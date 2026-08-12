// Types for the GenEd Deskbot pre-order flow.

export type BuyerType = "parent" | "school" | "other";

/** Fields captured for a reservation. */
export interface PreorderFields {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  quantity: number;
  buyerType: BuyerType;
  hearAbout?: string;
  notes?: string;
  consent: boolean;
}

/** Response from `POST /preorders` — a Razorpay order awaiting payment. */
export interface PreorderOrder {
  reference: string;
  razorpay_order_id: string;
  amount: number;
  currency: string;
  key_id: string | null;
}

/** Payload sent to `POST /preorders/verify` after Razorpay checkout succeeds. */
export interface PreorderVerifyPayload {
  reference: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/** Response from `POST /preorders/verify`. */
export interface PreorderVerifyResult {
  ok: boolean;
  reference: string;
}

/** A product feature surfaced over the device as the user scrolls. */
export interface PreorderFeature {
  /** Two-digit index label, e.g. "01". */
  index: string;
  title: string;
  body: string;
}
