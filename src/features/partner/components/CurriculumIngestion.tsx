import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, FileText, Check, RotateCcw } from "lucide-react";
import { useState, useRef } from "react";
import { usePartnerStore } from "../store/usePartnerStore";
import { PageWisePreview } from "./PageWisePreview";

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
  const [subjectName, setSubjectName] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [agentName, setAgentName] = useState("");
  const [grade, setGrade] = useState("");
  const [board, setBoard] = useState("");
  const [documentType, setDocumentType] = useState("chapter");
  
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
    if (!subjectName || !documentTitle || !agentName || !grade || !file) return;
    
    setIsProcessing(true);
    try {
      await uploadCurriculum(file, subjectName, documentTitle, agentName, grade, board, documentType);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const hasFile = !!file;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-[#1A3D2C]/20 backdrop-blur-sm">
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`relative w-full ${hasFile ? "max-w-7xl h-[90vh]" : "max-w-2xl max-h-[90vh]"} bg-white rounded-[2.5rem] shadow-[0_20px_70px_rgba(26,61,44,0.15)] overflow-hidden flex flex-col transition-all duration-500`}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 md:top-8 md:right-8 p-2 text-gray-300 hover:text-[#1A3D2C] hover:bg-gray-50 rounded-xl transition-all z-50"
        >
          <X size={20} />
        </button>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Form */}
          <div className={`flex flex-col ${hasFile ? "w-full md:w-[550px] border-r border-gray-100" : "w-full"} overflow-y-auto`}>
            <div className="p-6 md:p-10 space-y-6 md:space-y-8">
              {/* Header */}
              <div>
                <h3 className="text-xl md:text-2xl font-black text-[#1A3D2C] tracking-tight">Curriculum Upload</h3>
                <p className="text-[10px] font-black text-[#1A3D2C]/40 uppercase tracking-widest mt-1">Registry Ingestion</p>
              </div>

              {!hasFile ? (
                /* Drag & Drop Area (Only visible when no file) */
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
                    className={`border-2 border-dashed ${fileError ? 'border-rose-400 bg-rose-50/30' : 'border-[#D1E6D9] bg-[#F8FBF9]'} rounded-[2rem] p-8 md:p-12 flex flex-col items-center justify-center text-center space-y-4 group-hover:bg-[#F0F7F2] group-hover:border-[#1A3D2C]/20 transition-all cursor-pointer`}
                  >
                    <div className={`w-16 h-16 ${fileError ? 'bg-rose-100 text-rose-500' : 'bg-[#D1E6D9] text-[#1A3D2C]'} rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                      <Upload size={24} />
                    </div>
                    <div className="space-y-1">
                      <p className={`text-lg font-bold ${fileError ? 'text-rose-600' : 'text-[#1A3D2C]'}`}>
                        Drag and Drop Curriculum
                      </p>
                      <p className="text-[11px] font-black text-[#1A3D2C]/30 uppercase tracking-widest leading-relaxed">
                        Supported formats: PDF only.
                      </p>
                      {fileError && (
                        <p className="text-[10px] font-bold text-rose-500 mt-2 animate-pulse">{fileError}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Compact File Summary (Visible when file selected) */
                <div className="p-4 bg-[#F8FBF9] rounded-2xl border border-[#1A3D2C]/5 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#1A3D2C] text-white rounded-xl flex items-center justify-center">
                      <FileText size={18} />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-[#1A3D2C] truncate max-w-[200px]">{file.name}</p>
                      <p className="text-[9px] font-black text-[#1A3D2C]/40 uppercase tracking-widest">Ready to process</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setFile(null); setFileError(null); }}
                    className="p-2 text-[#1A3D2C]/20 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Change File"
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-4 md:space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#1A3D2C] uppercase tracking-widest px-1">Subject</label>
                  <select 
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    className="w-full px-5 py-3.5 bg-[#F8F9F8] border border-[#1A3D2C]/10 focus:border-[#1A3D2C]/40 rounded-2xl text-xs font-bold text-[#1A3D2C] outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Select Subject</option>
                    <option value="english">English</option>
                    <option value="mathematics">Mathematics</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#1A3D2C] uppercase tracking-widest px-1">Document Title</label>
                  <input 
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    placeholder="e.g. NCERT Science Class 10"
                    className="w-full px-5 py-3.5 bg-[#F8F9F8] border border-[#1A3D2C]/10 focus:border-[#1A3D2C]/40 rounded-2xl text-xs font-bold text-[#1A3D2C] outline-none placeholder:text-[#1A3D2C]/30 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#1A3D2C] uppercase tracking-widest px-1">Agent Name</label>
                  <input 
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="e.g. Bio-Bot 3000"
                    className="w-full px-5 py-3.5 bg-[#F8F9F8] border border-[#1A3D2C]/10 focus:border-[#1A3D2C]/40 rounded-2xl text-xs font-bold text-[#1A3D2C] outline-none placeholder:text-[#1A3D2C]/30 transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#1A3D2C] uppercase tracking-widest px-1">Grade</label>
                    <select 
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full px-5 py-3.5 bg-[#F8F9F8] border border-[#1A3D2C]/10 focus:border-[#1A3D2C]/40 rounded-2xl text-xs font-bold text-[#1A3D2C] outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Grade</option>
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
                      className="w-full px-5 py-3.5 bg-[#F8F9F8] border border-[#1A3D2C]/10 focus:border-[#1A3D2C]/40 rounded-2xl text-xs font-bold text-[#1A3D2C] outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Board</option>
                      <option value="CBSE">CBSE</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#1A3D2C] uppercase tracking-widest px-1">Document Type</label>
                  <input 
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    placeholder="e.g. chapter"
                    className="w-full px-5 py-3.5 bg-[#F8F9F8] border border-[#1A3D2C]/10 focus:border-[#1A3D2C]/40 rounded-2xl text-xs font-bold text-[#1A3D2C] outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Footer inside Left Column */}
            <div className="mt-auto p-6 md:p-10 bg-white border-t border-gray-50 flex gap-3">
              <button 
                disabled={isProcessing}
                onClick={onClose}
                className="flex-1 py-4 text-xs font-black text-[#1A3D2C]/60 hover:bg-gray-50 rounded-2xl transition-all uppercase tracking-widest"
              >
                Cancel
              </button>
              <button 
                onClick={handleProcess}
                disabled={isProcessing || !subjectName || !documentTitle || !agentName || !grade || !board || !documentType || !file}
                className="flex-[2] py-4 bg-[#1A3D2C] text-white text-xs font-black rounded-2xl hover:bg-[#1A3D2C]/90 transition-all shadow-[0_8px_30px_rgba(26,61,44,0.2)] uppercase tracking-widest disabled:opacity-30"
              >
                {isProcessing ? "Processing..." : "Process Artifact"}
              </button>
            </div>
          </div>

          {/* Right Column: Page-Wise Preview */}
          <AnimatePresence>
            {hasFile && (
              <motion.div 
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 120 }}
                className="hidden md:flex flex-1 flex-col p-6 md:p-8 lg:p-10 bg-[#F8F9F8]"
              >
                <PageWisePreview file={file} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
