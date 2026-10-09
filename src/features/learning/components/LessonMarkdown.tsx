"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

/**
 * The tutor's text: Markdown with tables and KaTeX math, in the lesson's type.
 * Separate from the MVP chat's `MarkdownRenderer`, which is bound to the old
 * student store. Links open in a new tab; raw HTML is never rendered.
 */
const components: Components = {
  p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-1.5 list-disc pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-1.5 list-decimal pl-5">{children}</ol>,
  li: ({ children }) => <li className="my-0.5">{children}</li>,
  strong: ({ children }) => <strong className="font-bold text-[var(--ls-primary)]">{children}</strong>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer noopener" className="font-semibold text-[var(--ls-primary)] underline underline-offset-2">
      {children}
    </a>
  ),
  code: ({ children }) => <code className="rounded bg-white/70 px-1 py-0.5 font-mono text-[0.9em]">{children}</code>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 rounded-xl border border-[var(--ls-border)] bg-white/70 px-3 py-2">{children}</blockquote>
  ),
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b border-[var(--ls-border-strong)] px-2 py-1 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-b border-[var(--ls-border)] px-2 py-1">{children}</td>,
};

export function LessonMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={components}>
      {text}
    </ReactMarkdown>
  );
}
