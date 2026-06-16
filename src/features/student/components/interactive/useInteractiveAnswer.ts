import { useState } from "react";
import { useStudentStore } from "../../store/useStudentStore";

/**
 * Shared submit/result/retry logic for interactive math widgets.
 * Mirrors the ComprehensionWidget pattern: it stringifies the answer object to the
 * exact grader shape, posts via the store, and exposes the cached server result.
 *
 * A failed POST (network error / null result) is NOT a wrong answer: we surface a
 * distinct `submitError` and unlock the widget so the student can retry, instead of
 * showing the red "Not quite" banner for something the server never graded.
 */
export function useInteractiveAnswer(
  directiveId: string,
  interactionType: string,
  allowRetry: boolean
) {
  const { submitInteractiveAnswer, interactiveResults, clearInteractiveResult } = useStudentStore();
  const [submitting, setSubmitting] = useState(false);
  const [localSubmitted, setLocalSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  const result = interactiveResults[directiveId];
  // A real submission is one the server graded (cached result) or one we're
  // optimistically holding — but never an errored one.
  const submitted = (localSubmitted || !!result) && !submitError;
  const isCorrect = result?.is_correct;
  const attempts = result?.attempts ?? 0;

  let studentAnswer: any = undefined;
  if (result?.student_answer) {
    try {
      studentAnswer = JSON.parse(result.student_answer);
    } catch {
      studentAnswer = undefined;
    }
  }

  const submit = async (answer: unknown) => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(false);
    setLocalSubmitted(true);
    try {
      const res = await submitInteractiveAnswer(directiveId, interactionType, JSON.stringify(answer));
      if (!res) {
        // Server never graded this (network failure or aborted). Unlock so the
        // student can resubmit; do not present it as an incorrect answer.
        setSubmitError(true);
        setLocalSubmitted(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const retry = () => {
    if (!allowRetry) return;
    setLocalSubmitted(false);
    setSubmitError(false);
    clearInteractiveResult(directiveId);
  };

  const dismissError = () => setSubmitError(false);

  return {
    submitted,
    isCorrect,
    attempts,
    submitting,
    submit,
    retry,
    submitError,
    dismissError,
    hasResult: !!result,
    studentAnswer,
  };
}
