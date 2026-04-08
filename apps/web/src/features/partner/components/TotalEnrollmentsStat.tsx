"use client";

import React from "react";
import { usePartnerStore } from "../store/usePartnerStore";

export function TotalEnrollmentsStat() {
  const totalEnrollments = usePartnerStore((state) => state.totalEnrollments);

  return (
    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 border border-[#1A3D2C]/10 shadow-xl flex flex-col">
      <h4 className="text-[9px] md:text-[10px] font-black text-[#1A3D2C]/90 uppercase mb-3 md:mb-4 tracking-widest">
        Total Enrollments
      </h4>
      <div className="space-y-1">
        <p className="text-3xl md:text-4xl lg:text-5xl font-black text-[#1A3D2C] tracking-tighter">
          {totalEnrollments.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
