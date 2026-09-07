# 디자인 품질 가드레일

`frontend-design` (bytedance) + `ui-ux-pro-max` 핵심 원칙을 병합한 품질 기준. **모든 섹션 생성 시 이 문서 기준을 적용한다.**

---

## 제1원칙: 제네릭 AI 디자인 금지

**절대 쓰지 말 것:**
- 폰트: Inter, Roboto, Arial, 시스템 기본 폰트만 사용
- 컬러: 흰 배경 + 보라 그라데이션 (#8B5CF6 → #EC4899 류)
- 레이아웃: 중앙 정렬 카드 그리드 3개 + 둥근 모서리만 있는 구성
- 버튼: `bg-blue-500 hover:bg-blue-600 rounded-lg` 기본값
- 이모지를 UI 아이콘으로 사용
- 모든 요소에 `shadow-md rounded-xl` 일괄 적용

**대신 이렇게:**
- **굵은 미학 방향 선택** — 미니멀/맥시멀/에디토리얼/브루탈리즘/레트로/럭셔리 중 하나를 **분명히** 결정
- **의도성 > 강도** — 절제된 미니멀과 과감한 맥시멀 모두 정답. 어정쩡한 중간이 오답
- **문맥에 맞는 선택** — 카페 사이트와 B2B SaaS는 다른 규칙을 따라야 함

---

## 타이포그래피

**한국어 폰트 1순위: Pretendard**
- 가변 폰트, 100~900 굵기, 한글/영문/숫자 균일, Apple SD 산돌고딕 대체
- CDN: `https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.min.css`

**스타일별 한글 폰트 페어링**
| 분위기 | 본문 | 디스플레이(헤드라인) |
|---|---|---|
| 모던 기본 | Pretendard 400 | Pretendard 800~900 |
| 럭셔리/에디토리얼 | Noto Serif KR 400 | Noto Serif KR 900 또는 Nanum Myeongjo 900 |
| 힙/대담 | Pretendard 500 | Paperlogy Black |
| 친근/플레이풀 | Pretendard 500 | Gmarket Sans Bold |
| 테크/미니멀 | IBM Plex Sans KR 400 | Pretendard 900 |

**영문 디스플레이 페어링(혼용 시)**
- Instrument Serif, Fraunces, Space Grotesk(단, Space Grotesk 과용 금지), Archivo, PP Editorial New, Migra

**규칙**
- H1: clamp(2.5rem, 5vw, 5rem), `tracking-tight` (-0.02em~-0.03em), 굵기 800+
- 본문: 16~18px, line-height 1.6~1.7 (한글은 1.7 권장)
- **한 사이트에 3개 폰트 이상 섞지 않는다**

### 한국어 줄바꿈 가독성 (필수)

한국어는 공백이 드물어 기본 CSS 줄바꿈이 어절 중간에서 끊기는 경우가 많다.
헤드라인/버튼/카드 텍스트는 반드시 아래 규칙을 적용해 의미 단위로 끊어지게 한다.
**모바일에서 "나무로 깎 / 은 소리"처럼 어절 중간이 잘리면 실패**로 간주한다.

**CSS 전역 기본값**
- `word-break: keep-all` — 어절(공백 기준) 경계 외에서 절대 끊지 않음
- `overflow-wrap: break-word` — 너무 긴 단어(URL 등)는 예외적으로 끊음
- body와 헤드라인에 반드시 적용

```css
/* globals.css */
body {
  word-break: keep-all;
  overflow-wrap: break-word;
}
h1, h2, h3, h4, h5, h6 {
  word-break: keep-all;
}

/* 유틸리티 클래스 */
.kr-break { word-break: keep-all; overflow-wrap: break-word; }
.kr-block { display: inline-block; }
```

**의미 단위 수동 줄바꿈**

긴 헤드라인은 의미 블록을 `<br />`로 수동 분리하거나, 각 의미 블록을 `<span class="kr-block">`로 감싸 한 덩어리로 취급한다.

나쁜 예 — 모바일에서 "나무로 깎 / 은 소리"처럼 어색하게 잘림:
```tsx
<h1>나무로 깎은 소리</h1>
```

좋은 예 1 — 수동 `<br />`로 의미 블록 분리:
```tsx
<h1>
  나무로 깎은<br />소리
</h1>
```

좋은 예 2 — 의미 블록을 `inline-block`으로 감싸 한 덩어리 유지:
```tsx
<h1>
  <span className="kr-block">나무로 깎은</span>{" "}
  <span className="kr-block">소리</span>
</h1>
```

**적용 대상 (반드시)**
- 모든 H1, H2, H3
- CTA 버튼 텍스트
- 카드 제목
- 섹션 헤더
- 긴 본문 문단
- **폼 라벨과 에러 메시지** — 짧아도 2행으로 어색하게 잘리면 보기 흉함
- Footer의 법적 고지 텍스트 (사업자 정보 등)

**Tailwind 사용자 팁**

Tailwind 4 이상에는 `break-keep` 유틸리티가 이미 존재한다. 별도 `.kr-break` 유틸리티를 만들지 않고도 바로 쓸 수 있다:

```tsx
<h1 className="break-keep">나무로 깎은 소리</h1>
<p className="break-keep">본문 텍스트도 동일하게 적용</p>
```

`word-break: keep-all`을 전역에 걸면 사이트 전체 텍스트가 어절 단위로만 끊어지므로, 유틸리티 클래스를 매번 붙이지 않아도 되어 더 편리하다. 프로젝트 상황에 맞게 전역 적용 + 필요시 유틸리티 둘 중 선택.

**체크 방법**
- 375px 모바일 뷰포트에서 모든 헤드라인을 육안 확인
- 어절이 중간에서 잘리는 곳이 하나라도 있으면 수정 후 재확인
- Playwright 스크린샷으로 근거 남기기 권장

---

## 컬러 시스템

**원칙: 지배색 + 날카로운 악센트 > 고루 분포된 팔레트**

### 업종별 추천 팔레트 방향

| 업종 | 지배색 계열 | 악센트 |
|---|---|---|
| B2B SaaS (신뢰) | Slate/Neutral | 선명한 청록/라임/인디고 1색 |
| 크리에이티브/에이전시 | 오프화이트/크림 | 블랙 + 비비드 1색 (주황/핫핑크) |
| 럭셔리/패션 | 블랙/아이보리 | 골드/버건디 |
| 카페/F&B | 크림/베이지 | 테라코타/올리브/머스타드 |
| 헬스케어/병원 | 오프화이트/세이지 | 소프트 블루/민트 |
| 핀테크 | 딥네이비/블랙 | 네온그린/일렉트릭블루 |
| 교육/어린이 | 크림 | 주황/옐로우/민트 |
| 테크/개발자 도구 | 딥블랙/차콜 | 네온/형광 1색 |

**CSS 변수로 관리** — 하드코딩 금지
```css
:root {
  --bg: #0a0a0a;
  --fg: #f5f5f5;
  --accent: #c3ff00;
  --muted: #737373;
  --border: #1f1f1f;
}
```

**대비**: 본문 텍스트 WCAG AA (4.5:1) 이상. 시각적 멋을 위해 대비를 약화하지 않는다.

---

## 레이아웃과 공간

- **예상 밖의 레이아웃** — 비대칭, 오버랩, 대각선 흐름, 그리드 깨기
- **넉넉한 여백 OR 의도된 밀도** (어정쩡하지 말 것)
- **섹션 간 리듬** — 모든 섹션을 같은 `py-24`로 하지 말고 강약 조절
- **모바일 퍼스트** — 375px 기준으로 먼저 설계, 데스크톱은 확장

---

## 모션과 인터랙션

- CSS-only 우선 (HTML/정적), React는 Motion/Framer Motion 사용 가능
- **적은 수의 강력한 모션 > 많은 미세 인터랙션**
- 페이지 로드 시 stagger reveal 하나를 잘 연출하는 게 산만한 마이크로 인터랙션보다 효과적
- 호버 시 카드 scale은 레이아웃 흔들림 유발 금지 (`transform-origin`과 `will-change` 주의)
- **`@media (prefers-reduced-motion: reduce)` 반드시 존중**

---

## 배경과 디테일

솔리드 컬러 기본값 탈피:
- 그라데이션 메시
- 노이즈 텍스처 (SVG filter)
- 기하학 패턴
- 레이어드 반투명
- 드라마틱 섀도우
- 장식 보더
- 그레인 오버레이

**주의**: 미니멀 방향을 선택했다면 위 요소를 최소화. 맥시멀과 섞지 말 것.

---

## 접근성 체크리스트

- [ ] Semantic HTML (`<header> <nav> <main> <section> <footer>`)
- [ ] 모든 이미지에 `alt` (장식용은 `alt=""`)
- [ ] 버튼/링크 구분 (`<button>` vs `<a>`)
- [ ] 키보드 포커스 스타일 보이게 (focus-visible)
- [ ] 색상만으로 정보 전달 금지
- [ ] 폼 label 연결
- [ ] 헤딩 순서 준수 (h1 → h2 → h3)
- [ ] 대비 WCAG AA 이상
- [ ] `prefers-reduced-motion` 존중
- [ ] 한국어 lang: `<html lang="ko">`

---

## Safety Rules (ui-ux-pro-max 준수)

- 제품 유형과 연결 없이 디자인 언어를 고정하지 않는다
- 이모지를 주요 UI 아이콘으로 쓰지 않는다 (Lucide/Phosphor/Heroicons 사용)
- 시각적 멋을 위해 텍스트 대비를 희생하지 않는다
- 호버 시 인터랙티브 카드 scale이 레이아웃 불안정을 초래하지 않게 한다
- `prefers-reduced-motion` 위반 금지
