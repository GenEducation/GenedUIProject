"use client";

import React from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
// We can use a standard highlight.js theme
import "highlight.js/styles/github-dark.css";

interface MarkdownRendererProps {
  content: string;
}

/**
 * A robust Markdown renderer that supports:
 * - GitHub Flavored Markdown (tables, lists)
 * - Math/LaTeX (KaTeX)
 * - Syntax highlighting for code blocks
 * - GenEd branded styling
 */
const markdownComponents: any = {
  // Header styles
  h1: ({ ...props }: any) => <h1 className="text-lg font-black mt-4 mb-2 text-[#1a3a2a]" {...props} />,
  h2: ({ ...props }: any) => <h2 className="text-md font-bold mt-3 mb-1 text-[#1a3a2a]" {...props} />,
  h3: ({ ...props }: any) => <h3 className="text-sm font-bold mt-2 mb-1 text-[#1a3a2a]" {...props} />,
  
  // List styles
  ul: ({ node, ...props }: any) => <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="list-disc list-inside mb-3 space-y-1" {...(props as any)} />,
  ol: ({ node, ...props }: any) => <motion.ol initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="list-decimal list-inside mb-3 space-y-1" {...(props as any)} />,
  li: ({ node, ...props }: any) => <motion.li initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="text-sm leading-relaxed" {...(props as any)} />,
  
  // Table styles
  table: ({ node, ...props }: any) => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="overflow-x-auto my-4 rounded-xl border border-[#1a3a2a]/10">
      <table className="w-full text-left border-collapse" {...props} />
    </motion.div>
  ),
  thead: ({ ...props }: any) => <thead className="bg-[#1a3a2a]/5" {...props} />,
  th: ({ ...props }: any) => <th className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#1a3a2a]/50 border-b border-[#1a3a2a]/10" {...props} />,
  td: ({ ...props }: any) => <td className="px-4 py-2 text-sm border-b border-[#1a3a2a]/5" {...props} />,
  
  // Link styles
  a: ({ ...props }: any) => <a className="text-emerald-600 hover:underline font-bold" target="_blank" rel="noopener noreferrer" {...props} />,
  
  // Blockquote styles
  blockquote: ({ node, ...props }: any) => <motion.blockquote initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="border-l-4 border-emerald-400 pl-4 py-1 my-3 bg-emerald-50/50 rounded-r-lg italic text-[#1a3a2a]/70" {...(props as any)} />,
  
  // Code styles
  code: ({ node, inline, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || "");
    return !inline ? (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="relative my-4 group">
        {match && (
          <div className="absolute right-3 top-2 text-[9px] font-black uppercase tracking-tighter text-white/30 group-hover:text-white/60 transition-colors">
            {match[1]}
          </div>
        )}
        <pre className="!bg-[#1a3a2a] !p-4 rounded-2xl overflow-x-auto shadow-sm">
          <code className={`${className} !text-[13px] !leading-relaxed`} {...props}>
            {children}
          </code>
        </pre>
      </motion.div>
    ) : (
      <code className="bg-[#1a3a2a]/5 px-1.5 py-0.5 rounded-md text-[13px] font-bold text-emerald-700" {...props}>
        {children}
      </code>
    );
  },
  
  // Paragraph styles
  p: ({ node, ...props }: any) => <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-3 last:mb-0 leading-relaxed" {...(props as any)} />,
};

export const MarkdownRenderer = React.memo(({ content }: MarkdownRendererProps) => {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeHighlight, rehypeKatex]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

MarkdownRenderer.displayName = "MarkdownRenderer";
