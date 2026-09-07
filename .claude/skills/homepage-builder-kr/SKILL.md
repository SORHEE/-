---
name: homepage-builder-kr
description: 한국어 홈페이지/랜딩페이지/이커머스/포트폴리오/회사 소개 사이트를 기획 인터뷰부터 Next.js 스캐폴딩, Supabase 연결, 토스페이먼츠 결제, Vercel 배포까지 한 흐름으로 완성한다. **홈페이지/랜딩/사이트/웹사이트/쇼핑몰/포트폴리오/회사 소개/이벤트 페이지를 만들기/제작/개발/배포 요청이 있으면 반드시 이 스킬을 사용하라.** "Next.js", "Vercel", "Supabase", "토스페이먼츠", "카카오 로그인", "랜딩페이지 디자인", "한글 사이트" 같은 키워드가 나오거나 한국 사용자 대상 사이트를 새로 만들려는 맥락이면 적극적으로 트리거한다. 사용자 인터뷰로 스택·섹션·디자인·결제를 결정하고 프로덕션급 UI를 생성한다.
version: 0.3.0
language: ko
---

# Homepage Builder (Korean)

한국어 기본 홈페이지 빌더. **대화형 인터뷰 → 아키텍처 결정 → 생성 → Supabase 연결 → Vercel 배포**까지 일관된 흐름으로 안내한다.

모든 사용자 커뮤니케이션은 **한국어**로 진행한다. 코드 주석과 변수명만 영어 허용.

---

## 핵심 원칙

1. **먼저 묻고 나중에 코딩한다** — 스택, 섹션, 디자인은 절대 가정하지 말고 반드시 사용자에게 질문해서 결정한다.
2. **한 라운드씩 끊어 질문한다** — Phase 1 인터뷰는 반드시 한 라운드만 던지고 답변을 받은 뒤에야 다음 라운드로 넘어간다. 여러 라운드를 한 메시지에 묶지 않는다.
3. **Vercel + Supabase 고정** — 배포는 Vercel, DB/Auth/Storage는 Supabase로 통일한다.
4. **결제는 토스페이먼츠 고정** — 결제 기능이 요구될 때에만 적용되며, 그때는 반드시 `@tosspayments/payment-sdk`를 사용한다. Stripe 등 다른 PG 제안 금지.
5. **한국어 카피가 기본** — 모든 UI 텍스트, 메타 정보, 에러 메시지는 한국어로 작성한다. 영어 병기는 사용자가 요청할 때만.
6. **한국어 의미 단위 줄바꿈** — 모든 텍스트에 `word-break: keep-all`을 적용하고, 헤드라인은 의미 블록을 수동 분리해 모바일에서도 어색하게 끊기지 않게 한다. 세부 규칙은 `references/design-principles.md` 참조.
7. **제네릭한 AI 디자인 금지** — `references/design-principles.md`의 안티패턴을 엄격히 피한다.
8. **feature-planner로 계획 수립 후 구현** — Phase 2.5에서 항상 `feature-planner` 스킬을 호출해 실행 계획을 먼저 세운다. 이 단계는 생략하지 않는다.
9. **단계별 확인** — 각 Phase가 끝날 때마다 사용자에게 다음으로 진행할지 확인한다.

---

## 워크플로

총 12단계 (Phase 1 → 2 → **2.5 오케스트레이션** → 3 → 4 → **4.5 조건부 결제** → 5 → 6 → 7 → 8 → **8.5 배포 전 체크** → 9 → 10). 2.5와 4.5는 각각 항상/조건부로 수행되는 특수 단계다.

### Phase 1. 요구사항 인터뷰

`references/interview-questions.md`에 정의된 **Round 1 ~ Round 6**을 **한 라운드씩 순차적으로** 질문한다.

**엄격한 진행 규칙 (반드시 준수)**:
- 한 메시지에 **딱 한 라운드만** 담는다. 여러 라운드를 묶지 않는다.
- 사용자 답변이 해당 라운드의 필수 항목을 모두 채우기 전까지 다음 라운드로 넘어가지 않는다.
- 답변이 모호하면 같은 라운드 안에서 명확화 질문을 하거나 예시 2~3개를 제시해 선택하게 한다.
- 라운드 순서: Round 1 (정체성) → Round 2 (타겟/가치) → Round 3 (기능) → Round 4 (디자인) → Round 5 (콘텐츠) → Round 6 (배포 환경).

