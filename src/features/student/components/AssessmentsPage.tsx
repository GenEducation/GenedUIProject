"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useTestStore } from "@/features/student/store/useTestStore";
import { useSidebarStore } from "@/features/student/store/useSidebarStore";
import {
  ClipboardCheck,
  ChevronRight,
  Search,
  Filter,
  BookOpen,
  Sparkles,
  ArrowRight,
  Loader2,
  Tag,
  History,
} from "lucide-react";
import { studentService } from "@/features/student/services/studentService";
import { TypingStudentCharacter } from "@/components/shared/loaders/StudentLoader/TypingStudentCharacter";
import { StudentHomeSidebar } from "./StudentHomeSidebar";
import { Button } from "@/components/ui/Button";
import { STRINGS } from "../constants/strings";
import { requireExactSubject } from "@/features/subjects/subjectCatalog";
import { PageHeader } from "@/components/student/PageHeader";
import { SidebarToggle } from "@/components/student/SidebarToggle";
import { PageContainer } from "@/components/student/PageContainer";
import { FIELD_CLASSNAME, FIELD_FOCUS_CLASSNAME } from "@/components/ui/fieldStyles";

export function AssessmentsPage() {
  const router = useRouter();
  const { 
    analyticsSubjects, 
    fetchAnalyticsSubjects,
  } = useAnalyticsStore();


  const { studentProfile } = useStudentStore();
  const { startTest, loadTest, loadSubmission, loadStudentTests, studentTests, isLoadingTests } = useTestStore();
  const [isLoadingResult, setIsLoadingResult] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allChapters, setAllChapters] = useState<any[]>([]);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [isStartingTest, setIsStartingTest] = useState(false);
  const testNavTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const { sidebarOpen, setSidebarOpen, applyResponsive } = useSidebarStore();

  /* responsive sidebar */
  useEffect(() => {
    const handle = () => applyResponsive(window.innerWidth >= 1024);
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, [applyResponsive]);

  useEffect(() => {
    return () => { if (testNavTimerRef.current) clearTimeout(testNavTimerRef.current); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (studentProfile?.user_id) {
      fetchAnalyticsSubjects(studentProfile.user_id, controller.signal);
    }
    return () => controller.abort();
  }, [studentProfile, fetchAnalyticsSubjects]);

  useEffect(() => {
    if (studentProfile?.user_id) {
      loadStudentTests(studentProfile.user_id);
    }
  }, [studentProfile, loadStudentTests]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const fetchAllData = async () => {
      if (!studentProfile?.user_id || analyticsSubjects.length === 0) return;

      setIsLoadingAll(true);
      try {
        const results = await Promise.all(
          analyticsSubjects.map(async (subject) => {
            try {
              const chapters = await studentService.fetchChapterMastery(studentProfile.user_id, subject, controller.signal);
              return chapters.map((c: any) => ({ ...c, subject }));
            } catch (e: any) {
              if (e?.name !== "AbortError") console.error(`Failed to fetch chapters for ${subject}:`, e);
              return [];
            }
          })
        );
        if (!cancelled) setAllChapters(results.flat());
      } catch (error: any) {
        if (!cancelled && error?.name !== "AbortError") console.error("Error fetching all chapters:", error);
      } finally {
        if (!cancelled) setIsLoadingAll(false);
      }
    };

    fetchAllData();
    return () => { cancelled = true; controller.abort(); };
  }, [studentProfile, analyticsSubjects]);

  const filteredChapters = allChapters.filter(chapter => 
    chapter.document_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chapter.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewTest = async (testId: string, submissionId: string | null) => {
    setIsLoadingResult(true);
    try {
      await loadTest(testId);
      const { currentTest } = useTestStore.getState();
      if (!currentTest) {
        console.error("Failed to load test paper.");
        return;
      }
      if (submissionId) {
        await loadSubmission(submissionId);
      }
      router.push("/student/test?from=assessments");
    } catch (error) {
      console.error("Error loading past test:", error);
    } finally {
      setIsLoadingResult(false);
    }
  };

  const handleStartTest = async (chapterTitle: string, subject: string) => {
    if (studentProfile?.user_id && Number.isInteger(studentProfile.grade)) {
      setIsStartingTest(true);
      try {
        const exactSubject = requireExactSubject(subject, studentProfile.grade);
        await startTest({
          student_id: studentProfile.user_id,
          subject: exactSubject,
          chapter_query: chapterTitle,
          grade: studentProfile.grade!,
          questions_per_section: 3
        });
        
        testNavTimerRef.current = setTimeout(() => {
          router.push("/student/test?from=assessments");
        }, 2000);
      } catch (error) {
        console.error("Error starting test:", error);
        setIsStartingTest(false);
      }
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <StudentHomeSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpen={() => setSidebarOpen(true)} />
      <SidebarToggle />
    <div className="flex-1 min-w-0 flex flex-col h-screen bg-[var(--surface-page)] overflow-hidden font-sans">
      <PageHeader
        icon={<ClipboardCheck size={16} />}
        title={STRINGS.practice.pageTitle}
        onBack={() => window.location.href = '/student'}
        sidebarOpen={sidebarOpen}
      />

      {/* Search + Filter Section */}
      <div className="px-8 py-6 flex items-center justify-center gap-4">
        <div className="w-full max-w-md relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--primary-ink)]/30 group-focus-within:text-[var(--primary-ink)] transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search chapters or subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${FIELD_CLASSNAME} ${FIELD_FOCUS_CLASSNAME} pl-12 pr-4`}
          />
        </div>
        <button className="w-12 h-12 rounded-2xl bg-white border border-[var(--primary-ink)]/5 flex items-center justify-center text-[var(--primary-ink)]/40 hover:text-[var(--primary-ink)] transition-all">
          <Filter size={18} />
        </button>
      </div>

      {/* Chapters Grid */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <PageContainer width="wide" className="space-y-12">
          {/* Past Tests / History */}
          {(isLoadingTests || studentTests.length > 0) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[var(--primary-ink)]/5 flex items-center justify-center text-[var(--primary-ink)]">
                  <History size={14} />
                </div>
                <h2 className="text-sm font-black text-[var(--primary-ink)] uppercase tracking-widest">{STRINGS.practice.pastSectionTitle}</h2>
              </div>

              {isLoadingTests ? (
                <div className="flex items-center gap-3 py-6 text-[var(--primary-ink)]/40">
                  <Loader2 size={20} className="animate-spin" />
                  <span className="text-sm font-bold uppercase tracking-widest">Loading history...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {studentTests.map((t) => {
                    const scorePct = t.submission_id && t.overall_score != null
                      ? Math.round(t.overall_score * 100)
                      : null;
                    // Threshold colors mirror the report card's band language
                    // (Developing/Approaching/Proficient/Advanced).
                    const scoreColor = scorePct == null
                      ? null
                      : scorePct >= 80 ? "text-emerald-600"
                      : scorePct >= 60 ? "text-blue-600"
                      : scorePct >= 40 ? "text-amber-600"
                      : "text-red-500";
                    return (
                    <div
                      key={t.test_id}
                      className="bg-white p-6 rounded-3xl border border-[var(--primary-ink)]/5 shadow-sm flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black text-[var(--primary-ink)] truncate flex-1 min-w-0">{t.document_title}</h3>
                          <span
                            className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                              t.submission_id
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-amber-50 text-amber-600"
                            }`}
                          >
                            {t.submission_id ? "Completed" : "Pending"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-[var(--primary-ink)]/40 uppercase tracking-widest">
                            {t.subject}
                          </span>
                          <span className="text-[10px] font-medium text-[var(--primary-ink)]/30">
                            {new Date(t.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                      </div>
                      {scorePct != null && (
                        <div className="shrink-0 flex flex-col items-center">
                          <span className={`text-xl font-black leading-none ${scoreColor}`}>{scorePct}%</span>
                          <span className="text-[8px] font-bold uppercase tracking-widest text-[var(--primary-ink)]/30 mt-0.5">Score</span>
                        </div>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleViewTest(t.test_id, t.submission_id)}
                        disabled={isLoadingResult}
                        className="shrink-0"
                      >
                        View Test
                      </Button>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {isLoadingAll ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <Loader2 size={40} className="text-[var(--primary-ink)] animate-spin" />
              <p className="text-sm font-black text-[var(--primary-ink)]/40 uppercase tracking-widest">Gathering all curriculum...</p>
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
                    // Capped — an uncapped idx*0.05 delay meant the last card
                    // in a long curriculum list could wait multiple seconds
                    // to animate in.
                    transition={{ delay: Math.min(idx * 0.05, 0.4) }}
                    className="group"
                  >
                    <div className="bg-white p-8 rounded-[40px] border border-[var(--primary-ink)]/5 shadow-sm hover:shadow-2xl hover:shadow-[var(--primary-ink)]/10 transition-all flex flex-col h-full relative overflow-hidden">
                      {/* Decorative Element */}
                      <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                        <BookOpen size={80} />
                      </div>

                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                          <h3 className="text-xl font-black text-[var(--primary-ink)] leading-tight group-hover:text-cyan-600 transition-colors">
                            {chapter.document_title}
                          </h3>
                          <Sparkles size={16} className="text-[var(--primary-ink)]/20 group-hover:text-cyan-400 transition-colors shrink-0 mt-1" />
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Tag size={12} className="text-[var(--primary-ink)]/30" />
                          <span className="text-[10px] font-black text-[var(--primary-ink)]/50 uppercase tracking-widest">
                            {chapter.subject}
                          </span>
                        </div>
                      </div>

                      <div className="pt-8">
                        <Button
                          variant="primary"
                          size="lg"
                          fullWidth
                          onClick={() => handleStartTest(chapter.document_title, chapter.subject)}
                          trailingIcon={<ArrowRight size={16} />}
                        >
                          {STRINGS.practice.startCta}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 space-y-6 bg-white/40 rounded-[60px] border border-dashed border-[var(--primary-ink)]/10">
              <div className="w-20 h-20 rounded-full bg-[var(--primary-ink)]/5 flex items-center justify-center text-[var(--primary-ink)]/20">
                <Search size={40} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-black text-[var(--primary-ink)]">
                  {searchQuery ? "No chapters found" : "No chapters available yet"}
                </h3>
                <p className="text-sm font-medium text-[var(--primary-ink)]/40">
                  {searchQuery
                    ? "Try adjusting your search or select a different subject"
                    : STRINGS.practice.lockedMessage}
                </p>
              </div>
            </div>
          )}
        </PageContainer>
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
              <Loader2 size={48} className="text-[var(--primary-ink)] animate-spin" />
            </div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center space-y-3"
            >
              <h2 className="text-3xl font-black text-[var(--primary-ink)] tracking-tight">Preparing Your Test</h2>
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-medium text-[var(--primary-ink)]/60">Our AI is generating custom questions for you</p>
                <div className="flex gap-1.5 mt-2">
                  <motion.div 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} 
                    transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                    className="w-2 h-2 rounded-full bg-[var(--primary-ink)]" 
                  />
                  <motion.div 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} 
                    transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                    className="w-2 h-2 rounded-full bg-[var(--primary-ink)]" 
                  />
                  <motion.div 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} 
                    transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                    className="w-2 h-2 rounded-full bg-[var(--primary-ink)]" 
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
}
