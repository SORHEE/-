import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SETTINGS_PATH = path.join(__dirname, "..", "config", "settings.json");

export function loadSettings() {
  return JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8"));
}

export function saveSettings(patch) {
  const current = loadSettings();
  const next = { ...current, ...patch };
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(next, null, 2), "utf8");
  return next;
}
