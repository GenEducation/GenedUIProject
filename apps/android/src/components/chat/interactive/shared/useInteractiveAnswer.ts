import { useState } from "react";
import { studentService } from "../../../../services/studentService";
import { TYPE_TO_INTERACTION } from "../types";

export function useInteractiveAnswer(
  directiveId: string,
  interactiveType: string,
  sessionId?: string,
  allowRetry = true
) {
  const [submitting, setSubmitting] = useState(false);
  const [localSubmitted, setLocalSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [result, setResult] = useState<{ is_correct: boolean; attempts?: number } | null>(null);

  const interactionType = TYPE_TO_INTERACTION[interactiveType] || "build";
  const submitted = (localSubmitted || !!result) && !submitError;
  const isCorrect = result?.is_correct;
  const attempts = result?.attempts ?? 0;

  const submit = async (answer: unknown) => {
    if (submitting || !sessionId || !directiveId) return;
    setSubmitting(true);
    setSubmitError(false);
    setLocalSubmitted(true);
    try {
      const res = await studentService.submitInteractiveAnswer(
        sessionId,
        directiveId,
        interactionType,
        JSON.stringify(answer)
      );
      if (!res) {
        setSubmitError(true);
        setLocalSubmitted(false);
      } else {
        setResult({ is_correct: res.is_correct, attempts: res.attempts ?? 1 });
      }
    } catch {
      setSubmitError(true);
      setLocalSubmitted(false);
    } finally {
      setSubmitting(false);
    }
  };

  const retry = () => {
    if (!allowRetry) return;
    setLocalSubmitted(false);
    setSubmitError(false);
    setResult(null);
  };

  const dismissError = () => setSubmitError(false);

  return { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError };
}
