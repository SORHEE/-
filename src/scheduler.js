import cron from "node-cron";
import { loadSettings } from "./settings.js";
import { runPipeline } from "./pipeline.js";

let currentTask = null;

function toCronExpression(hhmm) {
  const [hour, minute] = hhmm.split(":").map((n) => parseInt(n, 10));
  return `${minute} ${hour} * * *`; // 매일 해당 시:분
}

/** config/settings.json의 publishTime 기준으로 매일 파이프라인을 실행하도록 예약한다. */
export function startScheduler({ onRun } = {}) {
  const settings = loadSettings();
  if (currentTask) currentTask.stop();

  const cronExpr = toCronExpression(settings.publishTime || "09:00");
  currentTask = cron.schedule(cronExpr, async () => {
    try {
      const result = await runPipeline({});
      onRun?.(null, result);
    } catch (err) {
      onRun?.(err, null);
    }
  });

  console.log(`[scheduler] 매일 ${settings.publishTime} 자동 발행이 예약되었습니다.`);
  return currentTask;
}

export function restartScheduler(opts) {
  return startScheduler(opts);
}
