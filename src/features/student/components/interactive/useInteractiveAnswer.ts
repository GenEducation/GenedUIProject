import { useState } from "react";
import { useStudentStore } from "../../store/useStudentStore";

/**
 * Shared submit/result/retry logic for interactive math widgets.
 * Mirrors the ComprehensionWidget pattern: it stringifies the answer object to the
 * exact grader shape, posts via the store, and exposes the cached server result.
 */
export function useInteractiveAnswer(
  directiveId: string,
  interactionType: string,
  allowRetry: boolean
) {
  const { submitInteractiveAnswer, interactiveResults, clearInteractiveResult } = useStudentStore();
  const [submitting, setSubmitting] = useState(false);
  const [localSubmitted, setLocalSubmitted] = useState(false);

  const result = interactiveResults[directiveId];
  const submitted = localSubmitted || !!result;
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
    setLocalSubmitted(true);
    try {
      await submitInteractiveAnswer(directiveId, interactionType, JSON.stringify(answer));
    } finally {
      setSubmitting(false);
    }
  };

  const retry = () => {
    if (!allowRetry) return;
    setLocalSubmitted(false);
    clearInteractiveResult(directiveId);
  };

  return { submitted, isCorrect, attempts, submitting, submit, retry, hasResult: !!result, studentAnswer };
}
