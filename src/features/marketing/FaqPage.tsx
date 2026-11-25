import { faqPageHtml } from "./engine/pages.js";
import { SiteShell } from "./components/SiteShell";

/** `/faq`: every question about GenEd and Zoovi in one place, grouped by who's asking. */
export function FaqPage() {
  return <SiteShell page="faq" html={faqPageHtml()} />;
}
