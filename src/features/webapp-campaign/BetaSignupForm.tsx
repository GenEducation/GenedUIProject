"use client";

import { useState, type FormEvent } from "react";
import { PILOT_SEATS, PILOT_START } from "@/constants/campaign";
import { BOARDS, GRADES, submitBetaSignup, type BetaSignup } from "./googleForm";
import { trackMeta } from "./MetaPixel";

type Status = "idle" | "sending" | "done" | "error";
type Errors = Partial<Record<"name" | "whatsapp" | "grade" | "board" | "otherBoard", string>>;

/** Indian mobile: 10 digits starting 6–9 (a leading 0, 91 or +91 is dropped). */
function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function BetaSignupForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [grade, setGrade] = useState<BetaSignup["grade"] | "">("");
  const [board, setBoard] = useState<BetaSignup["board"] | "">("");
  const [otherBoard, setOtherBoard] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [copied, setCopied] = useState(false);

  const validate = (): Errors => {
    const e: Errors = {};
    if (name.trim().length < 2) e.name = "Please enter your full name.";
    if (!/^[6-9]\d{9}$/.test(normalisePhone(phone))) e.whatsapp = "Enter a 10-digit WhatsApp number.";
    if (!grade) e.grade = "Choose your child's grade.";
    if (!board) e.board = "Choose a school board.";
    else if (board === "Other" && !otherBoard.trim()) e.otherBoard = "Which board?";
    return e;
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length || !grade || !board) return;
    setStatus("sending");
    try {
      await submitBetaSignup({ name, whatsapp: normalisePhone(phone), grade, board, otherBoard });
      setStatus("done");
      trackMeta("Lead", { content_name: "Webapp free pilot", content_category: grade });
    } catch {
      setStatus("error");
    }
  };

  /** Same parent, another child: keep name + number, pick grade/board again. */
  const addAnother = () => {
    setGrade("");
    setBoard("");
    setOtherBoard("");
    setErrors({});
    setCopied(false);
    setStatus("idle");
  };

  const share = async () => {
    const url = window.location.origin + window.location.pathname;
    const text = `A free AI tutor for Class 6–9 — free pilot, only ${PILOT_SEATS} families, starts ${PILOT_START}.`;
    try {
      if (navigator.share) await navigator.share({ title: "GenEd free pilot", text, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch {
      /* share sheet dismissed */
    }
  };

  if (status === "done") {
    return (
      <div className="gc-form gc-form-done" role="status">
        <span className="gc-form-tick" aria-hidden>
          ✓
        </span>
        <h3>You&apos;re in!</h3>
        <p>We&apos;ll WhatsApp you your access details before 23 October.</p>
        <p className="gc-form-muted">Know another parent whose child would benefit?</p>
        {/* eslint-disable-next-line no-restricted-syntax -- campaign-styled control (gc-btn), outside the app design system */}
        <button type="button" className="gc-btn gc-btn-primary" onClick={share}>
          {copied ? "Link copied" : "Share with a parent"}
        </button>
        {/* eslint-disable-next-line no-restricted-syntax -- campaign-styled control (gc-btn), outside the app design system */}
        <button type="button" className="gc-form-another" onClick={addAnother}>
          + Add another child
        </button>
      </div>
    );
  }

  return (
    <form className="gc-form" onSubmit={onSubmit} noValidate>
      <label className="gc-field">
        <span>Your full name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          placeholder="e.g. Priya Sharma"
          aria-invalid={!!errors.name}
        />
        {errors.name && <small className="gc-err">{errors.name}</small>}
      </label>

      <label className="gc-field">
        <span>WhatsApp number</span>
        <div className="gc-phone">
          <b>+91</b>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="98765 43210"
            aria-invalid={!!errors.whatsapp}
          />
        </div>
        {errors.whatsapp && <small className="gc-err">{errors.whatsapp}</small>}
      </label>

      <fieldset className="gc-field">
        <legend>Child&apos;s grade</legend>
        <div className="gc-chips">
          {GRADES.map((g) => (
            <label key={g} className={grade === g ? "gc-chip-opt gc-chip-on" : "gc-chip-opt"}>
              <input type="radio" name="grade" value={g} checked={grade === g} onChange={() => setGrade(g)} />
              {g.replace("Grade ", "Class ")}
            </label>
          ))}
        </div>
        {errors.grade && <small className="gc-err">{errors.grade}</small>}
      </fieldset>

      <fieldset className="gc-field">
        <legend>School board</legend>
        <div className="gc-chips">
          {BOARDS.map((b) => (
            <label key={b} className={board === b ? "gc-chip-opt gc-chip-on" : "gc-chip-opt"}>
              <input type="radio" name="board" value={b} checked={board === b} onChange={() => setBoard(b)} />
              {b}
            </label>
          ))}
        </div>
        {board === "Other" && (
          <input
            className="gc-other"
            value={otherBoard}
            onChange={(e) => setOtherBoard(e.target.value)}
            placeholder="Which board?"
            aria-label="Other board"
            aria-invalid={!!errors.otherBoard}
          />
        )}
        {(errors.board || errors.otherBoard) && <small className="gc-err">{errors.board ?? errors.otherBoard}</small>}
      </fieldset>

      {/* eslint-disable-next-line no-restricted-syntax -- campaign-styled control (gc-btn), outside the app design system */}
      <button type="submit" className="gc-btn gc-btn-primary gc-btn-lg gc-form-submit" disabled={status === "sending"}>
        {status === "sending" ? "Joining…" : "Join the free pilot"}
      </button>
      {status === "error" && (
        <small className="gc-err" role="alert">
          Couldn&apos;t send — please check your connection and try again.
        </small>
      )}
      <p className="gc-form-note">
        For Maths, Science &amp; English. By joining, you agree GenEd can contact you on WhatsApp about the pilot and
        ask for your feedback.
      </p>
    </form>
  );
}
