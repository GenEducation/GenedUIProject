"use client";

import { motion, AnimatePresence } from "framer-motion";
import { User, ShieldCheck, School, ArrowRight, Lock, Mail, ChevronLeft } from "lucide-react";
import { useState } from "react";

interface LoginViewProps {
  onLogin: (role: "student" | "parent" | "partner") => void;
}

export function LoginView({ onLogin }: LoginViewProps) {
  const [selectedRole, setSelectedRole] = useState<"student" | "parent" | "partner" | null>(null);
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");

  const roles = [
    { id: "student", name: "Student", desc: "Embark on a scholarly journey.", icon: <School size={32} />, color: "emerald" },
    { id: "parent", name: "Parent", desc: "Gain deep knowledge insights.", icon: <ShieldCheck size={32} />, color: "navy" },
    { id: "partner", name: "Partner", desc: "Oversee district ecosystem.", icon: <User size={32} />, color: "academic-grey" },
  ] as const;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole) {
      onLogin(selectedRole);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="max-w-4xl w-full space-y-12">
        <div className="text-center space-y-4">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 bg-emerald mx-auto rounded-3xl flex items-center justify-center text-4xl text-white font-bold italic italic-shadow shadow-xl shadow-emerald/20"
          >
            G
          </motion.div>
          <h1 className="text-5xl tracking-tight leading-tight">
            Welcome to <span className="font-bold underline decoration-emerald decoration-4">GenEd</span> Portal
          </h1>
          <p className="text-navy/40 max-w-lg mx-auto">
            A premium, agent-driven platform for conceptual mastery and scholarly excellence.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!selectedRole ? (
            <motion.div 
              key="role-selection"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {roles.map((role, i) => (
                <motion.div
                  key={role.id}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setSelectedRole(role.id)}
                  className="group relative p-8 bg-white border border-navy/5 rounded-[2rem] hover:border-emerald/30 hover:shadow-2xl hover:shadow-emerald/10 transition-all cursor-pointer overflow-hidden text-center"
                >
                  <div className={`w-14 h-14 mx-auto ${role.id === 'student' ? 'bg-emerald' : 'bg-navy'} rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform`}>
                    {role.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-navy mb-2">{role.name}</h3>
                  <p className="text-sm text-navy/40 leading-relaxed mb-6">{role.desc}</p>
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-navy group-hover:text-emerald transition-colors">
                    Login as {role.name} <ArrowRight size={14} />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              key="credential-entry"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="max-w-md mx-auto w-full p-10 bg-academic-grey/30 border border-navy/5 rounded-[3rem] space-y-8"
            >
              <button 
                onClick={() => setSelectedRole(null)}
                className="flex items-center gap-2 text-[10px] font-bold text-navy/40 uppercase tracking-widest hover:text-navy transition-colors"
              >
                <ChevronLeft size={14} /> Change Role
              </button>
              
              <div className="space-y-2">
                <h3 className="text-3xl font-bold text-navy capitalize">{selectedRole} Access</h3>
                <p className="text-sm text-navy/40">Enter your scholarly credentials to proceed.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-navy/30 uppercase tracking-[0.2em] pl-1">Email Identifier</label>
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-navy/20" size={18} />
                    <input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="arjun@gened.edu"
                      autoComplete="email"
                      className="w-full pl-14 pr-6 py-4 bg-white border border-navy/5 rounded-2xl text-sm focus:outline-none focus:border-emerald/30 transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-navy/30 uppercase tracking-[0.2em] pl-1">Private Passcode</label>
                  <div className="relative">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-navy/20" size={18} />
                    <input 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full pl-14 pr-6 py-4 bg-white border border-navy/5 rounded-2xl text-sm focus:outline-none focus:border-emerald/30 transition-all font-mono"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-5 bg-navy text-white text-xs font-bold rounded-[1.5rem] shadow-xl shadow-navy/20 hover:bg-emerald hover:-translate-y-0.5 transition-all"
                >
                  Verify & Enter Portal
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-center">
          <p className="text-[10px] font-bold text-navy/20 uppercase tracking-[0.2em]">GenEd Scholarly Engine v1.0 • Built for Excellence</p>
        </div>
      </div>
    </div>
  );
}
