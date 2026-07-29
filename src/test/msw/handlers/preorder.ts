import { http, HttpResponse } from "msw";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

/**
 * Default happy-path preorder handlers. Integration suites override specific
 * endpoints via server.use() to control error/status responses.
 */
export const preorderHandlers = [
  http.post(`${BASE}/preorders`, () =>
    HttpResponse.json({
      reference: "GENED-TEST01",
      razorpay_order_id: "order_test123",
      amount: 50000,
      currency: "INR",
      key_id: "rzp_test_key",
    }),
  ),
  http.post(`${BASE}/preorders/verify`, () =>
    HttpResponse.json({ ok: true, reference: "GENED-TEST01" }),
  ),
];
