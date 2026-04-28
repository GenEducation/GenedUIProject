"use client";

import { useEffect, useState } from "react";
import { NotificationProvider } from "@/components/NotificationProvider";

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [partnerId, setPartnerId] = useState<string | null>(null);

  useEffect(() => {
    // Get partner ID from localStorage
    const rawId = localStorage.getItem("gened_partner_id");
    if (rawId) {
      setPartnerId(rawId.replace(/['"]+/g, ""));
    }
  }, []);

  return (
    <NotificationProvider userId={partnerId}>
      {children}
    </NotificationProvider>
  );
}
