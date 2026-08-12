import { publicFetch } from "@/utils/publicFetch";
import type {
  PreorderFields,
  PreorderOrder,
  PreorderVerifyPayload,
  PreorderVerifyResult,
} from "../types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

/**
 * Create a Deskbot pre-order reservation and its Razorpay deposit order.
 * Public/anonymous endpoint — uses `publicFetch`, not `authFetch`.
 */
export async function createPreorder(fields: PreorderFields): Promise<PreorderOrder> {
  const res = await publicFetch(`${BASE_URL}/preorders`, {
    method: "POST",
    body: JSON.stringify({
      full_name: fields.fullName,
      email: fields.email,
      phone: fields.phone,
      city: fields.city,
      country: fields.country,
      quantity: fields.quantity,
      buyer_type: fields.buyerType,
      heard_about: fields.hearAbout || null,
      notes: fields.notes || null,
      consent: fields.consent,
    }),
  });
  return res.json();
}

/**
 * Verify a completed Razorpay checkout for a pre-order deposit. Public/
 * anonymous endpoint — uses `publicFetch`, not `authFetch`.
 */
export async function verifyPreorder(
  payload: PreorderVerifyPayload,
): Promise<PreorderVerifyResult> {
  const res = await publicFetch(`${BASE_URL}/preorders/verify`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}
