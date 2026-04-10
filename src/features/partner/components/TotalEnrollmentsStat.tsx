"use client";

import React from "react";
import { usePartnerStore } from "../store/usePartnerStore";

export function TotalEnrollmentsStat() {
  const totalEnrollments = usePartnerStore((state) => state.totalEnrollments);

  return (
    <div className="bg-white rounded-[1.5rem] p-4 md:p-5 border border-[#1A3D2C]/10 shadow-xl flex items-center justify-between shrink-0">
      <h4 className="text-[9px] font-black text-[#1A3D2C]/90 uppercase tracking-widest">
        Total Enrollments
      </h4>
      <p className="text-2xl lg:text-3xl font-black text-[#1A3D2C] tracking-tighter">
        {totalEnrollments.toLocaleString()}
      </p>
    </div>
  );
}