수집할 최소 정보:
- 프로젝트 유형 (SaaS / 포트폴리오 / 로컬 비즈니스 / 커뮤니티 / 이벤트 / 기타)
- 타겟 고객 (구체적 페르소나)
- 핵심 가치 제안 (한 문장)
- 주요 페인 포인트
- 기술 요구사항 (동적 기능? 로그인? 결제? 블로그? 관리자?)
- 디자인 톤 레퍼런스 (URL 또는 키워드)
- 한국어/영어/다국어 범위
- 도메인 보유 여부

### Phase 2. 아키텍처 결정

수집한 정보를 바탕으로 `references/stack-decision.md`에 따라 스택을 **추천**하고 사용자에게 최종 확인받는다.

- 동적 기능 많음 + 로그인/결제 → **Next.js (App Router) + Tailwind + shadcn/ui**
- 콘텐츠 중심(블로그, 문서) → **Astro + Tailwind**
- 초경량 랜딩 하나 → **정적 HTML + Tailwind CDN**

결정 요약 템플릿:
```
## 아키텍처 결정 요약
- 스택: Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- DB/Auth: Supabase (Postgres + Row Level Security)
- 배포: Vercel
- 섹션 구성: Hero → Features → Pricing → FAQ → CTA → Footer
- 디자인 방향: [스타일] + [컬러팔레트] + [폰트 페어링]
- 언어: 한국어 기본

이대로 진행할까요? (수정하고 싶은 항목이 있으면 알려주세요)
```

### Phase 2.5. 실행 계획 수립 (feature-planner 호출 — 필수)

아키텍처가 확정되면 **실제 구현에 들어가기 전에 반드시 `feature-planner` 스킬을 호출**하여 단계별 실행 계획을 먼저 세운다. 이는 스킬 오케스트레이션 단계로, 규모와 관계없이 **항상** 수행한다.

**호출 방법**:
Skill 도구를 사용해 `feature-planner` 스킬을 호출한다. 호출 시 skill 이름과 함께, Phase 1~2에서 모은 컨텍스트를 인자 또는 호출 직후 메시지로 전달한다. 호출 API의 정확한 필드명은 Claude Code 버전에 따라 달라질 수 있으니, 당시 사용 가능한 Skill 도구 시그니처를 확인해 동일한 의미(skill 이름 + 컨텍스트)만 전달하면 된다.

**전달할 컨텍스트**:
- Phase 2의 아키텍처 결정 요약 (스택, 섹션, 디자인 방향, 언어, 도메인 여부)
- Phase 1에서 수집한 기능 요구사항 전체
- 제약 조건 (한국어 기본, Vercel+Supabase 고정, 결제시 토스페이먼츠)

**기대 산출물**:
- Phase 3 이후 작업들의 단계별 Phase 계획
- Quality Gate (각 단계 완료 판정 기준)
- 의존성과 선후관계
- 우선순위

**운영 규칙**:
- feature-planner의 산출물을 사용자에게 보여주고 **승인받은 후** Phase 3으로 진행한다.
- 사용자가 계획에 수정을 요청하면 반영 후 재승인을 받는다.
- 규모가 작아 보여도 생략 금지. "간단한 랜딩 하나"라도 이 단계를 건너뛰지 않는다.

**폴백 (호출 실패/거부 시)**:
- `feature-planner` 스킬 호출이 기술적으로 실패하거나(예: 스킬 미설치, 도구 미가용), 사용자가 계획에 3회 이상 근본적 거부를 한다면, 이 스킬 내부에서 **간이 계획**을 직접 생성한다.
- 간이 계획은 Phase 3~10을 체크리스트 형태로 요약하고 각 단계의 완료 기준을 1~2줄로 명시한다.
- 사용자 승인 후 진행한다.
- 반복 거부가 요구사항 자체의 문제라면 Phase 1 또는 Phase 2로 되돌아가 재인터뷰한다. 계획 단계에서 무리하게 밀어붙이지 않는다.

### Phase 3. 프로젝트 스캐폴딩

결정된 스택으로 프로젝트를 초기화한다. Next.js 기본 예시:

```bash
npx create-next-app@latest my-site --typescript --tailwind --app --no-src-dir --import-alias "@/*"
cd my-site
npx shadcn@latest init
npm install @supabase/supabase-js @supabase/ssr
```

`.gitignore`에 `.env.local`이 포함되어 있는지 반드시 확인한다.

### Phase 4. Supabase 설정

`references/supabase-setup.md` 전체를 따라 진행한다. 핵심 단계:

1. 사용자에게 https://supabase.com/dashboard 에서 프로젝트 생성 요청 (이 단계는 사용자가 직접 수행)
2. Project URL과 anon key를 받아 `.env.local`에 저장
3. `lib/supabase/client.ts`, `lib/supabase/server.ts` 생성
4. 필요한 테이블 스키마를 SQL로 작성하고 Supabase SQL Editor에서 실행하도록 안내
5. **Row Level Security (RLS) 반드시 활성화** — 기본 deny 후 필요한 정책만 추가
6. 인증이 필요하면 `middleware.ts` 추가

