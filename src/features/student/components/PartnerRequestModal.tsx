"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useStudentStore } from "../store/useStudentStore";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { MomentArt } from "@/components/shared/MomentArt";
import { STUDENT_COLORS as C } from "../theme/colors";
import { GUARDIAN_LINKED_ART, LINK_FAILED_ART, SCHOOL_SENT_ART } from "../theme/momentArt";

/**
 * The answer to "join this school" (SchoolCard) and "link my parent" (GuardianCard): one store-driven modal, mounted
 * in the student layout.
 *
 * - sending:   a spinner
 * - sent:      a mailbox takes in a letter and raises its lime flag: the school, or a parent still to confirm, has to
 *              accept it
 * - connected: a cup telephone, its string pulled tight: the parent link is live
 * - failed:    the same, its string slack: try again
 */
export function PartnerRequestModal() {
  const { isPartnerModalOpen, setPartnerModalOpen, partnerRequestStatus, partnerRequestMessage, partnerRequestOutcome } =
    useStudentStore();
  const loading = partnerRequestStatus === "loading";

  // Fetch the mailbox's frames while the request is still sending, so its move is ready when the answer lands.
  useEffect(() => {
    if (isPartnerModalOpen && SCHOOL_SENT_ART.sprite) new Image().src = SCHOOL_SENT_ART.sprite.src;
  }, [isPartnerModalOpen]);
  const close = () => setPartnerModalOpen(false);

  const view =
    partnerRequestStatus === "error"
      ? { art: LINK_FAILED_ART, title: "That didn't go through", body: partnerRequestMessage }
      : partnerRequestOutcome === "connected"
        ? { art: GUARDIAN_LINKED_ART, title: "You're connected", body: partnerRequestMessage }
        : { art: SCHOOL_SENT_ART, title: "Request sent", body: partnerRequestMessage };

  return (
    <Modal
      open={isPartnerModalOpen}
      // While sending there's nothing to dismiss to: the result is on its way.
      onClose={loading ? undefined : close}
      size="sm"
      title={loading ? "Sending request" : view.title}
      panelStyle={{ background: C.card, border: `1px solid ${C.border}` }}
    >
      {loading ? (
        <div className="flex flex-col items-center text-center" style={{ padding: "40px 28px 36px" }}>
          <Loader2 size={34} className="animate-spin" style={{ color: C.primary }} aria-hidden />
          <p aria-hidden="true" className="m-0 mt-4 font-extrabold" style={{ color: C.text, fontFamily: "var(--font-display)", fontSize: 20 }}>
            Sending request
          </p>
          <p className="m-0 mt-1.5" style={{ color: C.textMid, fontSize: 14 }}>
            Just a moment while we connect your profile.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center text-center" style={{ padding: "28px 28px 20px" }}>
            <MomentArt art={view.art} width={partnerRequestStatus === "error" || partnerRequestOutcome === "connected" ? 200 : 160} float shadow={false} className="mb-2" />
            {/* Visual only: Modal's `title` is the dialog's accessible name. */}
            <p aria-hidden="true" className="m-0 font-extrabold" style={{ color: C.text, fontFamily: "var(--font-display)", fontSize: 22 }}>
              {view.title}
            </p>
            <p className="mt-2 mb-0 max-w-[300px]" style={{ color: C.textMid, fontSize: 14, lineHeight: 1.55 }}>
              {view.body}
            </p>
          </div>
          <div style={{ padding: "0 28px 28px" }}>
            <Button variant={partnerRequestStatus === "error" ? "secondary" : "primary"} fullWidth onClick={close}>
              {partnerRequestStatus === "error" ? "Close" : "Done"}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
