import path from "node:path";
import { generateText } from "./claudeClient.js";
import { parseLlmJson } from "./parseLlmJson.js";
import { fixLiteralNewlines, stripAutoCitations } from "./contentFormatter.js";
import { generateUniqueImage, buildCardTemplate } from "./imageStudio.js";

/**
 * 발행된 네이버 블로그 글(원본)을 marketing-science-writing 스킬로 인스타 카드뉴스용으로
 * 요약·재구성한다. 원문 복붙이 아니라 핵심만 추린 새 콘텐츠를 만들도록 명시적으로 지시한다.
 */
export async function generateInstagramCardNews({ blogTitle, blogPlainText, blogUrl, outDir }) {
  const prompt = `marketing-science-writing 스킬을 사용해서, 아래 네이버 블로그 글(원본)을
인스타그램 카드뉴스로 재가공해주세요. 원문을 그대로 복사하지 말고, 핵심 메시지만 뽑아
짧고 임팩트 있게 새로 써주세요.

[블로그 원본 제목]
${blogTitle}

[블로그 원본 본문]
${blogPlainText}

구성: 표지(cover) 1장 + 내용 슬라이드 3~7장.
caption 마지막 줄에는 절대 링크를 넣지 마세요(제가 따로 추가합니다).

다른 설명 없이 아래 JSON 형식으로만 정확히 응답하세요:
{
  "cover": { "title": "표지 제목", "subtitle": "표지 부제(선택, 없으면 빈 문자열)" },
  "slides": [ { "title": "슬라이드 소제목", "body": "슬라이드 본문(짧게)" } ],
  "caption": "인스타그램 캡션 전체 텍스트(해시태그 포함 가능)"
}`;

  const responseText = await generateText({ prompt, maxTurns: 4 });
  const data = parseLlmJson(responseText);

  const coverPath = await generateUniqueImage({
    templateFn: (seed) =>
      buildCardTemplate({ eyebrow: "", title: data.cover.title, body: data.cover.subtitle || "", seed }),
    outDir: path.join(outDir, "ig-cards"),
    baseName: "cover",
  });

  const slidePaths = [];
  for (let i = 0; i < data.slides.length; i++) {
    const slide = data.slides[i];
    const slidePath = await generateUniqueImage({
      templateFn: (seed) =>
        buildCardTemplate({ eyebrow: `${i + 1}/${data.slides.length}`, title: slide.title, body: slide.body, seed }),
      outDir: path.join(outDir, "ig-cards"),
      baseName: `slide-${i + 1}`,
    });
    slidePaths.push(slidePath);
  }

  const caption = stripAutoCitations(fixLiteralNewlines(data.caption)).trim() + `\n\n자세한 내용은 블로그에서 👉 ${blogUrl}`;

  return { images: [coverPath, ...slidePaths], caption };
}
