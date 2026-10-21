"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import { splitMath } from "./latex";

/**
 * What the student wrote, as they wrote it: words stay plain text (never Markdown), and the maths they put in with the
 * `/` notations (`$…$`) is drawn as maths. KaTeX escapes everything it is given and is never allowed raw HTML or links
 * (`trust: false`), so nothing a student types can become markup.
 */
export function LearnerText({ text }: { text: string }) {
  const parts = splitMath(text);
  if (!parts.some((p) => p.math)) return <>{text}</>;
  return (
    <>
      {parts.map((p, i) =>
        p.math ? (
          <span
            key={i}
            className="inline-block align-middle"
            // KaTeX's own output: escaped, no raw HTML, no links.
            dangerouslySetInnerHTML={{ __html: katex.renderToString(p.value, { throwOnError: false, trust: false, output: "html" }) }}
          />
        ) : (
          <span key={i}>{p.value}</span>
        ),
      )}
    </>
  );
}
