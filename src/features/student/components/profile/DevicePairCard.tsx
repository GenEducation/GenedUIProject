"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Info, KeyRound, Loader2, MonitorSmartphone, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SegmentedInput } from "@/components/shared/SegmentedInput";
import { confirmDevicePairing } from "@/features/auth/authService";
import { asError } from "@/utils/errors";
import { BotList, type BotListTheme } from "@/components/shared/BotList";
import { listMyBots, removeMyBot, type PairedBot } from "../../services/botService";
import { useStudentStore } from "../../store/useStudentStore";
import { CardHeading, ProfileCard } from "./ProfileCard";

const CODE_LENGTH = 6;

const BOT_THEME: BotListTheme = {
  row: "bg-[var(--soft-surface)]/45",
  ink: "text-[var(--text-primary)]",
  soft: "text-[var(--text-muted)]",
  icon: "bg-white text-[var(--primary)]",
  danger: "text-[var(--danger-ink)]",
};

function pairingErrorMessage(err: unknown): string {
  const e = asError(err);
  switch (e.error_code) {
    case "AUTH_1213":
      return "That code is invalid or expired. Check the device screen. If it changed, enter the new code.";
    case "AUTH_1214":
      return "Only a student account can be paired. Please sign in as the student.";
    case "AUTH_1201":
      return "Authentication error. Please sign in again.";
    case "AUTH_1206":
      return "Student profile not found.";
    default:
      return e.message || "Something went wrong. Please try again.";
  }
}

// `pushed` says whether the token also reached the device over MQTT. Production has no broker, so `false` is the
// normal answer: the device collects its token by polling `/auth/device/pairing/status`. Either way it is paired.
type Result = { kind: "paired" } | { kind: "approved" } | { kind: "error"; message: string } | null;

/**
 * The device shows a one-time code; the student types it here and we confirm
 * it (`POST /auth/device/pairing/confirm`).
 */
export function DevicePairCard({ index }: { index: number }) {
  const studentId = useStudentStore((s) => s.studentProfile?.user_id);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result>(null);
  // The code boxes only appear once the student chooses to enter a code.
  const [entering, setEntering] = useState(false);
  // The bots paired to this account (backend ADR 0043); null while loading, and left out if the list can't load.
  const [bots, setBots] = useState<PairedBot[] | null>(null);
  const [botsFailed, setBotsFailed] = useState(false);

  const loadBots = useCallback(async () => {
    try {
      setBots(await listMyBots());
      setBotsFailed(false);
    } catch {
      setBotsFailed(true);
    }
  }, []);

  useEffect(() => {
    void loadBots();
  }, [loadBots]);

  const ready = code.length === CODE_LENGTH && !!studentId && !loading;

  const handlePair = async () => {
    if (!ready || !studentId) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await confirmDevicePairing({ user_code: code, student_id: studentId });
      if (res.status === "approved") {
        setResult(res.pushed ? { kind: "paired" } : { kind: "approved" });
        setCode("");
        setEntering(false);
        void loadBots();
      } else {
        setResult({ kind: "error", message: "Pairing response was unexpected. Please try again." });
      }
    } catch (err) {
      if (asError(err).error_code === "AUTH_1213") setCode("");
      setResult({ kind: "error", message: pairingErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProfileCard index={index}>
      <CardHeading
        icon={<MonitorSmartphone size={24} strokeWidth={1.9} />}
        title="Your GenEd bot"
        description="Pair a bot with the one-time code on its screen. A bot stays connected while you use it."
      />

      <div className="mt-5 sm:pl-[68px]">
        {bots !== null && (
          <div className="mb-4">
            <BotList
              bots={bots}
              theme={BOT_THEME}
              emptyText="No bot paired yet."
              onRemove={async (bot) => {
                await removeMyBot(bot.id);
                setBots((prev) => (prev ?? []).filter((b) => b.id !== bot.id));
              }}
            />
          </div>
        )}
        {botsFailed && bots === null && (
          <p className="mb-4 text-[13px] text-[var(--text-muted)]">Your paired bots couldn&apos;t be loaded right now.</p>
        )}

        {/* Result messages stay visible after the entry row collapses. */}
        {result?.kind === "error" && (
          <p role="alert" className="mb-4 flex items-start gap-2 rounded-xl bg-[var(--danger-bg)] px-3.5 py-2.5 text-[13px] font-semibold leading-snug text-[var(--danger-ink)]">
            <TriangleAlert size={16} className="mt-px flex-none" aria-hidden />
            {result.message}
          </p>
        )}
        {result?.kind === "paired" && (
          <p role="status" className="mb-4 flex items-center gap-2 rounded-xl bg-[var(--accent)]/70 px-3.5 py-2.5 text-[13px] font-bold text-[var(--accent-ink)]">
            <CheckCircle2 size={16} className="flex-none" aria-hidden />
            Device paired! It&apos;ll be ready in a few seconds.
          </p>
        )}
        {result?.kind === "approved" && (
          <div role="status" className="mb-4 flex items-start gap-2 rounded-xl bg-[var(--accent)]/70 px-3.5 py-2.5 text-[var(--accent-ink)]">
            <CheckCircle2 size={16} className="mt-px flex-none" aria-hidden />
            <div className="leading-snug">
              <p className="text-[13px] font-bold">Approved: your device will finish pairing in a few seconds.</p>
              {/* Only older devices, which listen over MQTT alone, can miss it. */}
              <p className="mt-0.5 text-[12px] font-medium opacity-80">
                If it still shows a code after a minute, restart it and pair again.
              </p>
            </div>
          </div>
        )}

        {!entering ? (
          <Button
            variant="secondary"
            size="md"
            onClick={() => { setEntering(true); setResult(null); }}
            leadingIcon={<KeyRound size={16} />}
            className="rounded-full px-6"
          >
            Enter code
          </Button>
        ) : (
          <>
            <div className="flex justify-start [&>div]:!justify-start [&>div]:flex-wrap">
              <SegmentedInput length={CODE_LENGTH} value={code} onChange={(v) => { setCode(v); if (result?.kind === "error") setResult(null); }} disabled={loading} />
            </div>

            <p className="mt-4 flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
              <Info size={15} className="flex-none" aria-hidden />
              The code shows on your device&apos;s screen while it isn&apos;t paired. It stays valid for 10 minutes.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                variant="primary"
                size="md"
                onClick={handlePair}
                disabled={!ready}
                leadingIcon={loading ? <Loader2 size={16} className="animate-spin" /> : undefined}
                className="rounded-full px-7"
              >
                Pair device
              </Button>
              <Button
                variant="tertiary"
                size="md"
                onClick={() => { setEntering(false); setCode(""); }}
                disabled={loading}
                className="rounded-full"
              >
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </ProfileCard>
  );
}
