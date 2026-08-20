"use client";

import { ChangeEvent, FormEvent, useState, useEffect } from "react";
import { Eye, EyeOff, ArrowLeft, ArrowRight } from "lucide-react";
import { GoogleAuthButton } from "./GoogleAuthButton";
import { motion, AnimatePresence } from "framer-motion";
import { RoleCard } from "./RoleCard";
import { fetchAllTaxonomyGrades } from "@/features/subjects/subjectCatalog";
import { Select } from "@/components/ui/Select";

interface SignUpData {
  username?: string;
  email: string;
  password: string;
  confirmPassword?: string;
  role: "student" | "parent";
  age?: string;
  grade?: string;
  phone?: string;
  otp_code?: string;
  parent_email?: string;
}

interface SignUpProps {
  signupData: SignUpData;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSwitchToSignin: () => void;
  isSubmitting: boolean;
  errors: Record<string, string>;
  onGoogleSuccess: (token: string) => void;
}

// Shared input class builder
const inputCls = (hasError: boolean) =>
  `w-full rounded-xl border ${
    hasError
      ? "border-rose-400 bg-rose-50/30"
      : "border-[#042e5c]/15 bg-white/70"
  } px-5 py-3.5 text-sm text-[#0E1F2B] transition-all duration-200 placeholder:text-[#0E1F2B]/25 hover:border-[#059F6D]/40 focus:border-[#059F6D] focus:outline-none focus:ring-2 focus:ring-[#059F6D]/15`;

const labelCls =
  "block text-[9px] font-bold uppercase tracking-[0.28em] text-[#042e5c]/45 mb-2.5 pl-0.5";

const errorCls =
  "text-rose-500 text-[10px] font-semibold mt-1.5 ml-0.5 italic animate-in fade-in slide-in-from-top-1";

// Role illustration slots. Each role maps to an array of image URLs so a card's
// artwork can auto-rotate when more than one illustration is supplied later.
const ROLE_ILLUSTRATIONS: Record<"student" | "parent", string[]> = {
  student: ["/illustrations/role-student.svg"],
  parent: ["/illustrations/role-parent.svg"],
};


