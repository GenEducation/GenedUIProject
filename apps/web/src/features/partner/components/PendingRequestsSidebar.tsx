"use client";

import React from "react";
import { ChevronRight } from "lucide-react";
import { usePartnerStore } from "../store/usePartnerStore";

export function PendingRequestsSidebar() {
  const pendingRequests = usePartnerStore((state) => state.pendingRequests);
  const numberOfPendingRequests = usePartnerStore((state) => state.numberOfPendingRequests);
  const setSelectedStudent = usePartnerStore((state) => state.setSelectedStudent);

  return (
    <div className="flex-1 bg-[#F8F9F8] rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 border border-gray-100/50 shadow-xl flex flex-col min-h-[300px] lg:min-h-0 overflow-hidden">
      <div className="flex justify-between items-center mb-6 md:mb-8">
        <h4 className="text-[9px] md:text-[10px] font-black text-[#1A3D2C] uppercase tracking-widest">
          Pending Requests
        </h4>
        <span className="px-2 md:px-3 py-0.5 md:py-1 bg-red-500 text-white text-[8px] md:text-[9px] font-black rounded-full">
          {numberOfPendingRequests}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-2 pr-1 md:pr-2">
        {pendingRequests.map((request) => (
          <button
            key={request.id}
            onClick={() => setSelectedStudent(request)}
            className="w-full flex items-center justify-between p-3 md:p-4 bg-white rounded-xl md:rounded-2xl border border-transparent hover:border-[#1A3D2C]/5 transition-all text-left shadow-sm hover:shadow-md group"
          >
            <span className="text-[11px] md:text-xs font-bold text-[#1A3D2C]/80 group-hover:text-[#1A3D2C] transition-colors">
              {request.name}
            </span>
            <ChevronRight
              size={12}
              className="text-gray-300 group-hover:text-[#1A3D2C] transition-all group-hover:translate-x-1"
            />
          </button>
        ))}
        {pendingRequests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
            <p className="text-xs font-bold text-[#1A3D2C]/20 uppercase tracking-widest">No pending requests</p>
          </div>
        )}
      </div>
    </div>
  );
}
