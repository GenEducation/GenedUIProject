"use client";

import React, { useEffect, useState } from "react";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import InteractiveBlock from "@/features/student/components/interactive/InteractiveBlock";

interface ClientProps {
  directiveId: string;
  sessionId: string;
  metaStr: string;
  token: string;
  userId: string;
}

export default function InteractiveEmbedClient({
  directiveId,
  sessionId,
  metaStr,
  token,
  userId,
}: ClientProps) {
  const [ready, setReady] = useState(false);
  const [meta, setMeta] = useState<any>(null);

  useEffect(() => {
    // Parse metadata
    let parsedMeta: any = null;
    if (metaStr) {
      try {
        parsedMeta = JSON.parse(decodeURIComponent(metaStr));
      } catch (e) {
        console.error("Failed to parse interactive meta:", e);
        try {
          parsedMeta = JSON.parse(metaStr);
        } catch (e2) {
          console.error("Failed to parse raw interactive meta:", e2);
        }
      }
    }
    setMeta(parsedMeta);

    // Seed token & profile in localStorage so authFetch picks them up
    if (token) {
      localStorage.setItem("gened_auth_token", token);
    }
    if (userId) {
      localStorage.setItem("gened_user_profile", JSON.stringify({ user_id: userId, role: "student" }));
      localStorage.setItem("gened_user_role", "student");
    }

    // Seed Zustand store's state
    useStudentStore.setState({
      studentProfile: userId ? { user_id: userId, username: "student", role: "student" } : null,
      activeChat: sessionId ? { id: sessionId, session_id: sessionId, title: "Embed Session", agentType: "", agentIcon: "", lastActive: "", lastTopic: "" } : null,
    });

    setReady(true);
  }, [directiveId, sessionId, metaStr, token, userId]);

  if (!ready || !meta) {
    return (
      <div style={{ display: "flex", flex: 1, height: "100vh", alignItems: "center", justifyContent: "center", background: "#FFFFFF" }}>
        <div style={{ color: "#94A3B8", fontSize: 13, fontWeight: 600 }}>Loading Activity...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 12, background: "#FFFFFF", minHeight: "100vh" }}>
      <InteractiveBlock
        directiveId={meta.directive_id || directiveId}
        meta={meta}
        disabled={false}
        readOnly={false}
      />
    </div>
  );
}
