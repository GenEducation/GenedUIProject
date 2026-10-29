"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PencilLine } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { asError } from "@/utils/errors";
import { usePartnerStore, type Subject } from "../store/usePartnerStore";

interface ChapterCorrectionModalProps {
  subject: Subject | null;
  onClose: () => void;
}

const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-[#122D30]/15 text-sm text-[#122D30] focus:outline-none focus:border-[#075E63]";

/** Correct where a chapter sits (book, edition, number, title) when core files it differently, then run it again
 * (backend `PUT /v1/sources/{id}/chapter`). The server's refusal names what core already has; a 409 says why the
 * correction doesn't fit (still running, already filed, or the place is taken). */
export function ChapterCorrectionModal({ subject, onClose }: ChapterCorrectionModalProps) {
  const correctChapter = usePartnerStore((s) => s.correctChapter);
  const [bookTitle, setBookTitle] = useState("");
  const [edition, setEdition] = useState("");
  const [chapterNo, setChapterNo] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!subject) return;
    setBookTitle(subject.book_title);
    setEdition(subject.edition_label);
    setChapterNo(String(subject.chapter_ordinal));
    setTitle(subject.title);
    setError(null);
  }, [subject]);

  if (!subject) return null;
  const refusal = subject.progress?.refusal?.detail ?? null;
  const ordinal = Number(chapterNo);
  const valid = bookTitle.trim() && edition.trim() && title.trim() && Number.isInteger(ordinal) && ordinal >= 1;

  async function save() {
    if (!subject || !valid) return;
    setBusy(true);
    setError(null);
    try {
      await correctChapter(subject.id, {
        book_title: bookTitle.trim(),
        edition_label: edition.trim(),
        chapter_ordinal: ordinal,
        chapter_title: title.trim(),
      });
      onClose();
    } catch (err) {
      setError(asError(err).message ?? "Couldn't save the chapter's details. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={busy ? undefined : onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100]"
      />
      <motion.div
        role="dialog"
        aria-label="Correct the chapter's details"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-[2rem] shadow-2xl z-[101] p-8"
      >
        <div className="mb-5 w-12 h-12 rounded-2xl flex items-center justify-center bg-[#075E63]/10 text-[#075E63]">
          <PencilLine size={24} />
        </div>
        <h3 className="text-xl font-bold text-[#122D30] mb-2">Correct the chapter&apos;s details</h3>
        <p className="text-sm text-[#122D30]/60 leading-relaxed mb-4">
          Match what GenEd already has for this book. Saving runs the chapter again; it reuses the pages already read.
        </p>
        {refusal && (
          <p className="mb-4 px-4 py-2 rounded-xl bg-amber-50 text-amber-800 text-sm" data-testid="correction-refusal">
            {refusal}
          </p>
        )}
        <div className="flex flex-col gap-3 mb-5">
          <label className="text-xs font-semibold text-[#122D30]/70">
            Book title
            <input className={inputClass} value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} />
          </label>
          <label className="text-xs font-semibold text-[#122D30]/70">
            Edition
            <input className={inputClass} value={edition} onChange={(e) => setEdition(e.target.value)} />
          </label>
          <div className="flex gap-3">
            <label className="text-xs font-semibold text-[#122D30]/70 w-28">
              Chapter no.
              <input className={inputClass} type="number" min={1} value={chapterNo} onChange={(e) => setChapterNo(e.target.value)} />
            </label>
            <label className="text-xs font-semibold text-[#122D30]/70 flex-1">
              Chapter title
              <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
          </div>
        </div>
        {error && (
          <p role="alert" className="mb-4 px-4 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-medium">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <Button variant="outline" size="lg" className="flex-1" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button size="lg" className="flex-1" onClick={() => void save()} loading={busy} disabled={!valid || busy}>
            Save and run again
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
