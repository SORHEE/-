// Claude 응답 텍스트에서 JSON만 뽑아내는 유틸. 코드펜스(```json ... ```)가 섞여 와도 처리한다.
export function parseLlmJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  try {
    return JSON.parse(candidate.trim());
  } catch (err) {
    throw new Error(`LLM 응답을 JSON으로 파싱하지 못했습니다: ${err.message}\n원문: ${text.slice(0, 500)}`);
  }
}
