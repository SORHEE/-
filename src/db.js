import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function readJson(name, fallback) {
  const file = filePath(name);
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(name, data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2), "utf8");
}

// posts: 발행 이력
export function listPosts() {
  return readJson("posts", []);
}

export function addPost(post) {
  const posts = listPosts();
  posts.unshift({ id: Date.now().toString(36), createdAt: new Date().toISOString(), ...post });
  writeJson("posts", posts);
  return posts[0];
}

export function updatePost(id, patch) {
  const posts = listPosts();
  const idx = posts.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  posts[idx] = { ...posts[idx], ...patch };
  writeJson("posts", posts);
  return posts[idx];
}

// used-images: 이미지 해시 중복 방지
export function getUsedImageHashes() {
  return readJson("used-images", []);
}

export function addUsedImageHash(hash) {
  const hashes = getUsedImageHashes();
  if (!hashes.includes(hash)) {
    hashes.push(hash);
    writeJson("used-images", hashes);
  }
}

// used-topics: 최근 글감 이력
export function getUsedTopics() {
  return readJson("used-topics", []);
}

export function addUsedTopic(topic) {
  const topics = getUsedTopics();
  topics.unshift({ topic, usedAt: new Date().toISOString() });
  writeJson("used-topics", topics.slice(0, 200));
}
