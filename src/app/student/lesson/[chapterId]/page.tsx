"use client";

import { use } from "react";
import { LessonScreen } from "@/features/lesson/components/LessonScreen";

export default function LessonPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = use(params);
  return (
    <div className="h-[calc(100vh-0px)] bg-white">
      <LessonScreen chapterId={chapterId} />
    </div>
  );
}
