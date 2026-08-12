# Pre-order Frontend Handoff — wire up the ₹500 deposit flow

**Status:** Backend is implemented, tested, and merged-ready on the `MVP` repo
(branch `feat/preorder-deposit-endpoint`, off `main`). Full design context:
`MVP/docs/PREORDER_IMPLEMENTATION_PLAN.md`.

**Not done:** the frontend. This doc is the handoff — everything needed to
finish it, in one place, without re-deriving the backend contract.

**Branch:** none created here (frontend repo was left on `dev`, untouched,
per instruction). Cut your own feature branch off `dev` when you start —
`main` in this repo predates the pre-order page entirely.

---

## 1. What changes, in one sentence

`src/features/preorder/services/preorderService.ts` currently **stubs**
submission (console.log + fake reference, see the file's own `TODO(backend)`
comment). Replace it with real calls to the three endpoints below, and wire
Razorpay checkout into `PreorderModal.tsx` — reusing the pattern already in
this repo for the PRO-plan upgrade (`src/features/billing/useRazorpay.ts` +
`paymentService.ts`).

## 2. The backend contract (auth-service, proxied through the gateway)

All three live in `auth-service`. `POST /preorders` and `POST /preorders/verify`
are **public** (no JWT — gateway `_PUBLIC_PREFIXES` covers `/preorders`).
**Use plain `fetch`, not `authFetch`** — same reasoning the existing stub
already documents: this is anonymous at submit time, and `authFetch` attaches
an `Authorization` header and does session-expiry redirects that don't apply.

### `POST /preorders`

Request:
```ts
{
  full_name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  quantity: number;       // 1-100, default 1
  buyer_type: "parent" | "school" | "other";
  heard_about?: string;
  notes?: string;
  consent: boolean;       // must be true — server rejects false
}
```

Response:
```ts
{
  reference: string;          // "GENED-XXXXXX"
  razorpay_order_id: string;
  amount: number;              // paise — currently always 50000 (₹500)
  currency: string;            // "INR"
  key_id: string | null;       // Razorpay publishable key for checkout
}
```

### `POST /preorders/verify`

Called after the Razorpay checkout modal's `handler` callback fires.

Request:
```ts
{
  reference: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
```

Response:
```ts
{ ok: boolean; reference: string; }
```

On success, the backend has: verified the HMAC, created (or reused, if the
email already has a GenEd account) a `PROSPECT` user, marked the deposit
paid, and sent a confirmation email. **No token is returned** — the buyer
is not logged in by this call. See §5 for how they sign in later.

### `GET /preorders/mine` (optional for this pass)

Requires `Authorization: Bearer <jwt>` (this one goes through `authFetch`).
Returns the signed-in user's own pre-orders:
```ts
Array<{
  reference: string; status: string; full_name: string; email: string;
  quantity: number; deposit_amount_paise: number; currency: string;
  created_at: string; updated_at: string;
}>
```
Only relevant if/when there's a "my pre-orders" view in a signed-in
dashboard. Not required to ship the reserve-and-pay flow — skip it for now
unless you're also building that view.

### Errors

Same `ApiError` shape `src/utils/authFetch.ts` already models
(`status`, `error_code`, `message`, `request_id`, `retryable`, `retry_after`,
`details`). Pre-order-specific codes are prefixed `PREORD_*`:

| Code | Meaning |
|---|---|
| `PREORD_1101` | Validation failure (bad field) |
| `PREORD_1102` | Reference not found |
| `PREORD_1103` | Conflict — e.g. already paid, or not in a refundable state |
| `PREORD_1201` | Payment signature verification failed |
| `PREORD_1202` / `PREORD_1203` | Razorpay temporarily unavailable / refund failed |

## 3. Reuse this exact pattern (don't reinvent)

`src/features/billing/useRazorpay.ts` + `paymentService.ts` already do
create-order → open Razorpay modal → verify → handle success/error, for the
PRO-plan upgrade. The Razorpay checkout script is **already loaded globally**
in `src/app/layout.tsx` (`https://checkout.razorpay.com/v1/checkout.js`) —
no new `<script>` tag needed.

Mirror that shape for pre-order:
1. `preorderService.ts`: `createPreorder(fields)` → `POST /preorders`;
   `verifyPreorder(payload)` → `POST /preorders/verify`. Both plain `fetch`
   (see §2). Replace the whole stub body — the file's existing
   `TODO(backend)` comment shows the exact snake_case field mapping and
   already matches this contract.
2. `PreorderModal.tsx` (`handleSubmit`): call `createPreorder(data)` →
   open `new (window as any).Razorpay({...})` with `key: order.key_id`,
   `amount: order.amount`, `order_id: order.razorpay_order_id`, prefill
   name/email from the form → in the `handler` callback, call
   `verifyPreorder({...})` with the values Razorpay returns → on success,
   show `SuccessView` with the **backend's** `reference` (not the current
   client-fabricated one).
3. Distinguish error states in the `catch` (currently everything collapses
   into "Something went wrong" — see `PreorderModal.tsx`'s existing
   `catch { setErrors({ form: ... }) }`): a `PREORD_1103` conflict reads
   differently to the user than a `PREORD_1201` signature failure.

## 4. Flag to the page owner before shipping (not this doc's call)

The live copy on `/pre-order` says **"No payment now"**, **"Reserve free.
Pay only when it's ready to ship"**, and the modal subtext says **"No
payment is taken now."** (`src/app/pre-order/page.tsx`,
`PreorderModal.tsx`). Payment is now **mandatory** (₹500 deposit) on the
backend. This copy contradicts the real flow and needs to change — but the
wording/framing is the page owner's decision, not prescribed here.

## 5. How the buyer signs in afterward

A `PROSPECT` account is created with a **random password the buyer doesn't
know**. No new passwordless mechanism was built — the confirmation email
tells them to use the existing **`/forgot-password` → OTP → `/reset-password`
→ `/login`** flow with the email they used to pre-order. Nothing new to
build here; just don't be surprised the account has no usable password yet.

## 6. Tests

`src/features/preorder` currently has **zero tests**. Add an MSW handler at
`src/test/msw/handlers/preorder.ts` (mirror the existing `auth.ts` /
`parent.ts` handlers) for `POST /preorders` and `POST /preorders/verify`,
and at least one integration test covering: submit → Razorpay `handler`
fires → verify succeeds → success view shows the backend reference.
