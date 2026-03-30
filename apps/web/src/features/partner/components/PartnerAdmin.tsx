"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, BookOpen, Activity, ShieldCheck, TrendingUp, Download, 
  Plus, HelpCircle, X, ChevronRight, Search, Bell, Settings, 
  FileText, BrainCircuit, Sparkles, Filter, Check
} from "lucide-react";
import { useState, useEffect } from "react";
import { CurriculumIngestion } from "./CurriculumIngestion";
import { EnrollmentAdmin } from "./EnrollmentAdmin";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
const GRADES = ["4th Standard", "5th Standard", "6th Standard", "7th Standard"];
const SUBJECTS = ["Mathematics", "Science", "History", "English", "Social Studies"];

export function PartnerAdmin() {
  const [activeTab, setActiveTab] = useState(0); // 0: Ops, 1: Users, 2: Activity, 3: Settings
  const [agents, setAgents] = useState<any[]>([]);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: "", grade: GRADES[0], subject: SUBJECTS[0] });
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [lastExtraction, setLastExtraction] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/agents`)
      .then(res => res.json())
      .then(data => {
        setAgents(data);
        if (data.length > 0) setActiveAgentId(data[0].id);
      })
      .catch(err => console.error("Agents fetch failed", err));

    fetch(`${API_BASE_URL}/district/ingestion/history`)
      .then(res => res.json())
      .then(data => setHistory(data))
      .catch(err => console.error("History fetch failed", err));
      
    fetch(`${API_BASE_URL}/district/settings`)
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(err => console.error("Settings fetch failed", err));
  }, []);

  const handleExtractionComplete = (data: any) => {
    setLastExtraction(data);
    setHistory([data, ...history]);
  };

  const handleAddAgent = async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/district/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgent)
      });
      const data = await resp.json();
      setAgents([...agents, data]);
      setShowAddAgent(false);
      setNewAgent({ name: "", grade: GRADES[0], subject: SUBJECTS[0] });
    } catch (err) {
      console.error("Failed to add agent", err);
    }
  };

  return (
    <div className="min-h-screen bg-academic-grey flex font-sans text-navy">
      {/* Sidebar - Matching V6 Mockup */}
      <aside className="w-20 bg-navy flex flex-col items-center py-8 space-y-8 border-r border-white/5">
        <div className="w-12 h-12 bg-emerald/20 rounded-2xl flex items-center justify-center text-emerald">
          <BrainCircuit size={28} />
        </div>
        <nav className="flex-1 flex flex-col space-y-6">
          {[BookOpen, Users, Activity, Settings].map((Icon, i) => (
            <button 
              key={i} 
              onClick={() => setActiveTab(i)}
              className={`p-4 rounded-2xl transition-all ${activeTab === i ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              <Icon size={20} />
            </button>
          ))}
        </nav>
        <button className="p-4 text-white/40 hover:text-white mt-auto">
          <Download size={20} />
        </button>
      </aside>

      <main className="flex-1 p-10 space-y-10 overflow-y-auto">
        {/* Top Bar */}
        <header className="flex justify-between items-center">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              {activeTab === 0 && "Scholarly Ops"}
              {activeTab === 1 && "District Enrollment"}
              {activeTab === 2 && "Efficacy Center"}
              {activeTab === 3 && "District Config"}
            </h1>
            <p className="text-sm text-navy/40 font-medium">
              {activeTab === 0 && "District-wide curriculum and agent management."}
              {activeTab === 1 && "Registry, learner metadata and subject enrollment approvals."}
              {activeTab === 2 && "Longitudinal growth and scholastic impact reporting."}
              {activeTab === 3 && "Administrative parameters and API configuration."}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex bg-white px-4 py-2 rounded-xl border border-navy/5 items-center gap-3 w-64 shadow-sm">
              <Search size={16} className="text-navy/20" />
              <input placeholder="Search district intel..." className="bg-transparent border-none text-xs outline-none w-full" />
            </div>
            <button className="p-3 bg-white border border-navy/5 rounded-xl text-navy/40 relative">
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-emerald rounded-full border-2 border-white" />
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-navy/10">
              <div className="text-right">
                <p className="text-xs font-bold leading-none">{settings ? settings.lead_admin : "Admin User"}</p>
                <p className="text-[10px] text-navy/40 font-bold uppercase mt-1">District Lead</p>
              </div>
              <div className="w-10 h-10 bg-emerald rounded-xl shadow-lg border-2 border-white" />
            </div>
          </div>
        </header>

        {/* Dynamic View Content */}
        {activeTab === 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* Panel 1: Subject Registry */}
          <section className="bg-white border border-navy/5 rounded-[2.5rem] p-8 shadow-sm space-y-6 flex flex-col h-[600px]">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <h3 className="text-lg font-bold">Subject Registry</h3>
                <p className="text-xs text-navy/40">Subject agent canted for subject registry.</p>
              </div>
            </div>
            
            <motion.div layout className="grid grid-cols-2 auto-rows-min gap-4 flex-1 overflow-y-auto pr-2 scrollbar-thin">
              {agents.map((agent) => (
                <motion.div 
                   key={agent.id}
                   layout
                   initial={false}
                   onClick={() => setActiveAgentId(agent.id)}
                   className={`p-6 rounded-[2rem] border transition-all duration-500 cursor-pointer group relative flex flex-col min-h-[160px] ${activeAgentId === agent.id ? 'bg-navy text-white border-navy shadow-2xl col-span-2' : 'bg-academic-grey border-navy/5 hover:border-emerald/30 shadow-sm'}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner italic font-serif ${activeAgentId === agent.id ? 'bg-white/10 text-white' : 'bg-white text-navy/20'}`}>
                      {agent.icon || "🎓"}
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <p className={`text-[8px] font-bold uppercase tracking-widest ${activeAgentId === agent.id ? 'text-emerald' : 'text-emerald/60'}`}>{agent.grade}</p>
                    </div>
                  </div>
                  <h4 className="font-bold text-xs mb-1 truncate">{agent.name}</h4>
                  
                  {/* Subject Depth Indicators (Replacing 41/21) */}
                  <div className="flex gap-4 mt-2">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-emerald">{agent.topics?.length || 0}</p>
                      <p className="text-[7px] font-bold uppercase opacity-40">Topics</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-emerald">{Object.keys(agent.skill_vectors || {}).length}</p>
                      <p className="text-[7px] font-bold uppercase opacity-40">Skills</p>
                    </div>
                  </div>

                  {/* Scholastic Map Disclosure Row */}
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                    <div className={`p-3 rounded-2xl text-[10px] font-bold border transition-all flex items-center justify-between group/combo ${activeAgentId === agent.id ? 'bg-white/10 border-white/20 hover:bg-white/20 shadow-lg' : 'bg-white border-navy/10 hover:bg-navy/5'}`}>
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${activeAgentId === agent.id ? 'bg-emerald text-white' : 'bg-emerald/10 text-emerald'}`}>
                          <BookOpen size={14} />
                        </div>
                        <span className="uppercase tracking-widest font-extrabold">Scholastic Intel Map</span>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${activeAgentId === agent.id ? 'bg-white/10 rotate-90 text-emerald' : 'bg-navy/5 opacity-40'}`}>
                        <ChevronRight size={14} />
                      </div>
                    </div>
                    
                    {activeAgentId === agent.id && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-1">
                        <div className="space-y-2">
                           <p className="text-[8px] font-bold uppercase text-emerald tracking-tighter">Academic Topics</p>
                           <div className="space-y-1.5 pl-1 border-l-2 border-emerald/20">
                            {agent.topics?.map((topic: string) => (
                              <div key={topic} className="flex items-center gap-2 group/topic">
                                <div className="w-1.5 h-1.5 bg-emerald/40 rounded-full" />
                                <span className="text-[10px] font-medium opacity-60 group-hover/topic:opacity-100 transition-opacity">{topic}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {agent.skill_vectors && (
                          <div className="pt-3 border-t border-white/5 space-y-3">
                             <p className="text-[8px] font-bold uppercase text-emerald tracking-tighter">Skill Persistence</p>
                             <div className="grid grid-cols-2 gap-3">
                               {Object.entries(agent.skill_vectors).map(([skill, val]: any) => (
                                 <div key={skill} className="space-y-1.5">
                                   <div className="flex justify-between items-center text-[8px] font-bold uppercase opacity-30">
                                     <span>{skill}</span>
                                     <span>{val}%</span>
                                   </div>
                                   <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                     <div className="h-full bg-emerald shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-all duration-1000" style={{ width: `${val}%` }} />
                                   </div>
                                 </div>
                               ))}
                             </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* Panel 2: Curriculum Ingestion - Delegated to subcomponent */}
          <CurriculumIngestion 
            activeAgentId={activeAgentId} 
            agents={agents} 
            onAddAgent={() => setShowAddAgent(true)} 
            onExtractionComplete={handleExtractionComplete}
          />

          {/* Panel 3: Live Extraction Snapshot - Premium Intel Look */}
          <section className="bg-white border border-navy/5 rounded-[2.5rem] p-10 shadow-sm space-y-8 min-h-[450px] flex flex-col">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <h3 className="text-lg font-bold">Live Extraction</h3>
                <p className="text-xs text-navy/40">Preview of English Language Arts curriculum.</p>
              </div>
              <button className="flex items-center gap-2 text-[10px] font-bold text-navy/40 uppercase hover:text-navy transition-all">
                <Eye size={14} /> Preview
              </button>
            </div>
            
            {lastExtraction ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 grid grid-cols-2 gap-8"
              >
                {/* Visual Doc Preview */}
                <div className="bg-academic-grey rounded-2xl p-6 border border-navy/5 relative overflow-hidden flex flex-col items-center">
                  <div className="absolute top-0 left-0 w-full h-1 bg-emerald" />
                  <div className="w-full space-y-3">
                    <div className="h-1.5 w-1/3 bg-emerald/20 rounded-full" />
                    <h4 className="text-sm font-bold text-navy leading-tight">{lastExtraction.topic_name}</h4>
                    <p className="text-[10px] text-navy/30 leading-relaxed italic">e.g. English Language Arts curriculum</p>
                    <div className="space-y-2 pt-4">
                      <p className="text-[9px] font-bold text-navy uppercase tracking-widest">Abstract</p>
                      <div className="space-y-1">
                        <div className="h-1 w-full bg-navy/5 rounded-full" />
                        <div className="h-1 w-full bg-navy/5 rounded-full" />
                        <div className="h-1 w-3/4 bg-navy/5 rounded-full" />
                      </div>
                    </div>
                  </div>
                  <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald/5 rounded-full blur-2xl" />
                </div>

                {/* Skill Matrix Visual */}
                <div className="space-y-6">
                   <div className="space-y-2">
                     <p className="text-[10px] font-bold text-navy/40 uppercase tracking-widest">Skill Matrix</p>
                     <p className="text-[9px] font-serif text-navy/30 leading-none">{`{ "metric": { "Reading": "100", ... } }`}</p>
                   </div>
                   <div className="space-y-5">
                     {Object.entries(lastExtraction.skills).map(([skill, value]: any) => (
                       <div key={skill} className="space-y-2">
                         <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-navy">{skill}</span>
                            <span className="text-[10px] font-bold text-navy/40">{value}%</span>
                         </div>
                         <div className="h-1.5 w-full bg-navy/5 rounded-full overflow-hidden">
                           <div className="h-full bg-emerald" style={{ width: `${value}%` }} />
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center text-center p-10 bg-academic-grey/50 rounded-[2rem] border border-dashed border-navy/10 group">
                 <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-navy/10 mb-4 group-hover:scale-110 transition-transform">
                   <Sparkles size={32} />
                 </div>
                 <p className="text-sm font-bold text-navy/40">Select an agent and process curriculum to see live extraction intel.</p>
              </div>
            )}
          </section>

          {/* Panel 4: Ingestion History - Ledger Look */}
          <section className="bg-white border border-navy/5 rounded-[2.5rem] p-8 shadow-sm space-y-6 flex flex-col min-h-[450px]">
             <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold">Ingestion History</h3>
                  <p className="text-xs text-navy/40">Ledger of processed intellectual nodes.</p>
                </div>
                <button className="p-2 text-navy/40 hover:text-navy hover:bg-academic-grey rounded-lg transition-all">
                  <Filter size={18} />
                </button>
             </div>
             
             <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-navy/5">
                      <th className="py-4 text-[10px] font-bold text-navy/30 uppercase tracking-widest pr-4">Filename</th>
                      <th className="py-4 text-[10px] font-bold text-navy/30 uppercase tracking-widest pr-4">Source Agent</th>
                      <th className="py-4 text-[10px] font-bold text-navy/30 uppercase tracking-widest pr-4">Upload Time</th>
                      <th className="py-4 text-[10px] font-bold text-navy/30 uppercase tracking-widest text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy/5">
                    {history.map((item) => (
                      <tr key={item.id} className="group hover:bg-academic-grey/30 transition-all cursor-pointer">
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-3">
                            <FileText size={16} className="text-navy/20" />
                            <div className="space-y-0.5">
                              <p className="text-[11px] font-bold text-navy truncate max-w-[120px]">{item.filename}</p>
                              <p className="text-[9px] text-navy/30 font-bold uppercase leading-none">English Language</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-2">
                             <div className="w-5 h-5 bg-navy rounded-md flex items-center justify-center text-[10px] text-white italic">🎓</div>
                             <span className="text-[10px] font-bold text-navy/60">{item.agent_name}</span>
                          </div>
                        </td>
                        <td className="py-4 pr-4 text-[10px] text-navy/40 font-bold">
                          {new Date(item.uploaded_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          <br/>
                          <span className="text-[8px] opacity-60">{new Date(item.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </td>
                        <td className="py-4 text-right">
                           <div className="flex justify-end">
                              <div className="w-5 h-5 bg-emerald/10 rounded-full flex items-center justify-center text-emerald">
                                <Check size={12} />
                              </div>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </section>

        </div>
        )}

        {/* Tab 1: District Enrollment */}
        {activeTab === 1 && (
          <div className="space-y-10">
            {/* Enrollment Census Header */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
               {[
                 { label: "Total District Enrollment", val: "1,240", sub: "Students", icon: Users },
                 { label: "Active Scholarly Grants", val: "3.2k", sub: "Approved", icon: ShieldCheck },
                 { label: "Avg Mastery Level", val: "72%", sub: "High Performance", icon: TrendingUp },
                 { label: "Pending Requests", val: "8", sub: "Needs Sync", icon: Bell }
               ].map((stat, i) => (
                 <motion.div 
                   key={i}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: i * 0.1 }}
                   className="bg-white p-6 rounded-[2rem] border border-navy/5 shadow-sm space-y-4"
                 >
                   <div className="w-10 h-10 bg-academic-grey rounded-xl flex items-center justify-center text-navy/40">
                     <stat.icon size={20} />
                   </div>
                   <div className="space-y-1">
                      <p className="text-[9px] font-bold text-navy/40 uppercase tracking-widest leading-none">{stat.label}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">{stat.val}</span>
                        <span className="text-[10px] font-bold text-navy/20">{stat.sub}</span>
                      </div>
                   </div>
                 </motion.div>
               ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
               {/* Enrollment Requests (Left 33%) */}
               <div className="lg:col-span-1">
                 <EnrollmentAdmin />
               </div>

               {/* Detailed Student Registry (Right 66%) */}
               <section className="lg:col-span-2 bg-white border border-navy/5 rounded-[2.5rem] p-10 shadow-sm space-y-8">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold">Scholarly Registry</h3>
                      <p className="text-xs text-navy/40">Longitudinal learning paths and agent status.</p>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-navy/5">
                          <th className="pb-4 text-[10px] font-bold text-navy/30 uppercase tracking-widest">Learner</th>
                          <th className="pb-4 text-[10px] font-bold text-navy/30 uppercase tracking-widest">Enrolled Agents</th>
                          <th className="pb-4 text-[10px] font-bold text-navy/30 uppercase tracking-widest">Current Status</th>
                          <th className="pb-4 text-[10px] font-bold text-navy/30 uppercase tracking-widest text-right">Mastery</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-navy/5">
                        {[
                          { name: "Arjun A.", grade: "5th", agents: ["Math Alchemist", "Science Explorer"], status: "Mastering Fraction Denominators", mastery: 85 },
                          { name: "Sarah J.", grade: "6th", agents: ["History Chronicler"], status: "Nomadic Trade Synthesis", mastery: 92 },
                          { name: "Leo K.", grade: "5th", agents: ["Science Explorer"], status: "Starting: Light Waves", mastery: 45 },
                          { name: "Maya R.", grade: "4th", agents: ["Math Alchemist"], status: "Parts of a Whole", mastery: 78 }
                        ].map((student, i) => (
                          <tr key={i} className="group hover:bg-academic-grey/30 transition-all">
                            <td className="py-5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-academic-grey rounded-lg flex items-center justify-center text-[10px] font-bold text-navy/40">
                                  {student.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-navy">{student.name}</p>
                                  <p className="text-[9px] text-navy/40 font-bold uppercase">{student.grade} Grade</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-5">
                              <div className="flex flex-wrap gap-1">
                                {student.agents.map((a, j) => (
                                  <span key={j} className="px-2 py-0.5 bg-navy/5 text-[8px] font-bold text-navy/60 rounded-md border border-navy/5">{a}</span>
                                ))}
                              </div>
                            </td>
                            <td className="py-5">
                              <p className="text-[10px] font-medium text-navy/60">{student.status}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="h-1 w-24 bg-navy/5 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald" style={{ width: `${student.mastery}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="py-5 text-right">
                              <span className="text-xs font-bold text-navy">{student.mastery}%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               </section>
            </div>
          </div>
        )}

        {/* Tab 2: Efficacy Center */}
        {activeTab === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <section className="bg-white border border-navy/5 rounded-[2.5rem] p-10 shadow-sm space-y-8 flex flex-col">
              <div className="space-y-1">
                <h3 className="text-lg font-bold">Longitudinal Mastery</h3>
                <p className="text-xs text-navy/40">District-wide progress over the current semester.</p>
              </div>
              <div className="flex-1 flex flex-col justify-end gap-2">
                 <div className="flex items-end gap-4 h-64 px-4">
                    {[45, 52, 68, 74].map((v, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-3">
                         <div className="w-full bg-navy/5 rounded-t-xl overflow-hidden relative" style={{ height: `${v}%` }}>
                            <motion.div 
                              initial={{ height: 0 }} 
                              animate={{ height: '100%' }} 
                              className="absolute bottom-0 w-full bg-emerald" 
                            />
                         </div>
                         <span className="text-[10px] font-bold text-navy/40">{["Jan", "Feb", "Mar", "Apr"][i]}</span>
                      </div>
                    ))}
                 </div>
              </div>
            </section>
            
            <section className="bg-white border border-navy/5 rounded-[2.5rem] p-10 shadow-sm space-y-8 flex flex-col">
              <div className="space-y-1">
                <h3 className="text-lg font-bold">Subject Impact</h3>
                <p className="text-xs text-navy/40">Baseline vs. GenEd mastery scores.</p>
              </div>
              <div className="space-y-6">
                 {[
                   {s: "Mathematics", b: 65, g: 88},
                   {s: "Science", b: 58, g: 82},
                   {s: "History", b: 70, g: 91}
                 ].map((item, i) => (
                   <div key={i} className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                         <span>{item.s}</span>
                         <span className="text-emerald">+{item.g - item.b}% Gain</span>
                      </div>
                      <div className="h-2 w-full bg-academic-grey rounded-full relative overflow-hidden">
                         <div className="h-full bg-navy/20 absolute left-0" style={{ width: `${item.b}%` }} />
                         <div className="h-full bg-emerald absolute left-0 opacity-40" style={{ width: `${item.g}%` }} />
                      </div>
                   </div>
                 ))}
              </div>
              <div className="mt-auto pt-6 border-t border-navy/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-navy/20 rounded-full" />
                  <span className="text-[10px] font-bold text-navy/40">Baseline</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald rounded-full" />
                  <span className="text-[10px] font-bold text-navy/40">GenEd Advantage</span>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Tab 3: System Config */}
        {activeTab === 3 && (
          <div className="max-w-2xl">
            <section className="bg-white border border-navy/5 rounded-[2.5rem] p-10 shadow-sm space-y-10">
               <div className="space-y-1">
                  <h3 className="text-xl font-bold">District Parameters</h3>
                  <p className="text-sm text-navy/40">Manage administrative metadata and security.</p>
               </div>
               
               <div className="space-y-8 text-navy">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-navy/40 uppercase tracking-widest">District Name</label>
                      <input 
                        className="w-full px-6 py-4 bg-academic-grey border border-navy/5 rounded-2xl text-sm font-bold outline-none"
                        defaultValue={settings?.district_name}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-navy/40 uppercase tracking-widest">Academic Year</label>
                      <input 
                        className="w-full px-6 py-4 bg-academic-grey border border-navy/5 rounded-2xl text-sm font-bold outline-none"
                        defaultValue={settings?.academic_year}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-navy/40 uppercase tracking-widest">Scholarly API Access</label>
                    <div className="flex gap-4">
                       <input 
                        className="flex-1 px-6 py-4 bg-academic-grey border border-navy/5 rounded-2xl text-xs font-mono font-bold outline-none text-navy/40"
                        value={settings?.api_key_masked}
                        readOnly
                      />
                      <button className="px-6 py-4 bg-navy text-white rounded-2xl text-[10px] font-bold hover:bg-navy/90 transition-all">Rotate Key</button>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-navy/5 flex justify-between items-center">
                    <div className="space-y-1">
                       <p className="text-xs font-bold leading-tight">Automated Ingestion</p>
                       <p className="text-[10px] text-navy/40 font-medium">Auto-map PDFs to Subject Agents.</p>
                    </div>
                    <div className="w-12 h-6 bg-emerald rounded-full relative cursor-pointer">
                       <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                    </div>
                  </div>
               </div>
               
               <button className="w-full py-5 bg-navy text-white rounded-2xl font-bold text-sm shadow-xl shadow-navy/20 hover:bg-emerald transition-all active:scale-[0.98]">
                 Persist System Config
               </button>
            </section>
          </div>
        )}
      </main>

      {/* Add Agent Modal */}
      <AnimatePresence>
        {showAddAgent && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-navy/60 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[3rem] shadow-2xl max-w-lg w-full p-12 space-y-8 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-emerald" />
              <button onClick={() => setShowAddAgent(false)} className="absolute top-8 right-8 text-navy/20 hover:text-navy">
                <X size={24} />
              </button>
              <div className="space-y-2">
                <div className="p-4 bg-emerald/10 w-fit rounded-2xl text-emerald"><Plus size={28} /></div>
                <h3 className="text-3xl font-bold text-navy">Provision Agent</h3>
                <p className="text-sm text-navy/40">Deploy a new subject expert to the scholarly matrix.</p>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-navy/60 uppercase tracking-widest">Expert Name</label>
                  <input 
                    className="w-full px-6 py-5 bg-academic-grey rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald/20 transition-all border border-transparent focus:border-emerald/10"
                    placeholder="e.g. Logic Alchemist"
                    value={newAgent.name}
                    onChange={(e) => setNewAgent({...newAgent, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-navy/60 uppercase tracking-widest">Academic Grade</label>
                    <select 
                      className="w-full px-6 py-5 bg-academic-grey rounded-2xl text-sm font-bold outline-none border border-transparent hover:border-navy/5 appearance-none"
                      value={newAgent.grade}
                      onChange={(e) => setNewAgent({...newAgent, grade: e.target.value})}
                    >
                      {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-navy/60 uppercase tracking-widest">Focus Area</label>
                    <select 
                      className="w-full px-6 py-5 bg-academic-grey rounded-2xl text-sm font-bold outline-none border border-transparent hover:border-navy/5 appearance-none"
                      value={newAgent.subject}
                      onChange={(e) => setNewAgent({...newAgent, subject: e.target.value})}
                    >
                      {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <button 
                onClick={handleAddAgent}
                disabled={!newAgent.name}
                className="w-full py-6 bg-navy text-white rounded-2xl font-bold text-sm shadow-xl shadow-navy/20 hover:bg-emerald disabled:opacity-30 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                Assemble Agent <ChevronRight size={18} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const Eye = ({ size, className }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
  </svg>
)
