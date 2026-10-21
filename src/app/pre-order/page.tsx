import type { Metadata } from "next";
import { ACTIVE_CAMPAIGN, PILOT_SEATS } from "@/constants/campaign";
import { DeskbotPreorderPage } from "@/features/preorder/DeskbotPreorderPage";
import { WebappCampaignPage } from "@/features/webapp-campaign/WebappCampaignPage";

// `/pre-order` is the ad landing page. ACTIVE_CAMPAIGN decides which campaign it
// serves; the other stays in the codebase, ready to switch back.
const META: Record<typeof ACTIVE_CAMPAIGN, Metadata> = {
  webapp: {
    title: "Free AI Tutor for Your Child — Class 6 to 9 (Limited Pilot) | GenEd",
    description:
      `A 1-on-1 AI tutor that follows your child's NCERT textbook chapter by chapter — and shows you every step. Maths, Science & English. Free for the whole pilot, only ${PILOT_SEATS} families, starts 23 October.`,
    openGraph: {
      title: "Their journey. Your front-row seat.",
      description: "A free AI tutor for Class 6–9, and a parent home that shows you every step. Limited pilot.",
      type: "website",
    },
  },
  deskbot: {
    title: "Pre-order the GenEd Deskbot",
    description:
      "A dedicated AI learning device for your child. Reserve yours with a refundable ₹500 deposit.",
  },
};

export const metadata: Metadata = META[ACTIVE_CAMPAIGN];

export default function PreOrderPage() {
  return ACTIVE_CAMPAIGN === "webapp" ? <WebappCampaignPage /> : <DeskbotPreorderPage />;
}
