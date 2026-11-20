"use client";

// TEMPORARY review page for the Study Deck loader + tutor mark — not for commit.
// Loops: the deck plays through (destination "ready" after 1s), finishes, restarts.
import { useEffect, useState } from "react";
import { StudyDeckLoader } from "@/components/shared/loaders/StudyDeck/StudyDeckLoader";
import { TutorMark } from "@/features/learning/components/TutorMark";

export default function StudyDeckDev() {
  const [run, setRun] = useState(0);
  const [visible, setVisible] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const show = setTimeout(() => {
      setComplete(false);
      setVisible(true);
    }, 900);
    const ready = setTimeout(() => setComplete(true), 1900);
    return () => {
      clearTimeout(show);
      clearTimeout(ready);
    };
  }, [run]);

  return (
    <div style={{ minHeight: "100vh", background: "#F7F4EA" }}>
      <div id="tutor-preview" style={{ position: "fixed", left: 16, bottom: 16, zIndex: 300, display: "flex", gap: 8, alignItems: "flex-start", maxWidth: 340 }}>
        <TutorMark size={36} />
        <div style={{ background: "#EEF4DD", borderRadius: "20px 20px 20px 6px", padding: "12px 16px", color: "#1D6315", fontSize: 15, lineHeight: 1.6 }}>
          Exactly right. 100 centimetres in the metre plus 20 centimetres is 120 centimetres in total.
        </div>
      </div>
      <StudyDeckLoader
        isVisible={visible}
        isComplete={complete}
        completionWord={run % 2 ? "see you soon!" : undefined}
        onFinished={() => {
          setVisible(false);
          setComplete(false);
          setRun((r) => r + 1);
        }}
      />
    </div>
  );
}
