"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { asError } from "@/utils/errors";

const inputCls = (hasError: boolean) =>
  `w-full rounded-xl border ${
    hasError ? "border-rose-400 bg-rose-50/30" : "border-[#122D30]/15 bg-white/70"
  } px-5 py-3.5 text-sm text-[#122D30] transition-all duration-200 placeholder:text-[#122D30]/25 hover:border-[#075E63]/40 focus:border-[#075E63] focus:outline-none focus:ring-2 focus:ring-[#075E63]/15`;
const labelCls = "block text-[9px] font-bold uppercase tracking-[0.28em] text-[#122D30]/45 mb-2.5 pl-0.5";
const errorCls = "text-rose-500 text-[10px] font-semibold mt-1.5 ml-0.5 italic animate-in fade-in slide-in-from-top-1";

/**
 * The parent or guardian email on the student sign-up form, verified with a code
 * the parent receives (`POST /auth/send-otp/guardian`) and reads out to the
 * student, who types it in as `parent_otp_code`. A verified address is what lets
 * the parent's account connect to the student's automatically later, once the
 * parent registers with that same address and confirms. The student never needs
 * the parent to have an account to finish signing up.
 *
 * Changing the address after a code was sent clears the code: it only verifies
 * the address it was sent to.
 */
export function ParentEmailVerification({
  email,
  code,
  onChange,
  required,
  error,
  codeError,
}: {
  email: string;
  code: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  required: boolean;
  error?: string;
  codeError?: string;
}) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((secs) => secs - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const trimmed = email.trim();
  const codeSent = sentTo !== null && sentTo === trimmed.toLowerCase();

  // A new address needs its own code.
  useEffect(() => {
    if (sentTo !== null && sentTo !== trimmed.toLowerCase()) {
      setSentTo(null);
      setMessage("");
      if (code) onChange({ target: { name: "parent_otp_code", value: "" } } as ChangeEvent<HTMLInputElement>);
    }
  }, [trimmed, sentTo, code, onChange]);

  const sendCode = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setLocalError("Enter your parent's email address first");
      return;
    }
    setSending(true);
    setLocalError("");
    setMessage("");
    try {
      const { sendGuardianOtp } = await import("../authService");
      await sendGuardianOtp(trimmed);
      setSentTo(trimmed.toLowerCase());
      setMessage("We emailed your parent a 6-digit code. Ask them for it and type it below.");
      setTimeout(() => codeRef.current?.focus(), 0);
    } catch (err) {
      const { message: msg, retry_after } = asError(err);
      if (retry_after) setCooldown(Math.ceil(retry_after));
      setLocalError(msg || "We couldn't send the code. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const shownError = error || localError;
  return (
    <div>
      <label className={labelCls} htmlFor="parent_email">
        Parent or Guardian&apos;s Email Address{required ? "" : " (Optional)"}
      </label>
      <div className="flex gap-3">
        <input
          id="parent_email"
          name="parent_email"
          value={email}
          onChange={onChange}
          type="email"
          placeholder="parent@example.com"
          className={inputCls(!!shownError)}
        />
        <button
          type="button"
          onClick={sendCode}
          disabled={sending || !trimmed || cooldown > 0}
          className="px-5 py-3.5 rounded-xl bg-[#122D30]/5 text-[#122D30] text-xs font-bold whitespace-nowrap transition-all hover:bg-[#122D30]/10 active:scale-95 disabled:opacity-50"
        >
          {sending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : codeSent ? "Resend code" : "Send code to parent"}
        </button>
      </div>
      <p className="text-[#122D30]/40 text-[9px] mt-1.5 ml-0.5 font-medium leading-relaxed">
        {required ? "" : "Optional. "}We&apos;ll email your parent a code to confirm it&apos;s really their address. You
        don&apos;t have to wait for them to make an account: you can start learning straight away.
      </p>
      {message && <p className="text-[#075E63] text-[10px] font-bold mt-1.5 ml-0.5 tracking-tight">{message}</p>}
      {shownError && <p className={errorCls}>{shownError}</p>}

      {(codeSent || !!codeError) && (
        <div className="mt-4">
          <label className={labelCls} htmlFor="parent_otp_code">
            Code from your parent
          </label>
          <input
            ref={codeRef}
            id="parent_otp_code"
            name="parent_otp_code"
            value={code}
            onChange={onChange}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="6-digit code"
            className={inputCls(!!codeError)}
          />
          {codeError && <p className={errorCls}>{codeError}</p>}
        </div>
      )}
    </div>
  );
}
