"use client";

import { useCallback, useEffect, useState } from "react";
import { Info, KeyRound, Loader2, MonitorSmartphone } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { STUDENT_COLORS as C } from "../../theme/colors";
import { MomentArt } from "@/components/shared/MomentArt";
import { DEVICE_EMPTY_ART, DEVICE_PAIRED_ART, LINK_FAILED_ART } from "../../theme/momentArt";
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
        title="Your Zoovi bot"
        description="Pair a bot with the one-time code on its screen. A bot stays connected while you use it."
      />

      <div className="mt-5 sm:pl-[68px]">
        {bots !== null && bots.length === 0 && !result && (
          // Nothing paired: the socket waiting, its plug in front, a small lime light on.
          <div className="mb-4 flex items-center gap-4 rounded-2xl bg-[var(--soft-surface)]/35 px-4 py-3">
            <MomentArt art={DEVICE_EMPTY_ART} width={92} shadow={false} />
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-[var(--text-primary)]">No bot paired yet.</p>
              <p className="mt-0.5 text-[13px] leading-snug text-[var(--text-muted)]">Switch your bot on, then enter the code it shows.</p>
            </div>
          </div>
        )}
        {bots !== null && bots.length > 0 && (
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

      {/* The answer, as a pop-up: paired (the plug pushes home, a lime glow) or not (the plug falls short). */}
      <Modal
        open={result !== null}
        onClose={() => setResult(null)}
        size="sm"
        title={result?.kind === "error" ? "Couldn't pair" : result?.kind === "approved" ? "Approved" : "Device paired!"}
        panelStyle={{ background: C.card, border: `1px solid ${C.border}` }}
      >
        {result && (
          <>
            <div className="flex flex-col items-center text-center" style={{ padding: "26px 28px 18px" }}>
              <MomentArt art={result.kind === "error" ? LINK_FAILED_ART : DEVICE_PAIRED_ART} width={result.kind === "error" ? 200 : 170} float shadow={false} className="mb-2" />
              {/* Visual only: Modal's `title` is the dialog's accessible name. */}
              <p aria-hidden="true" className="m-0 font-extrabold" style={{ color: C.text, fontFamily: "var(--font-display)", fontSize: 22 }}>
                {result.kind === "error" ? "Couldn't pair" : result.kind === "approved" ? "Approved" : "Device paired!"}
              </p>
              <p className="mt-2 mb-0 max-w-[300px]" style={{ color: C.textMid, fontSize: 14, lineHeight: 1.55 }}>
                {result.kind === "error"
                  ? result.message
                  : result.kind === "approved"
                    ? "Your device will finish pairing in a few seconds."
                    : "It'll be ready in a few seconds."}
              </p>
              {/* Only older devices, which listen over MQTT alone, can miss it. */}
              {result.kind === "approved" && (
                <p className="mt-1.5 mb-0 max-w-[300px]" style={{ color: C.textMuted, fontSize: 12.5, lineHeight: 1.5 }}>
                  If it still shows a code after a minute, restart it and pair again.
                </p>
              )}
            </div>
            <div style={{ padding: "0 28px 26px" }}>
              <Button variant={result.kind === "error" ? "secondary" : "primary"} fullWidth onClick={() => setResult(null)}>
                {result.kind === "error" ? "Try again" : "Done"}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </ProfileCard>
  );
}
