"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { asError } from "@/utils/errors";
import { studentService, type GuardianStatus } from "../../services/studentService";

/**
 * Verifies the parent address already on the student's profile: a code goes
 * to the parent, who reads it out; the student types it in. Used where the
 * address was never verified (an account from before verification, a Google
 * sign-up, or a changed address).
 */
export function VerifyParentEmail({
  studentId,
  parentEmail,
  onVerified,
}: {
  studentId: string;
  parentEmail: string;
  onVerified: (status: GuardianStatus) => void;
}) {
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    setBusy(true);
    setError("");
    try {
      await studentService.sendParentEmailCode(studentId);
      setSent(true);
    } catch (err) {
      setError(asError(err).message || "We couldn't send the code. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError("");
    try {
      onVerified(await studentService.verifyParentEmail(studentId, code));
    } catch (err) {
      setError(asError(err).message || "That code didn't work.");
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <p className="text-[13px] leading-relaxed text-[var(--text-mid)]">
        Let&apos;s check <strong>{parentEmail}</strong> is really your parent&apos;s address. We&apos;ll email them a
        6-digit code; ask them for it and type it here.
      </p>
      {!sent ? (
        <Button variant="primary" size="sm" loading={busy} disabled={busy} onClick={send}>
          Send code to my parent
        </Button>
      ) : (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void verify();
          }}
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="6-digit code"
            aria-label="Code from your parent"
            className="w-36 rounded-xl border border-[var(--surface-border)] bg-[var(--canvas)] px-3 py-2 text-[14px] outline-none focus:border-[var(--primary)]"
          />
          <Button type="submit" variant="primary" size="sm" loading={busy} disabled={busy || code.trim().length < 6}>
            Verify
          </Button>
          <Button type="button" variant="tertiary" size="sm" disabled={busy} onClick={send}>
            Send a new code
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-[12.5px] font-semibold text-[var(--danger-ink)]">
          {error}
        </p>
      )}
    </div>
  );
}
