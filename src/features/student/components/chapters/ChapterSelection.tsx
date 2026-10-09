"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/student/PageHeader";
import { SidebarToggle } from "@/components/student/SidebarToggle";
import { SubjectIcon } from "@/features/subjects/subjectPresentation";
import { asError } from "@/utils/errors";
import { StudentHomeSidebar } from "../StudentHomeSidebar";
import { useSidebarStore } from "../../store/useSidebarStore";
import { learnerService } from "../../learner/learnerService";
import { useLearnerChapters } from "../../learner/useLearnerChapters";
import { useLessonLaunch } from "../../learner/useLessonLaunch";
import type { LearnerChapter } from "../../learner/types";
import { ChapterTile } from "./ChapterTile";

const GRID = "grid gap-[clamp(12px,1.6vw,20px)] grid-cols-1 sm:grid-cols-2 xl:grid-cols-3";

/** The chapters a student can open for one subject, as cover-card tiles. */
export function ChapterSelection({ subject }: { subject: string }) {
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen, applyResponsive } = useSidebarStore();
  const { data, loading, error, refresh } = useLearnerChapters(subject);
  const launch = useLessonLaunch((s) => s.launch);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  // One list refetch per page visit for expired card signatures, however many tiles fail.
  const refetchedForCards = useRef(false);

  useEffect(() => {
    applyResponsive(window.innerWidth >= 1024);
  }, [applyResponsive]);

  const openChapter = async (chapter: LearnerChapter) => {
    setOpeningId(chapter.chapter_id);
    setOpenError(null);
    try {
      const instance = await learnerService.openChapter(chapter.chapter_id);
      launch(instance.id, chapter, subject);
      router.push(`/student/lesson/${encodeURIComponent(instance.id)}`);
    } catch (e) {
      setOpenError(asError(e).message || "Couldn't open this chapter. Please try again.");
      setOpeningId(null);
    }
  };

  const onCardExpired = () => {
    if (refetchedForCards.current) return;
    refetchedForCards.current = true;
    void refresh();
  };

  const chapters = data?.chapters ?? [];
  const books = [...new Set(chapters.map((c) => c.book_title))];
  const firstLoad = loading && !data;

  return (
    <div className="flex h-screen overflow-hidden relative">
      <StudentHomeSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpen={() => setSidebarOpen(true)} />
      <SidebarToggle />

      <div className="flex-1 min-w-0 flex flex-col h-full bg-[var(--surface-page)] overflow-hidden">
        <PageHeader
          icon={<SubjectIcon subject={subject} size={14} />}
          title={subject}
          onBack={() => router.push("/student")}
          sidebarOpen={sidebarOpen}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-8 py-6 sm:py-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="m-0 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--primary-ink)]/45">
                  {data ? `Grade ${data.grade}` : " "}
                </p>
                <h2
                  className="m-0 mt-1 text-[clamp(22px,2.6vw,30px)] font-extrabold tracking-tight text-[var(--primary-ink)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Pick a chapter
                </h2>
              </div>
              {data && chapters.length > 0 && (
                <p className="m-0 text-sm font-semibold text-[var(--primary-ink)]/50">
                  {chapters.length} chapter{chapters.length === 1 ? "" : "s"} ready
                </p>
              )}
            </div>

            {openError && (
              <div role="alert" className="mb-5 rounded-2xl border border-[var(--danger-border,rgba(232,99,90,0.2))] bg-[var(--danger-soft,rgba(232,99,90,0.08))] px-4 py-3 text-sm font-semibold text-[var(--danger,#E8635A)]">
                {openError}
              </div>
            )}

            {firstLoad ? (
              <div className={GRID} data-testid="chapters-loading">
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="aspect-[16/10] rounded-[22px] bg-[var(--primary-ink)]/[0.05] animate-pulse" />
                ))}
              </div>
            ) : error && !data ? (
              <div className="rounded-[22px] border border-[var(--primary-ink)]/10 bg-white px-6 py-12 text-center">
                <p role="alert" className="m-0 text-sm font-semibold text-[var(--primary-ink)]/70">{error}</p>
                <Button variant="secondary" className="mt-4" onClick={() => void refresh()}>
                  <RotateCw size={14} /> Try again
                </Button>
              </div>
            ) : chapters.length === 0 ? (
              <div className="rounded-[22px] border-2 border-dashed border-[var(--primary-ink)]/10 px-6 py-14 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-ink)]/5 text-[var(--primary-ink)]/50">
                  <BookOpen size={22} />
                </div>
                <p className="m-0 text-base font-bold text-[var(--primary-ink)]">No chapters yet</p>
                <p className="m-0 mt-1.5 text-sm text-[var(--primary-ink)]/55">
                  Your school hasn&apos;t published any {subject} chapters for your grade yet. Check back soon.
                </p>
              </div>
            ) : (
              <div className="space-y-9">
                {books.map((book) => (
                  <section key={book} aria-label={books.length > 1 ? book : undefined}>
                    {books.length > 1 && (
                      <h3 className="m-0 mb-3.5 flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.12em] text-[var(--primary-ink)]/55">
                        <BookOpen size={14} /> {book}
                      </h3>
                    )}
                    <div className={GRID}>
                      {chapters
                        .filter((c) => c.book_title === book)
                        .map((chapter, i) => (
                          <ChapterTile
                            key={chapter.chapter_id}
                            chapter={chapter}
                            index={i}
                            opening={openingId === chapter.chapter_id}
                            disabled={openingId !== null}
                            onOpen={(c) => void openChapter(c)}
                            onCardExpired={onCardExpired}
                          />
                        ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
