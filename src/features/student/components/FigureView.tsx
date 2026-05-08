"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { authFetch } from "@/utils/authFetch";

interface FigureViewProps {
  uuid: string;
}

/**
 * FigureView handles authenticated image fetching for historical figures
 */
export const FigureView = React.memo(({ uuid }: FigureViewProps) => {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    let objectUrl: string | null = null;
    
    const fetchImage = async () => {
      try {
        const res = await authFetch(`${API_URL}/rag/retrieve/figure/${uuid}`);
        if (!res.ok) throw new Error("Failed to fetch figure");
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch (err) {
        console.error("Figure load error:", err);
        setError(true);
      }
    };

    fetchImage();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [uuid, API_URL]);

  if (error) {
    return (
      <div className="my-6 p-6 bg-red-50 border border-red-100 rounded-2xl text-center">
        <p className="text-xs font-bold text-red-400 uppercase tracking-widest">Error loading figure</p>
      </div>
    );
  }

  if (!src) {
    return (
      <div className="my-6 h-40 animate-pulse bg-[#1a3a2a]/5 rounded-2xl flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1a3a2a]/10 border-t-[#1a3a2a]/30 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.img 
      initial={{ opacity: 0, scale: 0.98 }} 
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      src={src} 
      alt="Historical Figure" 
      className="rounded-2xl border border-[#1a3a2a]/10 shadow-md w-full h-auto object-contain max-h-[500px] my-6 block mx-auto"
    />
  );
});

FigureView.displayName = "FigureView";
