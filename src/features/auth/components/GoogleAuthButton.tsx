"use client";

import { GoogleLogin } from "@react-oauth/google";

interface GoogleAuthButtonProps {
  label?: string;
  onSuccess: (token: string) => void;
}

/**
 * On-brand Google button.
 *
 * `<GoogleLogin>` paints itself inside a Google-owned iframe that no amount
 * of CSS on our side can restyle, so we render our own surface and stretch
 * the real widget over it at opacity 0 (see `.google-overlay` in
 * globals.css). Clicks land on Google's widget — preserving the ID-token
 * credential flow `googleSignIn()` expects and the personalised
 * "Sign in as …" session state — while everything visible is ours.
 */
export function GoogleAuthButton({ label = "Continue with Google", onSuccess }: GoogleAuthButtonProps) {
  return (
    <div className="relative w-full">
      <div
        aria-hidden
        className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#042e5c]/15 bg-white/70 py-3.5 text-sm font-semibold text-[#0E1F2B]/80 transition-all duration-200 hover:border-[#059F6D]/40 hover:bg-white"
      >
        <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden>
          <path
            fill="#4285F4"
            d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
          />
          <path
            fill="#34A853"
            d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.94v2.33A9 9 0 0 0 9 18Z"
          />
          <path
            fill="#FBBC05"
            d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.94a9 9 0 0 0 0 8.1l3.03-2.33Z"
          />
          <path
            fill="#EA4335"
            d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .94 4.95l3.03 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
          />
        </svg>
        {label}
      </div>

      <div className="google-overlay">
        <GoogleLogin
          onSuccess={(credentialResponse) => {
            if (credentialResponse.credential) {
              onSuccess(credentialResponse.credential);
            }
          }}
          onError={() => {
            console.error("Google Login Failed");
          }}
          width="400"
          theme="outline"
          text="continue_with"
          shape="rectangular"
        />
      </div>
    </div>
  );
}
