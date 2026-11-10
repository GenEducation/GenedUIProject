"use client";

import { Languages } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { useLessonStore } from "../useLessonStore";
import { useSessionLanguage, useUiText } from "../i18n";
import { SESSION_LANGUAGES, languageLabel, type SessionLanguage } from "../voice/languages";

/**
 * The lesson's one language selector, always on screen, so a learner can choose before the first word they type or say. The choice
 * is the session language of every typed turn (backend ADR 0037), the language a voice session opens in, and the language of the
 * screen's own words; the book's text stays in its own language. It is this learner's choice, remembered for them on this
 * browser only, and it outranks their profile preference for this lesson.
 */
export function LessonLanguageSelect({ inBox = false }: { inBox?: boolean }) {
  const language = useSessionLanguage();
  const setSessionLanguage = useLessonStore((s) => s.setSessionLanguage);
  const t = useUiText();
  return (
    // Inside the chat or voice box it is a quiet inline control; on its own it is a small card.
    <div
      className={
        inBox
          ? "flex items-center gap-1 text-[var(--ls-ink-mid)]"
          : "flex items-center gap-1.5 rounded-[18px] border border-[var(--ls-border)] bg-[var(--ls-card)] px-3 py-1.5 shadow-[var(--ls-shadow)]"
      }
    >
      <Languages size={inBox ? 16 : 18} strokeWidth={2.2} className="shrink-0 text-[var(--ls-primary)]" aria-hidden />
      <Select<SessionLanguage>
        size="sm"
        variant="inline"
        aria-label={t("lessonLanguage")}
        value={language}
        onChange={(tag) => setSessionLanguage(tag)}
        options={SESSION_LANGUAGES.map((tag) => ({ value: tag, label: languageLabel(tag) }))}
      />
    </div>
  );
}
