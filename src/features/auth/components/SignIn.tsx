"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";

import { GoogleLogin } from "@react-oauth/google";

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
  onGoogleSuccess: (token: string) => void;
}

export function SignIn({
  loginData,
  onChange,
  onSubmit,
  onSwitchToSignup,
  isSigningIn,
  errors,
  onGoogleSuccess,
}: SignInProps) {
  const [showPassword, setShowPassword] = useState(false);



  return (
    <form
      onSubmit={onSubmit}
      className="space-y-8 rounded-2xl border border-[#042e5c]/10 bg-white/80 backdrop-blur-xl p-8 sm:p-10 shadow-[0_8px_40px_rgba(4,46,92,0.07)]"
    >
      <div className="space-y-6">
        {/* Google Sign In Button */}
        <div className="flex justify-center w-full">
          <GoogleLogin
            onSuccess={(credentialResponse) => {
              if (credentialResponse.credential) {
                onGoogleSuccess(credentialResponse.credential);
              }
            }}
            onError={() => {
              console.error("Google Login Failed");
            }}
            width="100%"
            theme="outline"
            text="signin_with"
            shape="rectangular"
          />
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-gray-400 font-medium uppercase tracking-widest">Or continue with</span>
          </div>
        </div>

        {/* Username field */}
        <div>
          <label className="block text-[9px] font-bold uppercase tracking-[0.28em] text-[#042e5c]/45 mb-2.5 pl-0.5">
            Username
          </label>
          <input
            name="username"
            value={loginData.username}
            onChange={onChange}
            type="text"
            placeholder="Enter your username"
            className={`w-full rounded-xl border ${
              errors.username
                ? "border-rose-400 bg-rose-50/30"
                : "border-[#042e5c]/15 bg-white/70"
            } px-5 py-3.5 text-sm text-[#0E1F2B] transition-all duration-200 placeholder:text-[#0E1F2B]/25 hover:border-[#059F6D]/40 focus:border-[#059F6D] focus:outline-none focus:ring-2 focus:ring-[#059F6D]/15`}
          />
          {errors.username && (
            <p className="text-rose-500 text-[10px] font-semibold mt-1.5 ml-0.5 italic animate-in fade-in slide-in-from-top-1">
              {errors.username}
            </p>
          )}
        </div>

        {/* Password field */}
        <div>
          <div className="flex items-center justify-between mb-2.5 pr-1">
            <label className="text-[9px] font-bold uppercase tracking-[0.28em] text-[#042e5c]/45">
              Password
            </label>
            <a
              href="#"
              className="text-[10px] font-semibold text-[#059F6D] hover:text-[#047a54] hover:underline transition-colors tracking-wide"
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
              className={`w-full rounded-xl border ${
                errors.password
                  ? "border-rose-400 bg-rose-50/30"
                  : "border-[#042e5c]/15 bg-white/70"
              } px-5 py-3.5 text-sm text-[#0E1F2B] transition-all duration-200 placeholder:text-[#0E1F2B]/25 hover:border-[#059F6D]/40 focus:border-[#059F6D] focus:outline-none focus:ring-2 focus:ring-[#059F6D]/15 font-mono tracking-widest`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#042e5c]/30 hover:text-[#059F6D] transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-rose-500 text-[10px] font-semibold mt-1.5 ml-0.5 italic animate-in fade-in slide-in-from-top-1">
              {errors.password}
            </p>
          )}
        </div>

        {/* Remember session */}
        <div className="flex items-center gap-3 pl-0.5">
          <input
            id="remember"
            type="checkbox"
            className="h-4 w-4 rounded border-[#042e5c]/20 accent-[#059F6D] focus:ring-[#059F6D]/60 cursor-pointer transition-all"
          />
          <label
            htmlFor="remember"
            className="text-sm font-medium text-[#2D3E51]/60 cursor-pointer select-none"
          >
            Remember this session
          </label>
        </div>
      </div>

      {/* Root error */}
      {errors.root ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700 animate-in fade-in slide-in-from-top-2">
          {errors.root}
        </div>
      ) : null}

      <div className="space-y-6 pt-2">
        {/* Liquid Emerald CTA button */}
        <button
          type="submit"
          disabled={isSigningIn}
          className="group relative w-full overflow-hidden rounded-xl bg-[#059F6D] py-4 text-sm font-bold text-white transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100 shadow-lg shadow-[#059F6D]/20 hover:shadow-xl hover:shadow-[#059F6D]/40"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {isSigningIn ? "Accessing archive…" : "Enter the Sanctuary"}
          </span>
        </button>

        <div className="text-center text-sm font-medium text-[#2D3E51]/60">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="font-bold text-[#059F6D] hover:text-[#047a54] hover:underline transition-colors"
          >
            Sign up
          </button>
        </div>
      </div>
    </form>
  );
}
