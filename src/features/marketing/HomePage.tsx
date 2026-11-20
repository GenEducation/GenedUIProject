import { homeHtml } from "./engine/pages.js";
import { SiteShell } from "./components/SiteShell";

/** `/` for a visitor who isn't signed in: the Zoovi story (prototype home, take B "One Question"). */
export function HomePage() {
  return <SiteShell page="home" html={homeHtml()} />;
}