**한국 서비스 권장**: 로그인이 필요한 경우 **카카오 로그인 Provider**를 기본 추천한다. 한국 사용자 대상 사이트에서는 이메일/비밀번호보다 카카오 로그인의 전환율이 압도적으로 높다. Supabase Authentication → Providers → Kakao에서 설정하며, Kakao Developers에서 앱을 먼저 만들어야 한다. 상세 절차는 `references/supabase-setup.md`의 인증 섹션 참고.

### Phase 4.5. 결제 연동 (토스페이먼츠 — 조건부)

**조건**: Phase 1 인터뷰에서 결제/장바구니/주문 기능이 요구된 경우에만 수행한다. 결제 요구가 없으면 이 Phase는 스킵한다.

**고정 규칙**:
- 반드시 `@tosspayments/payment-sdk`를 사용한다. Stripe/이니시스/카카오페이 단독 등 다른 PG 제안 금지.
- 개발 환경에서는 Toss 공개 테스트 키를 기본값으로 사용 (`test_ck_...`, `test_sk_...`)
- 운영 전환 시 사용자가 https://developers.tosspayments.com 에서 본인 키로 교체하도록 안내
- 서버 결제 승인은 `app/api/payments/confirm/route.ts`에 구현
- 성공/실패 URL은 `/checkout/success`, `/checkout/fail`로 통일

전체 절차와 코드 템플릿: `references/payments-toss.md`

### Phase 5. 섹션별 UI 생성

`references/section-templates.md`의 **프로젝트 유형별 프리셋**을 기반으로, `references/design-principles.md`의 품질 가드레일을 모두 적용해 섹션을 순차적으로 생성한다.

섹션 구성은 Phase 1에서 결정된 프로젝트 유형(SaaS/포트폴리오/로컬 비즈니스/이커머스/이벤트 등)에 따라 다르다. 아래는 **SaaS 랜딩 기준 예시 순서**이며, 다른 유형은 `section-templates.md`의 해당 프리셋을 따른다:

> (SaaS 예시) Hero → Features → (Pricing) → (Testimonials) → FAQ → CTA → Footer

각 섹션 생성 시 체크:
- 디자인 원칙 위반 없음 (제네릭 폰트/보라 그라데이션/예측 가능한 레이아웃 금지)
- 반응형 (모바일 우선, 375px 기준으로 먼저 설계)
- **한국어 줄바꿈**: `word-break: keep-all` 전역 적용, 헤드라인은 의미 단위로 수동 `<br />` 또는 `.kr-block` 감싸기. 모바일에서 "나무로 깎 / 은 소리"처럼 어절 중간이 잘리면 안 된다. Tailwind 4 사용자는 `break-keep` 유틸리티를 바로 쓰면 된다.
- **이미지 최적화**: `next/image`를 사용하고 `remotePatterns` 설정. 제품/히어로 이미지는 AVIF/WebP 우선, 플레이스홀더 blur 적용. 프리미엄 브랜드일수록 이미지 품질이 브랜드 인상을 좌우한다.
- **한국 특유 요소**: 매장 안내가 있으면 **카카오맵/네이버맵** 임베드를 기본 선택(구글맵은 한국에서 제한적). 로그인이 있으면 **카카오 로그인** 버튼을 제공.
- 접근성 (semantic HTML, alt, aria-label, 대비 WCAG AA)
- `prefers-reduced-motion` 존중

### Phase 6. 한국어 카피 작성

`references/korean-copy.md`의 PAS/AIDA/BAB 프레임워크 한국어 버전을 사용한다.

- 헤드라인은 **짧고 구체적** (15자 이내 선호)
- 영어 직역체(예: "당신의 비즈니스를 변화시키세요") 금지
- 한국어 어법에 맞는 자연스러운 문장
- CTA는 동사로 끝냄 ("무료로 시작하기", "지금 예약하기")

### Phase 7. SEO / 메타 / OG

Next.js의 경우 `app/layout.tsx`에 `metadata` 객체로 처리:
- `title`, `description` (한국어)
- Open Graph (`og:title`, `og:description`, `og:image` 1200x630)
- Twitter Card
- `robots.txt`, `sitemap.xml` (Next.js 13+ 파일 컨벤션 활용)
- 구조화 데이터 (JSON-LD) — Organization/WebSite 최소 포함

### Phase 8. 로컬 검증

```bash
npm run dev
```

