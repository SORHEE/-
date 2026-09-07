import { generateText } from "./claudeClient.js";
import { getUsedTopics } from "./db.js";
import { parseLlmJson } from "./parseLlmJson.js";

/**
 * 설정된 키워드를 바탕으로 오늘의 글감 후보를 제안받는다. 최근 사용한 글감과 겹치지 않게 지시한다.
 */
export async function findTopicCandidates({ keywords, targetAudience, count = 3 }) {
  if (!keywords || keywords.length === 0) {
    throw new Error("config/settings.json의 keywords가 비어 있습니다. 관심 키워드를 먼저 채워주세요.");
  }
  const recentTopics = getUsedTopics()
    .slice(0, 20)
    .map((t) => t.topic);

  const prompt = `당신은 네이버 블로그 글감을 기획하는 편집자입니다.
아래 키워드를 참고해서 오늘 쓸 블로그 글 주제 후보 ${count}개를 제안해주세요.

키워드: ${keywords.join(", ")}
타깃 독자: ${targetAudience || "특정되지 않음"}
최근에 이미 다룬 주제(겹치지 않게 해주세요): ${recentTopics.length ? recentTopics.join(", ") : "없음"}

다른 설명 없이 아래 JSON 배열 형식으로만 정확히 응답하세요:
["주제 후보 1", "주제 후보 2", "주제 후보 3"]`;

  const responseText = await generateText({ prompt, maxTurns: 3 });
  const topics = parseLlmJson(responseText);
  if (!Array.isArray(topics)) throw new Error("글감 후보 응답이 배열이 아닙니다.");
  return topics;
}
