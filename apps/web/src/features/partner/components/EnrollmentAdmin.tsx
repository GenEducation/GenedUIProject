"use client";

import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, ChevronRight, Search, ChevronLeft, Calendar } from "lucide-react";
import { useState } from "react";
import { StudentDetailsModal } from "./StudentDetailsModal";

const STUDENTS = [
  { id: "1", name: "Aliza Bennet", grade: "Grade 12", initials: "AB" },
  { id: "2", name: "Darius Knight", grade: "Grade 11", initials: "DK" },
  { id: "3", name: "Fiona Hayes", grade: "Grade 12", initials: "FH" },
  { id: "4", name: "Gabriel Russo", grade: "Grade 10", initials: "GR" },
  { id: "5", name: "Hannah Miller", grade: "Grade 12", initials: "HM" },
  { id: "6", name: "Isaac Watts", grade: "Grade 11", initials: "IW" },
  { id: "7", name: "Jade Morales", grade: "Grade 12", initials: "JM" },
  { id: "8", name: "Kaelen Smith", grade: "Grade 10", initials: "KS" },
];

const PENDING_REQUESTS = [
  { id: "p1", name: "Julianne Sterling", grade: "Grade 12" },
  { id: "p2", name: "Marcus Holloway", grade: "Grade 11" },
  { id: "p3", name: "Elena Rodriguez", grade: "Grade 12" },
  { id: "p4", name: "Samuel Thorne", grade: "Grade 10" },
  { id: "p5", name: "Beatrice Vance", grade: "Grade 12" },
  { id: "p6", name: "Oliver Chen", grade: "Grade 11" },
];

export function EnrollmentAdmin() {
  const [selectedStudent, setSelectedStudent] = useState<typeof PENDING_REQUESTS[0] | null>(null);

  return (
    <div className="flex-1 px-4 md:px-12 pt-8 md:pt-12 pb-8 bg-white flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start gap-4 md:gap-0 mb-8 md:mb-12">
        <div className="space-y-2 md:space-y-4 max-w-2xl">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-[#1A3D2C] tracking-tight">Analytics</h2>
          <p className="text-[#1A3D2C]/60 text-xs md:text-sm leading-relaxed font-medium">
            Detailed insight into student performance and enrollment.
          </p>
        </div>
        <div className="flex items-center gap-3 px-3 py-1.5 md:px-4 md:py-2 bg-[#F8F9F8] rounded-full border border-[#1A3D2C]/5">
          <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-[#1A3D2C] rounded-full animate-pulse" />
          <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-[#1A3D2C]/40">Live Updates</span>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 min-h-0 overflow-y-auto lg:overflow-hidden scrollbar-hide">
        {/* Left: Student Registry Table */}
        <div className="lg:col-span-8 flex flex-col bg-[#FBFCFB] rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-8 border border-gray-100 shadow-xl min-h-[400px] lg:min-h-0 overflow-hidden">
          <div className="flex justify-between items-center mb-6 md:mb-10">
            <h3 className="text-lg md:text-2xl font-black text-[#1A3D2C]">Student Registry</h3>
          </div>

          <div className="flex-1 overflow-x-auto lg:overflow-y-auto scrollbar-hide pr-1 md:pr-2">
            <table className="w-full text-left min-w-[500px] lg:min-w-0">
              <thead>
                <tr className="border-b border-[#1A3D2C]/5">
                  <th className="pb-4 md:pb-6 text-[9px] md:text-[10px] font-black text-[#1A3D2C]/90 uppercase tracking-widest">Student Name</th>
                  <th className="pb-4 md:pb-6 text-[9px] md:text-[10px] font-black text-[#1A3D2C]/90 uppercase tracking-widest">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A3D2C]/5">
                {STUDENTS.map((student) => (
                  <tr key={student.id} className="group hover:bg-white transition-all cursor-pointer">
                    <td className="py-3 md:py-5">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-[#D1E6D9]/50 rounded-lg md:rounded-xl flex items-center justify-center text-[#1A3D2C] text-[10px] md:text-xs font-bold shadow-sm">
                          {student.initials}
                        </div>
                        <span className="text-xs md:text-sm font-bold text-[#1A3D2C]">{student.name}</span>
                      </div>
                    </td>
                    <td className="py-3 md:py-5">
                      <span className="px-2 md:px-3 py-1 bg-white text-[#1A3D2C]/80 text-[8px] md:text-[9px] font-black uppercase tracking-widest rounded-full border border-[#1A3D2C]/5 shadow-sm">
                        {student.grade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Mockup */}
          <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-[#1A3D2C]/5 flex items-center justify-between">
            <p className="text-[8px] md:text-[10px] font-bold text-[#1A3D2C]/30 uppercase tracking-widest leading-tight">
              Showing 8 of 12,482 students
            </p>
            <div className="flex gap-2">
              <button className="p-1.5 md:p-2 rounded-lg md:rounded-xl bg-gray-50 text-gray-300 hover:text-[#1A3D2C] hover:bg-gray-100 transition-all">
                <ChevronLeft size={16} />
              </button>
              <button className="p-1.5 md:p-2 rounded-lg md:rounded-xl bg-gray-50 text-gray-300 hover:text-[#1A3D2C] hover:bg-gray-100 transition-all">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Sidebar Cards */}
        <div className="lg:col-span-4 space-y-6 md:gap-8 flex flex-col min-h-0">
          {/* Total Enrollments Card */}
          <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 border border-[#1A3D2C]/10 shadow-xl flex flex-col">
            <h4 className="text-[9px] md:text-[10px] font-black text-[#1A3D2C]/90 uppercase mb-3 md:mb-4">Total Enrollments</h4>
            <div className="space-y-1">
              <p className="text-3xl md:text-4xl lg:text-5xl font-black text-[#1A3D2C] tracking-tighter">12,482</p>
            </div>
          </div>

          {/* Pending Requests Card */}
          <div className="flex-1 bg-[#F8F9F8] rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 border border-gray-100/50 shadow-xl flex flex-col min-h-[300px] lg:min-h-0 overflow-hidden">
            <div className="flex justify-between items-center mb-6 md:mb-8">
              <h4 className="text-[9px] md:text-[10px] font-black text-[#1A3D2C] uppercase">Pending Requests</h4>
              <span className="px-2 md:px-3 py-0.5 md:py-1 bg-red-500 text-white text-[8px] md:text-[9px] font-black rounded-full">14</span>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide space-y-2 pr-1 md:pr-2">
              {PENDING_REQUESTS.map((request) => (
                <button 
                  key={request.id}
                  onClick={() => setSelectedStudent(request)}
                  className="w-full flex items-center justify-between p-3 md:p-4 bg-white rounded-xl md:rounded-2xl border border-transparent hover:border-[#1A3D2C]/5 transition-all text-left shadow-sm hover:shadow-md group"
                >
                  <span className="text-[11px] md:text-xs font-bold text-[#1A3D2C]/80 group-hover:text-[#1A3D2C] transition-colors">{request.name}</span>
                  <ChevronRight size={12} className="text-gray-300 group-hover:text-[#1A3D2C] transition-all group-hover:translate-x-1" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Student Details Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <StudentDetailsModal 
            studentName={selectedStudent.name}
            grade={selectedStudent.grade}
            onClose={() => setSelectedStudent(null)}
            onAccept={() => setSelectedStudent(null)}
            onReject={() => setSelectedStudent(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
