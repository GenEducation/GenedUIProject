"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { normalisePhone } from "@/features/webapp-campaign/googleForm";
import { ROUTES } from "@/features/marketing/routes";
import {
  BOARDS,
  CLASSES,
  EDUCATOR_HEARD_FROM,
  ROLES,
  SUBJECTS,
  submitEducatorInvite,
  type EducatorSignup,
} from "./educatorForm";
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
type Field =
  | "name"
  | "whatsapp"
  | "email"
  | "role"
  | "school"
  | "city"
  | "board"
  | "classes"
  | "subjects"
  | "heardFrom"
  | "consent";
type Errors = Partial<Record<Field, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Ticks or unticks `v`, keeping the list in `order`'s order. */
function toggle<T>(list: readonly T[], v: T, order: readonly T[]): T[] {
  const next = list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  return order.filter((x) => next.includes(x));
}

/**
 * "Get an Invite" for teachers and schools: the parent form's sibling, with the questions an educator answers
 * (role, school, the classes and subjects they teach). Answers land in their own Google Form (educatorForm.ts).
 */
export function EducatorInviteForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<EducatorSignup["role"] | "">("");
  const [otherRole, setOtherRole] = useState("");
  const [school, setSchool] = useState("");
  const [city, setCity] = useState("");
  const [board, setBoard] = useState<EducatorSignup["board"] | "">("");
  const [otherBoard, setOtherBoard] = useState("");
  const [classes, setClasses] = useState<(typeof CLASSES)[number][]>([]);
  const [subjects, setSubjects] = useState<(typeof SUBJECTS)[number][]>([]);
  const [heardFrom, setHeardFrom] = useState<EducatorSignup["heardFrom"] | "">("");
  const [otherHeardFrom, setOtherHeardFrom] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");

  const clear = (field: Field) => setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const validate = (): Errors => {
    const e: Errors = {};
    if (name.trim().length < 2) e.name = "Please enter your full name.";
    if (!isIndianMobile(normalisePhone(phone))) e.whatsapp = "Enter a 10-digit WhatsApp number.";
    if (!EMAIL.test(email.trim())) e.email = "Enter a valid email address.";
    if (!role) e.role = "Choose your role.";
    else if (role === "Other" && !otherRole.trim()) e.role = "What's your role?";
    if (school.trim().length < 2) e.school = "Enter your school or institution.";
    if (city.trim().length < 2) e.city = "Enter your city.";
    if (!board) e.board = "Choose a school board.";
    else if (board === "Other" && !otherBoard.trim()) e.board = "Which board?";
    if (!classes.length) e.classes = "Pick at least one class.";
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
    if (Object.keys(e).length || !role || !board || !heardFrom) return;
    setStatus("sending");
    try {
      await submitEducatorInvite({
        name,
        whatsapp: normalisePhone(phone),
        email,
        school,
        city,
        role,
        otherRole,
        board,
        otherBoard,
        classes,
        subjects,
        heardFrom,
        otherHeardFrom,
      });
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <DoneCard message={<>We&apos;ll WhatsApp your educator invite to +91 {normalisePhone(phone)} soon.</>}>
        <Link
          href={ROUTES.educators}
          className="rounded-full bg-[#287624] px-6 py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(40,118,36,0.7)] transition-colors hover:bg-[#22661F]"
        >
          Back to Zoovi for Educators
        </Link>
      </DoneCard>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6 pt-1">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="educator-name"
          label="Your full name"
          value={name}
          onChange={(v) => (setName(v), clear("name"))}
          error={errors.name}
          autoComplete="name"
          placeholder="e.g. Anita Rao"
        />
        <TextField
          id="educator-phone"
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

      <TextField
        id="educator-email"
        label="Email address"
        value={email}
        onChange={(v) => (setEmail(v), clear("email"))}
        error={errors.email}
        type="email"
        autoComplete="email"
        placeholder="you@school.edu.in"
      />

      <ChipGroup legend="Your role" error={errors.role}>
        {ROLES.map((r) => (
          <Chip key={r} type="radio" name="role" checked={role === r} onChange={() => (setRole(r), clear("role"))}>
            {r}
          </Chip>
        ))}
        {role === "Other" && (
          <input
            value={otherRole}
            onChange={(e) => (setOtherRole(e.target.value), clear("role"))}
            placeholder="Your role"
            aria-label="Other role"
            className={`${INPUT} mt-1 ${inputTone(!!errors.role)}`}
          />
        )}
      </ChipGroup>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="educator-school"
          label="School / institution"
          value={school}
          onChange={(v) => (setSchool(v), clear("school"))}
          error={errors.school}
          autoComplete="organization"
          placeholder="e.g. Delhi Public School"
        />
        <TextField
          id="educator-city"
          label="City"
          value={city}
          onChange={(v) => (setCity(v), clear("city"))}
          error={errors.city}
          autoComplete="address-level2"
          placeholder="e.g. Pune"
        />
      </div>

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

      <ChipGroup legend="Classes you teach" error={errors.classes}>
        {CLASSES.map((c) => (
          <Chip
            key={c}
            type="checkbox"
            name="classes"
            checked={classes.includes(c)}
            onChange={() => (setClasses((prev) => toggle(prev, c, CLASSES)), clear("classes"))}
          >
            {c}
          </Chip>
        ))}
      </ChipGroup>

      <ChipGroup legend="Subjects you teach" error={errors.subjects}>
        {SUBJECTS.map((s) => (
          <Chip
            key={s}
            type="checkbox"
            name="subjects"
            checked={subjects.includes(s)}
            onChange={() => (setSubjects((prev) => toggle(prev, s, SUBJECTS)), clear("subjects"))}
          >
            {s}
          </Chip>
        ))}
      </ChipGroup>

      <ChipGroup legend="How did you hear about us?" error={errors.heardFrom}>
        {EDUCATOR_HEARD_FROM.map((h) => (
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
        Request my educator invite
      </Button>

      <div className="space-y-1.5 text-center text-sm font-medium text-[#3B5533]/60">
        <p>
          Signing up as a parent?{" "}
          <Link
            href="/get-an-invite"
            className="font-bold text-[#287624] transition-colors hover:text-[#22661F] hover:underline"
          >
            Get a parent invite
          </Link>
        </p>
        <p>
          Have a question?{" "}
          <Link href="/faq#schools" className="font-bold text-[#287624] transition-colors hover:text-[#22661F] hover:underline">
            Read the FAQs
          </Link>
        </p>
      </div>
    </form>
  );
}