export function SignUp({
  signupData,
  onChange,
  onSubmit,
  onSwitchToSignin,
  isSubmitting,
  errors,
  onGoogleSuccess,
}: SignUpProps) {
  const [step, setStep] = useState(1);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSentMessage, setOtpSentMessage] = useState("");
  const [hasPersonalEmail, setHasPersonalEmail] = useState(false);
  const [availableGrades, setAvailableGrades] = useState<number[]>([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const isSignupEnabled = process.env.NEXT_PUBLIC_ENABLE_SIGNUP !== "false";

  useEffect(() => {
    fetchAllTaxonomyGrades()
      .then(setAvailableGrades)
      .catch((err) => console.warn("Failed to load taxonomy grades during signup:", err));
  }, []);

  // -- Signup disabled state --------------------------------------------------
  if (!isSignupEnabled) {
    return (
      <div className="text-center py-10 flex flex-col items-center justify-center">
        <div className="w-20 h-20 bg-[#059F6D]/8 rounded-full flex items-center justify-center mb-6">
          <svg
            className="w-10 h-10 text-[#059F6D]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-extrabold text-[#042e5c] mb-4 font-serif">
          <em>Registration</em> Restricted
        </h3>
        <p className="text-[#2D3E51]/60 text-sm font-medium leading-relaxed max-w-xs mb-10">
          This page is not for public access currently. Please contact us at{" "}
          <a
            href="mailto:support@geneducation.ai"
            className="text-[#059F6D] font-bold hover:underline"
          >
            support@geneducation.ai
          </a>
        </p>
        <button
          type="button"
          onClick={onSwitchToSignin}
          className="group flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white border border-[#042e5c]/12 text-[#042e5c] text-sm font-bold shadow-sm transition-all hover:border-[#059F6D]/30 hover:text-[#059F6D] active:scale-[0.98]"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back to Login
        </button>
      </div>
    );
  }

  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  /**
   * Client-side gate for the final step. Both roles now finish at step 2, so
   * this runs on submit rather than on a "next" transition.
   */
  const validateStep2 = () => {
    const errors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    
    if (signupData.role === "student") {
      if (hasPersonalEmail) {
        if (!signupData.email?.trim()) {
          errors.email = "Personal email is required";
        } else if (!emailRegex.test(signupData.email)) {
          errors.email = "Invalid email format";
        }
        if (signupData.username?.trim() && signupData.username.trim().length < 3) {
          errors.username = "Username must be at least 3 characters";
        }
        if (signupData.parent_email?.trim() && !emailRegex.test(signupData.parent_email)) {
          errors.parent_email = "Invalid parent email format";
        }
        if (isOtpSent && !signupData.otp_code?.trim()) {
          errors.email = "Please enter the OTP code sent to your email";
        }
      } else {
        if (!signupData.username?.trim()) {
          errors.username = "Username is required";
        } else if (signupData.username.trim().length < 3) {
          errors.username = "Username must be at least 3 characters";
        }
        if (!signupData.parent_email?.trim()) {
          errors.parent_email = "Parent email is required";
        } else if (!emailRegex.test(signupData.parent_email)) {
          errors.parent_email = "Invalid parent email format";
        }
      }
      if (!signupData.password.trim()) {
        errors.password = "Password is required";
      } else if (signupData.password.length < 6) {
        errors.password = "Password must be at least 6 characters";
      }
      if (signupData.password !== signupData.confirmPassword) {
        errors.confirmPassword = "Passwords do not match";
      }
      if (!signupData.grade) {
        errors.grade = "Please select your grade";
      }
    } else {
      if (!googleToken) {
        if (!signupData.email.trim()) {
          errors.email = "Email is required";
        } else if (!emailRegex.test(signupData.email)) {
          errors.email = "Invalid email format";
        }
        if (!signupData.password.trim()) {
          errors.password = "Password is required";
        } else if (signupData.password.length < 6) {
          errors.password = "Password must be at least 6 characters";
        }
        if (signupData.password !== signupData.confirmPassword) {
          errors.confirmPassword = "Passwords do not match";
        }
        if (isOtpSent && !signupData.otp_code?.trim()) {
          errors.email = "Please enter the OTP code sent to your email";
        }
      }
    }

    return errors;
  };

  const prevStep = () => setStep((s) => s - 1);

  const handleRoleSelect = (role: "student" | "parent") => {
    const event = {
      target: { name: "role", value: role },
    } as any;
    onChange(event);
    setStep(2);
  };

  const renderStep1 = () => (
    <div className="space-y-8">
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-[#042e5c] font-serif">Let&apos;s personalize your experience</h3>
        <p className="text-xs text-[#042e5c]/50 mt-1">Select your role to get started</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { id: "student" as const, label: "Student", illustrations: ROLE_ILLUSTRATIONS.student },
          { id: "parent" as const, label: "Parent", illustrations: ROLE_ILLUSTRATIONS.parent },
          // Partner accounts are provisioned by an administrator, not via public
          // self-signup. (Removed intentionally.)
        ].map((role, i) => (
          <RoleCard
            key={role.id}
            label={role.label}
            illustrations={role.illustrations}
            selected={signupData.role === role.id}
            onSelect={() => handleRoleSelect(role.id)}
            startDelay={i * 1500}
          />
        ))}
      </div>
    </div>
  );

  const handleGradeSelect = (grade: number) => {
    const event = {
      target: { name: "grade", value: String(grade) },
    } as any;
    onChange(event);
  };

  const renderStep2 = () => {
    if (signupData.role === "student") {
      return (
        <div className="space-y-6">
          <button
            type="button"
            onClick={prevStep}
            aria-label="Back to role selection"
            className="-ml-2 p-2 rounded-full hover:bg-[#042e5c]/5 text-[#042e5c]/40 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex items-center gap-2.5 bg-[#042e5c]/5 p-4 rounded-xl border border-[#042e5c]/10">
            <input
              type="checkbox"
              id="hasPersonalEmail"
              checked={hasPersonalEmail}
              onChange={(e) => {
                setHasPersonalEmail(e.target.checked);
                setLocalErrors({});
              }}
              className="w-4 h-4 accent-[#059F6D] cursor-pointer"
            />
            <label htmlFor="hasPersonalEmail" className="text-xs font-bold text-[#042e5c] cursor-pointer select-none">
              I want to sign up with my personal email address
            </label>
          </div>

          {hasPersonalEmail ? (
            <>
              <div>
                <label className={labelCls}>Personal Email Address</label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      name="email"
                      value={signupData.email}
                      onChange={onChange}
                      type="email"
                      placeholder="scholar@example.com"
                      className={inputCls(!!errors.email || !!localErrors.email)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!signupData.email) {
                        setLocalErrors({ email: "Email is required to send OTP" });
                        return;
                      }
                      setIsSendingOtp(true);
                      setOtpSentMessage("");
                      setLocalErrors({});
                      try {
                        const { sendOtp } = await import("../authService");
                        await sendOtp(signupData.email);
                        setIsOtpSent(true);
                        setOtpSentMessage("OTP sent to your email!");
                      } catch (err: any) {
                        setLocalErrors({ email: err.message || "Failed to send OTP" });
                      } finally {
                        setIsSendingOtp(false);
                      }
                    }}
                    disabled={isSendingOtp || !signupData.email}
                    className="px-6 py-3.5 rounded-xl bg-[#042e5c]/5 text-[#042e5c] text-xs font-bold transition-all hover:bg-[#042e5c]/10 active:scale-95 disabled:opacity-50"
                  >
                    {isSendingOtp ? "Sending..." : isOtpSent ? "Resend" : "Verify"}
                  </button>
                </div>
                {otpSentMessage && (
                  <p className="text-[#059F6D] text-[10px] font-bold mt-1.5 ml-0.5 tracking-tight animate-in fade-in">
                    {otpSentMessage}
                  </p>
                )}
                {(errors.email || localErrors.email) && (
                  <p className={errorCls}>{errors.email || localErrors.email}</p>
                )}
              </div>

              {isOtpSent && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className={labelCls}>OTP Code</label>
                  <input
                    name="otp_code"
                    value={signupData.otp_code || ""}
                    onChange={onChange}
                    type="text"
                    placeholder="Enter 6-digit code"
                    className={inputCls(false)}
                    maxLength={6}
                  />
                  <p className="text-[#042e5c]/40 text-[9px] mt-1.5 ml-0.5 font-medium">
                    Check your inbox for the verification code
                  </p>
                </div>
              )}

              <div>
                <label className={labelCls}>Choose a Username (Optional)</label>
                <input
                  name="username"
                  value={signupData.username || ""}
                  onChange={onChange}
                  type="text"
                  placeholder="e.g. creative_coder"
                  className={inputCls(!!errors.username || !!localErrors.username)}
                />
                {(errors.username || localErrors.username) && (
                  <p className={errorCls}>{errors.username || localErrors.username}</p>
                )}
              </div>

              <div>
                <label className={labelCls}>Parent or Guardian's Email Address (Optional)</label>
                <input
                  name="parent_email"
                  value={signupData.parent_email || ""}
                  onChange={onChange}
                  type="email"
                  placeholder="parent@example.com"
                  className={inputCls(!!errors.parent_email || !!localErrors.parent_email)}
                />
                <p className="text-[#042e5c]/40 text-[9px] mt-1.5 ml-0.5 font-medium leading-relaxed">
                  Optional. Link parent now to grant them dashboard access.
                </p>
                {(errors.parent_email || localErrors.parent_email) && (
                  <p className={errorCls}>{errors.parent_email || localErrors.parent_email}</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div>
                <label className={labelCls}>Choose a Username</label>
                <input
                  name="username"
                  value={signupData.username || ""}
                  onChange={onChange}
                  type="text"
                  placeholder="e.g. creative_coder"
                  className={inputCls(!!errors.username || !!localErrors.username)}
                />
                {(errors.username || localErrors.username) && (
                  <p className={errorCls}>{errors.username || localErrors.username}</p>
                )}
              </div>

              <div>
                <label className={labelCls}>Parent or Guardian's Email Address</label>
                <input
                  name="parent_email"
                  value={signupData.parent_email || ""}
                  onChange={onChange}
                  type="email"
                  placeholder="parent@example.com"
                  className={inputCls(!!errors.parent_email || !!localErrors.parent_email)}
                />
                <p className="text-[#042e5c]/40 text-[9px] mt-1.5 ml-0.5 font-medium leading-relaxed">
                  Required for account confirmation. Your parent will receive an email to confirm and link accounts.
                </p>
                {(errors.parent_email || localErrors.parent_email) && (
                  <p className={errorCls}>{errors.parent_email || localErrors.parent_email}</p>
                )}
              </div>
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Password</label>
              <div className="relative">
                <input
                  name="password"
                  value={signupData.password}
                  onChange={onChange}
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  className={`${inputCls(!!errors.password || !!localErrors.password)} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#042e5c]/30 hover:text-[#059F6D] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {(errors.password || localErrors.password) && (
                <p className={errorCls}>{errors.password || localErrors.password}</p>
              )}
            </div>

            <div>
              <label className={labelCls}>Confirm Password</label>
              <input
                name="confirmPassword"
                value={signupData.confirmPassword || ""}
                onChange={onChange}
                type={showPassword ? "text" : "password"}
                placeholder="Confirm your password"
                className={inputCls(!!errors.confirmPassword || !!localErrors.confirmPassword)}
              />
              {(errors.confirmPassword || localErrors.confirmPassword) && (
                <p className={errorCls}>{errors.confirmPassword || localErrors.confirmPassword}</p>
              )}
            </div>
          </div>

          <div>
            <label className={labelCls}>What grade are you in?</label>
            {/*
              Grades here pick the student's own year, not a subject. The list
              is fetched from the unauthenticated taxonomy endpoint because
              sign-up runs before a JWT exists. Uses the shared Select so the
              control matches every other dropdown in the app.
            */}
            <Select
              size="lg"
              accentColor="#059F6D"
              searchable={false}
              aria-label="What grade are you in?"
              placeholder="Select your grade"
              value={signupData.grade ?? ""}
              onChange={(value) => handleGradeSelect(Number(value))}
              options={availableGrades.map((grade) => ({
                value: String(grade),
                label: `Grade ${grade}`,
              }))}
              error={errors.grade || localErrors.grade}
            />
          </div>

          {errors.root && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
              {errors.root}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !signupData.grade}
            className="group relative w-full overflow-hidden rounded-xl bg-[#059F6D] py-3.5 text-sm font-bold text-white transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 shadow-lg shadow-[#059F6D]/20 hover:shadow-xl hover:shadow-[#059F6D]/40"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isSubmitting ? "Creating account…" : "Create Account"}
              {!isSubmitting && <ArrowRight size={16} />}
            </span>
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={prevStep}
          aria-label="Back to role selection"
          className="-ml-2 p-2 rounded-full hover:bg-[#042e5c]/5 text-[#042e5c]/40 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>

        {!googleToken && (
          <>
            <div>
              <label className={labelCls}>Email Address</label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <input
                    name="email"
                    value={signupData.email}
                    onChange={onChange}
                    type="email"
                    placeholder="scholar@gened.edu"
                    className={inputCls(!!errors.email || !!localErrors.email)}
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!signupData.email) {
                      setLocalErrors({ email: "Email is required to send OTP" });
                      return;
                    }
                    setIsSendingOtp(true);
                    setOtpSentMessage("");
                    setLocalErrors({});
                    try {
                      const { sendOtp } = await import("../authService");
                      await sendOtp(signupData.email);
                      setIsOtpSent(true);
                      setOtpSentMessage("OTP sent to your email!");
                    } catch (err: any) {
                      setLocalErrors({ email: err.message || "Failed to send OTP" });
                    } finally {
                      setIsSendingOtp(false);
                    }
                  }}
                  disabled={isSendingOtp || !signupData.email}
                  className="px-6 py-3.5 rounded-xl bg-[#042e5c]/5 text-[#042e5c] text-xs font-bold transition-all hover:bg-[#042e5c]/10 active:scale-95 disabled:opacity-50"
                >
                  {isSendingOtp ? "Sending..." : isOtpSent ? "Resend" : "Verify"}
                </button>
              </div>
              {otpSentMessage && (
                <p className="text-[#059F6D] text-[10px] font-bold mt-1.5 ml-0.5 tracking-tight animate-in fade-in">
                  {otpSentMessage}
                </p>
              )}
              {(errors.email || localErrors.email) && (
                <p className={errorCls}>{errors.email || localErrors.email}</p>
              )}
            </div>

            {isOtpSent && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className={labelCls}>OTP Code</label>
                <input
                  name="otp_code"
                  value={signupData.otp_code || ""}
                  onChange={onChange}
                  type="text"
                  placeholder="Enter 6-digit code"
                  className={inputCls(false)}
                  maxLength={6}
                />
                <p className="text-[#042e5c]/40 text-[9px] mt-1.5 ml-0.5 font-medium">
                  Check your inbox for the verification code
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Password</label>
                <div className="relative">
                  <input
                    name="password"
                    value={signupData.password}
                    onChange={onChange}
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    className={`${inputCls(!!errors.password || !!localErrors.password)} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#042e5c]/30 hover:text-[#059F6D] transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {(errors.password || localErrors.password) && (
                  <p className={errorCls}>{errors.password || localErrors.password}</p>
                )}
              </div>

              <div>
                <label className={labelCls}>Confirm Password</label>
                <input
                  name="confirmPassword"
                  value={signupData.confirmPassword || ""}
                  onChange={onChange}
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  className={`${inputCls(!!errors.confirmPassword || !!localErrors.confirmPassword)}`}
                />
                {(errors.confirmPassword || localErrors.confirmPassword) && (
                  <p className={errorCls}>{errors.confirmPassword || localErrors.confirmPassword}</p>
                )}
              </div>
            </div>
          </>
        )}

        <div>
          <label className={labelCls}>Phone Number</label>
          <input
            name="phone"
            value={signupData.phone || ""}
            onChange={onChange}
            type="tel"
            placeholder="10-digit mobile number"
            className={inputCls(!!errors.phone)}
          />
          {errors.phone && <p className={errorCls}>{errors.phone}</p>}
        </div>

        {errors.root && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-5 py-3.5 text-sm font-medium text-rose-700">
            {errors.root}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="group relative w-full overflow-hidden rounded-xl bg-[#059F6D] py-3.5 text-sm font-bold text-white transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 shadow-lg shadow-[#059F6D]/20 hover:shadow-xl hover:shadow-[#059F6D]/40"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {isSubmitting ? "Creating account…" : "Create Account"}
            {!isSubmitting && <ArrowRight size={16} />}
          </span>
        </button>

        {!googleToken && (
          <>
            {/* Divider — no opaque fill, the card surface is translucent */}
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-[#042e5c]/10" />
              <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-[#042e5c]/35">
                or
              </span>
              <span className="h-px flex-1 bg-[#042e5c]/10" />
            </div>

            <GoogleAuthButton
              label="Sign up with Google"
              onSuccess={(credential) => {
                setGoogleToken(credential);
                onGoogleSuccess(credential);
              }}
            />
          </>
        )}
      </div>
    );
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (step !== 2) return;
        const stepErrors = validateStep2();
        if (Object.keys(stepErrors).length > 0) {
          setLocalErrors(stepErrors);
          return;
        }
        setLocalErrors({});
        onSubmit(e);
      }}
      className="space-y-7 relative"
    >
      {/* Progress Bar */}
      <div className="w-full h-1.5 flex gap-1">
        {[1, 2].map((s) => (
          <div
            key={s}
            className={`h-full flex-1 transition-all duration-500 rounded-full ${
              s <= step ? "bg-[#059F6D]" : "bg-[#042e5c]/5"
            }`}
          />
        ))}
      </div>

      <div className="pt-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="text-center text-xs font-medium text-[#2D3E51]/40 pt-4">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToSignin}
          className="font-bold text-[#059F6D] hover:text-[#047a54] transition-colors"
        >
          Log in
        </button>
      </div>
    </form>
  );
}
