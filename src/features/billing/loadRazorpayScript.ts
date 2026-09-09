// Razorpay's checkout script used to load from the root layout on every
// route (report card, chat, voice, auth) even though only payment flows
// need it. Load it lazily, once, shared across every feature that opens
// Razorpay checkout (billing upgrade, pre-order deposit).

/**
 * The slice of Razorpay's checkout API this app uses. The SDK is loaded from
 * a <script> tag and ships no types, so these mirror the options object and
 * handler payload documented at https://razorpay.com/docs/checkout/.
 */
export interface RazorpayHandlerResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler?: (response: RazorpayHandlerResponse) => void | Promise<void>;
  modal?: { ondismiss?: () => void };
}

export interface RazorpayInstance {
  open(): void;
}

export type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

/** The checkout constructor the script installs on `window`, once loaded. */
export function getRazorpay(): RazorpayConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay;
}

let razorpayScriptPromise: Promise<void> | null = null;

export function loadRazorpayScript(): Promise<void> {
  if (getRazorpay()) {
    return Promise.resolve();
  }
  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        razorpayScriptPromise = null;
        reject(new Error("Failed to load Razorpay checkout script"));
      };
      document.body.appendChild(script);
    });
  }
  return razorpayScriptPromise;
}
