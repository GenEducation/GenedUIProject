"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { GenEdLogo } from "@/components/shared/GenEdLogo";
import { ADMIN_INPUT, ADMIN_LABEL } from "@/features/admin/components/ui/fields";
import { ErrorNote } from "@/features/admin/components/ui/EmptyState";

import { signIn } from "@/features/auth/authService";
import { adminAuthBase } from "@/features/admin/adminApiRouting";
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
      // The console's own sign-in host, which is the MVP until one is configured
      // (`adminApiRouting.adminAuthBase`). Both stacks issue the same token.
      const token = await signIn(
        { username: username.trim(), password },
        { baseUrl: adminAuthBase() },
      );

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
    <div className="auth-canvas flex min-h-dvh w-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-7 flex flex-col items-center text-center">
          <GenEdLogo height={48} priority />
          <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald shadow-[0_1px_2px_rgba(18,45,48,.06)]">
            <ShieldCheck size={13} /> Admin console
          </span>
          <h1 className="mt-3 font-serif text-[28px] font-bold leading-tight text-ink">Sign in to continue</h1>
          <p className="mt-1 text-sm text-muted">Restricted to GenEd administrators.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-[24px] border border-border bg-white p-6 shadow-[0_30px_80px_rgba(18,45,48,.12)] sm:p-8"
        >
          <div>
            <label htmlFor="admin-username" className={ADMIN_LABEL}>
              Username
            </label>
            <input
              id="admin-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              type="text"
              autoComplete="username"
              placeholder="Enter your username"
              className={ADMIN_INPUT}
            />
          </div>

          <div>
            <label htmlFor="admin-password" className={ADMIN_LABEL}>
              Password
            </label>
            <div className="relative">
              <input
                id="admin-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                className={`${ADMIN_INPUT} pr-12`}
              />
              <button
                aria-label={showPassword ? "Hide password" : "Show password"}
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors hover:bg-ink/5 hover:text-ink"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error ? <ErrorNote>{error}</ErrorNote> : null}

          <Button type="submit" size="lg" fullWidth loading={isSigningIn}>
            Sign in to console
          </Button>
        </form>
      </div>
    </div>
  );
}
