// Types for the GenEd Deskbot pre-order flow.

export type BuyerType = "parent" | "school" | "other";

/** Fields captured for a reservation (no payment). */
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

/** Result returned by the (stubbed) submission service. */
export interface PreorderResult {
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
