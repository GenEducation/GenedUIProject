"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { Eye, EyeOff, ArrowLeft, ArrowRight } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { motion, AnimatePresence } from "framer-motion";

interface SignUpData {
  username: string;
  email: string;
  password: string;
  confirmPassword?: string;
  role: "student" | "parent" | "partner";
  age?: string;
  grade?: string;
  school_board?: string;
  phone?: string;
  organization?: string;
  website?: string;
  otp_code?: string;
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

// Role SVGs provided by user
const StudentSVG = () => (
  <svg width="100%" height="100%" viewBox="0 0 420 420" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <rect x="90" y="290" width="240" height="24" rx="12" fill="#8B5CF6"/>
    <rect x="110" y="314" width="16" height="60" fill="#6D28D9"/>
    <rect x="294" y="314" width="16" height="60" fill="#6D28D9"/>
    <rect x="150" y="230" width="120" height="70" rx="10" fill="#0f172a" stroke="#38BDF8" strokeWidth="4"/>
    <circle cx="210" cy="265" r="12" fill="#38BDF8" opacity="0.8"/>
    <rect x="100" y="250" width="40" height="28" rx="4" fill="#F59E0B"/>
    <line x1="120" y1="250" x2="120" y2="278" stroke="#fff" strokeWidth="2"/>
    <rect x="165" y="180" width="90" height="95" rx="40" fill="#22C55E"/>
    <ellipse cx="160" cy="245" rx="22" ry="16" fill="#F4C7A1"/>
    <ellipse cx="260" cy="245" rx="22" ry="16" fill="#F4C7A1"/>
    <circle cx="210" cy="135" r="55" fill="#F4C7A1"/>
    <path d="M160 130 Q170 60 210 70 Q255 60 265 130 Q240 95 210 100 Q180 95 160 130" fill="#1E293B"/>
    <circle cx="190" cy="135" r="5" fill="#111"/>
    <circle cx="230" cy="135" r="5" fill="#111"/>
    <path d="M192 160 Q210 175 228 160" stroke="#111" strokeWidth="4" fill="none" strokeLinecap="round"/>
    <circle cx="320" cy="120" r="12" fill="#38BDF8" opacity="0.8"/>
    <text x="314" y="126" fontSize="14" fill="white">A+</text>
    <circle cx="90" cy="120" r="10" fill="#F59E0B" opacity="0.8"/>
    <text x="84" y="126" fontSize="14" fill="white">★</text>
    <rect x="300" y="190" width="40" height="10" rx="5" fill="#EF4444" transform="rotate(-20 300 190)"/>
  </svg>
);

const ParentSVG = () => (
  <svg width="100%" height="100%" viewBox="0 0 420 420" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <rect x="150" y="180" width="120" height="140" rx="50" fill="#2563EB"/>
    <ellipse cx="130" cy="250" rx="25" ry="18" fill="#F4C7A1"/>
    <ellipse cx="290" cy="250" rx="25" ry="18" fill="#F4C7A1"/>
    <circle cx="210" cy="120" r="60" fill="#F4C7A1"/>
    <path d="M150 120 Q170 40 210 55 Q255 40 270 120 Q240 90 210 95 Q180 90 150 120" fill="#111827"/>
    <circle cx="190" cy="120" r="5" fill="#111"/>
    <circle cx="230" cy="120" r="5" fill="#111"/>
    <path d="M190 145 Q210 165 230 145" stroke="#111" strokeWidth="4" fill="none" strokeLinecap="round"/>
    <rect x="275" y="220" width="70" height="90" rx="12" fill="#0f172a" stroke="#38BDF8" strokeWidth="4"/>
    <circle cx="310" cy="265" r="8" fill="#38BDF8"/>
    <circle cx="90" cy="110" r="25" fill="#22C55E" opacity="0.9"/>
    <text x="78" y="118" fontSize="20" fill="white">👧</text>
    <circle cx="330" cy="110" r="22" fill="#EF4444" opacity="0.9"/>
    <text x="320" y="118" fontSize="18" fill="white">❤</text>
    <ellipse cx="210" cy="360" rx="90" ry="20" fill="#94A3B8" opacity="0.3"/>
  </svg>
);

const PartnerSVG = () => (
  <svg width="100%" height="100%" viewBox="0 0 420 420" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <ellipse cx="210" cy="370" rx="90" ry="18" fill="#64748B" opacity="0.3"/>
    <rect x="150" y="180" width="120" height="150" rx="50" fill="#8B5CF6"/>
    <ellipse cx="135" cy="245" rx="24" ry="18" fill="#F4C7A1"/>
    <ellipse cx="285" cy="245" rx="24" ry="18" fill="#F4C7A1"/>
    <rect x="85" y="210" width="55" height="70" rx="8" fill="#F59E0B"/>
    <line x1="112" y1="210" x2="112" y2="280" stroke="white" strokeWidth="3"/>
    <line x1="290" y1="230" x2="350" y2="180" stroke="#E5E7EB" strokeWidth="6" strokeLinecap="round"/>
    <circle cx="210" cy="120" r="60" fill="#F4C7A1"/>
    <path d="M150 120 Q170 45 210 60 Q250 45 270 120 Q240 90 210 95 Q180 90 150 120" fill="#111827"/>
    <circle cx="190" cy="120" r="14" fill="none" stroke="#111" strokeWidth="3"/>
    <circle cx="230" cy="120" r="14" fill="none" stroke="#111" strokeWidth="3"/>
    <line x1="204" y1="120" x2="216" y2="120" stroke="#111" strokeWidth="3"/>
    <circle cx="190" cy="120" r="4" fill="#111"/>
    <circle cx="230" cy="120" r="4" fill="#111"/>
    <path d="M190 150 Q210 168 230 150" stroke="#111" strokeWidth="4" fill="none" strokeLinecap="round"/>
    <circle cx="90" cy="110" r="22" fill="#22C55E" opacity="0.9"/>
    <text x="80" y="118" fontSize="18" fill="white">A+</text>
    <circle cx="330" cy="110" r="22" fill="#38BDF8" opacity="0.9"/>
    <text x="320" y="118" fontSize="18" fill="white">π</text>
    <circle cx="350" cy="250" r="18" fill="#EF4444" opacity="0.9"/>
    <text x="343" y="257" fontSize="16" fill="white">✓</text>
  </svg>
);

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
  const isSignupEnabled = process.env.NEXT_PUBLIC_ENABLE_SIGNUP !== "false";

