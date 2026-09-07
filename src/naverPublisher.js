// 네이버 블로그 스마트에디터 ONE 자동 입력/발행.
//
// 주의: 네이버 에디터의 실제 DOM 구조/클래스명은 수시로 바뀐다. 아래 selector 값들은
// config/selectors.json 한 곳에 모아뒀으니, 자동입력이 실패하면 브라우저 개발자도구(F12)로
// 실제 요소를 확인해 그 파일만 고치면 된다(이 파일은 손댈 필요 없음).
//
// 품질 스펙 반영:
//  - 본문 전체 15pt 고정: 모든 텍스트를 입력한 뒤 전체 선택 -> 글자 크기 15 적용을 한 번에 수행.
//  - 인용구는 첫 소제목 이전/이후 관계없이 네이버 기본 인용구 서식(자동으로 커지는 문제)을 쓰지
//    않고, 그냥 따옴표를 포함한 일반 문단(15pt)으로 넣는다 — "크기 섞지 말 것" 규칙을 항상 지키기 위함.
//  - 소제목은 크기를 키우지 않고 굵게(Bold)만 적용해 구분한다.
//  - 발행 직전 공개범위 라디오가 실제로 선택됐는지 확인하고, 아니면 발행을 중단한다.

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");
const AUTH_DIR = path.join(PROJECT_ROOT, ".auth");
const AUTH_FILE = path.join(AUTH_DIR, "naver.json");

function loadSelectors() {
  const raw = fs.readFileSync(path.join(PROJECT_ROOT, "config", "selectors.json"), "utf8");
  return JSON.parse(raw);
}

export function hasNaverSession() {
  return fs.existsSync(AUTH_FILE);
}

/**
 * 헤디드 브라우저를 띄워 사용자가 직접 네이버에 로그인하게 하고, 완료되면 세션을 저장한다.
 * 대시보드의 "네이버 로그인" 버튼에서 호출한다.
 */
export async function loginAndSaveSession({ timeoutMs = 5 * 60 * 1000 } = {}) {
  const selectors = loadSelectors();
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("https://nid.naver.com/nidlogin.login");

  try {
    await page.waitForSelector(selectors.login.loginSuccessIndicator, { timeout: timeoutMs });
  } catch {
    await browser.close();
    throw new Error("로그인 대기 시간이 초과됐습니다. 다시 시도해주세요.");
  }

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  await context.storageState({ path: AUTH_FILE });
  await browser.close();
  return true;
}

async function getEditorFrame(page, selectors) {
  const frameElement = await page.waitForSelector(selectors.writePage.iframeSelector);
  const frame = await frameElement.contentFrame();
  if (!frame) throw new Error("스마트에디터 iframe을 찾지 못했습니다.");
  return frame;
}

async function dismissHelpPopups(frame, selectors) {
  for (const sel of [selectors.writePage.helpCloseButton, selectors.writePage.helperPopupCancel]) {
    try {
      const el = await frame.$(sel);
      if (el) await el.click({ timeout: 1000 });
    } catch {
      // 팝업이 없으면 무시
    }
  }
}

async function typeTitle(frame, selectors, title) {
  const titleSelector = (await frame.$(selectors.writePage.titleArea))
    ? selectors.writePage.titleArea
    : selectors.writePage.documentTitleFallback;
  await frame.click(titleSelector);
  await frame.type(titleSelector, title, { delay: 15 });
}

async function typeParagraphLine(frame, text, { bold = false } = {}) {
  if (bold) await frame.keyboard.down("Control");
  if (bold) {
    await frame.keyboard.press("b");
    await frame.keyboard.up("Control");
  }
  await frame.keyboard.type(text, { delay: 12 });
  if (bold) {
    await frame.keyboard.down("Control");
    await frame.keyboard.press("b");
    await frame.keyboard.up("Control");
  }
  await frame.keyboard.press("Enter");
}

async function insertImage(frame, selectors, imagePath) {
  await frame.click(selectors.toolbar.imageButton);
  const fileInput = await frame.waitForSelector(selectors.imageUpload.fileInputSelector, { state: "attached" });
  await fileInput.setInputFiles(imagePath);
  // 업로드/렌더링 대기 (네트워크 요청 완료를 기다림)
  await frame.waitForTimeout(1500);
  await frame.keyboard.press("Enter");
}

async function applyUniformFontSize(frame, selectors, bodySelector) {
  await frame.click(bodySelector);
  await frame.keyboard.down("Control");
  await frame.keyboard.press("a");
  await frame.keyboard.up("Control");
  await frame.click(selectors.toolbar.fontSizeDropdown);
  await frame.click(selectors.toolbar.fontSize15pt);
}

/**
 * 본문 블록(contentFormatter.formatDraftForPublish 결과)을 스마트에디터에 입력하고 발행한다.
 * @param {object} params
 * @param {string} params.blogId
 * @param {string} params.title
 * @param {Array} params.blocks
 * @param {Record<string,string>} params.imagesByAlt  altText -> 로컬 이미지 파일 경로
 * @param {'public'|'private'} params.openType
 * @param {string} [params.categoryNo]
 */
export async function publishPost({ blogId, title, blocks, imagesByAlt = {}, openType = "public", categoryNo }) {
  if (!hasNaverSession()) {
    throw new Error("NEEDS_LOGIN");
  }
  const selectors = loadSelectors();
  const browser = await chromium.launch({ headless: false, slowMo: 60 });
  const context = await browser.newContext({ storageState: AUTH_FILE });
  const page = await context.newPage();

  try {
    await page.goto(selectors.writePage.url.replace("{blogId}", blogId));
    const frame = await getEditorFrame(page, selectors);
    await dismissHelpPopups(frame, selectors);

    await typeTitle(frame, selectors, title);
    await frame.keyboard.press("Enter");

    for (const block of blocks) {
      if (block.type === "image") {
        const imagePath = imagesByAlt[block.altText];
        if (imagePath) await insertImage(frame, selectors, imagePath);
        continue;
      }
      const bold = block.type === "subheading";
      const lines = block.type === "quote" ? block.lines.map((l) => `“ ${l} ”`) : block.lines;
      for (const line of lines) {
        await typeParagraphLine(frame, line, { bold });
      }
    }

    // 본문 전체 15pt로 통일 (요구사항 1)
    await applyUniformFontSize(frame, selectors, selectors.writePage.bodyArea);

    // 발행 레이어 열기
    await page.click(selectors.publish.openPublishLayerButton);
    if (categoryNo) {
      try {
        await page.selectOption(selectors.publish.categorySelect, categoryNo);
      } catch {
        // 카테고리 선택 실패는 치명적이지 않으므로 무시하고 진행
      }
    }

    const wantedSelector =
      openType === "private" ? selectors.publish.openTypePrivateSelector : selectors.publish.openTypePublicSelector;
    await page.check(wantedSelector).catch(() => {});

    // 공개범위 검증 (요구사항 5) — 실제로 체크됐는지 확인 후 아니면 발행 중단
    const isChecked = await page.isChecked(wantedSelector).catch(() => false);
    if (!isChecked) {
      throw new Error(
        `발행 중단: 공개범위(${openType})가 실제로 선택되지 않았습니다. selectors.json의 publish 항목을 확인하세요.`
      );
    }

    await page.click(selectors.publish.finalPublishButton);
    await page.waitForURL(/blog\.naver\.com\/.+\/\d+/, { timeout: 30000 });
    const url = page.url();

    return { url, title };
  } finally {
    await browser.close();
  }
}
