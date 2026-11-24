import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { InviteForm } from "@/features/invite/InviteForm";

export const metadata: Metadata = {
  title: "Get an Invite | Zoovi",
  description:
    "Ask for an invite to Zoovi: a 1-on-1 AI tutor for Class 6 to 9 that follows your child's textbook, with a parent home that shows you every step.",
};

/** Where every "Get an Invite" button on the marketing site lands (INVITE_HREF). */
export default function GetAnInvitePage() {
  return (
    <AuthShell
      title="Get an invite"
      subtitle="Tell us about your child and we'll WhatsApp you an invite."
      width="xl"
    >
      <InviteForm />
    </AuthShell>
  );
}
