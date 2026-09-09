import { generateText } from "./claudeClient.js";
import { parseLlmJson } from "./parseLlmJson.js";
import { fixLiteralNewlines, stripAutoCitations } from "./contentFormatter.js";

/**
 * 발행된 네이버 블로그 글(원본)을 marketing-science-writing 스킬로 스레드(Threads)용
 * 대화체 짧은 글타래로 재구성한다. 마지막 글에는 블로그 링크를 붙인다.
 */
export async function generateThreadsThread({ blogTitle, blogPlainText, blogUrl }) {
  const prompt = `marketing-science-writing 스킬을 사용해서, 아래 네이버 블로그 글(원본)을
Threads(스레드)용 대화체 글타래로 재구성해주세요. 원문을 그대로 복사하지 말고, 핵심만
편하게 말하듯 짧게 새로 써주세요. 필요하면 여러 개의 이어지는 글로 나눠도 됩니다
(각 글은 500자 이내). 마지막 글에는 절대 링크를 넣지 마세요(제가 따로 추가합니다).

[블로그 원본 제목]
${blogTitle}

[블로그 원본 본문]
${blogPlainText}

다른 설명 없이 아래 JSON 배열 형식으로만 정확히 응답하세요:
["첫 번째 글", "두 번째 글(있다면)", "..."]`;

  const responseText = await generateText({ prompt, maxTurns: 15 });
  const posts = parseLlmJson(responseText).map((p) => stripAutoCitations(fixLiteralNewlines(p)).trim());

  if (posts.length === 0) throw new Error("스레드 글타래 응답이 비어 있습니다.");
  posts[posts.length - 1] = `${posts[posts.length - 1]}\n\n자세한 내용은 블로그에서 👉 ${blogUrl}`;
  return { posts };
}
