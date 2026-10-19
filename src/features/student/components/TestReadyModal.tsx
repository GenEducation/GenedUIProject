"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
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
 *
 * The first caller migrated onto the shared `Modal` primitive — the scrim,
 * spring, aria wiring, focus trap and Escape handling all come from there now.
 * Escape resolves to "Later", the non-destructive option, which is why the
 * dialog passes `handleLater` as its `onClose`.
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

  const chapter = currentTest?.document_title;

  return (
    <Modal
      open={testReadyPrompt}
      onClose={handleLater}
      title="Your test is ready"
      panelStyle={{ background: C.card, border: `1px solid ${C.border}` }}
    >
      <div className="flex flex-col items-center text-center" style={{ padding: "32px 28px 24px" }}>
        <div
          className="flex items-center justify-center rounded-[20px] mb-5"
          style={{ width: 64, height: 64, background: `${C.tutor}14`, color: C.tutor }}
        >
          <ClipboardCheck size={30} strokeWidth={2.2} />
        </div>

        {/* Visual only: Modal's `title` is the dialog's accessible
            name, so announcing this too would just repeat it. */}
        <p
          aria-hidden="true"
          className="m-0 font-extrabold"
          style={{ color: C.text, fontFamily: "var(--font-display)", fontSize: 22 }}
        >
          Your test is ready
        </p>

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
    </Modal>
  );
}
