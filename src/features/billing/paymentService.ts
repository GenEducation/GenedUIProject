import { authFetch } from "@/utils/authFetch";

export interface OrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  billing_cycle: "monthly" | "annual";
  key_id: string;
}

export interface VerifyResponse {
  status: string;
  plan: string;
  plan_expires_at: string;
  access_token: string;
  token_type: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

export const createOrder = async (userId: string, billingCycle: "monthly" | "annual" = "monthly"): Promise<OrderResponse> => {
  const url = `${API_BASE_URL}/payments/create-order`;
  console.log("[PaymentService] Creating order at:", url);
  const response = await authFetch(url, {
    method: "POST",
    body: JSON.stringify({ user_id: userId, billing_cycle: billingCycle }),
  });
  
  if (!response.ok) {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to create order");
    }
    throw new Error(`Order creation failed (${response.status})`);
  }
  
  return response.json();
};

export const verifyPayment = async (data: {
  user_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  billing_cycle: "monthly" | "annual";
}): Promise<VerifyResponse> => {
  const response = await authFetch(`${API_BASE_URL}/payments/verify-payment`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const error = await response.json();
      throw new Error(error.detail || "Payment verification failed");
    }
    throw new Error(`Payment verification failed (${response.status})`);
  }
  
  return response.json();
};
