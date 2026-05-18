"use client";

import { motion } from "framer-motion";
import { Mic, MicOff, Play, Pause, CheckCircle2, RotateCcw, Send } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { ActivityAction, useStudentStore } from "../store/useStudentStore";
import { useSpeechToText } from "@/hooks/useSpeechToText";

interface ActivityRendererProps {
  action: ActivityAction;
  isCompleted?: boolean;
}

export function ActivityRenderer({ action, isCompleted = false }: ActivityRendererProps) {
  const { submitActivityResult } = useStudentStore();
  const [localTranscript, setLocalTranscript] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { isListening, transcript, startListening, stopListening, isSupported } = useSpeechToText({
    onResult: (t) => setLocalTranscript(t),
    onEnd: () => {
      // Auto-submit for reading/repeat if transcript is substantial? 
      // Or let user review. Let's let them review for now.
    }
  });

  const handleSubmit = () => {
    if (!localTranscript && action.type !== "request_listening") return;
    submitActivityResult(action.activity_id, action.type, localTranscript);
  };

  const handleToggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const renderReading = () => (
    <div className="flex flex-col gap-3 mt-2 mb-4">
      <div className="text-[15px] font-medium text-[#042E5C]/90 leading-relaxed border-l-2 border-[#042E5C]/20 pl-3">
        {action.content}
      </div>
      
      {!isCompleted && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleMic}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${
              isListening ? "bg-red-500 text-white animate-pulse" : "bg-white text-[#042E5C] border border-[#042E5C]/10 hover:bg-[#042E5C] hover:text-white"
            }`}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          
          <div className="flex-1 px-3 py-2 bg-white/50 rounded-xl border border-transparent min-h-[40px] text-[13px] text-[#042E5C]/60 flex items-center">
            {localTranscript || (isListening ? "Listening..." : "Tap mic to read aloud") }
          </div>

          {localTranscript && (
            <button
              onClick={handleSubmit}
              className="w-10 h-10 rounded-full bg-[#042E5C] text-white flex items-center justify-center hover:bg-[#064282] transition-all"
            >
              <Send size={16} />
            </button>
          )}
        </div>
      )}
      
      {isCompleted && (
        <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[12px] uppercase tracking-wider pl-3">
          <CheckCircle2 size={14} /> Completed
        </div>
      )}
    </div>
  );

  const renderListening = () => (
    <div className="flex flex-col gap-4 p-4 bg-white rounded-2xl border border-[#042E5C]/10 shadow-sm mt-3">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-12 h-12 rounded-full bg-[#042E5C] text-white flex items-center justify-center hover:bg-[#064282] transition-all shadow-md"
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
        </button>
        <div className="flex-1">
          <p className="text-[14px] font-bold text-[#042E5C]">Listen carefully</p>
          <p className="text-[12px] text-[#042E5C]/60">{action.question || "Answer the question based on what you hear."}</p>
        </div>
      </div>

      {!isCompleted && (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="text"
            value={localTranscript}
            onChange={(e) => setLocalTranscript(e.target.value)}
            placeholder="Type your answer here..."
            className="flex-1 px-4 py-3 bg-[#F8F9FA] rounded-xl border border-[#042E5C]/10 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#042E5C]/20"
          />
          <button
            onClick={handleSubmit}
            disabled={!localTranscript.trim()}
            className="px-6 py-3 bg-[#042E5C] text-white rounded-xl font-bold text-[14px] disabled:opacity-30 transition-all"
          >
            Submit
          </button>
        </div>
      )}

      {isCompleted && (
        <div className="flex items-center gap-2 text-emerald-500 font-bold text-[13px] uppercase tracking-wider">
          <CheckCircle2 size={16} /> Answer Submitted
        </div>
      )}
    </div>
  );

  const renderSpelling = () => (
    <div className="flex flex-col gap-4 p-4 bg-white rounded-2xl border border-[#042E5C]/10 shadow-sm mt-3">
      <p className="text-[14px] font-bold text-[#042E5C]">Spelling Challenge</p>
      <div className="flex flex-wrap gap-2">
        {action.words?.map((word, i) => (
          <span key={i} className="px-3 py-1 bg-[#042E5C]/5 rounded-lg text-[13px] font-medium text-[#042E5C]">
            {word}
          </span>
        ))}
      </div>

      {!isCompleted && (
        <div className="space-y-3">
          <input
            type="text"
            value={localTranscript}
            onChange={(e) => setLocalTranscript(e.target.value)}
            placeholder="Spell the words..."
            className="w-full px-4 py-3 bg-[#F8F9FA] rounded-xl border border-[#042E5C]/10 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#042E5C]/20"
          />
          <button
            onClick={handleSubmit}
            disabled={!localTranscript.trim()}
            className="w-full py-3 bg-[#042E5C] text-white rounded-xl font-bold text-[14px] disabled:opacity-30 transition-all"
          >
            Check Spelling
          </button>
        </div>
      )}

      {isCompleted && (
        <div className="flex items-center gap-2 text-emerald-500 font-bold text-[13px] uppercase tracking-wider">
          <CheckCircle2 size={16} /> Spelling Completed
        </div>
      )}
    </div>
  );

  const renderRepeat = () => (
    <div className="flex flex-col gap-3 mt-2 mb-4">
      <div className="flex items-center gap-2 pl-1">
        <RotateCcw size={14} className="text-[#042E5C]/50" />
        <p className="text-[12px] font-bold text-[#042E5C]/50 uppercase tracking-wider">Repeat after me</p>
      </div>
      
      <div className="text-[15px] font-medium text-[#042E5C]/90 leading-relaxed border-l-2 border-[#042E5C]/20 pl-3 italic">
        "{action.content}"
      </div>

      {!isCompleted && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleMic}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${
              isListening ? "bg-red-500 text-white animate-pulse" : "bg-white text-[#042E5C] border border-[#042E5C]/10 hover:bg-[#042E5C] hover:text-white"
            }`}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          
          <div className="flex-1 px-3 py-2 bg-white/50 rounded-xl border border-transparent min-h-[40px] text-[13px] text-[#042E5C]/60 flex items-center">
            {localTranscript || (isListening ? "Listening..." : "Tap to record...") }
          </div>

          {localTranscript && (
            <button
              onClick={handleSubmit}
              className="w-10 h-10 rounded-full bg-[#042E5C] text-white flex items-center justify-center hover:bg-[#064282] transition-all"
            >
              <Send size={16} />
            </button>
          )}
        </div>
      )}

      {isCompleted && (
        <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[12px] uppercase tracking-wider pl-3">
          <CheckCircle2 size={14} /> Good Job!
        </div>
      )}
    </div>
  );

  switch (action.type) {
    case "request_reading": return renderReading();
    case "request_listening": return renderListening();
    case "request_spelling": return renderSpelling();
    case "request_repeat": return renderRepeat();
    default: return null;
  }
}
