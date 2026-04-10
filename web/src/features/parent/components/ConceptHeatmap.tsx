"use client";

import { motion } from "framer-motion";
import { useAgentStore } from "@/store/useAgent";
import { useEffect, useState } from "react";
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip } from "recharts";

export function ConceptHeatmap() {
  const { student, activeAgent } = useAgentStore();
  const [data, setData] = useState<any[]>([]);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

  useEffect(() => {
    if (!student) return;
    const classId = activeAgent?.class_id || "math_501";
    fetch(`${API_BASE_URL}/students/${student.id}/mastery-map?class_id=${classId}`)
      .then(res => res.json())
      .then(nodes => {
        const formatted = nodes.map((n: any) => ({
          subject: n.label,
          A: n.score,
          fullMark: 100,
        }));
        setData(formatted);
      });
  }, [student, activeAgent]);

  return (
    <div className="h-[400px] w-full bg-white border border-navy/5 rounded-3xl p-8 shadow-sm relative overflow-hidden">
      <div className="absolute top-8 left-8 z-10">
        <h3 className="text-xl font-bold text-navy">Knowledge X-Ray</h3>
        <p className="text-xs text-navy/40 font-sans tracking-wide">Conceptual depth for {activeAgent?.name || 'Mathematics'}.</p>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#042E5C10" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: "#042E5C40", fontSize: 10, fontWeight: "bold" }} 
          />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Mastery"
            dataKey="A"
            stroke="#059F6D"
            fill="#059F6D"
            fillOpacity={0.1}
            strokeWidth={3}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(4,46,92,0.1)', padding: '12px' }}
            itemStyle={{ color: '#042E5C', fontWeight: 'bold', fontSize: '12px' }}
          />
        </RadarChart>
      </ResponsiveContainer>
      
      {/* Decorative pulse for active scanning */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-emerald/5 rounded-full animate-ping pointer-events-none" />
    </div>
  );
}
