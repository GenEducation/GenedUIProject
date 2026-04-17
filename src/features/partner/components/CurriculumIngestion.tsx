"use client";

import { motion } from "framer-motion";
import { Upload, X, FileText, Check } from "lucide-react";
import { useState, useRef } from "react";

interface CurriculumIngestionProps {
  onClose: () => void;
  activeAgentId: string | null;
  agents: any[];
  onAddAgent: () => void;
  onExtractionComplete: (data: any) => void;
}

import { usePartnerStore } from "../store/usePartnerStore";

interface CurriculumIngestionProps {
  onClose: () => void;
  activeAgentId: string | null;
  agents: any[];
  onAddAgent: () => void;
  onExtractionComplete: (data: any) => void;
}

export function CurriculumIngestion({
  onClose,
  activeAgentId,
  agents,
  onAddAgent,
  onExtractionComplete,
}: CurriculumIngestionProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(65);
  const [subjectName, setSubjectName] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [agentName, setAgentName] = useState("");
  const [grade, setGrade] = useState("");
  const [board, setBoard] = useState("");
  
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const uploadCurriculum = usePartnerStore((state) => state.uploadCurriculum);

  const validateFile = (selectedFile: File) => {
    if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setFileError("Invalid document type. Only PDF files are allowed.");
      setFile(null);
      return false;
    }
    setFileError(null);
    setFile(selectedFile);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateFile(e.target.files[0]);
    }
  };

  const handleProcess = async () => {
    if (!subjectName || !chapterTitle || !agentName || !grade || !file) return;
    
    setIsProcessing(true);
    try {
      await uploadCurriculum(file, subjectName, chapterTitle, agentName, grade, board);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#1A3D2C]/20 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-[2.5rem] shadow-[0_20px_70px_rgba(26,61,44,0.15)] overflow-hidden flex flex-col"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 md:top-8 md:right-8 p-2 text-gray-300 hover:text-[#1A3D2C] hover:bg-gray-50 rounded-xl transition-all z-10"
        >
          <X size={20} />
        </button>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-4 md:space-y-8 scrollbar-hide">
          {/* Header */}
          <div>
            <h3 className="text-lg md:text-xl font-black text-[#1A3D2C]">Curriculum Upload</h3>
          </div>

          {/* Drag & Drop Area */}
          <div className="relative group">
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf"
            />
            <div 
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  validateFile(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed ${fileError ? 'border-rose-400 bg-rose-50/30' : 'border-[#D1E6D9] bg-[#F8FBF9]'} rounded-[1.5rem] md:rounded-[2rem] p-4 sm:p-6 md:p-12 flex flex-col items-center justify-center text-center space-y-2 md:space-y-4 group-hover:bg-[#F0F7F2] group-hover:border-[#1A3D2C]/20 transition-all cursor-pointer`}
            >
              <div className={`w-10 h-10 md:w-16 md:h-16 ${fileError ? 'bg-rose-100 text-rose-500' : 'bg-[#D1E6D9] text-[#1A3D2C]'} rounded-xl md:rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                <Upload size={20} />
              </div>
              <div className="space-y-1">
                <p className={`text-base md:text-lg font-bold ${fileError ? 'text-rose-600' : 'text-[#1A3D2C]'}`}>
                  {file ? file.name : fileError ? "Invalid File" : "Drag and Drop Curriculum"}
                </p>
                <p className="text-[10px] md:text-[11px] font-black text-[#1A3D2C]/30 uppercase tracking-widest leading-relaxed">
                  Supported formats: PDF only.<br className="hidden md:block" />
                  Max file size: 50MB.
                </p>
                {fileError && (
                  <p className="text-[10px] font-bold text-rose-500 mt-2 animate-pulse">{fileError}</p>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#1A3D2C] uppercase tracking-widest px-1">Subject</label>
              <select 
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className="w-full px-4 md:px-5 py-3 md:py-3.5 bg-[#F8F9F8] border border-[#1A3D2C]/15 focus:border-[#1A3D2C]/40 rounded-2xl text-[11px] md:text-xs font-bold text-[#1A3D2C] outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">Select Subject</option>
                <option value="english">English</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#1A3D2C] uppercase tracking-widest px-1">Chapter Title</label>
              <input 
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
                placeholder="e.g. Plant Reproduction"
                className="w-full px-4 md:px-5 py-3 md:py-3.5 bg-[#F8F9F8] border border-[#1A3D2C]/15 focus:border-[#1A3D2C]/40 rounded-2xl text-[11px] md:text-xs font-bold text-[#1A3D2C] outline-none placeholder:text-[#1A3D2C]/50 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#1A3D2C] uppercase tracking-widest px-1">Agent Name</label>
              <input 
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="e.g. Bio-Bot 3000"
                className="w-full px-4 md:px-5 py-3 md:py-3.5 bg-[#F8F9F8] border border-[#1A3D2C]/15 focus:border-[#1A3D2C]/40 rounded-2xl text-[11px] md:text-xs font-bold text-[#1A3D2C] outline-none placeholder:text-[#1A3D2C]/50 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#1A3D2C] uppercase tracking-widest px-1">Grade</label>
              <select 
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-4 md:px-5 py-3 md:py-3.5 bg-[#F8F9F8] border border-[#1A3D2C]/15 focus:border-[#1A3D2C]/40 rounded-2xl text-[11px] md:text-xs font-bold text-[#1A3D2C] outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">Select Grade</option>
                <option value="4">Grade 4</option>
                <option value="5">Grade 5</option>
                <option value="6">Grade 6</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#1A3D2C] uppercase tracking-widest px-1">Board</label>
              <select 
                value={board}
                onChange={(e) => setBoard(e.target.value)}
                className="w-full px-4 md:px-5 py-3 md:py-3.5 bg-[#F8F9F8] border border-[#1A3D2C]/15 focus:border-[#1A3D2C]/40 rounded-2xl text-[11px] md:text-xs font-bold text-[#1A3D2C] outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">Select Board</option>
                <option value="CBSE">CBSE</option>
              </select>
            </div>
          </div>

          {/* Upload Progress */}
          <div className="p-3 md:p-5 bg-[#F8F9F8] rounded-[1.5rem] border border-[#1A3D2C]/5 space-y-2 md:space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-[#D1E6D9]/50 rounded-lg md:rounded-xl flex items-center justify-center text-[#1A3D2C]/40">
                  <FileText size={16} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-[#1A3D2C] truncate max-w-[150px] md:max-w-xs">{file ? file.name : "No file selected"}</p>
                  <p className="text-[10px] font-bold text-[#1A3D2C]/30 italic">{isProcessing ? "Processing..." : file ? "Ready to process" : "Please upload a file"}</p>
                </div>
              </div>
              <span className="text-xs font-black text-[#1A3D2C] opacity-60">{isProcessing ? "100" : file ? "100" : "0"}%</span>
            </div>
            
            <div className="space-y-2 md:space-y-3">
              <div className="h-1.5 w-full bg-[#D1E6D9]/30 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${isProcessing || file ? 100 : 0}%` }}
                  className="h-full bg-[#1A3D2C] rounded-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 md:p-8 lg:px-10 bg-white border-t border-gray-50 flex flex-col sm:flex-row justify-end gap-2 md:gap-4 items-center">
          <button 
            disabled={isProcessing}
            onClick={onClose}
            className="w-full sm:w-auto px-8 py-2 md:py-3 text-sm font-black text-[#1A3D2C] hover:bg-gray-50 rounded-2xl transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            onClick={handleProcess}
            disabled={isProcessing || !subjectName || !chapterTitle || !agentName || !grade || !board || !file}
            className="w-full sm:w-auto px-8 py-2 md:py-3 bg-[#D1E6D9] text-[#1A3D2C] text-sm font-black rounded-2xl hover:bg-[#1A3D2C] hover:text-white transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? "Processing..." : "Process Artifact"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
