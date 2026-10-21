"use client";

import { useState } from "react";
import { Link2, Loader2, School } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useStudentStore } from "../../store/useStudentStore";
import { useTutorialStore } from "@/features/tutorial/store/useTutorialStore";
import type { PartnerAssociationStatus } from "@/features/student/services/studentService";
import { CardHeading, ProfileCard, StatusPill } from "./ProfileCard";

/** Dropdown hint for a school the student already has a request with. */
const PARTNER_STATUS_HINT: Record<PartnerAssociationStatus, string | undefined> = {
  NOT_REQUESTED: undefined,
  PENDING: "Request pending",
  APPROVED: "Connected",
  REJECTED: "Request declined",
  REVOKED: "Access ended",
};

export function SchoolCard({ index }: { index: number }) {
  const {
    availablePartners,
    enrolledPartners,
    isEnrolledPartnersLoading,
    sendPartnerRequest,
    partnerRequestStatus,
  } = useStudentStore();
  const { completeAction } = useTutorialStore();
  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState("");

  const sending = partnerRequestStatus === "loading";
  const pending = availablePartners.filter((p) => p.association_status === "PENDING");
  const connected = enrolledPartners.length > 0;

  const handleSend = async () => {
    if (!selected) return;
    await sendPartnerRequest(selected);
    completeAction("send_admin_request");
    setSelected("");
    setPicking(false);
  };

  return (
    <ProfileCard index={index}>
      <CardHeading
        icon={<School size={24} strokeWidth={1.9} />}
        title="School connection"
        description="Connect your school to get personalized learning plans and relevant updates."
      />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 sm:pl-[68px]">
        <div className="flex flex-wrap items-center gap-2">
          {isEnrolledPartnersLoading ? (
            <Loader2 size={18} className="animate-spin text-[var(--text-muted)]" aria-label="Loading school" />
          ) : connected ? (
            enrolledPartners.map((p, i) => (
              <StatusPill key={p.partner_id ?? p.id ?? `ep-${i}`} tone="on">
                {p.organization ?? "Connected"}
              </StatusPill>
            ))
          ) : pending.length > 0 ? (
            pending.map((p, i) => (
              <StatusPill key={p.partner_id ?? p.id ?? `pp-${i}`} tone="pending">
                Pending · {p.organization}
              </StatusPill>
            ))
          ) : (
            <StatusPill tone="off">Not connected</StatusPill>
          )}
        </div>

        {!picking && (
          <Button
            variant="secondary"
            size="md"
            onClick={() => setPicking(true)}
            leadingIcon={<Link2 size={16} />}
            className="rounded-full px-6"
          >
            {connected ? "Link another school" : "Link school"}
          </Button>
        )}
      </div>

      {picking && (
        <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-[var(--canvas)] p-4 sm:ml-[68px] sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <Select
              aria-label="Choose your school"
              placeholder="Choose your school…"
              value={selected}
              onChange={setSelected}
              disabled={sending}
              options={availablePartners.map((p, i) => ({
                value: String(p.partner_id ?? p.id ?? `avp-${i}`),
                label: p.organization ?? "",
                hint: p.association_status ? PARTNER_STATUS_HINT[p.association_status] : undefined,
                // Any existing association blocks a new request ("Association already exists").
                disabled: !!p.association_status && p.association_status !== "NOT_REQUESTED",
              }))}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="tertiary" onClick={() => { setPicking(false); setSelected(""); }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSend} disabled={!selected || sending}>
              {sending ? <Loader2 size={15} className="animate-spin" /> : "Send request"}
            </Button>
          </div>
        </div>
      )}
    </ProfileCard>
  );
}
