// Razorpay's checkout script used to load from the root layout on every
// route (report card, chat, voice, auth) even though only payment flows
// need it. Load it lazily, once, shared across every feature that opens
// Razorpay checkout (billing upgrade, pre-order deposit).
let razorpayScriptPromise: Promise<void> | null = null;

export function loadRazorpayScript(): Promise<void> {
  if (typeof window !== "undefined" && (window as any).Razorpay) {
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
