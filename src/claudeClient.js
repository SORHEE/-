// Claude Agent SDK 래퍼.
//
// 인증: 반드시 사용자의 Claude 구독(로그인 세션 또는 CLAUDE_CODE_OAUTH_TOKEN)만 사용한다.
// ANTHROPIC_API_KEY가 설정돼 있으면(공식 인증 우선순위상 API 키가 구독보다 우선하기 때문에)
// 그대로 두면 요금이 API로 별도 청구된다. 그래서 시작 시 발견 즉시 process.env에서 지우고
// 경고를 남긴다 — 사용자 지시(README에도 동일하게 안내).
//
// 참고: 이 스크립트는 사용자 본인의 구독 계정으로, 사용자 본인 컴퓨터에서만 개인적으로 실행되는
// 도구다. 제3자에게 이 프로그램을 서비스로 제공하며 그 사람들의 claude.ai 로그인을 대신 처리하는
// 용도로 확장하지 말 것 — Anthropic 상업 이용약관상 사전 승인 없이는 허용되지 않는다.

import { query } from "@anthropic-ai/claude-agent-sdk";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.join(__dirname, "..");

export function ensureSubscriptionAuthOnly() {
  if (process.env.ANTHROPIC_API_KEY) {
    console.warn(
      "[claudeClient] ANTHROPIC_API_KEY가 환경에 설정되어 있어 삭제합니다. " +
        "이 프로그램은 Claude 구독 인증(로그인 세션 또는 CLAUDE_CODE_OAUTH_TOKEN)만 사용합니다."
    );
    delete process.env.ANTHROPIC_API_KEY;
  }
}

/**
 * Claude Agent SDK에 프롬프트를 보내고 최종 텍스트 결과를 반환한다.
 * @param {object} params
 * @param {string} params.prompt
 * @param {number} [params.maxTurns]
 * @returns {Promise<string>}
 */
export async function generateText({ prompt, maxTurns = 8 }) {
  ensureSubscriptionAuthOnly();

  let finalText = "";
  let sawSuccess = false;

  for await (const message of query({
    prompt,
    options: {
      cwd: PROJECT_ROOT,
      // 프로젝트(.claude/skills)와 사용자 전역(~/.claude/skills) 스킬을 모두 로드.
      settingSources: ["user", "project"],
      // 콘텐츠 생성 전용 — 파일 수정/명령 실행 도구는 열어주지 않는다. Skill 도구만 허용해
      // naver-blog-writing / marketing-science-writing 스킬을 쓸 수 있게 한다.
      allowedTools: ["Skill", "Read", "Glob"],
      // 사람이 지켜보지 않는 cron 자동 실행이므로, 위처럼 허용 도구를 최소한으로 좁혀둔 채
      // 도구 승인 프롬프트 없이 진행되게 한다.
      permissionMode: "bypassPermissions",
      maxTurns,
    },
  })) {
    if (message.type === "result") {
      if (message.subtype === "success") {
        finalText = message.result || "";
        sawSuccess = true;
      } else {
        throw new Error(`Claude Agent SDK 실행 실패: ${message.subtype}`);
      }
    }
  }

  if (!sawSuccess) {
    throw new Error("Claude Agent SDK로부터 최종 응답(result)을 받지 못했습니다.");
  }
  return finalText.trim();
}
