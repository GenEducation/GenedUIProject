"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useParentStore } from "@/features/parent/store/useParentStore";

export default function HomePage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("gened_auth_token");
    const role = localStorage.getItem("gened_user_role") as "student" | "parent" | "partner" | null;
    const profileStr = localStorage.getItem("gened_user_profile");

    if (token && role && profileStr) {
      try {
        const profile = JSON.parse(profileStr);
        const searchParams = new URLSearchParams(window.location.search);
        const redirectPath = searchParams.get("redirect");

        if (redirectPath) {
          if (redirectPath.startsWith("/parent") && role !== "parent") {
            localStorage.clear();
            setIsChecking(false);
            return;
          }
          if (role === "student") {
            useStudentStore.getState().setStudentProfile({
              user_id: profile.user_id,
              username: profile.username,
              email: profile.email,
              role: profile.role,
              name: profile.name,
              grade: profile.grade,
              school_board: profile.school_board,
              ai_name: profile.ai_name,
              plan: profile.plan,
              plan_expires_at: profile.plan_expires_at,
            });
          } else if (role === "parent") {
            useParentStore.getState().setParentProfile({
              user_id: profile.user_id || "",
              username: profile.username || "",
              email: profile.email || "",
              role: profile.role || "parent",
            });
          }
          router.replace(redirectPath);
          return;
        }

        if (role === "student") {
          useStudentStore.getState().setStudentProfile({
            user_id: profile.user_id,
            username: profile.username,
            email: profile.email,
            role: profile.role,
            name: profile.name,
            grade: profile.grade,
            school_board: profile.school_board,
            ai_name: profile.ai_name,
            preferred_voice: profile.preferred_voice,
            plan: profile.plan,
            plan_expires_at: profile.plan_expires_at,
          });
        } else if (role === "parent") {
          useParentStore.getState().setParentProfile({
            user_id: profile.user_id || "",
            username: profile.username || "",
            email: profile.email || "",
            role: profile.role || "parent",
          });
        }

        router.replace(`/${role}`);
        return;
      } catch {
        localStorage.clear();
      }
    }

    setIsChecking(false);
  }, [router]);

  if (isChecking) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F7F6F1]">
        <div className="flex flex-col items-center gap-4">
          <Image src="/Logo.svg" alt="Logo" width={48} height={48} className="animate-pulse" />
          <div className="w-8 h-8 border-4 border-[#2D5540] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white font-sans">
      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <Link href="/" className="flex-shrink-0">
            <Image src="/GenEd Logo Colored.svg" alt="GenEd" width={110} height={40} />
          </Link>
          <div className="hidden md:flex gap-8">
            {[
              { label: "Home", href: "/" },
              { label: "For Schools", href: "https://gened.ai/onboarding" },
              { label: "Offerings", href: "https://gened.ai/offerings" },
              { label: "Contact", href: "https://gened.ai/contact" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-gray-700 hover:text-[#042E5C] transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="border-2 border-[#059F6D] text-[#059F6D] hover:bg-[#059F6D] hover:text-white font-semibold px-5 py-2 rounded-lg text-sm transition-all duration-200"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="bg-[#059F6D] text-white font-semibold px-5 py-2 rounded-lg text-sm transition-all duration-200 shadow-md hover:shadow-lg hover:bg-[#047a54]"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-end overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/hero-student.jpg"
            alt="Student studying with GenEd deskbot"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#042E5C]/90 via-[#042E5C]/30 to-transparent" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto w-full px-6 pb-20 pt-40">
          <div className="max-w-2xl">
            <span className="inline-block bg-[#059F6D]/20 text-[#059F6D] border border-[#059F6D]/30 text-sm font-semibold px-4 py-1.5 rounded-full mb-6 backdrop-blur-sm">
              Live now — try it today
            </span>
            <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
              Your child&apos;s personal AI tutor.{" "}
              <span className="text-[#059F6D]">No distractions. Just learning.</span>
            </h1>
            <p className="text-xl text-gray-200 mb-10 leading-relaxed">
              GenEd is a dedicated AI learning device that sits on your child&apos;s desk — not a
              phone, not a tablet. It adapts to how they learn, closes knowledge gaps, and keeps
              parents informed. All without a browser in sight.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/register"
                className="inline-block bg-[#059F6D] hover:bg-[#047a54] text-white font-bold px-10 py-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl text-lg text-center"
              >
                Get Started
              </Link>
              <a
                href="#device"
                className="inline-block bg-white/10 hover:bg-white/20 backdrop-blur text-white font-semibold px-10 py-4 rounded-lg transition-all duration-200 text-lg text-center border border-white/20"
              >
                Meet the Device ↓
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── THE PROBLEM ── */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-[#042E5C] mb-4">
              The problem with giving kids a device to learn
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Every parent knows this moment — you set your child up to study, and twenty minutes
              later they&apos;re watching videos.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: "📱",
                title: "Tablets and phones are too distracting",
                description:
                  "A device with a browser is a device with YouTube, games, and social media. No app or parental control fully solves this — the temptation is always one tap away.",
              },
              {
                icon: "🧩",
                title: "Knowledge gaps go unnoticed",
                description:
                  "In a classroom of 30, teachers can't see each student's gaps in real time. Students move to the next chapter whether they've mastered the last one or not.",
              },
              {
                icon: "🔒",
                title: "Parents are left in the dark",
                description:
                  "A grade tells you what your child scored. It doesn't tell you what they don't understand, where they're stuck, or what they need next. GenEd does.",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl p-8 shadow-sm hover:shadow-xl transition-all border-t-4 border-transparent hover:border-[#059F6D] flex flex-col items-center text-center"
              >
                <div className="text-4xl mb-4 bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-[#042E5C] mb-3">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEVICE INTRO ── */}
      <section id="device" className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img
                src="/student-desk.jpg"
                alt="GenEd deskbot on a student's desk"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="text-[#059F6D] font-bold text-sm uppercase tracking-widest mb-4 block">
                The GenEd Deskbot
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-[#042E5C] mb-6 leading-tight">
                A dedicated AI tutor. Not another screen.
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                The GenEd Deskbot is a standalone AI learning device designed to sit on your
                child&apos;s study desk. It has no browser, no apps, no social media — just a
                focused AI that talks, teaches, and adapts to each student&apos;s pace and learning
                style.
              </p>
              <div className="space-y-5">
                {[
                  {
                    icon: "🔒",
                    title: "Distraction-free by design",
                    desc: "No browser. No games. No rabbit holes. The hardware enforces the focus that no app ever could.",
                  },
                  {
                    icon: "⚡",
                    title: "Adapts until they truly understand",
                    desc: "The device reads how your child responds and tries a different approach if something isn't landing.",
                  },
                  {
                    icon: "📡",
                    title: "Always there when they need it",
                    desc: "10pm before an exam, a quiet Sunday afternoon — GenEd is always ready, patient, and never too tired.",
                  },
                  {
                    icon: "📊",
                    title: "Syncs with the parent app",
                    desc: "Everything the device learns about your child's progress is available to you in plain language.",
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <div className="mt-1 bg-green-50 rounded-lg p-2 flex-shrink-0 text-lg">
                      {item.icon}
                    </div>
                    <div>
                      <p className="font-bold text-[#042E5C]">{item.title}</p>
                      <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY GENED ── */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[#059F6D] font-bold text-sm uppercase tracking-widest mb-4 block">
              Why GenEd
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-[#042E5C] mb-4">
              Designed around how children actually learn
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Every decision GenEd makes — from the hardware to the AI — is built around one goal:
              helping every child learn confidently, safely, and at their own pace.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: "🧠",
                title: "Every Child Learns Differently",
                desc: "GenEd adapts to each child's unique pace, strengths, and learning style — not a one-size-fits-all curriculum that leaves some students behind.",
              },
              {
                icon: "📱",
                title: "A Dedicated Device, Not Another Distraction",
                desc: "Unlike tablets or phones, the GenEd Deskbot has one purpose: learning. No browser, no apps, no notifications.",
              },
              {
                icon: "✨",
                title: "Making Learning Engaging and Fun",
                desc: "Interactive voice conversations, visual explanations, and a friendly AI companion that keeps children curious and motivated.",
              },
              {
                icon: "👨‍👩‍👧",
                title: "Helping Parents Stay Connected",
                desc: "Real-time progress insights help parents understand where their child is thriving and where they need more support.",
              },
              {
                icon: "🛡️",
                title: "Safe Learning, Built Responsibly",
                desc: "Built-in content guardrails protect children from inappropriate interactions. GenEd is safe AI for kids, from the ground up.",
              },
              {
                icon: "🏠",
                title: "Learning Beyond the Classroom",
                desc: "Whether it's homework help at 9pm or revision before exams, GenEd helps children build confidence and independent learning habits.",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl p-8 border border-gray-100 hover:border-[#059F6D] hover:shadow-lg transition-all h-full"
              >
                <div className="text-3xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-bold text-[#042E5C] mb-3">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PARENT TRANSPARENCY ── */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-[#059F6D] font-bold text-sm uppercase tracking-widest mb-4 block">
                For Parents
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-[#042E5C] mb-6 leading-tight">
                Be part of your child&apos;s learning journey. Not just their results.
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                The GenEd parent app gives you a real-time window into your child&apos;s learning
                journey — what they understand, where they&apos;re struggling, and what the device
                is working through with them. Not after the exam. During the learning, when it still
                matters.
              </p>
              <ul className="space-y-4 list-none">
                {[
                  "See which topics your child has mastered vs. where gaps exist",
                  "Get notified when they've been struggling with a concept",
                  "Track daily study sessions and time spent learning",
                  "Understand their progress in plain language — no jargon",
                  "Share reports directly with their class teacher",
                ].map((point, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-700">
                    <span className="text-[#059F6D] font-bold mt-0.5 flex-shrink-0">✓</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img
                src="/parent-analytics-5.jpg"
                alt="Parent checking child's learning progress"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── SAFE & RESPONSIBLE AI ── */}
      <section className="py-24 px-4 bg-[#042E5C]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[#059F6D] font-bold text-sm uppercase tracking-widest mb-4 block">
              Safe & Responsible AI
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Built with children in mind. Every decision.
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              When your child interacts with GenEd, you can trust that every part of the experience
              has been designed to be safe, appropriate, and responsible.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: "🛡️",
                title: "Content Guardrails",
                desc: "GenEd's AI prevents children from accessing inappropriate content — no matter how they phrase their questions.",
              },
              {
                icon: "🔒",
                title: "No Open Internet Access",
                desc: "The Deskbot has no browser and no open search. What your child can access is intentional and limited to learning.",
              },
              {
                icon: "👥",
                title: "Full Parent Visibility",
                desc: "Parents can see exactly what topics their child is engaging with. There are no hidden conversations.",
              },
              {
                icon: "⚡",
                title: "Supervised Learning Interactions",
                desc: "Every interaction is purpose-driven and curriculum-focused. GenEd teaches and guides in a structured learning context.",
              },
              {
                icon: "📊",
                title: "Designed for Children",
                desc: "The AI's language, tone, and responses are calibrated for children — patient, encouraging, and age-appropriate.",
              },
              {
                icon: "🌐",
                title: "Responsible Tech for Kids",
                desc: "AI that respects children's wellbeing — supporting healthy study habits, not maximising screen time at any cost.",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:border-[#059F6D]/50 transition-all h-full"
              >
                <div className="bg-green-900/30 rounded-lg p-3 w-fit mb-4 text-xl">
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR SCHOOLS ── */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[#059F6D] font-bold text-sm uppercase tracking-widest mb-4 block">
              For Schools
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-[#042E5C] mb-4">
              Every student gets a tutor. Every teacher gets visibility.
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Deploy GenEd Deskbots across your classrooms and give every student their own
              personalised learning companion — aligned to your curriculum, under your control.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: "👥",
                title: "School-wide dashboard",
                desc: "See learning progress across every student, class, and subject from one place.",
              },
              {
                icon: "🛡️",
                title: "Your curriculum, built in",
                desc: "Upload your syllabi and the device teaches to your school's standards — not a generic one.",
              },
              {
                icon: "📊",
                title: "Identify at-risk students early",
                desc: "Spot which students are falling behind — before results day, not after.",
              },
              {
                icon: "🔒",
                title: "Safe and controlled",
                desc: "Fully managed by school administration. No unsupervised internet access, ever.",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-gray-50 rounded-xl p-6 border border-gray-100 hover:border-[#059F6D] hover:shadow-lg transition-all h-full"
              >
                <div className="bg-green-50 rounded-lg p-3 w-fit mb-4 text-xl">{item.icon}</div>
                <p className="font-bold text-[#042E5C] mb-2">{item.title}</p>
                <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <a
              href="https://gened.ai/contact"
              className="inline-block bg-[#042E5C] hover:bg-[#042E5C]/90 text-white font-bold px-10 py-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
            >
              Book a School Demo
            </a>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 px-4 bg-[#042E5C]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">How GenEd works</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              The device does the hard work. Your child just learns.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Your child turns it on",
                desc: "The device greets them by name and picks up exactly where they left off. No login, no setup.",
              },
              {
                step: "02",
                title: "It reads how they're learning",
                desc: "GenEd watches how the student responds and builds a real-time picture of what they understand.",
              },
              {
                step: "03",
                title: "Keeps going until it clicks",
                desc: "If the first explanation doesn't land, it tries another angle — a metaphor, a visual, a simpler example.",
              },
              {
                step: "04",
                title: "Parents see everything",
                desc: "Every session syncs to the GenEd parent app. See what clicked and what still needs attention.",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-white/5 border border-white/10 text-white rounded-xl px-6 py-8 flex flex-col hover:-translate-y-2 transition-transform duration-300"
              >
                <div className="text-5xl font-bold text-[#059F6D] mb-6 opacity-80">{item.step}</div>
                <h3 className="text-lg font-bold mb-4">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-32 px-4 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/hero-student-2.jpg"
            alt=""
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-[#042E5C]/85" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Give your child the learning companion they deserve.
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            GenEd is live and ready. Give your child a focused, distraction-free AI tutor that
            actually adapts to how they learn.
          </p>
          <Link
            href="/register"
            className="inline-block bg-[#059F6D] hover:bg-[#047a54] text-white font-bold px-12 py-5 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#042E5C] border-t border-white/10 py-10 px-6 text-center">
        <p className="text-gray-400 text-sm">
          &copy; {new Date().getFullYear()} GenEd. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
