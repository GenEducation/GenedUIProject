"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  BOARDS,
  GRADES,
  HEARD_FROM,
  SUBJECTS,
  normalisePhone,
  submitBetaSignup,
  type BetaSignup,
} from "@/features/webapp-campaign/googleForm";

type Status = "idle" | "sending" | "done" | "error";
type Field = "name" | "whatsapp" | "grade" | "board" | "subjects" | "heardFrom" | "consent";
type Errors = Partial<Record<Field, string>>;
type Subject = (typeof SUBJECTS)[number];

// The auth pages' own field look (SignIn.tsx), so this sits on the login backdrop as a sibling of the sign-in card.
const LABEL = "block text-[9px] font-bold uppercase tracking-[0.28em] text-[#1D6315]/45 mb-2 pl-0.5";
const INPUT =
  "w-full rounded-xl border px-5 py-3.5 text-sm text-[#1D6315] transition-all duration-200 placeholder:text-[#1D6315]/25 hover:border-[#287624]/40 focus:border-[#287624] focus:outline-none focus:ring-2 focus:ring-[#287624]/15";
const inputTone = (bad: boolean) => (bad ? "border-rose-400 bg-rose-50/30" : "border-[#1D6315]/15 bg-white/70");

function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p className="text-rose-500 text-[10px] font-semibold mt-1.5 ml-0.5 italic animate-in fade-in slide-in-from-top-1">
      {children}
    </p>
  );
}

/** A pill toggle around a native radio/checkbox: keyboard, screen readers and form semantics come for free. */
function Chip({
  type,
  name,
  checked,
  onChange,
  children,
}: {
  type: "radio" | "checkbox";
  name: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label
      className={`inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-all duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#287624]/30 ${
        checked
          ? "border-[#287624] bg-[#287624] text-white shadow-[0_6px_16px_-8px_rgba(40,118,36,0.8)]"
          : "border-[#1D6315]/15 bg-white/70 text-[#1D6315]/75 hover:border-[#287624]/40 hover:text-[#1D6315]"
      }`}
    >
      <input type={type} name={name} checked={checked} onChange={onChange} className="sr-only" />
      {checked && type === "checkbox" ? <Check size={13} strokeWidth={3} aria-hidden /> : null}
      {children}
    </label>
  );
}

function ChipGroup({ legend, error, children }: { legend: string; error?: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className={LABEL}>{legend}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
      <FieldError>{error}</FieldError>
    </fieldset>
  );
}

/**
 * "Get an Invite": a parent leaves their details and we WhatsApp them an invite. Answers land in the same Google
 * Form as the /pre-order pilot sign-up (googleForm.ts), but here the parent picks their subjects and says where
 * they heard of us, instead of the ad page's fixed answers.
 */
