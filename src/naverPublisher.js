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
export async function loginAndSaveSession({ timeoutMs = 5 * 60 * 1000, pollIntervalMs = 1500 } = {}) {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("https://nid.naver.com/nidlogin.login");

  // 로그인 완료 감지는 화면 요소(UI는 수시로 바뀜) 대신, 네이버가 로그인 성공 시 발급하는
  // 인증 쿠키(NID_AUT, NID_SES)가 생겼는지로 판단한다 — 훨씬 안정적이다.
  const start = Date.now();
  let loggedIn = false;
  while (Date.now() - start < timeoutMs) {
    const cookies = await context.cookies("https://www.naver.com");
    const names = cookies.map((c) => c.name);
    if (names.includes("NID_AUT") && names.includes("NID_SES")) {
      loggedIn = true;
      break;
    }
    await page.waitForTimeout(pollIntervalMs);
  }

  if (!loggedIn) {
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

async function dismissResumeDraftPopup(page, selectors) {
  // "작성 중인 글이 있습니다. 이어서 작성하시겠습니까?" 팝업 — 예전에 자동화가 중간에 멈췄을 때
  // 생긴 임시저장 글을 무시하고 새 글로 시작하기 위해 "취소"를 누른다. 이 팝업은 iframe이 아니라
  // 페이지 최상단에 뜨므로 page에서 바로 찾는다.
  try {
    const cancelButton = page.locator(selectors.writePage.resumeDraftCancelButton).first();
    await cancelButton.click({ timeout: 3000 });
  } catch {
    // 팝업이 없으면 무시
  }
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

// 주의: 키보드 입력은 Frame이 아니라 Page 전체에 대해서만 가능하다(Playwright의 keyboard는
// Page에만 있음). 그래서 아래 함수들은 클릭/입력 대상 찾기는 frame으로, 실제 키 입력은
// page.keyboard로 나눠서 한다.

async function typeParagraphLine(page, text, { bold = false } = {}) {
  if (bold) {
    await page.keyboard.down("Control");
    await page.keyboard.press("b");
    await page.keyboard.up("Control");
  }
  await page.keyboard.type(text, { delay: 12 });
  if (bold) {
    await page.keyboard.down("Control");
    await page.keyboard.press("b");
    await page.keyboard.up("Control");
  }
  await page.keyboard.press("Enter");
}

async function insertImage(page, frame, selectors, imagePath) {
  // 이미지 버튼 클릭이 실제 OS 파일 선택 창(윈도우 탐색기)을 띄우므로, 그 창이 뜨기 전에
  // Playwright의 filechooser 이벤트로 가로채서 자동으로 파일을 넣어준다. 이렇게 하지 않으면
  // 진짜 탐색기 창이 열린 채로 멈추고, 그 뒤 키보드 입력이 브라우저가 아니라 그 창으로 들어가
  // 버려서 나머지 글이 전혀 입력되지 않는다.
  const fileChooserPromise = page.waitForEvent("filechooser");
  await frame.click(selectors.toolbar.imageButton);
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(imagePath);
  // 업로드/렌더링 대기 (네트워크 요청 완료를 기다림)
  await frame.waitForTimeout(1500);
  await page.keyboard.press("Enter");
}

async function applyUniformFontSize(page, frame, selectors) {
  // 마지막으로 입력한 문단에 커서(포커스)가 이미 있으므로, 특정 문단을 다시 찾아 클릭할
  // 필요가 없다(그 selector가 실제 화면과 안 맞으면 여기서 타임아웃이 나기 쉬웠음).
  await page.keyboard.down("Control");
  await page.keyboard.press("a");
  await page.keyboard.up("Control");
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
    await dismissResumeDraftPopup(page, selectors);
    const frame = await getEditorFrame(page, selectors);
    await dismissHelpPopups(frame, selectors);

    await typeTitle(frame, selectors, title);
    await page.keyboard.press("Enter");

    for (const block of blocks) {
      if (block.type === "image") {
        const imagePath = imagesByAlt[block.altText];
        if (imagePath) await insertImage(page, frame, selectors, imagePath);
        continue;
      }
      const bold = block.type === "subheading";
      const lines = block.type === "quote" ? block.lines.map((l) => `“ ${l} ”`) : block.lines;
      for (const line of lines) {
        await typeParagraphLine(page, line, { bold });
      }
    }

    // 본문 전체 15pt로 통일 (요구사항 1)
    await applyUniformFontSize(page, frame, selectors);

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
