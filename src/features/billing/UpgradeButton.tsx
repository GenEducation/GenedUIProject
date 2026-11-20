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
      className={`relative inline-flex items-center gap-2 px-4 py-2 bg-[#A6CF08] text-[#1D6315] rounded-lg font-bold shadow-[0_8px_18px_-10px_rgb(184_214_63/0.9)] hover:bg-[#8DB000] transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isProcessing ? (
        <div className="w-4 h-4 border-2 border-[#1D6315]/30 border-t-[#1D6315] rounded-full animate-spin" />
      ) : (
        <Sparkles size={16} />
      )}
      {children || "Upgrade to Pro"}
    </button>
  );
};

export default UpgradeButton;
