"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Menu } from "lucide-react";
import { useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useStudentStore, ChatMessage, ChatSession } from "../store/useStudentStore";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { StudentChatInput } from "./StudentChatInput";

interface StudentChatMainProps {
  activeChat: ChatSession;
  messages: ChatMessage[];
  isAITyping: boolean;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export function StudentChatMain({ 
  activeChat, 
  messages, 
  isAITyping,
  isSidebarOpen,
  toggleSidebar
}: StudentChatMainProps) {
  const router = useRouter();
  const { closeChat, isHistoryLoading, sendMessage, streamingMessageId } = useStudentStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // During streaming or AI typing, use "auto" for instant sync
    // Otherwise use "smooth" for a nice transition
    const behavior = (streamingMessageId || isAITyping) ? "auto" : "smooth";
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  }, [messages, isAITyping, streamingMessageId]);

  const handleOptionSelect = useCallback(
    (option: string) => {
      sendMessage(option);
    },
    [sendMessage]
  );

  const isNewChat = messages.length === 0 && !isHistoryLoading;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-5 border-b border-[#042E5C]/8 bg-white flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="w-10 h-10 rounded-xl bg-[#F4F3EE] flex items-center justify-center text-[#042E5C]/60 hover:text-[#042E5C] transition-all"
          >
            <Menu size={20} />
          </button>
          <button
            onClick={() => { closeChat(); router.push('/student'); }}
            className="w-10 h-10 rounded-xl bg-[#F4F3EE] flex items-center justify-center text-[#042E5C]/60 hover:text-[#042E5C] hover:bg-[#042E5C]/5 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="font-extrabold text-[#042E5C] text-lg leading-tight">
              {activeChat.title}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-widest">
                Assistant Active
              </span>
            </div>
          </div>
        </div>
        {activeChat.grade && (
          <span className="text-xs font-bold text-[#042E5C]/40 bg-[#F4F3EE] px-4 py-2 rounded-full">
            {activeChat.grade}
          </span>
        )}
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto flex flex-col relative">
        <AnimatePresence initial={false}>
          {isHistoryLoading && messages.length === 0 ? (
            <motion.div
              key="loading-history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-4"
            >
              <Loader2 className="w-10 h-10 text-[#042E5C]/20 animate-spin" />
              <p className="text-sm text-[#042E5C]/40 font-bold tracking-wide">Retrieving history...</p>
            </motion.div>
          ) : isNewChat ? (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col items-center justify-center px-6 max-w-5xl mx-auto w-full"
            >
              <div className="w-24 h-24 rounded-[2.5rem] bg-white border border-[#042E5C]/10 flex items-center justify-center overflow-hidden mb-8 shadow-sm">
                <Image 
                  src="/Favicon1.jpg" 
                  alt="Agent Icon" 
                  width={96} 
                  height={96} 
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="text-center space-y-4 mb-12">
                <h1 className="font-serif text-4xl text-[#042E5C] leading-tight">
                  New session: {activeChat.title}
                </h1>
                <p className="text-lg text-[#042E5C]/50 max-w-md mx-auto leading-relaxed">
                  Ask anything about {activeChat.title}. Your Socratic guide is ready.
                </p>
              </div>
              
              {/* Centered Input for New Chat */}
              <div className="w-full max-w-4xl">
                <StudentChatInput chatTitle={activeChat.title} isCentered />
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col">
              {/* Session label */}
              <div className="flex justify-center py-6 border-b border-[#042E5C]/5">
                <span className="text-[11px] font-extrabold text-[#042E5C]/20 uppercase tracking-[0.3em]">
                  Foundation Session &bull; Today
                </span>
              </div>

              {/* Messages List */}
              <div className="flex-1 px-6 md:px-12 py-8 space-y-8 max-w-5xl mx-auto w-full">
                {messages.map((msg) => (
                  <ChatMessageBubble
                    key={msg.id}
                    message={msg}
                    isStreaming={msg.id === streamingMessageId}
                    onOptionSelect={handleOptionSelect}
                  />
                ))}
                <div ref={messagesEndRef} className="h-32" />
              </div>

              {/* Fixed Bottom Input for Active Chat */}
              <div className="sticky bottom-0 left-0 right-0 px-6 pb-8 bg-gradient-to-t from-white via-white to-transparent pt-12">
                <div className="max-w-5xl mx-auto">
                  <StudentChatInput chatTitle={activeChat.title} />
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

