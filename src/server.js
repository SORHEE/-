import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";

import { loadSettings, saveSettings } from "./settings.js";
import { findTopicCandidates } from "./topicFinder.js";
import { prepareDraft, publishDraft } from "./pipeline.js";
import { hasNaverSession, loginAndSaveSession } from "./naverPublisher.js";
import { listPosts } from "./db.js";
import { startScheduler } from "./scheduler.js";
import { closeImageStudio } from "./imageStudio.js";
import { ensureSubscriptionAuthOnly, PROJECT_ROOT } from "./claudeClient.js";

ensureSubscriptionAuthOnly();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/output", express.static(path.join(PROJECT_ROOT, "output")));

// 대시보드가 "초안 확인" 이후 "발행" 버튼을 누를 때 다시 생성하지 않도록 마지막 초안을 잠깐 들고 있는다.
// (로컬 1인용 대시보드라 단일 슬롯이면 충분하다.)
let pendingDraft = null;

app.get("/api/status", (req, res) => {
  res.json({
    naverLoggedIn: hasNaverSession(),
    settings: loadSettings(),
    hasPendingDraft: !!pendingDraft,
  });
});

app.get("/api/settings", (req, res) => {
  res.json(loadSettings());
});

app.post("/api/settings", (req, res) => {
  const next = saveSettings(req.body || {});
  startScheduler(); // 발행 시각이 바뀌었을 수 있으니 재예약
  res.json(next);
});

app.post("/api/naver/login", async (req, res) => {
  try {
    await loginAndSaveSession();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/topics", async (req, res) => {
  try {
    const settings = loadSettings();
    const topics = await findTopicCandidates({ keywords: settings.keywords, targetAudience: settings.targetAudience });
    res.json({ topics });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/draft", async (req, res) => {
  try {
    const bundle = await prepareDraft({ topic: req.body?.topic });
    pendingDraft = bundle;
    res.json({
      topic: bundle.topic,
      title: bundle.title,
      blocks: bundle.blocks,
      imageUrls: toPublicImageMap(bundle.imagesByAlt),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/publish", async (req, res) => {
  if (!pendingDraft) {
    return res.status(400).json({ error: "먼저 초안을 생성해주세요 (POST /api/draft)." });
  }
  try {
    const result = await publishDraft(pendingDraft);
    pendingDraft = null;
    if (!result.published) return res.status(409).json(result);
    res.json({
      published: true,
      url: result.url,
      igImages: result.ig.images.map(toPublicPath),
      igCaption: result.ig.caption,
      threadsPosts: result.threads.posts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/history", (req, res) => {
  res.json(listPosts());
});

function toPublicPath(absPath) {
  const rel = path.relative(path.join(PROJECT_ROOT, "output"), absPath).split(path.sep).join("/");
  return `/output/${rel}`;
}

function toPublicImageMap(imagesByAlt) {
  const out = {};
  for (const [alt, filePath] of Object.entries(imagesByAlt)) {
    out[alt] = toPublicPath(filePath);
  }
  return out;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`대시보드: http://localhost:${PORT}`);
  startScheduler({
    onRun: (err) => {
      if (err) console.error("[scheduler] 자동 실행 실패:", err.message);
      else console.log("[scheduler] 오늘의 자동 발행 파이프라인이 완료됐습니다.");
    },
  });
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await closeImageStudio();
    process.exit(0);
  });
}
