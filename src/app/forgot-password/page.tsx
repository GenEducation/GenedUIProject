"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { requestPasswordReset, resetPassword } from "@/features/auth/authService";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Failed to send OTP code");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!otpCode || !newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }
    if (newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    setIsSubmitting(true);
    setError(null);
    try {
      await resetPassword({ email, otp_code: otpCode, new_password: newPassword });
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls = (hasError = false) =>
    `w-full rounded-xl border ${
      hasError ? "border-rose-400 bg-rose-50/30" : "border-[#042e5c]/15 bg-white/70"
    } px-5 py-3.5 text-sm text-[#0E1F2B] transition-all duration-200 placeholder:text-[#0E1F2B]/25 hover:border-[#059F6D]/40 focus:border-[#059F6D] focus:outline-none focus:ring-2 focus:ring-[#059F6D]/15`;

  const labelCls = "block text-[9px] font-bold uppercase tracking-[0.28em] text-[#042e5c]/45 mb-2.5 pl-0.5";

  return (
    <div className="min-h-screen bg-[#F7F9FB] flex flex-col">
      {/* Nav — centered logo */}
      <header className="w-full bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-center">
        <Link href="/">
          <Image src="/GenEd Logo Colored.svg" alt="GenEd" width={100} height={36} />
        </Link>
      </header>

      {/* Form */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#042E5C] mb-2">
              {isSuccess ? "Password Reset" : step === 1 ? "Forgot Password" : "Reset Password"}
            </h1>
            {!isSuccess && (
              <p className="text-gray-500 text-sm">
                {step === 1
                  ? "Enter your email and we'll send you a code."
                  : `Code sent to ${email}`}
              </p>
            )}
          </div>

          {isSuccess ? (
            <div className="space-y-8 rounded-2xl border border-[#042e5c]/10 bg-white/80 backdrop-blur-xl p-8 sm:p-10 shadow-[0_8px_40px_rgba(4,46,92,0.07)]">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-6 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-4 text-emerald-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-emerald-800 leading-relaxed">
                  Your password has been successfully reset!
                </p>
              </div>
              <Link
                href="/login"
                className="group relative w-full overflow-hidden rounded-xl bg-[#059F6D] py-4 text-sm font-bold text-white transition-all duration-300 flex items-center justify-center shadow-lg shadow-[#059F6D]/20 hover:shadow-xl hover:shadow-[#059F6D]/40"
              >
                Sign In with New Password
              </Link>
            </div>
          ) : (
            <form
              onSubmit={step === 1 ? handleRequestOtp : handleResetPassword}
              className="space-y-8 rounded-2xl border border-[#042e5c]/10 bg-white/80 backdrop-blur-xl p-8 sm:p-10 shadow-[0_8px_40px_rgba(4,46,92,0.07)]"
            >
              {/* Step dots */}
              <div className="flex gap-2 justify-center">
                {[1, 2].map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 w-8 rounded-full transition-all duration-300 ${s <= step ? "bg-[#059F6D]" : "bg-[#042e5c]/10"}`}
                  />
                ))}
              </div>

              <div className="space-y-6">
                {step === 1 ? (
                  <div>
                    <label className={labelCls}>Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(null); }}
                      placeholder="e.g. scholar@geneducation.ai"
                      className={inputCls()}
                    />
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <label className={labelCls}>OTP Code</label>
                      <input
                        type="text"
                        required
                        value={otpCode}
                        onChange={(e) => { setOtpCode(e.target.value); setError(null); }}
                        placeholder="6-digit code"
                        maxLength={6}
                        className={`${inputCls()} tracking-[0.5em] font-mono text-center`}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>New Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={newPassword}
                          onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                          placeholder="••••••••"
                          className={inputCls()}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#042e5c]/30 hover:text-[#059F6D] transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Confirm New Password</label>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                        placeholder="••••••••"
                        className={inputCls()}
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
                    {error}
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-2">
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    (step === 1 && !email) ||
                    (step === 2 && (!otpCode || !newPassword || !confirmPassword))
                  }
                  className="group relative w-full overflow-hidden rounded-xl bg-[#059F6D] py-4 text-sm font-bold text-white transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 shadow-lg shadow-[#059F6D]/20 hover:shadow-xl hover:shadow-[#059F6D]/40"
                >
                  {isSubmitting
                    ? step === 1 ? "Sending…" : "Updating Password…"
                    : step === 1 ? "Send OTP Code" : "Reset Password"}
                </button>

                <div className="flex flex-col items-center gap-3">
                  {step === 2 && (
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex items-center gap-2 text-sm font-semibold text-[#042e5c]/50 hover:text-[#042e5c] transition-colors"
                    >
                      <ArrowLeft size={15} /> Use different email
                    </button>
                  )}
                  <Link
                    href="/login"
                    className="text-sm font-semibold text-[#059F6D] hover:text-[#047a54] hover:underline transition-colors"
                  >
                    Return to Sign In
                  </Link>
                </div>
              </div>
            </form>
          )}
        </div>
      </main>

      <footer className="text-center text-xs text-gray-400 py-6">
        &copy; {new Date().getFullYear()} GenEd. All rights reserved.
      </footer>
    </div>
  );
}
