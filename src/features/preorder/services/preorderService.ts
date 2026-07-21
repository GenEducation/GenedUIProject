import type { PreorderFields, PreorderResult } from "../types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

/**
 * Submit a Deskbot pre-order reservation.
 *
 * TODO(backend): once the API exposes a pre-order endpoint, replace the stub
 * body with a real call, e.g.:
 *
 *   const res = await fetch(`${BASE_URL}/preorders`, {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json", accept: "application/json" },
 *     body: JSON.stringify({
 *       full_name: fields.fullName,
 *       email: fields.email,
 *       phone: fields.phone,
 *       city: fields.city,
 *       country: fields.country,
 *       quantity: fields.quantity,
 *       buyer_type: fields.buyerType,
 *       heard_about: fields.hearAbout ?? null,
 *       notes: fields.notes ?? null,
 *       consent: fields.consent,
 *     }),
 *   });
 *   if (!res.ok) throw new Error(`Pre-order failed: ${res.status}`);
 *   return res.json();
 *
 * This is a public/anonymous endpoint, so it uses plain `fetch` (no authFetch).
 */
export async function submitPreorder(fields: PreorderFields): Promise<PreorderResult> {
  console.log("[preorder] submission (stub — no backend yet):", { BASE_URL, fields });

  // Simulate network latency so the submitting state is visible.
  await new Promise((resolve) => setTimeout(resolve, 900));

  return {
    ok: true,
    reference: `GENED-${Date.now().toString(36).toUpperCase()}`,
  };
}
