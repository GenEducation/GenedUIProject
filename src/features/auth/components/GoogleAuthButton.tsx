"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";

/** Google Identity Services refuses to render a button wider than this. */
const GSI_MAX_WIDTH = 400;
const GSI_MIN_WIDTH = 200;

interface GoogleAuthButtonProps {
  /** `signup_with` renders Google's sign-up copy. */
  text?: "signin_with" | "signup_with" | "continue_with";
  onSuccess: (token: string) => void;
}

/**
 * Google sign-in, rendered as Google's own button.
 *
 * An earlier version drew a custom surface and laid Google's widget over it at
 * `opacity: 0` to capture the clicks. It shipped broken. Google's widget lives
 * in a cross-origin iframe whose internal layout we cannot see or predict —
 * measured at 300x150 with the button inset 40px from the top, not the tidy
 * box its outer wrapper suggests — so the invisible layer never quite covered
 * the visible one and clicks landed on dead space. Nothing surfaced the
 * failure: the button still looked perfect, which is exactly why it went
 * unnoticed. That trade is not worth making on a login button.
 *
 * So the widget is real and visible. We control what we legitimately can — the
 * width, and the props Google exposes (outline theme, rectangular, large) —
 * and leave the inside to Google.
 *
 * A genuinely custom-looking button is still possible, but not this way: it
 * needs the `useGoogleLogin` hook, which returns an OAuth access token instead
 * of the ID-token JWT that `googleSignIn()` currently expects, so the backend
 * would have to accept the new token type first.
 */
export function GoogleAuthButton({ text = "continue_with", onSuccess }: GoogleAuthButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);

  // GSI takes a fixed pixel width, so track the container to stay full-bleed
  // as the card responds.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const next = Math.round(
        Math.min(GSI_MAX_WIDTH, Math.max(GSI_MIN_WIDTH, el.clientWidth)),
      );
      setWidth((current) => (current === next ? current : next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid="google-widget-layer"
      className="flex w-full justify-center [color-scheme:light]"
    >
      {width !== null && (
        <GoogleLogin
          onSuccess={(credentialResponse) => {
            if (credentialResponse.credential) {
              onSuccess(credentialResponse.credential);
            }
          }}
          onError={() => {
            console.error("Google Login Failed");
          }}
          width={width}
          theme="outline"
          text={text}
          shape="rectangular"
          size="large"
          logo_alignment="center"
        />
      )}
    </div>
  );
}
