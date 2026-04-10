"use client";

import { BrainCircuit, Building2, LineChart, Lightbulb } from "lucide-react";

const features = [
  {
    title: "Adaptive learning",
    desc: "Personalized paths that adjust to each student’s unique pace and mastery.",
    icon: <BrainCircuit size={22} strokeWidth={2} />,
  },
  {
    title: "Partner onboarding",
    desc: "Fast curriculum ingestion, version control, and workflow automation.",
    icon: <Building2 size={22} strokeWidth={2} />,
  },
  {
    title: "Progress visibility",
    desc: "Real-time dashboards for students, parents, and educators to monitor growth.",
    icon: <LineChart size={22} strokeWidth={2} />,
  },
  {
    title: "Insight analytics",
    desc: "Actionable learning data and heatmaps designed to reveal opportunities.",
    icon: <Lightbulb size={22} strokeWidth={2} />,
  },
];

export function AuthFeatures() {
  return (
    <section className="bg-white px-6 py-16 lg:px-16 lg:py-24 border-t border-[#2D5540]/5">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center max-w-2xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#2D5540]">
            The Framework
          </p>
          <h2 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight text-[#0E1F2B]">
            Services built for modern learning <span className="bg-gradient-to-r from-[#2D5540] via-[#50B4A8] to-[#4EB6BF] text-transparent bg-clip-text">ecosystems</span>
          </h2>
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div className="flex items-center justify-center">
            <div className="relative w-full max-w-md">
              <div className="absolute inset-0 bg-[#2D5540] rounded-[3rem] rotate-3 opacity-10 blur-sm transform transition-transform group-hover:rotate-6"></div>
              <img
                src="/robo.png"
                alt="Ecosystem architecture"
                className="relative w-full rounded-[3rem] object-cover shadow-2xl shadow-[#0E1F2B]/10 border-4 border-white"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="group rounded-[2rem] border border-[#2D5540]/10 bg-[#F9F8F4] p-8 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-[#2D5540]/5 hover:border-[#2D5540]/20"
              >
                <div className="w-12 h-12 rounded-2xl bg-white mb-5 flex items-center justify-center text-[#2D5540] group-hover:bg-[#042e5c] group-hover:text-white group-hover:scale-110 transition-all duration-300 shadow-sm">
                  {feature.icon}
                </div>
                <h3 className="text-base font-bold text-[#0E1F2B]">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#042e5c] font-medium">
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
