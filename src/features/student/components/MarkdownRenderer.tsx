"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
// We can use a standard highlight.js theme
import "highlight.js/styles/github-dark.css";
import { authFetch } from "@/utils/authFetch";
import { FigureView } from "./FigureView";
import { useStudentStore } from "../store/useStudentStore";
import { Volume2, Mic, RotateCcw, Image as ImageIcon } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
  showToolbar?: boolean;
}

/**
 * A robust Markdown renderer that supports:
 * - GitHub Flavored Markdown (tables, lists)
 * - Math/LaTeX (KaTeX)
 * - Syntax highlighting for code blocks
 * - GenEd branded styling
 */
const extractTextContent = (children: any): string => {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) {
    return children.map(c => {
      if (typeof c === "string") return c;
      if (c?.props?.children) return extractTextContent(c.props.children);
      return "";
    }).join("");
  }
  if (children?.props?.children) return extractTextContent(children.props.children);
  return "";
};

const getMarkdownComponents = (showToolbar: boolean) => ({
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
        <pre className="!bg-slate-100 !p-4 rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
          <code className={`${className} !text-[13px] !text-slate-800 !leading-relaxed`} {...props}>
            {children}
          </code>
        </pre>
      </motion.div>
    ) : (
      <code className="text-[13px] font-black text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md font-mono" {...props}>
        {children}
      </code>
    );
  },
  
  // Paragraph styles
  p: ({ node, children, ...props }: any) => {
    const handleAction = (action: string) => {
      const text = extractTextContent(children);
      useStudentStore.getState().sendMessage(`${action}: "${text}"`);
    };

    return (
      <div className="relative group mb-3 last:mb-0">
        <p className="leading-relaxed" {...props}>{children}</p>
      </div>
    );
  },
  
  // Image styles (supports resolved figures)
  img: ({ src, alt, ...props }: any) => {
    const isFigure = src?.includes("/rag/retrieve/figure/");
    if (isFigure) {
        const uuid = src.split('/').pop() || "";
        return <FigureView uuid={uuid} />;
    }
    const handleAction = () => {
      useStudentStore.getState().sendMessage(`Describe this image`);
    };
    return (
      <div className="relative group my-6">
        <motion.img 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          src={src} 
          alt={alt || "Illustration"} 
          className="rounded-2xl border border-[#1a3a2a]/10 shadow-md w-full h-auto object-contain max-h-[400px] block mx-auto"
          {...props} 
        />
      </div>
    );
  },
});

export const MarkdownRenderer = React.memo(({ content, showToolbar }: MarkdownRendererProps) => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
  
  // Parse history markers: <<SHOW_FIGURE(uuid)>> -> Markdown Image
  // Also cleans up AI-generated "slop" where math is unnecessarily wrapped in backticks
  const processedContent = useMemo(() => {
    let cleaned = content;
    
    // Handle Figure tags (and strip backticks if AI unnecessarily added them)
    cleaned = cleaned.replace(/`?(<<SHOW_FIGURE\((.+?)\)>>)`?/g, (_, __, uuid) => {
      return `\n\n![Figure](${API_URL}/rag/retrieve/figure/${uuid})\n\n`;
    });

    // Strip raw audio skill directives so they don't render as text in the UI
    cleaned = cleaned.replace(/<<(?:SPEAK_PARA|KARAOKE|PRONUNCIATION):[\s\S]*?>>/g, '');

    // Fix: Remove backticks wrapping math ($...$) to prevent them from being treated as code blocks
    // This resolves the "green box" issue where math wouldn't render properly
    cleaned = cleaned.replace(/`(\$.+?\$)`/g, '$1');

    // Fix: Remove backticks (single or triple) wrapping simple text that the AI might have accidentally formatted as code
    // We target strings that are short, contain spaces, and don't look like code (no common code symbols like ; { } ( ) =)
    const isCodeLike = (str: string) => /[;{}[\]()=]/.test(str);
    
    // Cleanup triple backticks
    cleaned = cleaned.replace(/```\n?([^`]+?)\n?```/g, (match, p1) => {
      if (p1.length < 100 && p1.includes(' ') && !isCodeLike(p1)) {
        return p1.trim();
      }
      return match;
    });

    // Cleanup single backticks
    cleaned = cleaned.replace(/`([^`\n]+)`/g, (match, p1) => {
      if (p1.length < 60 && p1.includes(' ') && !isCodeLike(p1)) {
        return p1;
      }
      return match;
    });

    // Fix: Escape underscores specifically inside math blocks to prevent KaTeX "Double Subscript" errors
    // We only escape sequences of 2 or more underscores (e.g. ____) to preserve valid subscripts like x_1
    cleaned = cleaned.replace(/\$([\s\S]+?)\$/g, (match, math) => {
      return '$' + math.replace(/_{2,}/g, (m: string) => m.replace(/_/g, '\\_')) + '$';
    });
    
    return cleaned;
  }, [content, API_URL]);

  const components = useMemo(() => getMarkdownComponents(showToolbar || false), [showToolbar]);

  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeHighlight, rehypeKatex]}
        components={components}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
});

MarkdownRenderer.displayName = "MarkdownRenderer";
