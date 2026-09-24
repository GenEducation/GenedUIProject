"use client";

import { use, useEffect } from "react";
import { GraduationCap } from "lucide-react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { PageHeader } from "@/components/student/PageHeader";
import { SidebarToggle } from "@/components/student/SidebarToggle";
import { StudentHomeSidebar } from "@/features/student/components/StudentHomeSidebar";
import { useSidebarStore } from "@/features/student/store/useSidebarStore";
import { useRouter } from "next/navigation";
import { LessonScreen } from "@/features/lesson/components/LessonScreen";
import { useLessonStore } from "@/features/lesson/store/useLessonStore";

export default function LessonPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = use(params);
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen, applyResponsive } = useSidebarStore();
  const chapterTitle = useLessonStore((s) => s.chapterTitle);

  useEffect(() => {
    applyResponsive(window.innerWidth >= 1024);
  }, [applyResponsive]);

  return (
    <AuthGuard requiredRole="student">
      <div className="flex h-screen overflow-hidden relative">
        <StudentHomeSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpen={() => setSidebarOpen(true)} />
        <SidebarToggle />

        <div className="flex-1 min-w-0 flex flex-col h-full bg-[var(--surface-page)] overflow-hidden font-sans">
          <PageHeader
            icon={<GraduationCap size={16} />}
            title={chapterTitle ?? "Lesson"}
            onBack={() => router.push("/student")}
            sidebarOpen={sidebarOpen}
          />
          <div className="flex-1 min-h-0">
            <LessonScreen chapterId={chapterId} />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
