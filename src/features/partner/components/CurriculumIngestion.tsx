import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, FileText, RotateCcw, AlertCircle } from "lucide-react";
import { useState, useRef } from "react";
import { usePartnerStore } from "../store/usePartnerStore";
import { PageWisePreview } from "./PageWisePreview";
import { LearningOutcomePicker } from "./LearningOutcomePicker";
import { MAX_UPLOAD_BYTES } from "../types/sources";
import { asError } from "@/utils/errors";
import { Select } from "@/components/ui/Select";
import {
  allTaxonomyGrades,
  requireExactSubject,
  resolveTaxonomyBoard,
  subjectsForGrade,
  useTaxonomySubjects,
} from "@/features/subjects/subjectCatalog";
import { Button } from "@/components/ui/Button";

interface CurriculumIngestionProps {
  onClose: () => void;
}

const fieldLabel = "text-[10px] font-black text-[#1A3D2C] uppercase tracking-widest px-1";
const textInput =
  "w-full px-5 py-3.5 bg-[#F8F9F8] border border-[#1A3D2C]/10 focus:border-[#1A3D2C]/40 rounded-2xl text-xs font-bold text-[#1A3D2C] outline-none placeholder:text-[#1A3D2C]/30 transition-all";

/**
 * Upload a chapter as a partner source (ADR 0014): the PDF, what it is (board,
 * publisher, subject, grade, book, edition, chapter and its pages) and which
 * learning outcomes and strand it maps to. Submitting registers it and queues
 * its first ingestion run; errors from the server stay on the form.
 */
