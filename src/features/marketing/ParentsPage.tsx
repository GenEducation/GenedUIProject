import { parentsHtml } from "./engine/pages.js";
import { SiteShell } from "./components/SiteShell";

/** `/for-parents` (prototype parents page, take A "The Window"). */
export function ParentsPage() {
  return <SiteShell page="parents" html={parentsHtml()} />;
}
