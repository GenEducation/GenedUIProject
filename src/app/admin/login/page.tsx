"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

import { signIn } from "@/features/auth/authService";
import { Button } from "@/components/ui/Button";

/**
 * Dedicated admin console login. Separate from the public login flow:
 * username + password only, no Google sign-in, no sign-up. Only ADMIN-role
 * accounts are allowed through — anyone else is rejected here.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Enter your username and password.");
      return;
    }

    setIsSigningIn(true);
    try {
      const token = await signIn({ username: username.trim(), password });

      if (token.role?.toUpperCase() !== "ADMIN") {
        setError("This account is not an administrator.");
        setIsSigningIn(false);
        return;
      }

      localStorage.setItem("gened_auth_token", token.access_token);
      localStorage.setItem("gened_user_profile", JSON.stringify(token));
      localStorage.setItem("gened_user_role", "admin");

      router.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0E1F2B] px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-[#059F6D]/15 border border-[#059F6D]/30 mb-4">
            <ShieldCheck className="h-7 w-7 text-[#059F6D]" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            GenEd Admin Console
          </h1>
          <p className="text-sm text-white/40 mt-1">Restricted access</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 shadow-2xl"
        >
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-[0.28em] text-white/40 mb-2.5">
              Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              type="text"
              autoComplete="username"
              placeholder="Enter your username"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-5 py-3.5 text-sm text-white transition-all duration-200 placeholder:text-white/25 focus:border-[#059F6D] focus:outline-none focus:ring-2 focus:ring-[#059F6D]/20"
            />
          </div>

          <div>
            <label className="block text-[9px] font-bold uppercase tracking-[0.28em] text-white/40 mb-2.5">
              Password
            </label>
            <div className="relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-5 py-3.5 text-sm text-white transition-all duration-200 placeholder:text-white/25 focus:border-[#059F6D] focus:outline-none focus:ring-2 focus:ring-[#059F6D]/20"
              />
              <button aria-label={showPassword ? "Hide password" : "Show password"}
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-[#059F6D] transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-3.5 text-sm font-medium text-rose-300">
              {error}
            </div>
          ) : null}

          <Button type="submit" size="lg" fullWidth loading={isSigningIn}>
            Sign in to console
          </Button>
        </form>
      </div>
    </div>
  );
}
