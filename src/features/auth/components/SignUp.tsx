"use client";

import { ChangeEvent, FormEvent } from "react";

interface SignUpData {
  username: string;
  email: string;
  password: string;
  role: "student" | "parent" | "partner";
  age?: string;
  grade?: string;
  school_board?: string;
  partner_id?: string;
  phone?: string;
  organization?: string;
  website?: string;
}

interface SignUpProps {
  signupData: SignUpData;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSwitchToSignin: () => void;
  isSubmitting: boolean;
  errors: Record<string, string>;
}

export function SignUp({
  signupData,
  onChange,
  onSubmit,
  onSwitchToSignin,
  isSubmitting,
  errors,
}: SignUpProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-8 rounded-[2.5rem] border border-[#2D5540]/10 bg-[#F9F8F4] p-8 sm:p-10 shadow-xl shadow-[#0E1F2B]/5"
    >
      <div className="space-y-5">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#2D3E51]/60 mb-2 pl-1">
            Username
          </label>
          <input
            name="username"
            value={signupData.username}
            onChange={onChange}
            type="text"
            placeholder="Your name"
            className={`w-full rounded-2xl border ${errors.username ? 'border-rose-500' : 'border-[#2D5540]/15'} bg-white px-5 py-3.5 text-sm text-[#0E1F2B] transition-all placeholder:text-[#0E1F2B]/30 hover:border-[#2D5540]/30 focus:border-[#2D5540] focus:outline-none focus:ring-4 focus:ring-[#2D5540]/10`}
          />
          {errors.username && <p className="text-rose-500 text-[10px] font-bold mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1">{errors.username}</p>}
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#2D3E51]/60 mb-2 pl-1">
            Role
          </label>
          <select
            name="role"
            value={signupData.role}
            onChange={onChange}
            className="w-full rounded-2xl border border-[#2D5540]/15 bg-white px-5 py-3.5 text-sm text-[#0E1F2B] transition-all outline-none hover:border-[#2D5540]/30 focus:border-[#2D5540] focus:ring-4 focus:ring-[#2D5540]/10"
          >
            <option value="student">Student</option>
            <option value="parent">Parent</option>
            <option value="partner">Partner</option>
          </select>
        </div>

        {signupData.role === "student" && (
          <>
            {/* Grouped Age and Grade horizontally to save vertical space */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#2D3E51]/60 mb-2 pl-1">
                  Age
                </label>
                <input
                  name="age"
                  value={signupData.age || ""}
                  onChange={onChange}
                  type="number"
                  placeholder="e.g. 14"
                  className={`w-full rounded-2xl border ${errors.age ? 'border-rose-500' : 'border-[#2D5540]/15'} bg-white px-5 py-3.5 text-sm text-[#0E1F2B] transition-all placeholder:text-[#0E1F2B]/30 hover:border-[#2D5540]/30 focus:border-[#2D5540] focus:outline-none focus:ring-4 focus:ring-[#2D5540]/10`}
                />
                {errors.age && <p className="text-rose-500 text-[10px] font-bold mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1">{errors.age}</p>}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#2D3E51]/60 mb-2 pl-1">
                  Grade
                </label>
                <input
                  name="grade"
                  value={signupData.grade || ""}
                  onChange={onChange}
                  type="text"
                  placeholder="e.g. 8th"
                  className={`w-full rounded-2xl border ${errors.grade ? 'border-rose-500' : 'border-[#2D5540]/15'} bg-white px-5 py-3.5 text-sm text-[#0E1F2B] transition-all placeholder:text-[#0E1F2B]/30 hover:border-[#2D5540]/30 focus:border-[#2D5540] focus:outline-none focus:ring-4 focus:ring-[#2D5540]/10`}
                />
                {errors.grade && <p className="text-rose-500 text-[10px] font-bold mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1">{errors.grade}</p>}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#2D3E51]/60 mb-2 pl-1">
                School Board
              </label>
              <input
                name="school_board"
                value={signupData.school_board || ""}
                onChange={onChange}
                type="text"
                placeholder="e.g. CBSE, State Board"
                className={`w-full rounded-2xl border ${errors.school_board ? 'border-rose-500' : 'border-[#2D5540]/15'} bg-white px-5 py-3.5 text-sm text-[#0E1F2B] transition-all placeholder:text-[#0E1F2B]/30 hover:border-[#2D5540]/30 focus:border-[#2D5540] focus:outline-none focus:ring-4 focus:ring-[#2D5540]/10`}
              />
              {errors.school_board && <p className="text-rose-500 text-[10px] font-bold mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1">{errors.school_board}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#2D3E51]/60 mb-2 pl-1">
                Partner ID (Optional)
              </label>
              <input
                name="partner_id"
                value={signupData.partner_id || ""}
                onChange={onChange}
                type="text"
                placeholder="e.g. PARTNER123"
                className="w-full rounded-2xl border border-[#2D5540]/15 bg-white px-5 py-3.5 text-sm text-[#0E1F2B] transition-all placeholder:text-[#0E1F2B]/30 hover:border-[#2D5540]/30 focus:border-[#2D5540] focus:outline-none focus:ring-4 focus:ring-[#2D5540]/10"
              />
            </div>
          </>
        )}

        {signupData.role === "parent" && (
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#2D3E51]/60 mb-2 pl-1">
              Phone Number
            </label>
            <input
              name="phone"
              value={signupData.phone || ""}
              onChange={onChange}
              type="tel"
              placeholder="e.g. +1 234 567 8900"
              className={`w-full rounded-2xl border ${errors.phone ? 'border-rose-500' : 'border-[#2D5540]/15'} bg-white px-5 py-3.5 text-sm text-[#0E1F2B] transition-all placeholder:text-[#0E1F2B]/30 hover:border-[#2D5540]/30 focus:border-[#2D5540] focus:outline-none focus:ring-4 focus:ring-[#2D5540]/10`}
            />
            {errors.phone && <p className="text-rose-500 text-[10px] font-bold mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1">{errors.phone}</p>}
          </div>
        )}

        {signupData.role === "partner" && (
          <>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#2D3E51]/60 mb-2 pl-1">
                Organization
              </label>
              <input
                name="organization"
                value={signupData.organization || ""}
                onChange={onChange}
                type="text"
                placeholder="e.g. ABC School"
                className={`w-full rounded-2xl border ${errors.organization ? 'border-rose-500' : 'border-[#2D5540]/15'} bg-white px-5 py-3.5 text-sm text-[#0E1F2B] transition-all placeholder:text-[#0E1F2B]/30 hover:border-[#2D5540]/30 focus:border-[#2D5540] focus:outline-none focus:ring-4 focus:ring-[#2D5540]/10`}
              />
              {errors.organization && <p className="text-rose-500 text-[10px] font-bold mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1">{errors.organization}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#2D3E51]/60 mb-2 pl-1">
                Website (Optional)
              </label>
              <input
                name="website"
                value={signupData.website || ""}
                onChange={onChange}
                type="url"
                placeholder="e.g. https://example.com"
                className="w-full rounded-2xl border border-[#2D5540]/15 bg-white px-5 py-3.5 text-sm text-[#0E1F2B] transition-all placeholder:text-[#0E1F2B]/30 hover:border-[#2D5540]/30 focus:border-[#2D5540] focus:outline-none focus:ring-4 focus:ring-[#2D5540]/10"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#2D3E51]/60 mb-2 pl-1">
            Email Address
          </label>
          <input
            name="email"
            value={signupData.email}
            onChange={onChange}
            type="email"
            placeholder="scholar@gened.edu"
            className={`w-full rounded-2xl border ${errors.email ? 'border-rose-500' : 'border-[#2D5540]/15'} bg-white px-5 py-3.5 text-sm text-[#0E1F2B] transition-all placeholder:text-[#0E1F2B]/30 hover:border-[#2D5540]/30 focus:border-[#2D5540] focus:outline-none focus:ring-4 focus:ring-[#2D5540]/10`}
          />
          {errors.email && <p className="text-rose-500 text-[10px] font-bold mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#2D3E51]/60 mb-2 pl-1">
            Password
          </label>
          <input
            name="password"
            value={signupData.password}
            onChange={onChange}
            type="password"
            placeholder="••••••••"
            className={`w-full rounded-2xl border ${errors.password ? 'border-rose-500' : 'border-[#2D5540]/15'} bg-white px-5 py-3.5 text-sm text-[#0E1F2B] transition-all placeholder:text-[#0E1F2B]/30 hover:border-[#2D5540]/30 focus:border-[#2D5540] focus:outline-none focus:ring-4 focus:ring-[#2D5540]/10 font-mono tracking-widest`}
          />
          {errors.password && <p className="text-rose-500 text-[10px] font-bold mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1">{errors.password}</p>}
        </div>
      </div>

      {errors.root ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700 animate-in fade-in slide-in-from-top-2">
          {errors.root}
        </div>
      ) : null}

      <div className="space-y-6 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-[#042e5c] py-4 text-sm font-bold text-white shadow-lg shadow-[#042e5c]/20 transition-all hover:bg-[#0a4a8f] hover:shadow-xl hover:shadow-[#042e5c]/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100"
        >
          {isSubmitting ? "Forging credentials..." : "Create account"}
        </button>

        <div className="text-center text-sm font-medium text-[#2D3E51]/60">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToSignin}
            className="font-bold text-[#042e5c] hover:text-[#0a4a8f] hover:underline transition-colors"
          >
            Log in
          </button>
        </div>
      </div>
    </form>
  );
}
