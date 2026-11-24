import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { EducatorInviteForm } from "@/features/invite/EducatorInviteForm";

export const metadata: Metadata = {
  title: "Educator Invite | Zoovi",
  description:
    "Ask for an educator invite to Zoovi: a 1-on-1 AI tutor for Class 3 to 9 that follows the school textbook, with a teacher view of every student's progress.",
};

/** Where every educator "Get an Invite" / "Register for the Educator Programme" lands (EDUCATOR_INVITE_HREF). */
export default function EducatorInvitePage() {
  return (
    <AuthShell
      title="Get an educator invite"
      subtitle="Tell us about you and your school and we'll WhatsApp you an invite."
      width="xl"
    >
      <EducatorInviteForm />
    </AuthShell>
  );
}
