import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { loadSettings } from "./settings.js";
import { generateText } from "./claudeClient.js";
import { parseLlmJson } from "./parseLlmJson.js";
import { formatDraftForPublish, blocksToPlainText } from "./contentFormatter.js";
import { generateUniqueImage, buildCardTemplate, closeImageStudio } from "./imageStudio.js";
import { findTopicCandidates } from "./topicFinder.js";
import { publishPost as publishToNaver, hasNaverSession } from "./naverPublisher.js";
import { generateInstagramCardNews } from "./instagramCardGen.js";
import { generateThreadsThread } from "./threadsThreadGen.js";
import { addPost, updatePost, addUsedTopic } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");

function todayOutDir() {
  const dateStr = new Date().toISOString().slice(0, 10);
  const dir = path.join(PROJECT_ROOT, "output", dateStr);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function generateBlogDraft({ topic, settings }) {
  const prompt = `naver-blog-writing 스킬을 사용해서 네이버 블로그 글을 써주세요.

주제: ${topic}
타깃 독자: ${settings.targetAudience || "특정되지 않음"}
말투: ${settings.tone}
CTA(마무리에 자연스럽게 유도할 것): ${settings.cta?.label || ""} ${settings.cta?.value || ""}

본문은 아래 규칙을 반드시 지켜서 작성하세요:
- 소제목은 "## 소제목" 형식으로 표시
- 인용구가 필요하면 "> 인용문" 형식으로 표시하되, 첫 번째 소제목보다 앞에는 절대 넣지 마세요
- 이미지가 들어가면 좋을 자리에는 "[IMAGE: 이미지 설명]" 한 줄을 넣으세요 (본문 전체에 2~4개 정도)
- 문단은 빈 줄로 구분
- 뉴스/논문 등 자동 출처 표기(예: "— OOO 뉴스")는 쓰지 마세요

다른 설명 없이 아래 JSON 형식으로만 정확히 응답하세요:
{ "title": "블로그 제목", "body": "위 규칙을 지킨 본문 전체" }`;

  const responseText = await generateText({ prompt, maxTurns: 6 });
  return parseLlmJson(responseText);
}

async function renderBlogImages(blocks, outDir) {
  const imageBlocks = blocks.filter((b) => b.type === "image");
  const imagesByAlt = {};
  const blogImagesDir = path.join(outDir, "blog-images");
  for (let i = 0; i < imageBlocks.length; i++) {
    const block = imageBlocks[i];
    const filePath = await generateUniqueImage({
      templateFn: (seed) => buildCardTemplate({ eyebrow: "", title: block.altText, seed }),
      width: 1200,
      height: 800,
      outDir: blogImagesDir,
      baseName: `image-${i + 1}`,
    });
    imagesByAlt[block.altText] = filePath;
  }
  return imagesByAlt;
}

/**
 * 글감 선택 -> 블로그 초안 생성 -> 포맷 적용 -> 블로그 삽입 이미지 렌더까지만 수행한다.
 * (네이버 로그인/발행은 하지 않음 — 대시보드 "초안 확인" 단계, dry-run 모두 이 함수를 쓴다.)
 */
export async function prepareDraft({ topic } = {}) {
  const settings = loadSettings();
  const outDir = todayOutDir();

  let chosenTopic = topic;
  if (!chosenTopic) {
    const candidates = await findTopicCandidates({ keywords: settings.keywords, targetAudience: settings.targetAudience });
    chosenTopic = candidates[0];
  }

  const draft = await generateBlogDraft({ topic: chosenTopic, settings });
  const blocks = formatDraftForPublish(draft.body);
  const imagesByAlt = await renderBlogImages(blocks, outDir);
  const plainText = blocksToPlainText(blocks);

  fs.writeFileSync(path.join(outDir, "blog-title.txt"), draft.title, "utf8");
  fs.writeFileSync(path.join(outDir, "blog-plaintext.txt"), plainText, "utf8");

  return { topic: chosenTopic, title: draft.title, blocks, imagesByAlt, plainText, outDir, settings };
}

/**
 * prepareDraft() 결과를 받아 네이버에 발행하고, 성공하면 그 글을 원본으로 인스타/스레드
 * 반자동 콘텐츠(이미지+캡션/글타래)를 생성한다. 인스타/스레드는 초안만 만들고 실제 업로드는
 * 사용자가 직접 한다.
 */
export async function publishDraft(draftBundle) {
  const { topic, title, blocks, imagesByAlt, plainText, outDir, settings } = draftBundle;

  if (!hasNaverSession()) {
    const post = addPost({ topic, title, status: "failed", reason: "네이버 로그인이 필요합니다." });
    return { published: false, reason: "NEEDS_LOGIN", post };
  }

  const post = addPost({ topic, title, status: "publishing" });

  let naverResult;
  try {
    naverResult = await publishToNaver({
      blogId: settings.naverBlogId,
      title,
      blocks,
      imagesByAlt,
      openType: settings.openType,
      categoryNo: settings.naverBlogCategoryNo,
    });
  } catch (err) {
    updatePost(post.id, { status: "failed", reason: err.message });
    return { published: false, reason: err.message, post };
  }

  addUsedTopic(topic);
  updatePost(post.id, { status: "published", url: naverResult.url });

  // 네이버 발행 성공 -> 그 글을 원본으로 인스타/스레드 반자동 콘텐츠 생성 (업로드는 사용자가 직접)
  const ig = await generateInstagramCardNews({
    blogTitle: title,
    blogPlainText: plainText,
    blogUrl: naverResult.url,
    outDir,
  });
  fs.writeFileSync(path.join(outDir, "ig-caption.txt"), ig.caption, "utf8");

  const threads = await generateThreadsThread({
    blogTitle: title,
    blogPlainText: plainText,
    blogUrl: naverResult.url,
  });
  fs.writeFileSync(path.join(outDir, "threads-thread.txt"), threads.posts.join("\n\n---\n\n"), "utf8");

  updatePost(post.id, {
    igImages: ig.images,
    igCaptionPath: path.join(outDir, "ig-caption.txt"),
    threadsPath: path.join(outDir, "threads-thread.txt"),
  });

  return { published: true, url: naverResult.url, ig, threads, outDir, post };
}

/**
 * 전체 파이프라인(글감 -> 블로그 발행 -> 인스타/스레드 재가공)을 한 번에 실행한다.
 * node-cron 매일 자동 실행, `npm run dry-run` 둘 다 이 함수를 쓴다.
 */
export async function runPipeline({ topic, dryRun = false } = {}) {
  const bundle = await prepareDraft({ topic });
  if (dryRun) return { dryRun: true, ...bundle };
  return publishDraft(bundle);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const dryRun = process.argv.includes("--dry-run");
  runPipeline({ dryRun })
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await closeImageStudio();
    });
}
