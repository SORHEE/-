// Claude 응답 텍스트에서 JSON만 뽑아내는 유틸. 코드펜스(```json ... ```)가 섞여 와도 처리한다.
//
// LLM이 JSON 문자열 값 안에 (이스케이프 없이) 진짜 개행문자를 그대로 넣어서 보내는 경우가 있다.
// JSON 표준상 문자열 리터럴 안의 제어문자(줄바꿈, 탭 등)는 반드시 \n, \t 처럼 이스케이프되어야
// 하는데, 그렇지 않으면 JSON.parse가 "Bad control character in string literal"로 실패한다.
// 아래 escapeControlCharsInStrings()가 문자열 리터럴 "안"에서만 그런 제어문자를 찾아
// 올바르게 이스케이프해준다(문자열 밖의 개행/들여쓰기는 원래 JSON에서도 허용되므로 건드리지 않음).
//
// 참고: 한글 Windows에서는 백슬래시(\)가 원화 기호(₩)로 보이는 경우가 있어(예: \n이 ₩n으로
// 표시) 그 패턴도 방어적으로 함께 정리한다.

function fixWonSignEscapes(text) {
  return text
    .replace(/₩r₩n/g, "\\n")
    .replace(/₩n/g, "\\n")
    .replace(/₩t/g, "\\t")
    .replace(/₩"/g, '\\"');
}

function escapeControlCharsInStrings(text) {
  let result = "";
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString && ch === "\\") {
      // 이스케이프 시퀀스는 그대로 통과(다음 글자까지 함께 복사)시켜 이중 처리하지 않는다.
      result += ch + (text[i + 1] ?? "");
      i++;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }
    if (inString && ch.charCodeAt(0) < 0x20) {
      if (ch === "\n") result += "\\n";
      else if (ch === "\r") result += "\\r";
      else if (ch === "\t") result += "\\t";
      else result += "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0");
      continue;
    }
    result += ch;
  }
  return result;
}

export function parseLlmJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced ? fenced[1] : text).trim();
  const candidate = escapeControlCharsInStrings(fixWonSignEscapes(raw));
  try {
    return JSON.parse(candidate);
  } catch (err) {
    throw new Error(`LLM 응답을 JSON으로 파싱하지 못했습니다: ${err.message}\n원문: ${text.slice(0, 500)}`);
  }
}