  // -- Signup disabled state --------------------------------------------------
  if (!isSignupEnabled) {
    return (
      <div className="rounded-2xl border border-[#042e5c]/10 bg-white/80 backdrop-blur-xl p-8 sm:p-10 shadow-[0_8px_40px_rgba(4,46,92,0.07)] text-center py-20 flex flex-col items-center justify-center">
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

  const nextStep = () => {
    setLocalErrors({});
    if (step === 1) {
      const errors: Record<string, string> = {};
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
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

      if (Object.keys(errors).length > 0) {
        setLocalErrors(errors);
        return;
      }
    }
    setStep((s) => s + 1);
  };

  const prevStep = () => setStep((s) => s - 1);

  const handleRoleSelect = (role: "student" | "parent" | "partner") => {
    const event = {
      target: { name: "role", value: role },
    } as any;
    onChange(event);
    setStep(3);
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      {!googleToken && (
        <>
          <div className="flex justify-center w-full">
            <GoogleLogin
              onSuccess={(credentialResponse) => {
                if (credentialResponse.credential) {
                  setGoogleToken(credentialResponse.credential);
                  onGoogleSuccess(credentialResponse.credential);
                  setStep(2); // Auto advance for Google sign-up
                }
              }}
              onError={() => console.error("Google Sign-up Failed")}
              width="320"
              theme="outline"
              text="signup_with"
              shape="rectangular"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-[10px]">
              <span className="bg-white px-3 text-gray-400 font-bold uppercase tracking-widest">Or continue with</span>
            </div>
          </div>

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
            <label className={labelCls}>Password</label>
            <div className="relative">
              <input
                name="password"
                value={signupData.password}
                onChange={onChange}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
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
              type="password"
              placeholder="••••••••"
              className={`${inputCls(!!errors.confirmPassword || !!localErrors.confirmPassword)}`}
            />
            {(errors.confirmPassword || localErrors.confirmPassword) && (
              <p className={errorCls}>{errors.confirmPassword || localErrors.confirmPassword}</p>
            )}
          </div>
        </>
      )}

      <button
        type="button"
        onClick={nextStep}
        className="group relative w-full overflow-hidden rounded-xl bg-[#059F6D] py-4 text-sm font-bold text-white transition-all duration-300 active:scale-[0.98] shadow-lg shadow-[#059F6D]/20 hover:shadow-xl hover:shadow-[#059F6D]/40"
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          Continue <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </span>
      </button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-8">
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-[#042e5c] font-serif">Select your role</h3>
        <p className="text-xs text-[#042e5c]/50 mt-1">Tell us who you are to customize your experience</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { id: "student", label: "Student", icon: <StudentSVG /> },
          { id: "parent", label: "Parent", icon: <ParentSVG /> },
          { id: "partner", label: "Partner", icon: <PartnerSVG /> },
        ].map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => handleRoleSelect(role.id as any)}
            className={`group relative flex flex-col items-center p-6 rounded-2xl border-2 transition-all duration-300 ${
              signupData.role === role.id
                ? "border-[#059F6D] bg-[#059F6D]/5 shadow-lg shadow-[#059F6D]/10"
                : "border-[#042e5c]/10 bg-white hover:border-[#059F6D]/40 hover:bg-[#059F6D]/5"
            }`}
          >
            <div className="w-full aspect-square mb-4 transition-transform duration-300 group-hover:scale-110">
              {role.icon}
            </div>
            <span className="text-sm font-bold text-[#042e5c]">{role.label}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={prevStep}
        className="flex items-center justify-center gap-2 w-full py-3 text-sm font-bold text-[#042e5c]/50 hover:text-[#042e5c] transition-colors"
      >
        <ArrowLeft size={16} /> Back to Credentials
      </button>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <button
          type="button"
          onClick={prevStep}
          className="p-2 rounded-full hover:bg-[#042e5c]/5 text-[#042e5c]/40 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h3 className="text-lg font-bold text-[#042e5c] font-serif">Complete Profile</h3>
          <p className="text-[10px] uppercase tracking-widest text-[#059F6D] font-bold">{signupData.role} details</p>
        </div>
      </div>

      <div>
        <label className={labelCls}>Username (Required)</label>
        <input
          name="username"
          value={signupData.username}
          onChange={onChange}
          type="text"
          placeholder="Choose a unique name"
          className={inputCls(!!errors.username)}
        />
        {errors.username && <p className={errorCls}>{errors.username}</p>}
      </div>

      {signupData.role === "student" && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Age</label>
              <input
                name="age"
                value={signupData.age || ""}
                onChange={onChange}
                type="number"
                placeholder="e.g. 14"
                className={inputCls(!!errors.age)}
              />
              {errors.age && <p className={errorCls}>{errors.age}</p>}
            </div>
            <div>
              <label className={labelCls}>Grade</label>
              <input
                name="grade"
                value={signupData.grade || ""}
                onChange={onChange}
                type="number"
                placeholder="e.g. 8"
                className={inputCls(!!errors.grade)}
              />
              {errors.grade && <p className={errorCls}>{errors.grade}</p>}
            </div>
          </div>
          <div>
            <label className={labelCls}>School Board</label>
            <input
              name="school_board"
              value={signupData.school_board || ""}
              onChange={onChange}
              type="text"
              placeholder="e.g. CBSE, ICSE"
              className={inputCls(!!errors.school_board)}
            />
            {errors.school_board && <p className={errorCls}>{errors.school_board}</p>}
          </div>
        </>
      )}

      {signupData.role === "parent" && (
        <div>
          <label className={labelCls}>Phone Number</label>
          <input
            name="phone"
            value={signupData.phone || ""}
            onChange={onChange}
            type="tel"
            placeholder="e.g. +1 234 567 8900"
            className={inputCls(!!errors.phone)}
          />
          {errors.phone && <p className={errorCls}>{errors.phone}</p>}
        </div>
      )}

      {signupData.role === "partner" && (
        <>
          <div>
            <label className={labelCls}>Organization</label>
            <input
              name="organization"
              value={signupData.organization || ""}
              onChange={onChange}
              type="text"
              placeholder="School or Institution name"
              className={inputCls(!!errors.organization)}
            />
            {errors.organization && <p className={errorCls}>{errors.organization}</p>}
          </div>
          <div>
            <label className={labelCls}>Website (Optional)</label>
            <input
              name="website"
              value={signupData.website || ""}
              onChange={onChange}
              type="url"
              placeholder="https://example.com"
              className={inputCls(false)}
            />
          </div>
        </>
      )}

      {/* Summary of hidden errors (e.g. from Step 1) */}
      {!googleToken && (errors.email || errors.password || errors.confirmPassword) && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold flex items-center gap-2 animate-pulse">
          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
          There are errors in your account credentials. Please go back to Step 1.
        </div>
      )}

      {errors.root && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
          {errors.root}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="group relative w-full overflow-hidden rounded-xl bg-[#059F6D] py-4 text-sm font-bold text-white transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 shadow-lg shadow-[#059F6D]/20 hover:shadow-xl hover:shadow-[#059F6D]/40"
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {isSubmitting ? "Forging credentials…" : "Create Account"}
          {!isSubmitting && <ArrowRight size={16} />}
        </span>
      </button>
    </div>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        console.log("Form submission triggered at step", step);
        if (step === 3) {
          console.log("Calling onSubmit with data:", signupData);
          onSubmit(e);
        }
      }}
      className="space-y-8 rounded-[2.5rem] border border-[#042e5c]/10 bg-white/90 backdrop-blur-xl p-8 sm:p-12 shadow-[0_32px_80px_rgba(4,46,92,0.08)] relative overflow-hidden min-h-[500px]"
    >
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-1.5 flex gap-1 px-1">
        {[1, 2, 3].map((s) => (
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
            {step === 3 && renderStep3()}
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
