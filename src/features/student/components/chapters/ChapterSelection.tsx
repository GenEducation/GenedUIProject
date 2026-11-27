"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SidebarToggle } from "@/components/student/SidebarToggle";
import { asError } from "@/utils/errors";
import { StudentHomeSidebar } from "../StudentHomeSidebar";
import { useSidebarStore } from "../../store/useSidebarStore";
import { learnerService } from "../../learner/learnerService";
import { useLearnerChapters } from "../../learner/useLearnerChapters";
import { useLessonLaunch } from "../../learner/useLessonLaunch";
import { useRecentChapters } from "../../learner/useRecentChapters";
import { chapterStatuses } from "../../learner/recentChapters";
import type { LearnerChapter } from "../../learner/types";
import { ChapterTile } from "./ChapterTile";
import { SubjectHeader } from "./SubjectHeader";
import { MomentArt } from "@/components/shared/MomentArt";
import { EMPTY_CHAPTERS_ART, ERROR_ART } from "../../theme/momentArt";

// Columns by the grid's own width (a container query), so the tiles keep a readable size with the sidebar open or
// closed: a fourth column only once there's room for ~300px tiles.
const GRID = "grid gap-[clamp(12px,1.6vw,20px)] grid-cols-1 @min-[560px]:grid-cols-2 @min-[860px]:grid-cols-3 @min-[1240px]:grid-cols-4";

/** The chapters a student can open for one subject, as cover-card tiles. */
export function ChapterSelection({ subject }: { subject: string }) {
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen, applyResponsive } = useSidebarStore();
  const { data, loading, error, refresh } = useLearnerChapters(subject);
  // Each tile's status comes from the student's recent chapters (the API's most, so a whole subject fits).
  const recent = useRecentChapters(true, 50);
  const launch = useLessonLaunch((s) => s.launch);
  const offerRevisit = useLessonLaunch((s) => s.offerRevisit);
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
      offerRevisit(instance.id);
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
  const chapterList = data?.chapters;
  const statuses = useMemo(
    () => chapterStatuses((chapterList ?? []).map((c) => c.chapter_id), recent.chapters),
    [chapterList, recent.chapters],
  );
  // While the recent list loads the tiles hold a placeholder; if it fails they just open, with no status.
  const statusReady = !recent.loading && !recent.error;
  const finished = [...statuses.values()].filter((s) => s.kind === "done" || s.kind === "revisit").length;
  const underWay = [...statuses.values()].filter((s) => s.kind === "progress" || s.kind === "revisit").length;
  const currentChapter = statusReady ? (chapterList ?? []).find((c) => statuses.get(c.chapter_id)?.current) ?? null : null;


  return (
    <div className="flex h-screen overflow-hidden relative">
      <StudentHomeSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpen={() => setSidebarOpen(true)} />
      <SidebarToggle />

      <div className="flex-1 min-w-0 flex flex-col h-full bg-[var(--surface-page)] overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className="@container mx-auto w-full max-w-[1400px] px-4 sm:px-8 py-6 sm:py-8">
            <SubjectHeader
              subject={subject}
              grade={data?.grade}
              chapterCount={chapters.length}
              progress={statusReady && chapters.length > 0 ? { finished, underWay } : null}
              current={currentChapter && openingId === null ? { number: currentChapter.number, title: currentChapter.title } : null}
              onBack={() => router.push("/student")}
              onContinue={() => currentChapter && void openChapter(currentChapter)}
              sidebarOpen={sidebarOpen}
            />

            {openError && (
              <div role="alert" className="mb-5 rounded-2xl border border-[var(--danger-border,rgba(232,99,90,0.2))] bg-[var(--danger-soft,rgba(232,99,90,0.08))] px-4 py-3 text-sm font-semibold text-[var(--danger,#E8635A)]">
                {openError}
              </div>
            )}

            {firstLoad ? (
              <div className={GRID} data-testid="chapters-loading">
                {/* Shaped like the tiles (cover, then the status line), so nothing moves when they arrive. */}
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="overflow-hidden rounded-[22px] border border-[rgba(29,99,21,0.10)] bg-white">
                    <div className="aspect-[16/10] bg-[var(--soft-surface)]/60 animate-pulse" />
                    <div className="flex h-[44px] items-center px-3.5">
                      <span className="h-2.5 w-28 animate-pulse rounded-full bg-[var(--soft-surface)]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error && !data ? (
              <div className="rounded-[22px] border border-[var(--primary-ink)]/10 bg-white px-6 py-10 text-center">
                {/* A house of cards, one card slipped out. */}
                <MomentArt art={ERROR_ART} width={220} float className="mx-auto mb-3" />
                <p role="alert" className="m-0 text-sm font-semibold text-[var(--primary-ink)]/70">{error}</p>
                <Button variant="secondary" className="mt-4" onClick={() => void refresh()}>
                  <RotateCw size={14} /> Try again
                </Button>
              </div>
            ) : chapters.length === 0 ? (
              <div className="rounded-[22px] border-2 border-dashed border-[var(--primary-ink)]/10 px-6 py-10 text-center">
                {/* An empty platform, tracks leading away: the next one is coming. */}
                <MomentArt art={EMPTY_CHAPTERS_ART} width={270} float className="mx-auto mb-3" />
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
                      <h3 className="citron-eyebrow m-0 mb-3.5 flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                        <BookOpen size={14} strokeWidth={2.2} aria-hidden /> {book}
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
                            status={statusReady ? statuses.get(chapter.chapter_id) ?? null : null}
                            statusLoading={recent.loading}
                            subject={subject}
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
