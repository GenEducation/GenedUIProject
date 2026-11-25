import type { SitePage } from "../routes";
import { HomeIntro } from "./HomeIntro";
import { NavBar } from "./NavBar";
import { PageRunner } from "./PageRunner";
import { SectionStepper } from "./SectionStepper";
// Generated from the prototypes by scripts/zoovi-scope-css.mjs, scoped under .zv-site (each to the pages that used
// it), and imported in the prototypes' own link order: tokens, parents, portal, educators, then the page styles.
import "../styles/tokens.css";
import "../styles/parents.css";
import "../styles/portal.css";
import "../styles/educators.css";
import "../styles/page-home.css";
import "../styles/page-parents.css";
import "../styles/page-educators.css";
// hand-written, no prototype behind it
import "../styles/page-about.css";
import "../styles/page-faq.css";
// hand-written changes on top of the generated styles
import "../styles/site.css";

/**
 * A Zoovi marketing page: the paper-and-ink wrapper every prototype style is scoped to, the top nav, and the page's
 * markup (built on the server by engine/pages.js, footer included), which PageRunner then brings to life.
 */
export function SiteShell({ page, html }: { page: SitePage; html: string }) {
  return (
    <div className="zv-site" data-page={page}>
      {page === "home" && <HomeIntro />}
      <NavBar current={page} />
      {/* Static copy from engine/content*.js, escaped by its esc(); nothing user-supplied reaches it. */}
      <main id="main" dangerouslySetInnerHTML={{ __html: html }} />
      <PageRunner page={page} />
      <SectionStepper />
    </div>
  );
}
