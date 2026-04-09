"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePartnerStore } from "../store/usePartnerStore";

export function StudentRegistryTable() {
  const students = usePartnerStore((state) => state.students);
  const setSelectedStudent = usePartnerStore((state) => state.setSelectedStudent);

  return (
    <div className="lg:col-span-8 flex flex-col bg-[#FBFCFB] rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-8 border border-gray-100 shadow-xl min-h-[400px] lg:min-h-0 overflow-hidden">
      <div className="flex justify-between items-center mb-6 md:mb-10">
        <h3 className="text-lg md:text-2xl font-black text-[#1A3D2C]">Student Registry</h3>
      </div>

      <div className="flex-1 overflow-x-auto lg:overflow-y-auto scrollbar-hide pr-1 md:pr-2">
        <table className="w-full text-left min-w-[500px] lg:min-w-0">
          <thead>
            <tr className="border-b border-[#1A3D2C]/5">
              <th className="pb-4 md:pb-6 text-[9px] md:text-[10px] font-black text-[#1A3D2C]/90 uppercase tracking-widest">
                Student Name
              </th>
              <th className="pb-4 md:pb-6 text-[9px] md:text-[10px] font-black text-[#1A3D2C]/90 uppercase tracking-widest">
                Grade
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A3D2C]/5">
            {students.map((student) => (
              <tr
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className="group hover:bg-white transition-all cursor-pointer"
              >
                <td className="py-2.5 md:py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#D1E6D9]/50 text-[#1A3D2C] text-[10px] font-bold shadow-sm">
                      {student.initials}
                    </div>
                    <span className="text-sm font-bold text-[#1A3D2C]">{student.name}</span>
                  </div>
                </td>
                <td className="py-2.5 md:py-3.5">
                  <span className="px-2 md:px-3 py-1 bg-white text-[#1A3D2C]/80 text-[8px] md:text-[9px] font-black uppercase tracking-widest rounded-full border border-[#1A3D2C]/5 shadow-sm">
                    {student.grade}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


    </div>
  );
}
