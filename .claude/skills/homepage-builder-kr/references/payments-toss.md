# 토스페이먼츠 SDK 연동 가이드

결제 기능이 요구된 프로젝트에만 적용. Next.js (App Router) + TypeScript 기준.

**핵심 원칙**: 결제 요구 시 반드시 토스페이먼츠 고정. 다른 PG(Stripe/이니시스/카카오페이 단독 등) 제안 금지.

**사전 조건**: 이 가이드는 Phase 3의 Next.js 스캐폴딩과 Phase 4의 Supabase 설정이 먼저 완료되어 있다고 가정한다. `app/api/orders/create` 같은 주문 생성 엔드포인트와 `orders` 테이블이 존재해야 결제 플로우가 완결된다.

---

## 1. 설치

```bash
npm install @tosspayments/payment-sdk
```

---

## 2. 환경변수 설정

### 개발 환경 (`.env.local`)

토스 공식 공개 테스트 키를 기본값으로 사용한다. 실제 서비스 전환 시 사용자가 본인 키로 교체.

```
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq
TOSS_SECRET_KEY=test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R
```

### 운영 전환 안내 (사용자에게 전달)

1. https://developers.tosspayments.com 접속
2. 가입 후 상점 등록 (사업자등록증 필요)
3. 상점 관리 → API 키에서 **라이브 키** 발급
4. Vercel 환경변수에 덮어쓰기:
   - `NEXT_PUBLIC_TOSS_CLIENT_KEY` → `live_ck_...`
   - `TOSS_SECRET_KEY` → `live_sk_...`
5. 반드시 **테스트 환경에서 결제 플로우 전체 검증 후**에 라이브 전환

---

## 3. 결제창 호출 (클라이언트 컴포넌트)

`app/checkout/page.tsx` 또는 전용 클라이언트 컴포넌트에서:

```typescript
"use client";

import { loadTossPayments } from "@tosspayments/payment-sdk";

async function handlePayment() {
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!;
  const tossPayments = await loadTossPayments(clientKey);

  await tossPayments.requestPayment("카드", {
    amount: 50000,                              // 결제 금액
    orderId: `ORDER-${Date.now()}-${crypto.randomUUID().slice(0,8)}`,
    orderName: "상품명 (여러 건이면 '외 N건')",
    customerName: "홍길동",
    customerEmail: "customer@example.com",
    successUrl: `${window.location.origin}/checkout/success`,
    failUrl: `${window.location.origin}/checkout/fail`,
  });
}
```

**필수 파라미터**:
- `amount` — 원화 기준 정수 (100원 미만 금액 불가)
- `orderId` — 상점 고유 주문번호. 재사용 금지. 6~64자.
- `orderName` — 결제창에 표시될 주문명. 상품 여러 건이면 `"첫 상품 외 N건"` 형식
- `successUrl` / `failUrl` — 결제 완료/실패 후 리다이렉트 URL

---

## 4. 서버 결제 승인 API

`successUrl`로 리다이렉트되면 쿼리스트링으로 `paymentKey`, `orderId`, `amount`가 전달됨. 이 값으로 서버에서 **토스 승인 API를 호출해야** 결제가 실제 완료됨.

### `app/api/payments/confirm/route.ts`

```typescript
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { paymentKey, orderId, amount } = await request.json();

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json({ error: "INVALID_PARAMS" }, { status: 400 });
    }

    // 서버에서만 사용 (클라이언트 노출 금지)
    const secretKey = process.env.TOSS_SECRET_KEY!;
    const encryptedKey =
      "Basic " + Buffer.from(secretKey + ":").toString("base64");

    const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: encryptedKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    // TODO: Supabase orders 테이블 상태 'paid'로 업데이트
    // const supabase = await createClient();
    // await supabase.from("orders")
    //   .update({ status: "paid", toss_payment_key: paymentKey })
    //   .eq("order_number", orderId);

    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
```

---

## 5. Success / Fail 페이지

### `app/checkout/success/page.tsx` (서버 컴포넌트 + 클라이언트 확정 조합)

서버 컴포넌트에서 쿼리스트링을 읽어 클라이언트 컴포넌트로 전달한다. 클라이언트 컴포넌트가 `/api/payments/confirm`을 호출해 승인을 완료한다.

```tsx
// app/checkout/success/page.tsx (Server Component)
import { ConfirmPayment } from "./confirm-payment";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    paymentKey?: string;
    orderId?: string;
    amount?: string;
  }>;
}) {
  const { paymentKey, orderId, amount } = await searchParams;

  if (!paymentKey || !orderId || !amount) {
    return (
      <div className="mx-auto max-w-2xl p-16 text-center">
        <h1 className="text-3xl mb-4">잘못된 접근입니다</h1>
        <p>결제 정보가 누락되었습니다.</p>
      </div>
    );
  }

  return (
    <ConfirmPayment
      paymentKey={paymentKey}
      orderId={orderId}
      amount={Number(amount)}
    />
  );
}
```

