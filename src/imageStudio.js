// Playwright(headless)로 HTML 템플릿을 PNG로 렌더링하는 모듈.
// 네이버 본문 삽입 이미지와 인스타 카드뉴스 이미지가 모두 이 모듈을 공유해서 쓴다.
// 매번 배경/색상/패턴을 랜덤 시드로 바꿔서 만들고, 해시가 이전에 쓴 적 없는지 확인한 뒤에만
// 채택한다 — 한 글 안에서도, 글과 글 사이에서도 같은 이미지가 재사용되지 않게 하기 위해서다
// (네이버 유사문서 판정 방지).

import { chromium } from "playwright";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getUsedImageHashes, addUsedImageHash } from "./db.js";

let browserPromise = null;

function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true });
  }
  return browserPromise;
}

export async function closeImageStudio() {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function renderHtmlToPng(html, { width, height }) {
  const browser = await getBrowser();
  const page = await browser.newPage({ viewport: { width, height } });
  try {
    await page.setContent(html, { waitUntil: "networkidle" });
    return await page.screenshot({ type: "png" });
  } finally {
    await page.close();
  }
}

const PALETTES = [
  ["#FF6B6B", "#FFD166"],
  ["#4ECDC4", "#556270"],
  ["#5B8DEF", "#8FD3F4"],
  ["#F7971E", "#FFD200"],
  ["#A18CD1", "#FBC2EB"],
  ["#0BA360", "#3CBA92"],
  ["#F857A6", "#FF5858"],
  ["#00C9FF", "#92FE9D"],
];

function randomSeed() {
  return crypto.randomBytes(8).toString("hex");
}

/**
 * 카드/블로그 삽입 이미지 공통 템플릿. seed에 따라 그라데이션 각도, 팔레트, 배경 도형 위치가
 * 매번 달라져 시각적으로도, 픽셀 단위로도 이전 이미지와 겹치지 않게 한다.
 */
export function buildCardTemplate({ eyebrow = "", title, body = "", seed = randomSeed() }) {
  const hash = crypto.createHash("md5").update(seed).digest();
  const palette = PALETTES[hash[0] % PALETTES.length];
  const angle = hash[1] % 360;
  const blobX = 10 + (hash[2] % 70);
  const blobY = 10 + (hash[3] % 70);
  const blobSize = 220 + (hash[4] % 160);

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; }
  body {
    overflow: hidden;
    font-family: -apple-system, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif;
    background: linear-gradient(${angle}deg, ${palette[0]}, ${palette[1]});
    position: relative;
  }
  .blob {
    position: absolute; left: ${blobX}%; top: ${blobY}%;
    width: ${blobSize}px; height: ${blobSize}px; border-radius: 50%;
    background: rgba(255,255,255,0.14); transform: translate(-50%, -50%);
  }
  .content {
    position: relative; z-index: 1; height: 100%;
    display: flex; flex-direction: column; justify-content: center;
    padding: 8%; color: #fff;
  }
  .eyebrow { font-size: 28px; font-weight: 600; opacity: 0.85; margin-bottom: 18px; letter-spacing: 1px; }
  .title { font-size: 56px; font-weight: 800; line-height: 1.35; white-space: pre-line; text-shadow: 0 2px 12px rgba(0,0,0,0.15); }
  .body { margin-top: 28px; font-size: 32px; line-height: 1.6; white-space: pre-line; opacity: 0.95; }
  .seed { position: absolute; bottom: 4px; right: 8px; font-size: 8px; color: rgba(255,255,255,0.01); }
</style></head>
<body>
  <div class="blob"></div>
  <div class="content">
    ${eyebrow ? `<div class="eyebrow">${escapeHtml(eyebrow)}</div>` : ""}
    <div class="title">${escapeHtml(title)}</div>
    ${body ? `<div class="body">${escapeHtml(body)}</div>` : ""}
  </div>
  <div class="seed">${seed}</div>
</body></html>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * 유일한(중복 없는) 이미지를 생성해 파일로 저장한다.
 * @param {object} params
 * @param {(seed: string) => string} params.templateFn  seed를 받아 HTML을 반환하는 함수
 * @param {number} params.width
 * @param {number} params.height
 * @param {string} params.outDir
 * @param {string} params.baseName
 */
export async function generateUniqueImage({ templateFn, width = 1080, height = 1350, outDir, baseName, maxAttempts = 6 }) {
  fs.mkdirSync(outDir, { recursive: true });
  const usedHashes = new Set(getUsedImageHashes());

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const seed = randomSeed();
    const html = templateFn(seed);
    const buffer = await renderHtmlToPng(html, { width, height });
    const hash = sha256(buffer);
    if (!usedHashes.has(hash)) {
      const filePath = path.join(outDir, `${baseName}-${hash.slice(0, 10)}.png`);
      fs.writeFileSync(filePath, buffer);
      addUsedImageHash(hash);
      return filePath;
    }
    // 해시 충돌(극히 드묾) -> 다음 루프에서 새 seed로 재시도
  }
  throw new Error(`중복되지 않는 이미지를 ${maxAttempts}번 시도해도 만들지 못했습니다: ${baseName}`);
}