export function InviteForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [grade, setGrade] = useState<BetaSignup["grade"] | "">("");
  const [board, setBoard] = useState<BetaSignup["board"] | "">("");
  const [otherBoard, setOtherBoard] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [heardFrom, setHeardFrom] = useState<NonNullable<BetaSignup["heardFrom"]> | "">("");
  const [otherHeardFrom, setOtherHeardFrom] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");

  const clear = (field: Field) => setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const validate = (): Errors => {
    const e: Errors = {};
    if (name.trim().length < 2) e.name = "Please enter your full name.";
    if (!/^[6-9]\d{9}$/.test(normalisePhone(phone))) e.whatsapp = "Enter a 10-digit WhatsApp number.";
    if (!grade) e.grade = "Choose your child's class.";
    if (!board) e.board = "Choose a school board.";
    else if (board === "Other" && !otherBoard.trim()) e.board = "Which board?";
    if (!subjects.length) e.subjects = "Pick at least one subject.";
    if (!heardFrom) e.heardFrom = "Let us know how you found us.";
    else if (heardFrom === "Other" && !otherHeardFrom.trim()) e.heardFrom = "Where did you hear about us?";
    if (!consent) e.consent = "We need this to send your invite.";
    return e;
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length || !grade || !board || !heardFrom) return;
    setStatus("sending");
    try {
      await submitBetaSignup({
        name,
        whatsapp: normalisePhone(phone),
        grade,
        board,
        otherBoard,
        // In the form's own order, whatever order they were ticked in.
        subjects: SUBJECTS.filter((s) => subjects.includes(s)),
        heardFrom,
        otherHeardFrom,
      });
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  /** Same parent, another child: keep their details, pick class, board and subjects again. */
  const addAnother = () => {
    setGrade("");
    setBoard("");
    setOtherBoard("");
    setSubjects([]);
    setErrors({});
    setStatus("idle");
  };

  if (status === "done") {
    return (
      <div role="status" className="flex flex-col items-center py-6 text-center animate-in fade-in zoom-in-95">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-[#287624] text-white shadow-[0_12px_30px_-10px_rgba(40,118,36,0.75)]">
          <Check size={30} strokeWidth={3} aria-hidden />
        </span>
        <h2 className="mt-5 text-xl font-bold tracking-tight text-[#1D6315]">You&apos;re on the list!</h2>
        <p className="mt-1.5 max-w-xs text-sm font-medium text-[#3B5533]/60">
          We&apos;ll WhatsApp your invite to +91 {normalisePhone(phone)} soon.
        </p>
        <div className="mt-7 flex w-full flex-col gap-3">
          <Link
            href="/"
            className="rounded-full bg-[#287624] px-6 py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(40,118,36,0.7)] transition-colors hover:bg-[#22661F]"
          >
            Back to Zoovi
          </Link>
          <Button variant="tertiary" onClick={addAnother}>
            + Add another child
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6 pt-1">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="invite-name" className={LABEL}>
            Your full name
          </label>
          <input
            id="invite-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clear("name");
            }}
            autoComplete="name"
            placeholder="e.g. Priya Sharma"
            aria-invalid={!!errors.name}
            className={`${INPUT} ${inputTone(!!errors.name)}`}
          />
          <FieldError>{errors.name}</FieldError>
        </div>

        <div>
          <label htmlFor="invite-phone" className={LABEL}>
            WhatsApp number
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#1D6315]/45">
              +91
            </span>
            <input
              id="invite-phone"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                clear("whatsapp");
              }}
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="98765 43210"
              aria-invalid={!!errors.whatsapp}
              className={`${INPUT} pl-14 ${inputTone(!!errors.whatsapp)}`}
            />
          </div>
          <FieldError>{errors.whatsapp}</FieldError>
        </div>
      </div>

      <ChipGroup legend="Child's class" error={errors.grade}>
        {GRADES.map((g) => (
          <Chip key={g} type="radio" name="grade" checked={grade === g} onChange={() => (setGrade(g), clear("grade"))}>
            {g.replace("Grade ", "Class ")}
          </Chip>
        ))}
      </ChipGroup>

      <ChipGroup legend="School board" error={errors.board}>
        {BOARDS.map((b) => (
          <Chip key={b} type="radio" name="board" checked={board === b} onChange={() => (setBoard(b), clear("board"))}>
            {b}
          </Chip>
        ))}
        {board === "Other" && (
          <input
            value={otherBoard}
            onChange={(e) => (setOtherBoard(e.target.value), clear("board"))}
            placeholder="Which board?"
            aria-label="Other board"
            className={`${INPUT} mt-1 ${inputTone(!!errors.board)}`}
          />
        )}
      </ChipGroup>

      <ChipGroup legend="Subjects" error={errors.subjects}>
        {SUBJECTS.map((s) => (
          <Chip
            key={s}
            type="checkbox"
            name="subjects"
            checked={subjects.includes(s)}
            onChange={() => {
              setSubjects((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
              clear("subjects");
            }}
          >
            {s}
          </Chip>
        ))}
      </ChipGroup>

      <ChipGroup legend="How did you hear about us?" error={errors.heardFrom}>
        {HEARD_FROM.map((h) => (
          <Chip
            key={h}
            type="radio"
            name="heardFrom"
            checked={heardFrom === h}
            onChange={() => (setHeardFrom(h), clear("heardFrom"))}
          >
            {h}
          </Chip>
        ))}
        {heardFrom === "Other" && (
          <input
            value={otherHeardFrom}
            onChange={(e) => (setOtherHeardFrom(e.target.value), clear("heardFrom"))}
            placeholder="Tell us where"
            aria-label="Where did you hear about us"
            className={`${INPUT} mt-1 ${inputTone(!!errors.heardFrom)}`}
          />
        )}
      </ChipGroup>

      <div>
        <label className="flex cursor-pointer items-start gap-3 pl-0.5">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => (setConsent(e.target.checked), clear("consent"))}
            aria-invalid={!!errors.consent}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-[#1D6315]/20 accent-[#287624]"
          />
          <span className="text-sm font-medium leading-snug text-[#3B5533]/70">
            Yes, GenEd can contact me on WhatsApp about my invite and ask for feedback.
          </span>
        </label>
        <FieldError>{errors.consent}</FieldError>
      </div>

      {status === "error" ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50/80 px-5 py-3.5 text-sm font-medium text-rose-700 animate-in fade-in slide-in-from-top-2"
        >
          Couldn&apos;t send. Please check your connection and try again.
        </div>
      ) : null}

      <Button type="submit" size="lg" fullWidth loading={status === "sending"}>
        Request my invite
      </Button>

      <p className="text-center text-sm font-medium text-[#3B5533]/60">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-[#287624] transition-colors hover:text-[#22661F] hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
