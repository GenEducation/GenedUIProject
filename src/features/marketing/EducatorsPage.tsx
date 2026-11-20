import { educatorsHtml } from "./engine/pages.js";
import { SiteShell } from "./components/SiteShell";

/** `/for-educators` (prototype educators page, take A "The Staffroom Window"). */
export function EducatorsPage() {
  return <SiteShell page="educators" html={educatorsHtml()} />;
}