export function CurriculumIngestion({ onClose }: CurriculumIngestionProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [subjectName, setSubjectName] = useState("");
  const [grade, setGrade] = useState("");
  const board = resolveTaxonomyBoard();
  const [publisher, setPublisher] = useState("NCERT");
  const [bookTitle, setBookTitle] = useState("");
  const [edition, setEdition] = useState("");
  const [chapterNo, setChapterNo] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [firstPage, setFirstPage] = useState("1");
  const [lastPage, setLastPage] = useState("");
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [loCodes, setLoCodes] = useState<string[]>([]);
  const [strand, setStrand] = useState("");

  const gradeNum = parseInt(grade, 10);
  // Loads the catalogue on mount rather than assuming an earlier screen already
  // did — ingestion is the boundary where an off-taxonomy name would be written.
  const catalog = useTaxonomySubjects(board);
  const gradeOptions = allTaxonomyGrades(catalog);
  const subjectOptions = subjectsForGrade(gradeNum, catalog);

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const uploadSource = usePartnerStore((state) => state.uploadSource);

  const validateFile = (selectedFile: File) => {
    if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setFileError("Invalid document type. Only PDF files are allowed.");
      setFile(null);
      return false;
    }
    if (selectedFile.size > MAX_UPLOAD_BYTES) {
      setFileError(`This PDF is larger than ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB. Upload just the chapter's pages.`);
      setFile(null);
      return false;
    }
    setFileError(null);
    setFile(selectedFile);
    setPageCount(null);
    setFirstPage("1");
    setLastPage("");
    return true;
  };

  const handlePageCount = (count: number) => {
    setPageCount(count);
    setLastPage((current) => current || String(count));
  };

  const first = parseInt(firstPage, 10);
  const last = parseInt(lastPage, 10);
  const pageRangeError =
    firstPage && lastPage && (!(first >= 1 && first <= last) || (pageCount !== null && last > pageCount))
      ? `Pages must be within 1 to ${pageCount ?? "the last page"}, first before last.`
      : null;
  const chapterNumber = parseInt(chapterNo, 10);
  const canSubmit =
    !!file && !!grade && !!subjectName && !!publisher.trim() && !!bookTitle.trim() && !!edition.trim() &&
    chapterNumber >= 1 && !!chapterTitle.trim() && first >= 1 && last >= 1 && !pageRangeError &&
    loCodes.length > 0 && !!strand;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateFile(e.target.files[0]);
    }
  };

  const handleProcess = async () => {
    if (!canSubmit || !file) return;
    setIsProcessing(true);
    setSubmitError(null);
    try {
      await uploadSource({
        file,
        board,
        publisher: publisher.trim(),
        subject: requireExactSubject(subjectName, gradeNum, catalog),
        grade: gradeNum,
        book_title: bookTitle.trim(),
        edition_label: edition.trim(),
        chapter_ordinal: chapterNumber,
        chapter_title: chapterTitle.trim(),
        first_pdf_page: first,
        last_pdf_page: last,
        strand,
        lo_codes: loCodes,
      });
      onClose();
    } catch (error) {
      setSubmitError(asError(error).message || "The upload didn't go through. Please try again.");
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
        <Button iconOnly size="sm" variant="tertiary" className="absolute top-4 right-4 z-50" aria-label="Close" onClick={onClose}>
          <X size={20} />
        </Button>

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
                  <Button iconOnly size="sm" variant="destructive" aria-label="Change File" onClick={() => { setFile(null); setFileError(null); }}>
                    <RotateCcw size={16} />
                  </Button>
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-4 md:space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#1A3D2C] uppercase tracking-widest px-1">Grade</label>
                    <Select
                      aria-label="Grade"
                      placeholder="Grade"
                      accentColor="#1A3D2C"
                      value={grade}
                      onChange={(next) => {
                        setGrade(next);
                        setLoCodes([]);
                        if (
                          subjectName &&
                          !subjectsForGrade(parseInt(next, 10), catalog).some(
                            (candidate) => candidate === subjectName,
                          )
                        ) {
                          setSubjectName("");
                        }
                      }}
                      options={gradeOptions.map((g) => ({ value: String(g), label: `Grade ${g}` }))}
                      buttonStyle={{
                        background: "#F8F9F8",
                        border: "1px solid rgba(26,61,44,0.10)",
                        borderRadius: 16,
                        padding: "14px 20px",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#1A3D2C",
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#1A3D2C] uppercase tracking-widest px-1">Board</label>
                    <Select
                      aria-label="Education board"
                      accentColor="#1A3D2C"
                      disabled
                      value={board}
                      onChange={() => {}}
                      options={[{ value: board, label: board }]}
                      buttonStyle={{
                        background: "#F8F9F8",
                        border: "1px solid rgba(26,61,44,0.10)",
                        borderRadius: 16,
                        padding: "14px 20px",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#1A3D2C",
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#1A3D2C] uppercase tracking-widest px-1">Subject</label>
                  <Select
                    aria-label="Subject"
                    placeholder="Select Subject"
                    accentColor="#1A3D2C"
                    value={subjectName}
                    onChange={(next) => {
                      setSubjectName(next);
                      setLoCodes([]);
                    }}
                    options={subjectOptions.map((subject) => ({ value: subject, label: subject }))}
                    buttonStyle={{
                      background: "#F8F9F8",
                      border: "1px solid rgba(26,61,44,0.10)",
                      borderRadius: 16,
                      padding: "14px 20px",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#1A3D2C",
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="src-publisher" className={fieldLabel}>Publisher</label>
                    <input id="src-publisher" value={publisher} onChange={(e) => setPublisher(e.target.value)} placeholder="e.g. NCERT" className={textInput} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="src-edition" className={fieldLabel}>Edition</label>
                    <input id="src-edition" value={edition} onChange={(e) => setEdition(e.target.value)} placeholder="e.g. Reprint 2025-26" className={textInput} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="src-book" className={fieldLabel}>Book Title</label>
                  <input id="src-book" value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} placeholder="e.g. Ganita Prakash" className={textInput} />
                </div>
                <div className="grid grid-cols-[110px_1fr] gap-4">
                  <div className="space-y-2">
                    <label htmlFor="src-chapter-no" className={fieldLabel}>Chapter No.</label>
                    <input id="src-chapter-no" type="number" min={1} value={chapterNo} onChange={(e) => setChapterNo(e.target.value)} placeholder="e.g. 2" className={textInput} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="src-chapter-title" className={fieldLabel}>Chapter Title</label>
                    <input id="src-chapter-title" value={chapterTitle} onChange={(e) => setChapterTitle(e.target.value)} placeholder="e.g. Lines and Angles" className={textInput} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="src-first-page" className={fieldLabel}>First Page</label>
                      <input id="src-first-page" type="number" min={1} value={firstPage} onChange={(e) => setFirstPage(e.target.value)} className={textInput} />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="src-last-page" className={fieldLabel}>Last Page</label>
                      <input id="src-last-page" type="number" min={1} max={pageCount ?? undefined} value={lastPage} onChange={(e) => setLastPage(e.target.value)} className={textInput} />
                    </div>
                  </div>
                  <p className={`text-[10px] px-1 ${pageRangeError ? "font-bold text-red-600" : "text-[#1A3D2C]/45"}`}>
                    {pageRangeError ?? (pageCount ? `The PDF has ${pageCount} pages. Only the chapter's pages are read.` : "The pages of the PDF that hold the chapter.")}
                  </p>
                </div>

                <LearningOutcomePicker
                  board={board}
                  subject={subjectName}
                  grade={Number.isInteger(gradeNum) ? gradeNum : null}
                  selected={loCodes}
                  onSelectedChange={setLoCodes}
                  strand={strand}
                  onStrandChange={setStrand}
                />
              </div>
            </div>

            {submitError && (
              <div role="alert" className="mx-6 md:mx-10 mb-2 flex items-start gap-2 px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
                <AlertCircle size={14} className="mt-px shrink-0" aria-hidden />
                {submitError}
              </div>
            )}

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
                disabled={isProcessing || !canSubmit}
                className="flex-[2] py-4 bg-[#1A3D2C] text-white text-xs font-black rounded-2xl hover:bg-[#1A3D2C]/90 transition-all shadow-[0_8px_30px_rgba(26,61,44,0.2)] uppercase tracking-widest disabled:opacity-30"
              >
                {isProcessing ? "Uploading..." : "Upload & Start"}
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
                <PageWisePreview file={file} onPageCount={handlePageCount} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
