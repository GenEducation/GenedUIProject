"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PreorderFields } from "../types";
import { createPreorder, verifyPreorder } from "../services/preorderService";
import { loadRazorpayScript } from "@/features/billing/loadRazorpayScript";
import { ApiRequestError } from "@/utils/authFetch";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function messageForError(err: unknown): string {
  if (err instanceof ApiRequestError) {
    switch (err.error_code) {
      case "PREORD_1101":
        return err.message || "Please check the details you entered and try again.";
      case "PREORD_1102":
        return "We couldn't find that reservation. Please start again.";
      case "PREORD_1103":
        return "This reservation is already paid or can no longer be changed.";
      case "PREORD_1201":
        return "We couldn't verify your payment. If you were charged, contact support with your reference.";
      case "PREORD_1202":
      case "PREORD_1203":
        return "Payments are temporarily unavailable. Please try again shortly.";
      default:
        break;
    }
  }
  return "Something went wrong. Please try again.";
}

const EMPTY: PreorderFields = {
  fullName: "",
  email: "",
  phone: "",
  city: "",
  country: "",
  quantity: 1,
  buyerType: "parent",
  hearAbout: "",
  notes: "",
  consent: false,
};

export function PreorderModal({ isOpen, onClose }: Props) {
  const [data, setData] = useState<PreorderFields>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  // Close on Escape + lock body scroll while open.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  // Reset to a clean form whenever the modal is reopened.
  useEffect(() => {
    if (isOpen) {
      setData(EMPTY);
      setErrors({});
      setSubmitting(false);
      setReference(null);
    }
  }, [isOpen]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const val =
      type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : name === "quantity"
        ? Math.max(1, Number(value) || 1)
        : value;
    setData((d) => ({ ...d, [name]: val }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!data.fullName.trim()) e.fullName = "Please enter your name.";
    if (!data.email.trim()) e.email = "Please enter your email.";
    else if (!emailRegex.test(data.email)) e.email = "Enter a valid email.";
    if (!data.phone.trim()) e.phone = "Please enter a phone number.";
    if (!data.city.trim()) e.city = "Required.";
    if (!data.country.trim()) e.country = "Required.";
    if (!data.quantity || data.quantity < 1) e.quantity = "Min 1.";
    if (!data.consent) e.consent = "Please agree to be contacted.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setErrors({});

    try {
      await loadRazorpayScript();
      const order = await createPreorder(data);

      if (!order.key_id) {
        setErrors({ form: "Payments are temporarily unavailable. Please try again shortly." });
        setSubmitting(false);
        return;
      }

      const rzp = new (window as any).Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "GenEd",
        description: "Deskbot pre-order deposit",
        order_id: order.razorpay_order_id,
        prefill: {
          name: data.fullName,
          email: data.email,
          contact: data.phone,
        },
        theme: {
          color: "#059F6D",
        },
        handler: async (response: any) => {
          try {
            const result = await verifyPreorder({
              reference: order.reference,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setReference(result.reference);
          } catch (err) {
            setErrors({ form: messageForError(err) });
          } finally {
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            setErrors({ form: "Payment cancelled — your reservation isn't confirmed yet." });
          },
        },
      });
      rzp.open();
    } catch (err) {
      setErrors({ form: messageForError(err) });
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="po-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="po-modal-shell">
            <motion.div
              className="po-modal gened-preorder"
              role="dialog"
              aria-modal="true"
              aria-label="Pre-order the GenEd Deskbot"
              initial={{ opacity: 0, scale: 0.94, y: 22 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 22 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
            >
              {reference ? (
                <SuccessView reference={reference} onClose={onClose} />
              ) : (
                <>
                  <div className="po-modal-head">
                    <button
                      type="button"
                      className="po-modal-close"
                      onClick={onClose}
                      aria-label="Close"
                    >
                      <svg viewBox="0 0 24 24">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                    <span className="po-eyebrow">
                      <span className="dot" /> Reserve yours
                    </span>
                    <h2>Pre-order the Deskbot</h2>
                    <p>
                      A refundable ₹500 deposit reserves your place — we&apos;ll
                      reach out with delivery details before we ship.
                    </p>
                  </div>

                  <form className="po-form" onSubmit={handleSubmit} noValidate>
                    <Field
                      label="Full name"
                      name="fullName"
                      value={data.fullName}
                      onChange={handleChange}
                      error={errors.fullName}
                      placeholder="Jane Sharma"
                      autoComplete="name"
                    />
                    <div className="po-form-row">
                      <Field
                        label="Email"
                        name="email"
                        type="email"
                        value={data.email}
                        onChange={handleChange}
                        error={errors.email}
                        placeholder="jane@email.com"
                        autoComplete="email"
                      />
                      <Field
                        label="Phone"
                        name="phone"
                        type="tel"
                        value={data.phone}
                        onChange={handleChange}
                        error={errors.phone}
                        placeholder="+91 98765 43210"
                        autoComplete="tel"
                      />
                    </div>
                    <div className="po-form-row">
                      <Field
                        label="City / region"
                        name="city"
                        value={data.city}
                        onChange={handleChange}
                        error={errors.city}
                        placeholder="Mumbai"
                        autoComplete="address-level2"
                      />
                      <Field
                        label="Country"
                        name="country"
                        value={data.country}
                        onChange={handleChange}
                        error={errors.country}
                        placeholder="India"
                        autoComplete="country-name"
                      />
                    </div>
                    <div className="po-form-row">
                      <Field
                        label="Quantity"
                        name="quantity"
                        type="number"
                        min={1}
                        value={String(data.quantity)}
                        onChange={handleChange}
                        error={errors.quantity}
                      />
                      <div className="po-field">
                        <label htmlFor="buyerType">I&apos;m ordering as</label>
                        <select
                          id="buyerType"
                          name="buyerType"
                          value={data.buyerType}
                          onChange={handleChange}
                        >
                          <option value="parent">A parent</option>
                          <option value="school">A school</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                    <Field
                      label="How did you hear about us? (optional)"
                      name="hearAbout"
                      value={data.hearAbout ?? ""}
                      onChange={handleChange}
                      placeholder="Instagram, a friend, school…"
                    />
                    <div className="po-field">
                      <label htmlFor="notes">Anything else? (optional)</label>
                      <textarea
                        id="notes"
                        name="notes"
                        value={data.notes ?? ""}
                        onChange={handleChange}
                        placeholder="Questions, delivery notes…"
                      />
                    </div>

                    <label
                      className={`po-consent${
                        errors.consent ? " has-error" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="consent"
                        checked={data.consent}
                        onChange={handleChange}
                      />
                      <span>
                        I agree to be contacted about my GenEd Deskbot
                        pre-order and to the ₹500 refundable deposit.
                      </span>
                    </label>

                    {errors.form && (
                      <div className="po-err" role="alert">
                        {errors.form}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="po-btn po-btn-primary po-btn-lg po-submit"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <span className="po-spinner" /> Opening payment…
                        </>
                      ) : (
                        <>
                          Reserve for ₹500
                          <svg viewBox="0 0 24 24">
                            <path d="M5 12h14M13 6l6 6-6 6" />
                          </svg>
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

function SuccessView({
  reference,
  onClose,
}: {
  reference: string;
  onClose: () => void;
}) {
  return (
    <div className="po-success">
      <div className="po-success-badge">
        <svg viewBox="0 0 24 24">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h2>You&apos;re on the list.</h2>
      <p>
        Your Deskbot is reserved and your ₹500 deposit is confirmed.
        We&apos;ll email you with delivery details before we ship — keep this
        reference handy.
      </p>
      <div className="po-ref">{reference}</div>
      <p className="po-success-note">
        A GenEd account has been created for you. To sign in, use{" "}
        <strong>Forgot password</strong> on the login page with the email you
        used to pre-order.
      </p>
      <div>
        <button
          type="button"
          className="po-btn po-btn-primary po-btn-lg"
          onClick={onClose}
        >
          Done
        </button>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  min?: number;
}

function Field({
  label,
  name,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
  autoComplete,
  min,
}: FieldProps) {
  return (
    <div className={`po-field${error ? " has-error" : ""}`}>
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        min={min}
      />
      {error && <div className="po-err">{error}</div>}
    </div>
  );
}
