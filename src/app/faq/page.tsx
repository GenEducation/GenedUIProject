import type { Metadata } from "next";
import { FaqPage } from "@/features/marketing/FaqPage";
import { faqEntries } from "@/features/marketing/engine/content-faq.js";

export const metadata: Metadata = {
  title: "FAQs | GenEd and Zoovi",
  description: "Find answers to questions about GenEd, Zoovi and ways to engage with us.",
};

// FAQPage structured data, so search engines can show the answers directly (static copy, nothing user-supplied)
const structuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqEntries().map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify of our own copy; "<" escaped so no string can close the script tag
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <FaqPage />
    </>
  );
}
