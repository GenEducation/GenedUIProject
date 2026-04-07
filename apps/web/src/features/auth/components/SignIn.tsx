"use client";

import { ChangeEvent, FormEvent } from "react";

interface SignInProps {
  loginData: {
    email: string;
    password: string;
  };
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSwitchToSignup: () => void;
  isSigningIn: boolean;
  error?: string;
}

export function SignIn({
  loginData,
  onChange,
  onSubmit,
  onSwitchToSignup,
  isSigningIn,
  error,
}: SignInProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-8 rounded-[2.5rem] border border-[#2D5540]/10 bg-[#F9F8F4] p-8 sm:p-10 shadow-xl shadow-[#0E1F2B]/5"
    >
      <div className="space-y-6">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#2D3E51]/60 mb-2.5 pl-1">
            Email Address
          </label>
          <input
            name="email"
            value={loginData.email}
            onChange={onChange}
            type="email"
            placeholder="curator@gened.edu"
            className="w-full rounded-2xl border border-[#2D5540]/15 bg-white px-5 py-3.5 text-sm text-[#0E1F2B] transition-all placeholder:text-[#0E1F2B]/30 hover:border-[#2D5540]/30 focus:border-[#2D5540] focus:outline-none focus:ring-4 focus:ring-[#2D5540]/10"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2.5 pl-1 pr-1">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2D3E51]/60">
              Password
            </label>
            <a
              href="#"
              className="text-xs font-bold text-[#2D5540] hover:text-[#1f3b2d] hover:underline transition-colors"
            >
              Forgot password?
            </a>
          </div>
          <input
            name="password"
            value={loginData.password}
            onChange={onChange}
            type="password"
            placeholder="••••••••"
            className="w-full rounded-2xl border border-[#2D5540]/15 bg-white px-5 py-3.5 text-sm text-[#0E1F2B] transition-all placeholder:text-[#0E1F2B]/30 hover:border-[#2D5540]/30 focus:border-[#2D5540] focus:outline-none focus:ring-4 focus:ring-[#2D5540]/10 font-mono tracking-widest"
          />
        </div>

        <div className="flex items-center gap-3 pl-1">
          <input
            id="remember"
            type="checkbox"
            className="h-4 w-4 rounded border-[#2D5540]/20 accent-[#2D5540] focus:ring-[#2D5540]/60 cursor-pointer transition-all"
          />
          <label
            htmlFor="remember"
            className="text-sm font-medium text-[#2D3E51]/70 cursor-pointer select-none"
          >
            Remember this session
          </label>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700 animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      ) : null}

      <div className="space-y-6 pt-2">
        <button
          type="submit"
          disabled={isSigningIn}
          className="w-full rounded-2xl bg-[#2D5540] py-4 text-sm font-bold text-white shadow-lg shadow-[#2D5540]/20 transition-all hover:bg-[#1f3b2d] hover:shadow-xl hover:shadow-[#2D5540]/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100"
        >
          {isSigningIn ? "Accessing archive..." : "Log in"}
        </button>

        <div className="text-center text-sm font-medium text-[#2D3E51]/60">
          Don’t have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="font-bold text-[#2D5540] hover:text-[#1f3b2d] hover:underline transition-colors"
          >
            Sign up
          </button>
        </div>
      </div>
    </form>
  );
}
