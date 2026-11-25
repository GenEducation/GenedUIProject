"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
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
import {
  Chip,
  ChipGroup,
  ConsentField,
  DoneCard,
  INPUT,
  SendError,
  TextField,
  inputTone,
  isIndianMobile,
} from "./fields";

type Status = "idle" | "sending" | "done" | "error";
type Field = "name" | "whatsapp" | "grade" | "board" | "subjects" | "heardFrom" | "consent";
type Errors = Partial<Record<Field, string>>;
type Subject = (typeof SUBJECTS)[number];

/**
 * "Get an Invite" for parents: they leave their details and we WhatsApp them an invite. Answers land in the same
 * Google Form as the /pre-order pilot sign-up (googleForm.ts), but here the parent picks their subjects and says
 * where they heard of us, instead of the ad page's fixed answers.
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
    if (!isIndianMobile(normalisePhone(phone))) e.whatsapp = "Enter a 10-digit WhatsApp number.";
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
      <DoneCard message={<>We&apos;ll WhatsApp your invite to +91 {normalisePhone(phone)} soon.</>}>
        <Link
          href="/"
          className="rounded-full bg-[#287624] px-6 py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(40,118,36,0.7)] transition-colors hover:bg-[#22661F]"
        >
          Back to Zoovi
        </Link>
        <Button variant="tertiary" onClick={addAnother}>
          + Add another child
        </Button>
      </DoneCard>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6 pt-1">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="invite-name"
          label="Your full name"
          value={name}
          onChange={(v) => (setName(v), clear("name"))}
          error={errors.name}
          autoComplete="name"
          placeholder="e.g. Priya Sharma"
        />
        <TextField
          id="invite-phone"
          label="WhatsApp number"
          prefix="+91"
          value={phone}
          onChange={(v) => (setPhone(v), clear("whatsapp"))}
          error={errors.whatsapp}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="98765 43210"
        />
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

      <ConsentField checked={consent} onChange={(v) => (setConsent(v), clear("consent"))} error={errors.consent} />

      {status === "error" ? <SendError /> : null}

      <Button type="submit" size="lg" fullWidth loading={status === "sending"}>
        Request my invite
      </Button>

      <div className="space-y-1.5 text-center text-sm font-medium text-[#3B5533]/60">
        <p>
          A teacher or school?{" "}
          <Link
            href="/get-an-invite/educators"
            className="font-bold text-[#287624] transition-colors hover:text-[#22661F] hover:underline"
          >
            Get an educator invite
          </Link>
        </p>
        <p>
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-[#287624] transition-colors hover:text-[#22661F] hover:underline">
            Log in
          </Link>
        </p>
        <p>
          Have a question?{" "}
          <Link href="/faq#parents" className="font-bold text-[#287624] transition-colors hover:text-[#22661F] hover:underline">
            Read the FAQs
          </Link>
        </p>
      </div>
    </form>
  );
}
