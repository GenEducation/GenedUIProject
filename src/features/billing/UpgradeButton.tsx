"use client";

import React from "react";
import { useRazorpay } from "./useRazorpay";
import { Sparkles } from "lucide-react";

interface UpgradeButtonProps {
  userId: string;
  userName: string;
  userEmail?: string;
  billingCycle?: "monthly" | "annual";
  onSuccess?: (expiresAt: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export const UpgradeButton: React.FC<UpgradeButtonProps> = ({
  userId,
  userName,
  userEmail,
  billingCycle = "monthly",
  onSuccess,
  className = "",
  children,
}) => {
  const { startPayment, isProcessing } = useRazorpay();

  const handleUpgrade = () => {
    startPayment({
      userId,
      userName,
      userEmail,
      billingCycle,
      onSuccess,
      onError: (err) => alert(err),
    });
  };

  return (
    <button
      onClick={handleUpgrade}
      disabled={isProcessing}
      className={`relative inline-flex items-center gap-2 px-4 py-2 bg-[#D9F279] text-[#122D30] rounded-lg font-bold shadow-[0_8px_18px_-10px_rgb(184_214_63/0.9)] hover:bg-[#B8D63F] transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isProcessing ? (
        <div className="w-4 h-4 border-2 border-[#122D30]/30 border-t-[#122D30] rounded-full animate-spin" />
      ) : (
        <Sparkles size={16} />
      )}
      {children || "Upgrade to Pro"}
    </button>
  );
};

export default UpgradeButton;
