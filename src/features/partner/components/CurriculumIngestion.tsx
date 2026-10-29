import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, FileText, RotateCcw, AlertCircle } from "lucide-react";
import { useState, useRef } from "react";
import { usePartnerStore, type Subject } from "../store/usePartnerStore";
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
  /** A chapter to upload again: every detail but the PDF and its pages is filled in from it. */
  prefill?: Subject | null;
}

const fieldLabel = "text-[10px] font-black text-[#122D30] uppercase tracking-widest px-1";
const textInputBase =
  "w-full px-5 py-3.5 border rounded-2xl text-xs font-bold text-[#122D30] outline-none placeholder:text-[#122D30]/30 transition-all";
const textInput = `${textInputBase} bg-[#F6F7F2] border-[#122D30]/10 focus:border-[#122D30]/40`;
const textInputMissing = `${textInputBase} bg-red-50/60 border-red-400 focus:border-red-500`;
const selectButton: React.CSSProperties = {
  background: "#F6F7F2",
  border: "1px solid rgba(18,45,48,0.10)",
  borderRadius: 16,
  padding: "14px 20px",
  fontSize: 12,
  fontWeight: 700,
  color: "#122D30",
};
const selectButtonMissing: React.CSSProperties = {
  ...selectButton,
  background: "rgba(254,242,242,0.6)",
  border: "1px solid #f87171",
};

/**
 * Upload a chapter as a partner source (ADR 0014): the PDF, what it is (board,
 * publisher, subject, grade, book, edition, chapter and its pages) and which
 * learning outcomes and strand it maps to. Submitting registers it and queues
 * its first ingestion run; errors from the server stay on the form.
 */
