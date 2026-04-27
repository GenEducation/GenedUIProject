"use client";

import { ArrowLeft, LogOut, ShieldCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useStudentStore } from "../store/useStudentStore";
import { useEffect, useState } from "react";
import { PartnerRequestModal } from "./PartnerRequestModal";

// Mock data
const MOCK_PARTNERS = [
  { id: "1", code: "OX", name: "Oxford Academy", since: "Sept 2023" },
  { id: "2", code: "ST", name: "Stanford Research", since: "Jan 2024" }
];

const MOCK_PARENTS = [
  { email: "eliza.thorne@email.com", active: true }
];

export function StudentProfile() {
  const router = useRouter();
  const { 
    studentProfile, 
    logoutStudent, 
    availablePartners, 
    fetchAvailablePartners, 
    sendPartnerRequest, 
    partnerRequestStatus, 
    enrolledPartners, 
    fetchEnrolledPartners, 
    isEnrolledPartnersLoading,
    linkParent 
  } = useStudentStore();
  
  useEffect(() => {
    fetchAvailablePartners();
    fetchEnrolledPartners();
  }, [fetchAvailablePartners, fetchEnrolledPartners]);

  const [parentEmailOrPhone, setParentEmailOrPhone] = useState("");
  const [selectedPartnerId, setSelectedPartnerId] = useState("");

  const isLoading = partnerRequestStatus === "loading";

  const username = studentProfile?.username ?? "Julian Thorne";
  const grade = studentProfile?.grade ? `Grade ${studentProfile.grade}` : "PhD Year 2";
  const board = studentProfile?.school_board ?? "Advanced Studies";

  const handleLinkParent = async () => {
    if (parentEmailOrPhone.trim()) {
      await linkParent(parentEmailOrPhone.trim());
      setParentEmailOrPhone(""); // Clear input on attempt
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F3EE] font-sans flex flex-col overflow-y-auto">
      {/* Top Header Logo */}
      <div className="px-8 py-5">
        <div className="flex items-center">
          <img src="/Logo.svg" alt="Scholarly Logo" className="h-10 w-auto" />
        </div>
      </div>

      <div className="flex-1 w-full max-w-4xl mx-auto px-8 pb-20 space-y-12 mt-4">
        {/* Top Controls: Back & Logout */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-[#1a3a2a]/60 hover:text-[#1a3a2a] font-semibold transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <button 
            onClick={logoutStudent}
            className="flex items-center gap-2 border border-red-500/20 text-red-600 px-5 py-2.5 rounded-full hover:bg-red-50 font-bold text-sm transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>

        {/* Title area */}
        <div className="space-y-3 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a3a2a] tracking-tight">
            Student Identity
          </h1>
          <p className="text-[#1a3a2a]/60 text-[15px] leading-relaxed font-medium">
            Manage your academic credentials, enrollment status, and institutional connections within the Scholarly Sanctuary.
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Left Column */}
          <div className="md:col-span-7 space-y-8">
            {/* Personal Information */}
            <div className="bg-[#f0f0eb] border border-[#1a3a2a]/5 rounded-3xl p-8 space-y-6">
              <div className="flex items-center gap-3 text-[#1a3a2a] font-bold">
                <h2 className="text-lg tracking-tight">Personal Information</h2>
              </div>
              
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#1a3a2a]/50">Full Name</label>
                  <div className="bg-white rounded-2xl px-5 py-3.5 text-[15px] font-semibold text-[#1a3a2a] shadow-sm">
                    {username}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#1a3a2a]/50">Grade</label>
                    <div className="bg-white rounded-2xl px-5 py-3.5 text-[15px] font-semibold text-[#1a3a2a] shadow-sm">
                      {grade}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#1a3a2a]/50">Board</label>
                    <div className="bg-white rounded-2xl px-5 py-3.5 text-[15px] font-semibold text-[#1a3a2a] shadow-sm">
                      {board}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Already Enrolled Partners */}
            <div className="space-y-5 pt-4">
              <div className="flex items-center gap-2 text-[#1a3a2a] font-bold pl-2">
                <ShieldCheck size={20} className="text-[#2d6a4a]" />
                <h2 className="text-[17px] tracking-tight">Already Enrolled Partners</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isEnrolledPartnersLoading ? (
                  <div key="loading-partners" className="col-span-full py-4 text-center text-sm font-semibold text-[#1a3a2a]/40">
                    Loading partners...
                  </div>
                ) : enrolledPartners.length === 0 ? (
                  <div key="no-partners" className="col-span-full py-4 text-center text-sm font-semibold text-[#1a3a2a]/40 bg-white rounded-3xl border border-[#1a3a2a]/[0.02]">
                    No partners enrolled yet.
                  </div>
                ) : enrolledPartners.map((partner, index) => (
                  <div key={partner.partner_id || partner.id || `enrolled-${index}`} className="bg-white rounded-3xl p-5 flex items-center gap-4 shadow-sm border border-[#1a3a2a]/[0.02]">
                    <div className="w-11 h-11 rounded-full bg-[#bce4cc]/40 text-[#2d6a4a] flex items-center justify-center font-bold text-[15px]">
                      {(partner.organization || "PT").substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1a3a2a] text-[15px] leading-tight mb-0.5">{partner.organization}</h3>
                      <p className="text-[11px] text-[#1a3a2a]/50 font-bold uppercase tracking-tight">Active</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="md:col-span-5 space-y-8">
            {/* Partner Requests */}
            <div className="bg-[#f0f0eb] border border-[#1a3a2a]/5 rounded-3xl p-8 space-y-6 shadow-sm">
              <div className="flex items-center gap-3 text-[#1a3a2a] font-bold">
                <h2 className="text-lg tracking-tight">Partner Requests</h2>
              </div>
              
              <p className="text-[13px] font-medium text-[#1a3a2a]/60 leading-relaxed">
                Connect your profile with new institutional partners to unlock advanced research modules.
              </p>

              <div className="space-y-4">
                <div className="relative">
                  <select 
                    value={selectedPartnerId}
                    onChange={(e) => setSelectedPartnerId(e.target.value)}
                    className="w-full bg-white rounded-2xl px-5 py-3.5 text-[14px] font-semibold text-[#1a3a2a]/80 outline-none focus:border-[#2d6a4a] appearance-none cursor-pointer shadow-sm border border-transparent disabled:opacity-50"
                    disabled={isLoading}
                  >
                    <option value="" disabled>Select Institution...</option>
                    {availablePartners.map((p, index) => (
                      <option key={p.partner_id || p.id || `avail-${index}`} value={p.partner_id || p.id}>{p.organization}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-[#1a3a2a]/50">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
                
                <button 
                  onClick={() => selectedPartnerId && sendPartnerRequest(selectedPartnerId)}
                  disabled={!selectedPartnerId || isLoading}
                  className="w-full bg-[#2d6a4a] hover:bg-[#1a3a2a] text-white rounded-2xl py-3.5 font-bold text-[14px] transition-colors shadow-lg shadow-[#2d6a4a]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Request"
                  )}
                </button>
              </div>
            </div>

            {/* Parent Access */}
            <div className="bg-white border border-[#1a3a2a]/5 rounded-3xl p-8 space-y-6 shadow-sm">
              <div className="flex items-center gap-3 text-[#1a3a2a] font-bold">
                <h2 className="text-lg tracking-tight">Parent Access</h2>
              </div>
              
              <div className="flex items-center gap-3">
                <input 
                  type="text"
                  placeholder="Guardian's email or phone"
                  value={parentEmailOrPhone}
                  onChange={(e) => setParentEmailOrPhone(e.target.value)}
                  className="flex-1 bg-[#f9f9f9] border border-[#1a3a2a]/5 rounded-2xl px-4 py-3 text-[13px] font-semibold outline-none focus:border-[#2d6a4a] disabled:opacity-50"
                  disabled={isLoading}
                />
                <button 
                  onClick={handleLinkParent}
                  disabled={!parentEmailOrPhone.trim() || isLoading}
                  className="bg-[#bce4cc] text-[#1a3a2a] px-5 py-3 rounded-2xl font-bold text-[14px] hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : "Add"}
                </button>
              </div>

            </div>
          </div>
        </div>
        
      </div>

      <PartnerRequestModal />
    </div>
  );
}
