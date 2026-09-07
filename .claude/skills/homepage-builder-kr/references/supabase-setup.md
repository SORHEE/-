# Supabase 연결 가이드

Next.js 15 (App Router) + Supabase SSR 기준. 다른 스택은 맨 아래 참고.

---

## 1. 프로젝트 생성 (사용자 직접 수행)

사용자에게 다음을 안내:

1. https://supabase.com/dashboard 접속 (GitHub 로그인 가능)
2. "New project" 클릭
3. 입력:
   - **Name**: 프로젝트명 (영어)
   - **Database Password**: 강력한 비밀번호 생성 후 **안전한 곳에 보관**
   - **Region**: `Northeast Asia (Seoul)` 선택 (한국 서비스 시 필수)
   - **Pricing Plan**: Free로 시작
4. 2~3분 대기 (프로비저닝)
5. 완료되면 **Project Settings → API** 이동

### 받아올 값
- `Project URL`: `https://xxx.supabase.co`
- `anon public` key: `eyJ...` (클라이언트에서 사용 가능, 공개되어도 RLS로 보호)
- `service_role` key: `eyJ...` **절대 클라이언트 코드에 노출 금지**

---

## 2. 환경변수 설정

`.env.local` (프로젝트 루트):
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # 서버 전용, 주의
```

`.gitignore`에 `.env*.local` 포함 확인 (Next.js 기본 포함됨).

---

## 3. 패키지 설치

```bash
npm install @supabase/supabase-js @supabase/ssr
```

---

## 4. 클라이언트 생성

### `lib/supabase/client.ts` (브라우저용)
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### `lib/supabase/server.ts` (서버 컴포넌트/Route Handler용)
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch { /* Server Component에서 set 호출 시 무시 */ }
        },
      },
    }
  )
}
```

### `middleware.ts` (인증 세션 갱신, 루트)
```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  await supabase.auth.getUser()
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

---

## 5. 스키마 작성

요구사항에 맞춰 SQL을 생성하고 **Supabase Dashboard → SQL Editor**에서 실행하도록 안내한다.

### 예시: 문의 폼 테이블
```sql
-- 1. 테이블 생성
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz default now()
);

-- 2. RLS 활성화 (반드시!)
alter table public.contacts enable row level security;

-- 3. 익명 사용자가 INSERT만 가능
create policy "anyone can insert contact"
  on public.contacts for insert
  to anon
  with check (true);

-- 4. SELECT/UPDATE/DELETE는 기본 거부 (정책 없음 = 거부)
-- 관리자 조회는 service_role 키로 서버에서만
```

### 예시: 사용자 프로필 (auth.users 확장)
```sql
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique,
  avatar_url text,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles are viewable by everyone"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);
```

---

## 6. RLS 체크리스트 (필수)

- [ ] 모든 public 테이블에 `enable row level security` 실행했는가?
- [ ] 익명 사용자(anon)에게 필요한 최소 권한만 부여했는가?
- [ ] service_role 키를 클라이언트 번들에 포함시키지 않았는가? (`NEXT_PUBLIC_` 접두사 금지)
- [ ] SELECT 정책이 민감 필드(이메일/전화)를 노출하지 않는가?
- [ ] `auth.uid() = user_id` 같은 소유자 체크가 들어갔는가?
- [ ] 실제로 anon 키로 브라우저에서 테스트해봤는가?

---

## 7. 인증 (선택)

이메일/비밀번호는 기본 활성화. 소셜 로그인은 **Dashboard → Authentication → Providers**에서 개별 설정 (Google, GitHub, Kakao 등).

카카오 로그인은 한국 서비스에 매우 선호됨. 설정 방법:
1. Kakao Developers에서 앱 생성
2. Redirect URI: `https://xxx.supabase.co/auth/v1/callback`
3. Supabase Dashboard에서 Client ID/Secret 입력

---

## 8. Storage (파일 업로드)

```sql
-- 버킷 생성은 Dashboard → Storage에서 GUI로
-- 정책은 SQL로:
create policy "public can view avatars"
  on storage.objects for select
  to anon
  using (bucket_id = 'avatars');

create policy "authenticated can upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
```

---

## 다른 스택의 경우

- **Astro**: `@supabase/supabase-js`만 써도 충분. SSR 세션이 필요하면 `@supabase/ssr` 사용.
- **정적 HTML**: CDN으로 `@supabase/supabase-js` 로드, anon 키만 사용, RLS에 전적으로 의존.

---

## 자주 발생하는 이슈

- **"new row violates row-level security policy"** → RLS 정책이 없거나 조건이 맞지 않음. Dashboard에서 정책 확인.
- **세션이 유지되지 않음** → `middleware.ts`가 없거나 matcher 설정 오류.
- **환경변수 undefined** → `NEXT_PUBLIC_` 접두사 확인, 개발 서버 재시작.
- **service_role 키 노출 사고** → 즉시 Dashboard에서 키 재발급, `.env.local` 수정, Vercel 환경변수 업데이트.
