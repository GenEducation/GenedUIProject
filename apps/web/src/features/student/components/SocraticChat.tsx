"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Send, User, Sparkles, Mic, History, Award, BookOpen, ChevronRight, CheckCircle2, ArrowLeft, RotateCcw, LayoutPanelLeft } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAgentStore } from "@/store/useAgent";

interface Question {
  id: string;
  question: string;
  options: string[];
  answer: string;
}

export function SocraticChat() {
  const { activeAgent, setActiveAgent, isAssessmentMode, setAssessmentMode, activeTopic, setActiveTopic, addMastery } = useAgentStore();
  const [messages, setMessages] = useState<{ id: string; text: string; sender: "user" | "agent" }[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  // Assessment State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Load Initial Message when topic is selected
  useEffect(() => {
    if (activeAgent && activeTopic && !isAssessmentMode) {
      setMessages([{
        id: "1",
        text: `Greetings, Scholar. I see you've chosen to explore the depths of '${activeTopic}'. What is your current understanding of its conceptual foundation?`,
        sender: "agent"
      }]);
    }
  }, [activeAgent, activeTopic, isAssessmentMode]);

  // Handle Assessment Mode Entry
  useEffect(() => {
    if (isAssessmentMode && activeTopic) {
      setIsLoadingQuiz(true);
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/assessments/${activeTopic}`)
        .then(res => res.json())
        .then(data => {
          setQuestions(data);
          setCurrentQuestionIndex(0);
          setScore(0);
          setQuizComplete(false);
          setIsLoadingQuiz(false);
        })
        .catch(err => {
          console.error("Quiz fetch failed", err);
          setIsLoadingQuiz(false);
        });
    }
  }, [isAssessmentMode, activeTopic]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { id: Date.now().toString(), text: input, sender: "user" as const };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Mock Socratic Response
    setTimeout(() => {
      const agentMsg = {
        id: (Date.now() + 1).toString(),
        text: `That is an intriguing observation about '${input}'. How does it relate to our broader goal of mastering ${activeTopic}?`,
        sender: "agent" as const
      };
      setMessages(prev => [...prev, agentMsg]);
      setIsTyping(false);
    }, 1500);
  };

  const handleAnswer = (option: string) => {
    if (!questions[currentQuestionIndex]) return;
    
    const isCorrect = option === questions[currentQuestionIndex].answer;
    if (isCorrect) setScore(s => s + 1);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(i => i + 1);
    } else {
      setQuizComplete(true);
      addMastery(10); // Reward for completion
    }
  };

  const resetToDialogue = () => {
    setAssessmentMode(false);
    setQuizComplete(false);
  };

  const exitToCouncil = () => {
    setActiveAgent(null);
    setActiveTopic(null);
    setAssessmentMode(false);
  };

  const changeTopic = () => {
    setActiveTopic(null);
    setAssessmentMode(false);
    setQuizComplete(false);
    setMessages([]);
  };

  if (!activeAgent) return null;

  return (
    <div className={`flex flex-col h-[700px] bg-white border rounded-[2.5rem] overflow-hidden transition-all duration-700 shadow-2xl relative
      ${isAssessmentMode ? 'border-amber-400/30' : 'border-navy/5 shadow-navy/5'}
    `}>
      {/* Header with Navigation */}
      <header className={`px-8 py-6 flex justify-between items-center transition-colors border-b border-navy/5
        ${isAssessmentMode ? 'bg-amber-50/50' : 'bg-academic-grey/30 backdrop-blur-md'}
      `}>
        <div className="flex items-center gap-4">
          <button 
            onClick={exitToCouncil}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-navy/5 text-navy/40 hover:text-navy hover:shadow-lg transition-all"
            title="Return to Council"
          >
            <LayoutPanelLeft size={20} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner
              ${isAssessmentMode ? 'bg-white border border-amber-200' : 'bg-white'}
            `}>
              {activeAgent.icon}
            </div>
            <div>
              <h3 className="font-extrabold text-navy leading-none text-lg">The {activeAgent.name}</h3>
              <p className="text-[10px] text-navy/40 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
                <span className={isAssessmentMode ? 'text-amber-600' : ''}>{isAssessmentMode ? 'CHALLENGE MODE' : 'DIALOGUE ACTIVE'}</span>
                {activeTopic && (
                  <>
                    <span className="opacity-20">•</span>
                    <span className="text-navy/60">{activeTopic}</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          {activeTopic && (
            <button 
              onClick={changeTopic}
              className="px-4 py-2 text-[10px] font-bold text-navy/40 uppercase tracking-widest hover:text-navy flex items-center gap-2"
            >
              <RotateCcw size={14} /> Change Path
            </button>
          )}

          {!isAssessmentMode && activeTopic ? (
            <button 
              onClick={() => setAssessmentMode(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-400 text-amber-950 text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-amber-500 transition-all shadow-xl shadow-amber-400/20"
            >
              <Award size={14} /> Plan Assessment
            </button>
          ) : isAssessmentMode && !quizComplete && (
             <button 
              onClick={resetToDialogue}
              className="flex items-center gap-2 px-6 py-2.5 bg-white border border-navy/10 text-navy/40 text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl hover:text-navy transition-all"
            >
              <ArrowLeft size={14} /> Return to Socratic
            </button>
          )}
        </div>
      </header>

      {/* Main Experience Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col bg-slate-50/10">
        <AnimatePresence mode="wait">
          {!activeTopic ? (
            /* Topic Selection Overlay */
            <motion.div 
              key="learning-select"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="absolute inset-0 z-20 bg-white/95 backdrop-blur-md p-12 flex flex-col items-center justify-center text-center space-y-10"
            >
              <div className="space-y-4">
                <motion.div 
                  initial={{ y: 20 }}
                  animate={{ y: 0 }}
                  className="w-20 h-20 bg-navy text-white rounded-[2rem] mx-auto flex items-center justify-center mb-6 shadow-2xl shadow-navy/20"
                >
                  <BookOpen size={40} />
                </motion.div>
                <h2 className="text-4xl font-black text-navy tracking-tight">Focus Your Mind</h2>
                <p className="text-navy/40 text-sm max-w-sm mx-auto font-medium">Which conceptual discipline shall we explore with {activeAgent.name} today?</p>
              </div>

              <div className="grid grid-cols-1 w-full max-w-sm gap-4">
                {activeAgent.topics?.map((topic, i) => (
                  <motion.button
                    key={topic}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => setActiveTopic(topic)}
                    className="flex justify-between items-center p-6 bg-white border border-navy/5 rounded-3xl hover:border-emerald/40 hover:bg-emerald/5 transition-all group shadow-sm hover:shadow-xl hover:shadow-emerald/5"
                  >
                    <span className="font-bold text-navy group-hover:text-emerald transition-colors">{topic}</span>
                    <ChevronRight size={18} className="text-navy/10 group-hover:text-emerald group-hover:translate-x-1 transition-all" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : isAssessmentMode ? (
            /* Quiz Logic View */
            <motion.div 
              key="quiz-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 p-12 flex flex-col justify-center items-center h-full"
            >
              {isLoadingQuiz ? (
                <div className="text-center space-y-4">
                  <RotateCcw className="animate-spin text-amber-500 mx-auto" size={40} />
                  <p className="text-[10px] font-bold text-navy/20 uppercase tracking-[0.3em]">Preparing Assessment...</p>
                </div>
              ) : !quizComplete ? (
                <div className="w-full max-w-md space-y-10">
                  <div className="space-y-5">
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-[0.3em]">Question {currentQuestionIndex + 1} of {questions.length}</p>
                    <h3 className="text-3xl font-bold text-navy leading-tight tracking-tight">{questions[currentQuestionIndex]?.question}</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {questions[currentQuestionIndex]?.options.map((opt, i) => (
                      <motion.button
                        key={opt}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        onClick={() => handleAnswer(opt)}
                        className="w-full p-6 border-2 border-academic-grey rounded-3xl text-left font-bold text-navy hover:border-amber-400 hover:bg-white hover:shadow-xl hover:shadow-amber-400/5 transition-all"
                      >
                        {opt}
                      </motion.button>
                    ))}
                  </div>
                </div>
              ) : (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center space-y-8 bg-academic-grey/30 p-12 rounded-[3.5rem] border border-white"
                >
                  <div className="w-24 h-24 bg-emerald text-white rounded-[2.5rem] mx-auto flex items-center justify-center shadow-2xl shadow-emerald/20">
                    <CheckCircle2 size={48} />
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-4xl font-extrabold text-navy tracking-tighter">Mastery Confirmed</h2>
                    <div className="inline-block px-4 py-2 bg-white rounded-full border border-navy/5">
                      <p className="text-navy/40 uppercase tracking-[0.2em] font-bold text-[10px]">Topic Completion: {activeTopic}</p>
                    </div>
                    <p className="text-navy/60 font-medium">You correctly answered {score} out of {questions.length} questions.</p>
                  </div>
                  <button 
                    onClick={resetToDialogue}
                    className="w-full py-5 bg-navy text-white text-sm font-bold rounded-[1.5rem] hover:bg-emerald hover:-translate-y-1 transition-all shadow-2xl shadow-navy/20"
                  >
                    Continue Socratic Dialogue
                  </button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            /* Standard Dialogue View */
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-8 scroll-smooth bg-slate-50/20">
              <div className="flex justify-center">
                <span className="text-[10px] font-bold text-navy/20 uppercase tracking-[0.3em] py-2.5 px-6 border border-navy/5 rounded-full bg-white shadow-sm">Engagement Area: {activeTopic}</span>
              </div>
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`max-w-[75%] p-6 rounded-[2rem] shadow-sm leading-relaxed ${
                      m.sender === 'user' ? 'bg-navy text-white rounded-tr-none' : 'bg-white border border-navy/5 text-navy rounded-tl-none font-medium text-lg'
                    }`}
                  >
                    {m.text}
                  </motion.div>
                </div>
              ))}
              {isTyping && (
                <div className="flex items-center gap-4 text-navy/20 pl-4">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-navy/20 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-navy/20 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-navy/20 rounded-full animate-bounce" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest italic text-navy/20">The {activeAgent.name} is weaving thoughts...</span>
                </div>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Interface */}
      {!isAssessmentMode && activeTopic && (
        <footer className="p-8 border-t border-navy/5 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-6 bg-academic-grey/50 p-2 pl-6 rounded-[2rem] border-2 border-transparent focus-within:border-emerald/20 focus-within:bg-white focus-within:shadow-2xl transition-all h-16">
            <Mic className="text-navy/20 cursor-pointer hover:text-emerald transition-colors" size={24} />
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Reflect on your understanding..." 
              className="flex-1 bg-transparent border-none focus:outline-none text-base font-medium text-navy placeholder:text-navy/20"
            />
            <button 
              onClick={handleSend}
              className="w-12 h-12 bg-navy text-white rounded-[1.25rem] flex items-center justify-center hover:bg-emerald hover:scale-105 transition-all shadow-xl shadow-navy/20"
            >
              <Send size={18} />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
