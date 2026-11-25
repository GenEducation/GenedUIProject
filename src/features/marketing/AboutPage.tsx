import { aboutHtml } from "./engine/pages.js";
import { SiteShell } from "./components/SiteShell";

/** `/about`: who GenEd is and why Zoovi exists, with the 3D "About us" hero. */
export function AboutPage() {
  return <SiteShell page="about" html={aboutHtml()} />;
}
