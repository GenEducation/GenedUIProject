"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";

interface SignInProps {
  loginData: {
    username: string;
    password: string;
  };
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSwitchToSignup: () => void;
  isSigningIn: boolean;
  errors: Record<string, string>;
}

export function SignIn({
  loginData,
  onChange,
  onSubmit,
  onSwitchToSignup,
  isSigningIn,
  errors,
}: SignInProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-8 rounded-[2.5rem] border border-[#2D5540]/10 bg-[#F9F8F4] p-8 sm:p-10 shadow-xl shadow-[#0E1F2B]/5"
    >
      <div className="space-y-6">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#2D3E51]/60 mb-2.5 pl-1">
            Username
          </label>
          <input
            name="username"
            value={loginData.username}
            onChange={onChange}
            type="text"
            placeholder="Enter your username"
            className={`w-full rounded-2xl border ${errors.username ? 'border-rose-500' : 'border-[#2D5540]/15'} bg-white px-5 py-3.5 text-sm text-[#0E1F2B] transition-all placeholder:text-[#0E1F2B]/30 hover:border-[#2D5540]/30 focus:border-[#2D5540] focus:outline-none focus:ring-4 focus:ring-[#2D5540]/10`}
          />
          {errors.username && <p className="text-rose-500 text-[10px] font-bold mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1">{errors.username}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2.5 pl-1 pr-1">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2D3E51]/60">
              Password
            </label>
            <a
              href="#"
              className="text-xs font-bold text-[#042e5c] hover:text-[#0a4a8f] hover:underline transition-colors"
            >
              Forgot password?
            </a>
          </div>
          <div className="relative">
            <input
              name="password"
              value={loginData.password}
              onChange={onChange}
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className={`w-full rounded-2xl border ${errors.password ? 'border-rose-500' : 'border-[#2D5540]/15'} bg-white px-5 py-3.5 text-sm text-[#0E1F2B] transition-all placeholder:text-[#0E1F2B]/30 hover:border-[#2D5540]/30 focus:border-[#2D5540] focus:outline-none focus:ring-4 focus:ring-[#2D5540]/10 font-mono tracking-widest`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#2D5540]/40 hover:text-[#2D5540] transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && <p className="text-rose-500 text-[10px] font-bold mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1">{errors.password}</p>}
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

      {errors.root ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700 animate-in fade-in slide-in-from-top-2">
          {errors.root}
        </div>
      ) : null}

      <div className="space-y-6 pt-2">
        <button
          type="submit"
          disabled={isSigningIn}
          className="w-full rounded-2xl bg-[#042e5c] py-4 text-sm font-bold text-white shadow-lg shadow-[#2D5540]/20 transition-all hover:bg-[#0a4a8f] hover:shadow-xl hover:shadow-[#2D5540]/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100"
        >
          {isSigningIn ? "Accessing archive..." : "Log in"}
        </button>

        <div className="text-center text-sm font-medium text-[#2D3E51]/60">
          Don’t have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="font-bold text-[#042e5c] hover:text-[#0a4a8f] hover:underline transition-colors"
          >
            Sign up
          </button>
        </div>
      </div>
    </form>
  );
}
