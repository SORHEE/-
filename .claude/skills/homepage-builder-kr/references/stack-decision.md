# Stack Decision Tree

인터뷰 답변 기반 스택 결정 가이드. **추천**까지만 하고 최종 선택은 사용자에게 맡긴다.

---

## 결정 트리

```
질문: 로그인/결제/대시보드/관리자 중 하나라도 필요?
├─ YES → Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
│         + Supabase Auth + RLS
│
└─ NO → 콘텐츠(블로그/문서)가 주력?
    ├─ YES → Astro + Tailwind + Supabase (폼/댓글만 동적)
    │
    └─ NO → 페이지 수가 5개 이하이고 순수 정보 전달?
        ├─ YES → 정적 HTML + Tailwind CDN + Supabase (문의 폼만)
        │
        └─ NO → Next.js 로 안전하게 간다
```

## 스택별 특징

### Next.js 15 (App Router) — 기본 추천
- **장점**: SSR/ISR/클라이언트 컴포넌트 혼용, Vercel과 완벽 궁합, Supabase SSR 공식 지원, 이미지 최적화 자동
- **단점**: 초기 학습 곡선, 정적 사이트엔 오버킬
- **언제**: 동적 기능 하나라도 있으면 기본 선택
- **세팅**: `npx create-next-app@latest --typescript --tailwind --app`
- **UI 라이브러리**: shadcn/ui (copy-paste 방식, 커스터마이징 자유)

### Astro
- **장점**: 기본 zero JS, MDX 지원, 콘텐츠 사이트에 최고, 빌드 빠름
- **단점**: 복잡한 상태 관리/실시간 기능엔 약함
- **언제**: 블로그, 문서 사이트, 회사 소개 + 최소한의 동적 요소
- **세팅**: `npm create astro@latest`

### 정적 HTML + Tailwind CDN
- **장점**: 초단순, 빌드 불필요, 수정 즉시 반영
- **단점**: 컴포넌트 재사용 어려움, 페이지 수 늘면 유지보수 지옥
- **언제**: 1~3페이지짜리 이벤트/캠페인 페이지
- **세팅**: `index.html` 하나 만들고 Tailwind CDN `<script>` 추가

---

## 반드시 포함되는 공통 요소 (스택 무관)

- **TypeScript** (정적 HTML 제외) — 타입 안정성
- **Tailwind CSS** — 유틸리티 우선, 빠른 반응형
- **Supabase** — DB/Auth/Storage (스택 무관하게 연결 가능)
- **Vercel** — 배포 (Astro/정적도 Vercel에 배포 가능)
- **한국어 폰트** — Pretendard 기본 (가변 폰트, 웹 최적화 잘 됨), 또는 Paperlogy, IBM Plex Sans KR

## 사용자에게 제시할 때 형식

```
요구사항을 바탕으로 **Next.js 15 + TypeScript + Tailwind + shadcn/ui**를 추천합니다.

이유:
1. 로그인 기능이 필요 → Supabase Auth와 Next.js SSR 조합이 가장 안전
2. 블로그 섹션이 있음 → MDX 또는 Supabase에서 콘텐츠 관리 가능
3. Vercel 배포에 최적화되어 있어 초기 비용 $0

대안:
- Astro: 블로그가 메인이고 로그인을 빼도 된다면 더 빠릅니다
- 정적 HTML: 전혀 맞지 않음 (로그인 요구사항 때문)

이대로 진행할까요? 아니면 다른 스택이 궁금하신가요?
```
