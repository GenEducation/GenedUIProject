"use client";

import { motion } from "framer-motion";
import { Upload, Plus, BrainCircuit, FolderOpen } from "lucide-react";
import { useState, useRef } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

interface CurriculumIngestionProps {
  activeAgentId: string | null;
  agents: any[];
  onAddAgent: () => void;
  onExtractionComplete: (data: any) => void;
}

export function CurriculumIngestion({
  activeAgentId,
  agents,
  onAddAgent,
  onExtractionComplete,
}: CurriculumIngestionProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState(activeAgentId || "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Sync internal select with parent activeAgentId
  if (activeAgentId && selectedAgentId !== activeAgentId) {
    setSelectedAgentId(activeAgentId);
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!selectedAgentId) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append("agent_id", selectedAgentId);
    const mockFile = new File(["mock content"], "curriculum_docs.pdf", {
      type: "application/pdf",
    });
    formData.append("file", mockFile);

    try {
      const resp = await fetch(`${API_BASE_URL}/district/ingestion/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await resp.json();
      onExtractionComplete(data);
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="bg-white border border-navy/5 rounded-[2.5rem] p-8 shadow-sm flex flex-col h-[600px] space-y-0">
      <div className="space-y-1 pb-4">
        <h3 className="text-lg font-bold text-navy">Curriculum Ingestion</h3>
        <p className="text-xs text-navy/40">
          Map uploaded content to agents for registry.
        </p>
      </div>

      {/* 80% Drag and Drop Area */}
      <div className="flex-1 min-h-0 flex items-stretch">
        <div className="w-full border-2 border-dashed border-navy/10 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4 hover:border-emerald/30 transition-all group bg-academic-grey/30">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-navy/10 group-hover:text-emerald group-hover:scale-110 transition-all shadow-sm"
          >
            <Upload size={32} />
          </motion.div>
          <div className="space-y-2">
            <p className="text-sm font-bold text-navy">Drag and Drop</p>
            <p className="text-[11px] text-navy/40 uppercase tracking-widest leading-tight">
              Drag and drop your files
              <br />
              here
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <div className="h-px bg-navy/10 flex-1" />
            <span className="text-[10px] text-navy/30 uppercase tracking-widest">
              or
            </span>
            <div className="h-px bg-navy/10 flex-1" />
          </div>
          <button
            onClick={triggerFileInput}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald/10 border border-emerald/30 text-emerald rounded-xl text-sm font-semibold hover:bg-emerald/20 transition-all"
          >
            <FolderOpen size={16} />
            Select Folder
          </button>
        </div>
      </div>

      {/* 20% Associate Agent and Create Button */}
      <div className="pt-4 flex items-center gap-4">
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-bold text-navy/40 uppercase tracking-widest">
            Associate Agent
          </label>
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-navy/5 rounded-xl text-sm font-semibold text-navy outline-none focus:ring-2 focus:ring-emerald/20 appearance-none shadow-sm hover:border-navy/10 transition-colors"
          >
            <option value="">Select an agent...</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleUpload}
          disabled={isUploading || !selectedAgentId}
          className={`self-end px-6 py-3 bg-navy text-white rounded-xl text-sm font-bold shadow-lg transition-all whitespace-nowrap ${
            isUploading
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-emerald hover:shadow-emerald/20 active:scale-95"
          }`}
        >
          {isUploading ? (
            <span className="flex items-center gap-2">
              <BrainCircuit size={16} className="animate-spin" />
              Ingesting...
            </span>
          ) : (
            "Create Agent"
          )}
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept="*"
      />
    </section>
  );
}
