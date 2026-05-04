"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { requestPasswordReset } from "../authService";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await requestPasswordReset(email);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset link");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 rounded-2xl border border-[#042e5c]/10 bg-white/80 backdrop-blur-xl p-8 sm:p-10 shadow-[0_8px_40px_rgba(4,46,92,0.07)]">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[#042e5c] tracking-tight">Forgot Password</h2>
        <p className="text-sm text-[#042e5c]/60 font-medium">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      {isSuccess ? (
        <div className="space-y-6 py-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-4 text-emerald-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <p className="text-sm font-bold text-emerald-800 leading-relaxed">
              [MOCK] If an account with that email exists, a reset link has been sent.
            </p>
          </div>
          <Link
            href="/"
            className="block w-full text-center py-4 text-sm font-bold text-[#059F6D] hover:text-[#047a54] hover:underline transition-colors"
          >
            Back to Login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-[0.28em] text-[#042e5c]/45 mb-2.5 pl-0.5">
              Email Address
            </label>
            <input
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              placeholder="e.g. socrates@example.com"
              className="w-full rounded-xl border border-[#042e5c]/15 bg-white/70 px-5 py-3.5 text-sm text-[#0E1F2B] transition-all duration-200 placeholder:text-[#0E1F2B]/25 hover:border-[#059F6D]/40 focus:border-[#059F6D] focus:outline-none focus:ring-2 focus:ring-[#059F6D]/15"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700 animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          <div className="space-y-6 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !email}
              className="group relative w-full overflow-hidden rounded-xl bg-[#059F6D] py-4 text-sm font-bold text-white transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100 shadow-lg shadow-[#059F6D]/20 hover:shadow-xl hover:shadow-[#059F6D]/40"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isSubmitting ? "Sending Link…" : "Send Reset Link"}
              </span>
            </button>

            <div className="text-center">
              <Link
                href="/"
                className="text-sm font-bold text-[#059F6D] hover:text-[#047a54] hover:underline transition-colors"
              >
                Return to Sign In
              </Link>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