사용자에게 `http://localhost:3000`에서 확인 요청. 가능하면 playwright MCP로 스크린샷 촬영해 디자인 품질 직접 검증:
- 모바일(375px), 태블릿(768px), 데스크톱(1440px) 3종
- 라이트/다크 모드 (지원 시)

발견한 문제는 수정 후 재검증.

### Phase 8.5. 배포 전 시크릿 스캔 (필수)

Vercel에 푸시하기 전에 **반드시** 시크릿이 레포에 추적되지 않는지 확인한다. 결제/인증 키가 실수로 커밋되면 치명적이다.

```bash
# 1. 추적 중인 파일 중 .env* 형태가 있는지 확인 (있으면 안 됨)
git ls-files | grep -E "\.env" || echo "OK: .env 파일이 추적되지 않음"

# 2. .gitignore에 .env.local이 포함돼 있는지 확인
grep -E "\.env" .gitignore || echo "WARNING: .gitignore에 .env 패턴 누락"

# 3. 혹시 커밋 히스토리에 시크릿 문자열이 들어갔는지 얕은 검사
git log --all --source -S "SUPABASE_SERVICE_ROLE_KEY" -p | head -20
git log --all --source -S "TOSS_SECRET_KEY" -p | head -20
```

만약 시크릿이 이미 커밋된 흔적이 발견되면:
1. 해당 키를 **즉시 재발급** (Supabase/토스 대시보드)
2. `.env.local`과 Vercel 환경변수를 새 키로 교체
3. 필요하면 `git filter-repo` 또는 BFG로 히스토리에서 제거
4. **재발급 없이 히스토리 제거만으로 끝내지 않는다** — 어딘가 캐시에 남아 있을 수 있음

### Phase 9. Vercel 배포

`references/vercel-deploy.md` 전체를 따라 진행한다. 요약:

1. Vercel CLI 설치 확인: `npm i -g vercel`
2. `vercel login` (사용자가 직접 수행)
3. `vercel link` — 프로젝트 연결
4. 환경변수 등록: `vercel env add NEXT_PUBLIC_SUPABASE_URL`, `vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY`, 그 외 server-only 키는 `SUPABASE_SERVICE_ROLE_KEY` 등
5. `vercel --prod` 로 배포
6. 배포 URL 확인 및 사용자에게 공유

### Phase 10. 배포 후 체크리스트

- [ ] 배포 URL 정상 접속 확인
- [ ] Supabase에서 실제 데이터 CRUD 동작 테스트
- [ ] RLS 정책 재확인 (anon 키로 민감 데이터 접근 불가한지)
- [ ] 커스텀 도메인 연결 안내 (사용자가 보유 시)
- [ ] Vercel Analytics 또는 Plausible 설치 제안
- [ ] Lighthouse 점수 확인 목표: Performance 90+, Accessibility 95+, SEO 100
- [ ] 모바일 실기기 확인 안내

---

## Safety Rules

- **환경변수/시크릿은 절대 코드에 하드코딩하지 않는다.** `.env.local`과 Vercel Environment Variables만 사용.
- **Supabase Service Role Key는 절대 클라이언트 코드에 노출하지 않는다.** 서버 컴포넌트/Route Handler에서만 사용.
- **RLS를 끄지 않는다.** 개발 편의로라도 비활성화 금지. 정책을 올바르게 작성하는 것이 답.
- **`git push` 전에 반드시 `git status`로 `.env*` 파일이 추적되지 않는지 확인.**
- **프로덕션 배포는 사용자 확인 후에만 실행.** `vercel --prod` 는 독단적으로 실행하지 않는다.
- **사용자 대신 Supabase/Vercel 계정 작업을 시도하지 않는다.** 브라우저가 필요한 작업은 사용자에게 단계별로 안내한다.

---

## References

필요할 때만 읽어들인다 (컨텍스트 절약):

- `references/interview-questions.md` — Phase 1 질문 템플릿 (한국어)
- `references/stack-decision.md` — 요구사항별 스택 결정 트리
- `references/section-templates.md` — 프로젝트 유형별 섹션 프리셋 (SaaS/포트폴리오/로컬 비즈니스 등)
- `references/design-principles.md` — 디자인 품질 가드레일, 안티패턴, 스타일/컬러/폰트 카탈로그
- `references/korean-copy.md` — 한국어 카피 프레임워크 (PAS/AIDA/BAB)
- `references/supabase-setup.md` — Supabase 연결, 스키마, RLS 체크리스트
- `references/payments-toss.md` — 토스페이먼츠 SDK 연동 (결제 요구시만)
- `references/vercel-deploy.md` — Vercel 배포 전체 절차와 환경변수 관리
