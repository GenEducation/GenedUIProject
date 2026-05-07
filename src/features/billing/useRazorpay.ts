"use client";

import { useState } from "react";
import { createOrder, verifyPayment } from "./paymentService";
import { useStudentStore } from "@/features/student/store/useStudentStore";

interface RazorpayOptions {
  userId: string;
  userName: string;
  userEmail?: string;
  billingCycle: "monthly" | "annual";
  onSuccess?: (expiresAt: string) => void;
  onError?: (error: string) => void;
}

export const useRazorpay = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const startPayment = async ({ 
    userId, 
    userName, 
    userEmail, 
    billingCycle, 
    onSuccess, 
    onError 
  }: RazorpayOptions) => {
    setIsProcessing(true);

    try {
      // 1. Create Order
      const order = await createOrder(userId, billingCycle);

      // 2. Open Razorpay Modal
      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "GenEd",
        description: `Pro — ${billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)}`,
        order_id: order.order_id,
        prefill: {
          name: userName,
          email: userEmail,
        },
        theme: {
          color: "#059F6D", // GenEd Green
        },
        handler: async (response: any) => {
          try {
            // 3. Verify Payment
            const result = await verifyPayment({
              user_id: userId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              billing_cycle: billingCycle,
            });

            // 4. Update localStorage
            localStorage.setItem("gened_auth_token", result.access_token);
            
            const profileStr = localStorage.getItem("gened_user_profile");
            if (profileStr) {
              const profile = JSON.parse(profileStr);
              profile.plan = "PRO";
              profile.plan_expires_at = result.plan_expires_at;
              localStorage.setItem("gened_user_profile", JSON.stringify(profile));
              
              // 5. Update Student Store
              const studentStore = useStudentStore.getState();
              studentStore.setStudentProfile({
                ...profile,
                plan: "PRO",
                plan_expires_at: result.plan_expires_at,
              });
              studentStore.setRateLimitHit(false);
            }

            onSuccess?.(result.plan_expires_at);
          } catch (err: any) {
            onError?.(err.message || "Verification failed");
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setIsProcessing(false);
      onError?.(err.message || "Failed to initiate payment");
    }
  };

  return { startPayment, isProcessing };
};
