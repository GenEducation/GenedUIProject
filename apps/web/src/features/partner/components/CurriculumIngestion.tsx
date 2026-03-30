"use client";

import { motion } from "framer-motion";
import { Upload, Plus, BrainCircuit } from "lucide-react";
import { useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

interface CurriculumIngestionProps {
  activeAgentId: string | null;
  agents: any[];
  onAddAgent: () => void;
  onExtractionComplete: (data: any) => void;
}

export function CurriculumIngestion({ activeAgentId, agents, onAddAgent, onExtractionComplete }: CurriculumIngestionProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState(activeAgentId || "");

  // Sync internal select with parent activeAgentId
  if (activeAgentId && selectedAgentId !== activeAgentId) {
    setSelectedAgentId(activeAgentId);
  }

  const handleUpload = async () => {
    if (!selectedAgentId) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append("agent_id", selectedAgentId);
    const mockFile = new File(["mock content"], "curriculum_docs.pdf", { type: "application/pdf" });
    formData.append("file", mockFile);

    try {
      const resp = await fetch(`${API_BASE_URL}/district/ingestion/upload`, {
        method: 'POST',
        body: formData
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
    <section className="bg-white border border-navy/5 rounded-[2.5rem] p-8 shadow-sm space-y-6 flex flex-col">
      <div className="space-y-1">
        <h3 className="text-lg font-bold">Curriculum Ingestion</h3>
        <p className="text-xs text-navy/40">Map uploaded content to agents for registry.</p>
      </div>

      <div className="flex-1 flex gap-6">
        {/* Dropzone */}
        <div className="flex-1 border-2 border-dashed border-navy/10 rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-4 hover:border-emerald/30 transition-all group bg-academic-grey/30">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-navy/10 group-hover:text-emerald group-hover:scale-110 transition-all shadow-sm">
            <Upload size={28} />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-navy">Drag and Drop</p>
            <p className="text-[10px] text-navy/40 uppercase tracking-widest leading-tight">Drag and drop your files<br/>here</p>
          </div>
        </div>

        {/* Form Controls */}
        <div className="w-48 flex flex-col justify-end space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-navy/40 uppercase tracking-widest">Associate Agent</label>
            <select 
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-navy/5 rounded-xl text-[10px] font-bold text-navy outline-none focus:ring-2 focus:ring-emerald/20 appearance-none shadow-sm"
            >
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <button 
            onClick={handleUpload}
            disabled={isUploading || !selectedAgentId}
            className={`w-full py-3 bg-navy text-white rounded-xl text-[10px] font-bold shadow-lg transition-all ${isUploading ? 'opacity-50' : 'hover:bg-emerald active:scale-95'}`}
          >
            {isUploading ? 'Ingesting...' : 'Create Agent'}
          </button>
        </div>
      </div>
    </section>
  );
}
