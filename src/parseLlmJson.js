// Claude 응답 텍스트에서 JSON만 뽑아내는 유틸. 코드펜스(```json ... ```)가 섞여 와도 처리한다.
//
// 한글 Windows 환경에서는 백슬래시(\)가 원화 기호(₩)로 치환되어 나타나는 경우가 있다.
// 그러면 JSON 안의 줄바꿈 이스케이프(\n)가 ₩n으로 깨져서 JSON.parse가 실패한다
// ("Bad control character in string literal" 등). 파싱 전에 이 패턴을 정상 이스케이프로
// 되돌려서 방어한다.
function fixWonSignEscapes(text) {
  return text
    .replace(/₩r₩n/g, "\\n")
    .replace(/₩n/g, "\\n")
    .replace(/₩t/g, "\\t")
    .replace(/₩"/g, '\\"');
}

export function parseLlmJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fixWonSignEscapes((fenced ? fenced[1] : text).trim());
  try {
    return JSON.parse(candidate);
  } catch (err) {
    throw new Error(`LLM 응답을 JSON으로 파싱하지 못했습니다: ${err.message}\n원문: ${text.slice(0, 500)}`);
  }
}