export function CurriculumIngestion({ onClose, prefill }: CurriculumIngestionProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [subjectName, setSubjectName] = useState(prefill?.subject ?? "");
  const [grade, setGrade] = useState(prefill ? String(prefill.grade) : "");
  const board = resolveTaxonomyBoard();
  const [publisher, setPublisher] = useState(prefill?.publisher ?? "NCERT");
  const [bookTitle, setBookTitle] = useState(prefill?.book_title ?? "");
  const [edition, setEdition] = useState(prefill?.edition_label ?? "");
  const [chapterNo, setChapterNo] = useState(prefill ? String(prefill.chapter_ordinal) : "");
  const [chapterTitle, setChapterTitle] = useState(prefill?.title ?? "");
  const [firstPage, setFirstPage] = useState("1");
  const [lastPage, setLastPage] = useState("");
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [loCodes, setLoCodes] = useState<string[]>(prefill?.lo_codes ?? []);
  const [strand, setStrand] = useState(prefill?.strand ?? "");

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
  // What still blocks the upload, in the order the form shows it: the first is where a
  // premature "Upload & Start" takes the partner. `id` is the element to scroll to and focus.
  const missing = [
    !file && { id: "src-file", label: "the chapter PDF" },
    !grade && { id: "src-grade", label: "Grade" },
    !subjectName && { id: "src-subject", label: "Subject" },
    !publisher.trim() && { id: "src-publisher", label: "Publisher" },
    !edition.trim() && { id: "src-edition", label: "Edition" },
    !bookTitle.trim() && { id: "src-book", label: "Book Title" },
    !(chapterNumber >= 1) && { id: "src-chapter-no", label: "Chapter No." },
    !chapterTitle.trim() && { id: "src-chapter-title", label: "Chapter Title" },
    (!(first >= 1) || !!pageRangeError) && { id: "src-first-page", label: "First Page" },
    !(last >= 1) && { id: "src-last-page", label: "Last Page" },
    loCodes.length === 0 && { id: "src-outcomes", label: "at least one learning outcome" },
    !strand && { id: "src-outcomes", label: "a strand" },
  ].filter((field): field is { id: string; label: string } => !!field);
  const canSubmit = missing.length === 0;
  // Set by the first premature submit; from then on every still-missing field is marked.
  const [showMissing, setShowMissing] = useState(false);
  const isMissing = (id: string) => showMissing && missing.some((field) => field.id === id);
  const inputClass = (id: string) => (isMissing(id) ? textInputMissing : textInput);
  const selectStyle = (id: string) => (isMissing(id) ? selectButtonMissing : selectButton);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateFile(e.target.files[0]);
    }
  };

  const handleProcess = async () => {
    if (!canSubmit || !file) {
      setShowMissing(true);
      const target = missing[0] && document.getElementById(missing[0].id);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.focus({ preventScroll: true });
      }
      return;
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-[#075E63]/20 backdrop-blur-sm">
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`relative w-full ${hasFile ? "max-w-7xl h-[90vh]" : "max-w-2xl max-h-[90vh]"} bg-white rounded-[2.5rem] shadow-[0_20px_70px_rgba(18,45,48,0.15)] overflow-hidden flex flex-col transition-all duration-500`}
      >
        {/* Close Button */}
        <Button iconOnly size="sm" variant="tertiary" className="absolute top-4 right-4 z-50" aria-label="Close" onClick={onClose}>
          <X size={20} />
        </Button>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Form */}
          <form
            noValidate
            aria-label="Upload a chapter"
            onSubmit={(e) => {
              e.preventDefault();
              if (!isProcessing) void handleProcess();
            }}
            className={`flex flex-col ${hasFile ? "w-full md:w-[550px] border-r border-gray-100" : "w-full"} overflow-y-auto`}
          >
            <div className="p-6 md:p-10 space-y-6 md:space-y-8">
              {/* Header */}
              <div>
                <h3 className="text-xl md:text-2xl font-black text-[#122D30] tracking-tight">Curriculum Upload</h3>
                <p className="text-[10px] font-black text-[#122D30]/40 uppercase tracking-widest mt-1">Registry Ingestion</p>
                {prefill && (
                  <p className="mt-2 text-[11px] font-semibold text-[#075E63]">
                    Uploading &ldquo;{prefill.title}&rdquo; again: its details are filled in. Choose the new PDF or pages.
                  </p>
                )}
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
                    id="src-file"
                    tabIndex={-1}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        validateFile(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`outline-none border-2 border-dashed ${fileError || isMissing("src-file") ? 'border-rose-400 bg-rose-50/30' : 'border-[#DCEBE7] bg-[#F8FBF9]'} rounded-[2rem] p-8 md:p-12 flex flex-col items-center justify-center text-center space-y-4 group-hover:bg-[#F0F7F2] group-hover:border-[#122D30]/20 transition-all cursor-pointer`}
                  >
                    <div className={`w-16 h-16 ${fileError ? 'bg-rose-100 text-rose-500' : 'bg-[#DCEBE7] text-[#122D30]'} rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                      <Upload size={24} />
                    </div>
                    <div className="space-y-1">
                      <p className={`text-lg font-bold ${fileError ? 'text-rose-600' : 'text-[#122D30]'}`}>
                        Drag and Drop Curriculum
                      </p>
                      <p className="text-[11px] font-black text-[#122D30]/30 uppercase tracking-widest leading-relaxed">
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
                <div className="p-4 bg-[#F8FBF9] rounded-2xl border border-[#122D30]/5 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#075E63] text-white rounded-xl flex items-center justify-center">
                      <FileText size={18} />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-[#122D30] truncate max-w-[200px]">{file.name}</p>
                      <p className="text-[9px] font-black text-[#122D30]/40 uppercase tracking-widest">Ready to process</p>
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
                    <label className="text-[10px] font-black text-[#122D30] uppercase tracking-widest px-1">Grade</label>
                    <Select
                      id="src-grade"
                      aria-label="Grade"
                      placeholder="Grade"
                      accentColor="#122D30"
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
                      buttonStyle={selectStyle("src-grade")}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#122D30] uppercase tracking-widest px-1">Board</label>
                    <Select
                      aria-label="Education board"
                      accentColor="#122D30"
                      disabled
                      value={board}
                      onChange={() => {}}
                      options={[{ value: board, label: board }]}
                      buttonStyle={selectButton}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#122D30] uppercase tracking-widest px-1">Subject</label>
                  <Select
                    id="src-subject"
                    aria-label="Subject"
                    placeholder="Select Subject"
                    accentColor="#122D30"
                    value={subjectName}
                    onChange={(next) => {
                      setSubjectName(next);
                      setLoCodes([]);
                    }}
                    options={subjectOptions.map((subject) => ({ value: subject, label: subject }))}
                    buttonStyle={selectStyle("src-subject")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="src-publisher" className={fieldLabel}>Publisher</label>
                    <input id="src-publisher" value={publisher} onChange={(e) => setPublisher(e.target.value)} placeholder="e.g. NCERT" className={inputClass("src-publisher")} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="src-edition" className={fieldLabel}>Edition</label>
                    <input id="src-edition" value={edition} onChange={(e) => setEdition(e.target.value)} placeholder="e.g. Reprint 2025-26" className={inputClass("src-edition")} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="src-book" className={fieldLabel}>Book Title</label>
                  <input id="src-book" value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} placeholder="e.g. Ganita Prakash" className={inputClass("src-book")} />
                </div>
                <div className="grid grid-cols-[110px_1fr] gap-4">
                  <div className="space-y-2">
                    <label htmlFor="src-chapter-no" className={fieldLabel}>Chapter No.</label>
                    <input id="src-chapter-no" type="number" min={1} value={chapterNo} onChange={(e) => setChapterNo(e.target.value)} placeholder="e.g. 2" className={inputClass("src-chapter-no")} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="src-chapter-title" className={fieldLabel}>Chapter Title</label>
                    <input id="src-chapter-title" value={chapterTitle} onChange={(e) => setChapterTitle(e.target.value)} placeholder="e.g. Lines and Angles" className={inputClass("src-chapter-title")} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="src-first-page" className={fieldLabel}>First Page</label>
                      <input id="src-first-page" type="number" min={1} value={firstPage} onChange={(e) => setFirstPage(e.target.value)} className={inputClass("src-first-page")} />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="src-last-page" className={fieldLabel}>Last Page</label>
                      <input id="src-last-page" type="number" min={1} max={pageCount ?? undefined} value={lastPage} onChange={(e) => setLastPage(e.target.value)} className={inputClass("src-last-page")} />
                    </div>
                  </div>
                  <p className={`text-[10px] px-1 ${pageRangeError ? "font-bold text-red-600" : "text-[#122D30]/45"}`}>
                    {pageRangeError ?? (pageCount ? `The PDF has ${pageCount} pages. Only the chapter's pages are read.` : "The pages of the PDF that hold the chapter.")}
                  </p>
                </div>

                <div
                  id="src-outcomes"
                  tabIndex={-1}
                  className={`outline-none rounded-2xl transition-shadow ${isMissing("src-outcomes") ? "ring-1 ring-red-400 ring-offset-8" : ""}`}
                >
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
            </div>

            {showMissing && missing.length > 0 && (
              <div role="alert" className="mx-6 md:mx-10 mb-2 flex items-start gap-2 px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
                <AlertCircle size={14} className="mt-px shrink-0" aria-hidden />
                {missing[0].id === "src-first-page" && pageRangeError
                  ? pageRangeError
                  : `Add ${missing[0].label} to upload${missing.length > 1 ? `, and fill the other marked fields` : ""}.`}
              </div>
            )}

            {submitError && (
              <div role="alert" className="mx-6 md:mx-10 mb-2 flex items-start gap-2 px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
                <AlertCircle size={14} className="mt-px shrink-0" aria-hidden />
                {submitError}
              </div>
            )}

            {/* Footer inside Left Column */}
            <div className="mt-auto p-6 md:p-10 bg-white border-t border-gray-50 flex gap-3">
              <button 
                type="button"
                disabled={isProcessing}
                onClick={onClose}
                className="flex-1 py-4 text-xs font-black text-[#122D30]/60 hover:bg-gray-50 rounded-2xl transition-all uppercase tracking-widest"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isProcessing}
                className="flex-[2] py-4 bg-[#075E63] text-white text-xs font-black rounded-2xl hover:bg-[#075E63]/90 transition-all shadow-[0_8px_30px_rgba(18,45,48,0.2)] uppercase tracking-widest disabled:opacity-30"
              >
                {isProcessing ? "Uploading..." : "Upload & Start"}
              </button>
            </div>
          </form>

          {/* Right Column: Page-Wise Preview */}
          <AnimatePresence>
            {hasFile && (
              <motion.div 
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 120 }}
                className="hidden md:flex flex-1 flex-col p-6 md:p-8 lg:p-10 bg-[#F6F7F2]"
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
