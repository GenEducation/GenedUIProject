"use client";

import { BrainCircuit, Building2, LineChart, Lightbulb } from "lucide-react";

const features = [
  {
    title: "Adaptive Learning",
    desc: "Personalized paths that adjust to each student's unique pace and mastery level.",
    icon: <BrainCircuit size={20} strokeWidth={2} />,
  },
  {
    title: "Partner Onboarding",
    desc: "Fast curriculum ingestion, version control, and workflow automation.",
    icon: <Building2 size={20} strokeWidth={2} />,
  },
  {
    title: "Progress Visibility",
    desc: "Real-time dashboards for students, parents, and educators to monitor growth.",
    icon: <LineChart size={20} strokeWidth={2} />,
  },
  {
    title: "Insight Analytics",
    desc: "Actionable learning data and heatmaps designed to reveal opportunities.",
    icon: <Lightbulb size={20} strokeWidth={2} />,
  },
];

export function AuthFeatures() {
  return (
    <section className="bg-[#F8F9FA] px-6 py-16 lg:px-16 lg:py-24 border-t border-[#042e5c]/6">
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <div className="mb-16 text-center max-w-2xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#059F6D] mb-4">
            The Framework
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#042e5c] font-serif">
            Services built for modern learning{" "}
            <em className="not-italic text-transparent bg-clip-text bg-gradient-to-r from-[#059F6D] to-[#4EB6BF]">
              ecosystems
            </em>
          </h2>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          {/* Image — kept as-is per user instruction */}
          <div className="flex items-center justify-center">
            <div className="relative w-full max-w-md">
              <div className="absolute inset-0 bg-[#042e5c] rounded-[2.5rem] rotate-2 opacity-[0.06] blur-sm" />
              <img
                src="/robo.png"
                alt="Ecosystem architecture"
                className="relative w-full rounded-[2.5rem] object-cover shadow-2xl shadow-[#042e5c]/10 border-4 border-white"
              />
            </div>
          </div>

          {/* Feature cards — white with emerald accents */}
          <div className="grid sm:grid-cols-2 gap-4">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="group rounded-2xl border border-[#042e5c]/8 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#059F6D]/8 hover:border-[#059F6D]/20"
              >
                <div className="w-10 h-10 rounded-xl bg-[#F0FBF6] mb-5 flex items-center justify-center text-[#059F6D] group-hover:bg-[#059F6D] group-hover:text-white group-hover:scale-110 transition-all duration-300 shadow-sm">
                  {feature.icon}
                </div>
                <h3 className="text-sm font-bold text-[#042e5c] mb-2">
                  {feature.title}
                </h3>
                <p className="text-[13px] leading-relaxed text-[#042e5c]/50 font-medium">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
