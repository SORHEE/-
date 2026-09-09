// 네이버 블로그 품질 스펙을 강제하는 후처리 파이프라인.
// AI가 만든 원고(마크다운과 비슷한 단순 포맷)를 받아서, 발행 직전 최종 형태로 바꾼다.
//
// 입력 포맷 규칙 (claudeClient의 프롬프트가 이 포맷으로 글을 쓰게 지시함):
//   - "## 소제목"  -> 소제목 블록
//   - "> 인용문"    -> 인용구 블록 (첫 소제목 이전에 나오면 일반 문단으로 강등됨)
//   - "[IMAGE: 설명]" -> 이미지 자리표시자 블록 (실제 이미지는 imageStudio가 만들어 끼워 넣음)
//   - 그 외 빈 줄로 구분된 문단 -> 일반 본문 블록
//
// 네이버 에디터에는 소제목도 별도 "제목" 서식이 아니라 굵은 일반 문단으로 넣는다.
// 요구사항이 "본문 전체 글자 크기 15pt 고정, 크기 섞지 말 것"이라 네이버 기본 소제목 서식(글자 커짐)을
// 쓰면 안 되기 때문이다.

export const FONT_SIZE_PT = 15;
const WRAP_WIDTH = 18;

const CITATION_PATTERNS = [
  /\(?\s*[—–-]\s*[^()\n]{0,20}(뉴스|일보|타임스|신문|저널|논문|매거진)\s*\)?/g,
  /\(\s*출처\s*[:：][^)\n]*\)/g,
  /\[\s*출처\s*[:：]?[^\]\n]*\]/g,
  /^\s*출처\s*[:：].*$/gm,
];

/**
 * 리터럴 "\n"(백슬래시+n 두 글자)을 실제 개행으로 치환한다.
 * 한글 Windows에서는 백슬래시가 원화 기호(₩)로 나타나 "₩n"으로 깨지는 경우도 있어 함께 처리한다.
 */
export function fixLiteralNewlines(text) {
  return text
    .replace(/₩r₩n/g, "\n")
    .replace(/₩n/g, "\n")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n");
}

/** 자동으로 붙는 출처 표기 패턴을 제거한다. */
export function stripAutoCitations(text) {
  let out = text;
  for (const pattern of CITATION_PATTERNS) {
    out = out.replace(pattern, "");
  }
  return out;
}

/** 한 문장을 어절(공백) 단위로 끊어 대략 maxWidth자 이내 줄들로 반환한다. 단어 중간은 자르지 않는다. */
export function wrapSentenceByWord(sentence, maxWidth = WRAP_WIDTH) {
  const words = sentence.trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

/** 문단 텍스트를 문장 단위로 쪼갠다(마침표/느낌표/물음표/말줄임표 기준). */
export function splitSentences(paragraph) {
  const normalized = paragraph.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const matches = normalized.match(/[^.!?…]+[.!?…]*/g) || [normalized];
  return matches.map((s) => s.trim()).filter(Boolean);
}

/** 문단 하나를 "문장당 한 줄 + 어절 단위 줄바꿈" 규칙으로 재구성한다. */
export function reflowParagraph(paragraph, maxWidth = WRAP_WIDTH) {
  const sentences = splitSentences(paragraph);
  const lines = [];
  for (const sentence of sentences) {
    lines.push(...wrapSentenceByWord(sentence, maxWidth));
  }
  return lines.join("\n");
}

/** 원고 텍스트를 블록 배열로 파싱한다. */
export function parseDraft(rawText) {
  const text = fixLiteralNewlines(rawText);
  const rawBlocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

  const blocks = [];
  let sawHeading = false;

  for (const raw of rawBlocks) {
    if (raw.startsWith("## ")) {
      sawHeading = true;
      blocks.push({ type: "subheading", text: raw.slice(3).trim() });
      continue;
    }
    if (raw.startsWith(">")) {
      const quoteText = raw.replace(/^>\s?/gm, "").trim();
      if (!sawHeading) {
        // 첫 소제목 이전 인용구는 네이버 에디터에서 30px로 커지고 뒤 문단까지 영향을 주므로 금지 -> 일반 문단으로 강등
        blocks.push({ type: "paragraph", text: quoteText });
      } else {
        blocks.push({ type: "quote", text: quoteText });
      }
      continue;
    }
    const imageMatch = raw.match(/^\[IMAGE:\s*(.+?)\]$/i);
    if (imageMatch) {
      blocks.push({ type: "image", altText: imageMatch[1].trim() });
      continue;
    }
    blocks.push({ type: "paragraph", text: raw });
  }

  return blocks;
}

/**
 * 전체 파이프라인: 원본 원고 -> 품질 스펙이 적용된 블록 배열.
 * 각 블록은 { type: 'subheading'|'paragraph'|'quote', lines: string[] } 또는 { type: 'image', altText } 형태.
 */
export function formatDraftForPublish(rawText, { wrapWidth = WRAP_WIDTH } = {}) {
  const cleaned = stripAutoCitations(fixLiteralNewlines(rawText));
  const blocks = parseDraft(cleaned);

  return blocks.map((block) => {
    if (block.type === "image") return block;
    const withoutCitation = stripAutoCitations(block.text);
    const reflowed = reflowParagraph(withoutCitation, wrapWidth);
    return { type: block.type, lines: reflowed.split("\n") };
  });
}

/** 블록 배열을 사람이 읽기 쉬운 순수 텍스트(카드뉴스/스레드 재가공 프롬프트 입력용)로 합친다. */
export function blocksToPlainText(blocks) {
  return blocks
    .map((b) => {
      if (b.type === "image") return `[이미지: ${b.altText}]`;
      const prefix = b.type === "subheading" ? "▶ " : b.type === "quote" ? "“ " : "";
      return prefix + b.lines.join(" ");
    })
    .join("\n\n");
}
