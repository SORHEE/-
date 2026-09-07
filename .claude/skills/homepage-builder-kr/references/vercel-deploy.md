# Vercel 배포 가이드

Next.js/Astro/정적 사이트 모두 동일한 흐름. 사용자 계정 작업은 절대 대신하지 않고 **단계별로 안내**만 한다.

---

## 두 가지 배포 방식

### A. GitHub 연동 (권장)
- 장점: 자동 배포, Preview 환경, 팀 협업 쉬움
- 과정: GitHub 레포 → Vercel import → 자동 빌드

### B. Vercel CLI 직접 배포
- 장점: GitHub 없이 빠르게 시작
- 과정: `vercel` 명령으로 로컬에서 바로 배포

사용자에게 선택하게 한다. GitHub 계정이 이미 있으면 A 권장.

---

## A. GitHub 연동 방식

### 1. GitHub 레포 생성
```bash
cd my-site
git init
git add .
git commit -m "init: homepage scaffolding"
gh repo create my-site --private --source=. --push
```

### 2. Vercel 가져오기 (사용자 수행)
1. https://vercel.com/new 접속
2. "Import Git Repository" → 해당 레포 선택
3. Framework Preset은 자동 감지됨 (Next.js/Astro 등)
4. **Environment Variables** 섹션 펼치기
5. `.env.local`의 키를 모두 추가:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (있으면)
6. "Deploy" 클릭
7. 1~2분 후 배포 URL 수령 (`xxx.vercel.app`)

### 이후 배포
- `main` 브랜치에 push → 자동 Production 배포
- 다른 브랜치/PR → 자동 Preview 배포

---

## B. Vercel CLI 방식

### 1. CLI 설치 및 로그인
```bash
npm i -g vercel
vercel login
```
→ 이메일/GitHub 선택, 사용자가 브라우저에서 인증

### 2. 프로젝트 연결
```bash
cd my-site
vercel link
```
프롬프트에 따라 기존 프로젝트에 연결하거나 새로 생성.

### 3. 환경변수 등록
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
vercel env add NEXT_PUBLIC_SUPABASE_URL development

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY development

# 서버 전용 (있는 경우)
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```
각 명령에서 값 입력 프롬프트가 나옴.

### 4. 로컬에 환경변수 pull (선택)
```bash
vercel env pull .env.local
```

### 5. 배포
```bash
vercel          # Preview 배포 (테스트용)
vercel --prod   # Production 배포 (사용자 최종 확인 후)
```

**중요**: `vercel --prod`는 독단적으로 실행하지 않고 반드시 사용자 확인 후 실행.

---

## 커스텀 도메인 연결

1. Vercel Dashboard → 프로젝트 → Settings → Domains
2. 도메인 입력 → "Add"
3. Vercel이 표시하는 DNS 레코드를 도메인 등록처(가비아/후이즈 등)에 추가:
   - **A 레코드**: `76.76.21.21`
   - 또는 **CNAME**: `cname.vercel-dns.com`
4. DNS 전파 대기 (몇 분~몇 시간)
5. SSL 자동 발급 확인

---

## 배포 전 체크리스트

- [ ] `.env.local`이 `.gitignore`에 포함되어 있는가?
- [ ] `npm run build`가 로컬에서 성공하는가?
- [ ] 하드코딩된 API 키/URL이 없는가? (grep으로 확인)
- [ ] `next.config.js`의 `images.remotePatterns`에 외부 이미지 도메인이 등록되었는가?
- [ ] Supabase URL을 Authentication → URL Configuration의 **Site URL**과 **Redirect URLs**에 추가했는가?
  - `https://your-domain.vercel.app`
  - 커스텀 도메인이 있으면 그것도
- [ ] robots.txt, sitemap.xml이 있는가?
- [ ] favicon, og:image가 있는가?

---

## 배포 후 체크리스트

- [ ] 배포 URL 정상 접속
- [ ] 각 섹션 렌더링 확인
- [ ] 폼 제출 → Supabase 테이블에 데이터 저장되는지 확인
- [ ] 로그인 기능 (있는 경우) 테스트
- [ ] RLS 재확인: 브라우저 콘솔에서 anon 키로 직접 DB 접근 시도해봐도 막히는지
- [ ] Lighthouse 실행 (Chrome DevTools → Lighthouse → Mobile)
  - Performance 90+
  - Accessibility 95+
  - Best Practices 100
  - SEO 100
- [ ] 실기기 확인: 본인 모바일에서 접속
- [ ] Vercel Analytics 활성화 제안 (무료 티어 충분)

---

## 자주 발생하는 이슈

- **빌드 실패: "Module not found"** → `package.json`에 의존성 누락. 로컬에서 `npm install` 후 커밋.
- **빌드 성공했지만 500 에러** → 환경변수 누락. Vercel Dashboard → Settings → Environment Variables 확인.
- **이미지가 안 뜸** → `next.config.js`의 `images.remotePatterns` 설정 누락.
- **Supabase 연결 실패** → Site URL이 Vercel 도메인과 다름. Supabase Dashboard에서 수정.
- **로그인 리다이렉트 루프** → Redirect URL에 Vercel URL 추가 필요.

---

## 롤백

문제가 생기면 Vercel Dashboard → Deployments → 이전 성공 배포 → "Promote to Production". 즉시 롤백 가능.