```tsx
// app/checkout/success/confirm-payment.tsx (Client Component)
"use client";

import { useEffect, useState } from "react";

type Status = "loading" | "success" | "fail";

export function ConfirmPayment({
  paymentKey,
  orderId,
  amount,
}: {
  paymentKey: string;
  orderId: string;
  amount: number;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function confirm() {
      try {
        const res = await fetch("/api/payments/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentKey, orderId, amount }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (!cancelled) {
            setError(data.message ?? "결제 승인 실패");
            setStatus("fail");
          }
          return;
        }
        if (!cancelled) setStatus("success");
      } catch (err) {
        if (!cancelled) {
          setError("네트워크 오류가 발생했습니다");
          setStatus("fail");
        }
      }
    }

    confirm();
    return () => {
      cancelled = true;
    };
  }, [paymentKey, orderId, amount]);

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-2xl p-16 text-center">
        <h1 className="text-3xl mb-4">결제 승인 중...</h1>
        <p>잠시만 기다려주세요</p>
      </div>
    );
  }

  if (status === "fail") {
    return (
      <div className="mx-auto max-w-2xl p-16 text-center">
        <h1 className="text-3xl mb-4">결제 승인에 실패했습니다</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-16 text-center">
      <h1 className="text-3xl mb-4">주문이 완료되었습니다</h1>
      <p className="text-sm mb-2">주문번호: {orderId}</p>
      <p className="text-sm">결제금액: {amount.toLocaleString("ko-KR")}원</p>
    </div>
  );
}
```

**주의**: useEffect가 React 18+ Strict Mode에서 두 번 실행될 수 있다. 서버 측 `/api/payments/confirm`은 **멱등성**을 보장해야 한다 (같은 paymentKey로 중복 요청 시 첫 번째만 성공, 두 번째는 기존 주문 상태 반환). 토스 API 자체가 동일한 `paymentKey`로의 중복 승인을 거부하므로 대부분 괜찮지만, DB 업데이트는 반드시 "이미 paid면 스킵" 로직을 포함한다.

### `app/checkout/fail/page.tsx`

```typescript
export default async function FailPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; message?: string }>;
}) {
  const { code, message } = await searchParams;
  return (
    <div>
      <h1>결제가 완료되지 못했습니다</h1>
      <p>{message ?? "다시 시도해주세요"}</p>
      {code && <p>에러 코드: {code}</p>}
    </div>
  );
}
```

---

## 6. Supabase 주문 테이블 연동

`orders` 테이블은 다음 필드를 반드시 포함:

```sql
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,  -- Toss orderId와 일치
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  shipping_address text not null,
  postcode text not null,
  total_amount integer not null,      -- 원화 정수
  status text not null default 'pending',  -- pending/paid/shipped/delivered/cancelled/failed
  toss_payment_key text,              -- 승인 후 저장
  toss_order_id text,
  created_at timestamptz default now()
);

alter table public.orders enable row level security;

-- 익명 사용자가 주문 생성 가능
create policy "anyone can create order"
  on public.orders for insert
  to anon
  with check (true);

-- 주문 조회는 order_number를 알고 있어야만 가능하도록 UX 설계
create policy "read order by number"
  on public.orders for select
  to anon
  using (true);
```

---

## 7. 결제 플로우 전체 순서

```
1. 사용자가 "결제하기" 버튼 클릭
       ↓
2. 서버 /api/orders/create 호출 → Supabase에 orders INSERT (status: 'pending')
       ↓
3. 응답받은 orderId / orderName으로 tossPayments.requestPayment() 호출
       ↓
4. 토스 결제창에서 사용자가 카드 정보 입력 및 인증
       ↓
5. 성공 → successUrl로 paymentKey/orderId/amount 쿼리스트링 리다이렉트
       ↓
6. Success 페이지에서 /api/payments/confirm 호출
       ↓
7. 서버가 토스 승인 API 호출
       ↓
8. 승인 성공 → Supabase orders 테이블 status 'paid'로 업데이트
       ↓
9. 사용자에게 주문 완료 화면 표시
```

---

## 8. 결제 수단 확장

기본은 `"카드"`. 다른 수단이 필요하면:

```typescript
await tossPayments.requestPayment("계좌이체", { ... });
await tossPayments.requestPayment("가상계좌", { ... });
await tossPayments.requestPayment("휴대폰", { ... });
await tossPayments.requestPayment("간편결제", { ... });  // 카카오페이, 네이버페이 등
```

**추천 UX**: 결제 수단 선택 UI를 제공하고 선택값으로 `requestPayment()` 첫 번째 인자를 바꾼다.

---

## 9. 체크리스트 (배포 전 필수)

- [ ] `.env.local`에 테스트 키가 올바르게 들어있는가?
- [ ] `TOSS_SECRET_KEY`가 클라이언트 번들에 포함되지 않는가? (`NEXT_PUBLIC_` 접두사 금지)
- [ ] 주문 생성 → 결제창 → 승인 → 주문 상태 업데이트 전체 플로우를 테스트 카드로 완주했는가?
- [ ] 결제 실패 케이스 테스트 (사용자 취소, 카드 한도 초과)
- [ ] Supabase `orders` 테이블에 실제로 레코드가 남는가?
- [ ] RLS 정책이 적용된 상태에서도 insert/select가 정상 동작하는가?
- [ ] Vercel 환경변수에도 동일한 키가 등록되어 있는가?
- [ ] 운영 전환 전에 **라이브 키로 소액 실결제 테스트** 1건 완료했는가?

---

## 10. 자주 발생하는 이슈

- **"올바르지 않은 요청입니다"** — `amount`가 결제창 호출 시와 승인 API 호출 시 **동일하지 않음**. 반드시 같은 값 전달.
- **CORS 에러** — 토스 SDK는 CORS 문제 없음. 만약 발생하면 서버 승인 API에서 fetch 실수가 있는지 확인.
- **`orderId` 중복 에러** — 같은 `orderId`를 두 번 사용. `ORDER-${Date.now()}-${random}` 같이 유니크하게 생성.
- **TOSS_SECRET_KEY undefined** — Vercel 환경변수 등록 후 재배포 필요.

---

## 참고 링크

- 공식 개발자 센터: https://developers.tosspayments.com
- SDK 문서: https://docs.tosspayments.com/sdk/v1/js
- 테스트 카드 번호: https://docs.tosspayments.com/reference/test-code
