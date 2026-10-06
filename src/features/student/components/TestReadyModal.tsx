"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { STUDENT_COLORS as C } from "../theme/colors";
import { useStudentStore } from "../store/useStudentStore";
import { useTestStore } from "../store/useTestStore";

/**
 * Asks what to do with a test that has just finished generating.
 *
 * Mounted once in the student layout rather than by the page that started the
 * test: generation can outlive that page, and silently navigating a student who
 * has moved on is the bug this replaces. Prop-less and store-driven, following
 * PartnerRequestModal.
 */
export function TestReadyModal() {
  const router = useRouter();
  const testReadyPrompt = useTestStore((s) => s.testReadyPrompt);
  const currentTest = useTestStore((s) => s.currentTest);
  const dismissTestReadyPrompt = useTestStore((s) => s.dismissTestReadyPrompt);
  const discardPreparedTest = useTestStore((s) => s.discardPreparedTest);
  const loadStudentTests = useTestStore((s) => s.loadStudentTests);
  const studentId = useStudentStore((s) => s.studentProfile?.user_id);

  const handleContinue = () => {
    dismissTestReadyPrompt();
    router.push("/student/test?from=assessments");
  };

  // "Later" leaves the test alone — it is already reachable from Practice,
  // where an unsubmitted test lists as "Pending". The refetch is so it shows up
  // straight away for a student who never left that page.
  const handleLater = useCallback(() => {
    dismissTestReadyPrompt();
    if (studentId) void loadStudentTests(studentId);
  }, [dismissTestReadyPrompt, loadStudentTests, studentId]);

  const handleCancel = () => {
    discardPreparedTest();
  };

  // Escape resolves to the non-destructive option.
  useEffect(() => {
    if (!testReadyPrompt) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleLater();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [testReadyPrompt, handleLater]);

  const chapter = currentTest?.document_title;

  return (
    <AnimatePresence>
      {testReadyPrompt && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleLater}
            className="fixed inset-0 z-[100] backdrop-blur-sm"
            style={{ background: "rgba(16,20,32,0.55)" }}
          />

          <div className="fixed inset-0 z-[101] flex items-center justify-center p-6 pointer-events-none">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="test-ready-title"
              initial={{ opacity: 0, scale: 0.92, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 18 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="w-full max-w-md rounded-[24px] overflow-hidden pointer-events-auto"
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                boxShadow: "0 30px 80px rgba(16,20,32,0.28)",
                fontFamily: "var(--font-body)",
              }}
            >
              <div className="flex flex-col items-center text-center" style={{ padding: "32px 28px 24px" }}>
                <div
                  className="flex items-center justify-center rounded-[20px] mb-5"
                  style={{ width: 64, height: 64, background: `${C.tutor}14`, color: C.tutor }}
                >
                  <ClipboardCheck size={30} strokeWidth={2.2} />
                </div>

                <h2
                  id="test-ready-title"
                  className="m-0 font-extrabold"
                  style={{ color: C.text, fontFamily: "var(--font-display)", fontSize: 22 }}
                >
                  Your test is ready
                </h2>

                <p className="mt-2 mb-0" style={{ color: C.textMid, fontSize: 14, lineHeight: 1.55 }}>
                  {chapter
                    ? <>We&apos;ve prepared your test on <strong style={{ color: C.text }}>{chapter}</strong>. Would you like to take it now?</>
                    : <>We&apos;ve finished preparing your test. Would you like to take it now?</>}
                </p>
              </div>

              <div className="flex flex-col gap-2" style={{ padding: "0 28px 28px" }}>
                <Button variant="primary" fullWidth onClick={handleContinue}>
                  Continue to test
                </Button>
                <Button variant="secondary" fullWidth onClick={handleLater}>
                  Later
                </Button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="border-none bg-transparent cursor-pointer mt-1"
                  style={{ color: C.textMuted, fontSize: 13, fontWeight: 500, padding: "6px 0" }}
                >
                  Cancel this test
                </button>
                <p className="text-center m-0 mt-1" style={{ color: C.textFaint, fontSize: 11.5, lineHeight: 1.5 }}>
                  Choosing Later keeps it waiting for you under Practice.
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
