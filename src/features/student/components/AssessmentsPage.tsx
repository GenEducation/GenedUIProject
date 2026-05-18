"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useTestStore } from "@/features/student/store/useTestStore";
import { 
  ClipboardCheck, 
  ChevronRight, 
  Search, 
  Filter, 
  BookOpen, 
  Sparkles,
  ArrowRight,
  Loader2,
  ArrowLeft,
  Tag
} from "lucide-react";
import { studentService } from "@/features/student/services/studentService";
import { TypingStudentCharacter } from "@/components/shared/loaders/StudentLoader/TypingStudentCharacter";

export function AssessmentsPage() {
  const router = useRouter();
  const { 
    analyticsSubjects, 
    fetchAnalyticsSubjects,
  } = useAnalyticsStore();


  const { studentProfile } = useStudentStore();
  const { startTest } = useTestStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [allChapters, setAllChapters] = useState<any[]>([]);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [isStartingTest, setIsStartingTest] = useState(false);

  useEffect(() => {
    if (studentProfile?.user_id) {
      fetchAnalyticsSubjects(studentProfile.user_id);
    }
  }, [studentProfile, fetchAnalyticsSubjects]);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!studentProfile?.user_id || analyticsSubjects.length === 0) return;
      
      setIsLoadingAll(true);
      try {
        const results = await Promise.all(
          analyticsSubjects.map(async (subject) => {
            try {
              const chapters = await studentService.fetchChapterMastery(studentProfile.user_id, subject);
              return chapters.map((c: any) => ({ ...c, subject }));
            } catch (e) {
              console.error(`Failed to fetch chapters for ${subject}:`, e);
              return [];
            }
          })
        );
        setAllChapters(results.flat());
      } catch (error) {
        console.error("Error fetching all chapters:", error);
      } finally {
        setIsLoadingAll(false);
      }
    };

    fetchAllData();
  }, [studentProfile, analyticsSubjects]);

  const filteredChapters = allChapters.filter(chapter => 
    chapter.document_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chapter.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartTest = async (chapterTitle: string, subject: string) => {
    if (studentProfile?.user_id) {
      setIsStartingTest(true);
      try {
        await startTest({
          student_id: studentProfile.user_id,
          subject: subject,
          chapter_query: chapterTitle,
          grade: studentProfile.grade || 1,
          questions_per_section: 3
        });
        
        // Give the user a moment to see the animation
        setTimeout(() => {
          router.push("/student/test?from=assessments");
        }, 2000);
      } catch (error) {
        console.error("Error starting test:", error);
        setIsStartingTest(false);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F4F3EE]/30 overflow-hidden font-sans">
      {/* Header Section */}
      <header className="px-8 py-6 flex flex-col gap-6 bg-white border-b border-[#042E5C]/5 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => window.location.href = '/student'}
              className="w-10 h-10 rounded-full bg-[#042E5C]/5 text-[#042E5C] flex items-center justify-center hover:bg-[#042E5C]/10 transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <img src="/Logo.svg" alt="GenEd Logo" className="h-7 w-auto" />
            <div className="h-8 w-px bg-[#042E5C]/10 mx-2" />
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#042E5C]/5 flex items-center justify-center text-[#042E5C]">
                  <ClipboardCheck size={16} />
                </div>
                <h1 className="text-xl font-black text-[#042E5C] tracking-tight">Test</h1>
              </div>
              <p className="text-[11px] font-medium text-[#042E5C]/40 uppercase tracking-widest">Select a chapter to begin</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <div className="w-full max-w-md relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#042E5C]/30 group-focus-within:text-[#042E5C] transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Search chapters or subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F4F3EE]/50 border border-[#042E5C]/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#042E5C]/10 focus:bg-white transition-all"
            />
          </div>
          <button className="w-12 h-12 rounded-2xl bg-white border border-[#042E5C]/5 flex items-center justify-center text-[#042E5C]/40 hover:text-[#042E5C] transition-all">
            <Filter size={18} />
          </button>
        </div>
      </header>

      {/* Chapters Grid */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-12">
          {isLoadingAll ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <Loader2 size={40} className="text-[#042E5C] animate-spin" />
              <p className="text-sm font-black text-[#042E5C]/40 uppercase tracking-widest">Gathering all curriculum...</p>
            </div>
          ) : filteredChapters.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredChapters.map((chapter, idx) => (
                  <motion.div
                    key={chapter.document_title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group"
                  >
                    <div className="bg-white p-8 rounded-[40px] border border-[#042E5C]/5 shadow-sm hover:shadow-2xl hover:shadow-[#042E5C]/10 transition-all flex flex-col h-full relative overflow-hidden">
                      {/* Decorative Element */}
                      <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                        <BookOpen size={80} />
                      </div>

                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                          <h3 className="text-xl font-black text-[#042E5C] leading-tight group-hover:text-cyan-600 transition-colors">
                            {chapter.document_title}
                          </h3>
                          <Sparkles size={16} className="text-[#042E5C]/20 group-hover:text-cyan-400 transition-colors shrink-0 mt-1" />
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Tag size={12} className="text-[#042E5C]/30" />
                          <span className="text-[10px] font-black text-[#042E5C]/50 uppercase tracking-widest">
                            {chapter.subject}
                          </span>
                        </div>
                      </div>

                      <div className="pt-8">
                        <button 
                          onClick={() => handleStartTest(chapter.document_title, chapter.subject)}
                          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#042E5C] text-white rounded-3xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-[#042E5C]/10 hover:bg-[#064282] hover:shadow-[#042E5C]/20 transition-all group/btn"
                        >
                          Start Test
                          <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 space-y-6 bg-white/40 rounded-[60px] border border-dashed border-[#042E5C]/10">
              <div className="w-20 h-20 rounded-full bg-[#042E5C]/5 flex items-center justify-center text-[#042E5C]/20">
                <Search size={40} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-black text-[#042E5C]">No chapters found</h3>
                <p className="text-sm font-medium text-[#042E5C]/40">Try adjusting your search or select a different subject</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Test Initiation Loader Overlay */}
      <AnimatePresence>
        {isStartingTest && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center"
          >
            <div className="mb-12">
              <Loader2 size={48} className="text-[#042E5C] animate-spin" />
            </div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center space-y-3"
            >
              <h2 className="text-3xl font-black text-[#042E5C] tracking-tight">Preparing Your Test</h2>
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-medium text-[#042E5C]/60">Our AI is generating custom questions for you</p>
                <div className="flex gap-1.5 mt-2">
                  <motion.div 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} 
                    transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                    className="w-2 h-2 rounded-full bg-[#042E5C]" 
                  />
                  <motion.div 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} 
                    transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                    className="w-2 h-2 rounded-full bg-[#042E5C]" 
                  />
                  <motion.div 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} 
                    transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                    className="w-2 h-2 rounded-full bg-[#042E5C]" 
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
