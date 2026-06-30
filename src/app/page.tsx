"use client";

/* eslint-disable @next/next/no-img-element, react/no-unescaped-entities */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useParentStore } from "@/features/parent/store/useParentStore";
import { useTeacherStore } from "@/features/teacher/store/useTeacherStore";
import "./landing.css";

export default function HomePage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Escape closes the video modal and the mobile menu
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowVideo(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Lock background scroll while the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Smooth in-page scrolling, scoped to while the landing page is mounted
  useEffect(() => {
    if (isChecking) return;
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = "smooth";
    return () => {
      html.style.scrollBehavior = prev;
    };
  }, [isChecking]);

  // Scroll-reveal animations
  useEffect(() => {
    if (isChecking) return;
    const els = document.querySelectorAll<HTMLElement>(".gened-landing .reveal:not(.in)");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [isChecking]);

  useEffect(() => {
    const token = localStorage.getItem("gened_auth_token");
    const role = localStorage.getItem("gened_user_role") as "student" | "parent" | "partner" | "teacher" | null;
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
          } else if (role === "teacher") {
            useTeacherStore.getState().setTeacherProfile({
              user_id: profile.user_id || "",
              username: profile.username || "",
              email: profile.email || "",
              role: profile.role || "TEACHER",
              full_name: profile.full_name || profile.username || "",
              title: profile.title || "",
              subjects: profile.subjects || [],
              partner_id: profile.partner_id,
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
        } else if (role === "teacher") {
          useTeacherStore.getState().setTeacherProfile({
            user_id: profile.user_id || "",
            username: profile.username || "",
            email: profile.email || "",
            role: profile.role || "TEACHER",
            full_name: profile.full_name || profile.username || "",
            title: profile.title || "",
            subjects: profile.subjects || [],
            partner_id: profile.partner_id,
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
          <Image src="/Logo.svg" alt="GenEd" width={150} height={30} className="animate-pulse" priority />
          <div className="w-8 h-8 border-4 border-[#2D5540] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="gened-landing">
      {/* Fonts (React 19 hoists these <link> tags into <head> and dedupes) */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..900;1,9..144,400..700&family=Manrope:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      <span id="top" />

      {/* ── NAV ── */}
      <header>
        <div className="wrap">
          <nav>
            <a href="#top" className="logo" aria-label="GenEd home">
              <Image src="/Logo.svg" alt="GenEd" width={150} height={30} priority />
            </a>
            <div className="navlinks">
              <a href="#device">The Device</a>
              <a href="#why">Why GenEd</a>
              <a href="#parents">For Parents</a>
              <a href="#schools">For Schools</a>
              <a href="#contact">Contact</a>
            </div>
            <div className="navcta">
              <Link className="btn btn-ghost" href="/login">Log in</Link>
              <Link className="btn btn-primary" href="/register">Get started</Link>
            </div>
            <button className="hamburger" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
              <svg className="icon" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
            </button>
          </nav>
        </div>
      </header>

      {/* mobile drawer */}
      <div className={`drawer${menuOpen ? " open" : ""}`}>
        <div className="scrim" onClick={closeMenu} />
        <div className="panel">
          <button className="close" aria-label="Close menu" onClick={closeMenu}>
            <svg className="icon" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          <a href="#device" onClick={closeMenu}>The Device</a>
          <a href="#why" onClick={closeMenu}>Why GenEd</a>
          <a href="#parents" onClick={closeMenu}>For Parents</a>
          <a href="#schools" onClick={closeMenu}>For Schools</a>
          <a href="#contact" onClick={closeMenu}>Contact</a>
          <Link className="btn btn-ghost" href="/login" onClick={closeMenu}>Log in</Link>
          <Link className="btn btn-primary" href="/register" onClick={closeMenu}>Get started</Link>
        </div>
      </div>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-bg"><span className="blob b1" /><span className="blob b2" /><span className="blob b3" /></div>
        <div className="wrap">
          <div>
            <span className="badge reveal in"><span className="dot" /> Live now — try it on your child's desk today</span>
            <h1 className="reveal in" data-d="1">Your child's personal AI tutor. <em>No distractions. Just learning.</em></h1>
            <p className="lead reveal in" data-d="2">GenEd is a dedicated AI learning device that sits on the desk — not a phone, not a tablet. It adapts to how your child learns, closes knowledge gaps, and keeps you informed. All without a browser in sight.</p>
            <div className="cta-row reveal in" data-d="3">
              <Link className="btn btn-primary" href="/register">Get started <svg className="icon" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg></Link>
              <button type="button" className="btn btn-ghost" onClick={() => setShowVideo(true)}>
                <svg className="icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor" stroke="none" /></svg> Meet the device
              </button>
            </div>
            <div className="trust reveal in" data-d="4">
              <span className="tchip"><svg className="icon" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg> No browser</span>
              <span className="tchip"><svg className="icon" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg> No ads</span>
              <span className="tchip"><svg className="icon" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg> Parent-visible</span>
            </div>
          </div>
          <div className="device-art reveal in" data-d="2">
            <div className="hero-photo">
              <div className="frame"><img src="/student-desk.jpg" alt="A student studying at their desk with the GenEd deskbot" /></div>
              <span className="ph-label tl"><span className="gdot" /> Study mode: ON</span>
              <span className="ph-label br"><svg className="icon" viewBox="0 0 24 24" style={{ width: 15, height: 15, color: "var(--green-600)" }}><path d="M20 6L9 17l-5-5" /></svg> No browser. Ever.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROBLEM ── */}
      <section className="alt" id="problem">
        <div className="wrap">
          <div className="sec-head center reveal">
            <span className="eyebrow">The problem</span>
            <h2>Giving a kid a device to learn rarely ends with learning</h2>
            <p className="lead" style={{ margin: "0 auto" }}>You set your child up to study — and twenty minutes later they're watching videos. It's not their fault. The device is the problem.</p>
          </div>
          <div className="grid-3">
            <div className="card reveal" data-d="1">
              <div className="ico coral"><svg className="icon" viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M11 18h2" /></svg></div>
              <h3>Tablets are too distracting</h3>
              <p>A device with a browser is a device with YouTube, games and social media. No parental control fully closes that one-tap temptation.</p>
            </div>
            <div className="card reveal" data-d="2">
              <div className="ico amber"><svg className="icon" viewBox="0 0 24 24"><path d="M12 2l3 6 6 .9-4.5 4.3 1 6.1L12 17l-5.5 2.3 1-6.1L3 8.9 9 8z" /></svg></div>
              <h3>Knowledge gaps go unseen</h3>
              <p>In a class of 30, no teacher sees every gap in real time. Students move to the next chapter whether the last one landed or not.</p>
            </div>
            <div className="card reveal" data-d="3">
              <div className="ico blue"><svg className="icon" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg></div>
              <h3>Parents are left in the dark</h3>
              <p>A grade tells you what your child scored — not what they don't understand, where they're stuck, or what they need next. GenEd does.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="stats" style={{ padding: "56px 0" }}>
        <div className="wrap">
          <div className="grid-4">
            <div className="stat reveal"><div className="n"><em>0</em></div><div className="t">Browsers, apps or ads on the device</div></div>
            <div className="stat reveal" data-d="1"><div className="n">1:1</div><div className="t">A dedicated AI tutor for every child</div></div>
            <div className="stat reveal" data-d="2"><div className="n">100<em>%</em></div><div className="t">Of sessions visible in the parent app</div></div>
            <div className="stat reveal" data-d="3"><div className="n">24<em>/7</em></div><div className="t">Patient, on-desk tutoring whenever it's needed</div></div>
          </div>
        </div>
      </section>

      {/* ── DEVICE ── */}
      <section id="device">
        <div className="wrap split">
          <div className="media reveal">
            <img src="/hero-student.jpg" alt="A focused student learning with the GenEd deskbot" />
          </div>
          <div className="reveal" data-d="1">
            <span className="eyebrow">The GenEd Deskbot</span>
            <h2 style={{ fontSize: "clamp(28px,3.4vw,44px)", margin: "16px 0 14px" }}>A dedicated AI tutor. Not another screen.</h2>
            <p className="lead">A standalone learning device built to sit on your child's desk. No browser, no apps, no social media — just a focused AI that talks, teaches, and adapts to each student's pace.</p>
            <div className="feature-list">
              <div className="feature"><span className="fi"><svg className="icon" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg></span><div><h4>Distraction-free by design</h4><p>No browser. No games. The hardware enforces the focus no app ever could.</p></div></div>
              <div className="feature"><span className="fi"><svg className="icon" viewBox="0 0 24 24"><path d="M13 2L3 14h7l-1 8 10-12h-7z" fill="currentColor" stroke="none" /></svg></span><div><h4>Adapts until it truly clicks</h4><p>Reads how your child responds and tries a new angle when something isn't landing.</p></div></div>
              <div className="feature"><span className="fi"><svg className="icon" viewBox="0 0 24 24"><path d="M4 4h16v12H5l-1 4z" /></svg></span><div><h4>Always there when needed</h4><p>10pm before an exam, a quiet Sunday — patient, ready, and never too tired.</p></div></div>
              <div className="feature"><span className="fi"><svg className="icon" viewBox="0 0 24 24"><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /></svg></span><div><h4>Syncs with the parent app</h4><p>Everything it learns about your child's progress, in plain language, in your pocket.</p></div></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY ── */}
      <section className="alt" id="why">
        <div className="wrap">
          <div className="sec-head center reveal">
            <span className="eyebrow">Why GenEd</span>
            <h2>Designed around how children actually learn</h2>
            <p className="lead" style={{ margin: "0 auto" }}>Every decision — from the hardware to the AI — is built around one goal: helping every child learn confidently, safely, and at their own pace.</p>
          </div>
          <div className="grid-3">
            <div className="card reveal"><div className="ico green"><svg className="icon" viewBox="0 0 24 24"><path d="M12 2a7 7 0 00-4 12.7V18a2 2 0 002 2h4a2 2 0 002-2v-3.3A7 7 0 0012 2z" /><path d="M9 22h6" /></svg></div><h3>Every child learns differently</h3><p>Adapts to each child's pace, strengths and style — not a one-size-fits-all curriculum that leaves some behind.</p></div>
            <div className="card reveal" data-d="1"><div className="ico coral"><svg className="icon" viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M10 18h4" /></svg></div><h3>A device, not a distraction</h3><p>Unlike tablets or phones, the Deskbot has one purpose: learning. No browser, no apps, no notifications.</p></div>
            <div className="card reveal" data-d="2"><div className="ico amber"><svg className="icon" viewBox="0 0 24 24"><path d="M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5z" /></svg></div><h3>Engaging and genuinely fun</h3><p>Voice conversations, visual explanations and a friendly companion that keeps children curious and motivated.</p></div>
            <div className="card reveal"><div className="ico blue"><svg className="icon" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /></svg></div><h3>Keeps parents connected</h3><p>Real-time insight into where your child is thriving and where they need a little more support.</p></div>
            <div className="card reveal" data-d="1"><div className="ico green"><svg className="icon" viewBox="0 0 24 24"><path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z" /></svg></div><h3>Safe, built responsibly</h3><p>Content guardrails protect children from inappropriate interactions. Safe AI for kids, from the ground up.</p></div>
            <div className="card reveal" data-d="2"><div className="ico coral"><svg className="icon" viewBox="0 0 24 24"><path d="M3 11l9-8 9 8" /><path d="M5 9v11h14V9" /></svg></div><h3>Learning beyond class</h3><p>Homework at 9pm or revision before exams — GenEd builds confidence and independent habits.</p></div>
          </div>
        </div>
      </section>

      {/* ── PARENTS ── */}
      <section id="parents">
        <div className="wrap split">
          <div className="reveal">
            <span className="eyebrow">For parents</span>
            <h2 style={{ fontSize: "clamp(28px,3.4vw,44px)", margin: "16px 0 14px" }}>Be part of the journey. Not just the results.</h2>
            <p className="lead">The GenEd parent app is a real-time window into your child's learning — what they understand, where they struggle, and what the device is working through with them. During the learning, when it still matters.</p>
            <ul className="checklist">
              <li><span className="ck"><svg className="icon" viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><path d="M20 6L9 17l-5-5" /></svg></span> See mastered topics vs. where gaps still exist</li>
              <li><span className="ck"><svg className="icon" viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><path d="M20 6L9 17l-5-5" /></svg></span> Get notified when they're stuck on a concept</li>
              <li><span className="ck"><svg className="icon" viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><path d="M20 6L9 17l-5-5" /></svg></span> Track daily sessions and time spent learning</li>
              <li><span className="ck"><svg className="icon" viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><path d="M20 6L9 17l-5-5" /></svg></span> Understand progress in plain language — no jargon</li>
              <li><span className="ck"><svg className="icon" viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><path d="M20 6L9 17l-5-5" /></svg></span> Share reports directly with the class teacher</li>
            </ul>
          </div>
          <div className="media reveal" data-d="1">
            <img src="/parent-analytics-5.jpg" alt="A parent checking their child's learning progress on the GenEd app" />
          </div>
        </div>
      </section>

      {/* ── SAFE / DARK ── */}
      <section className="dark-sec" id="safe">
        <div className="wrap">
          <div className="sec-head center reveal">
            <span className="eyebrow" style={{ color: "var(--green-200)" }}>Safe &amp; responsible AI</span>
            <h2>Built with children in mind. Every decision.</h2>
            <p className="lead" style={{ margin: "0 auto" }}>When your child interacts with GenEd, every part of the experience is designed to be safe, appropriate and responsible.</p>
          </div>
          <div className="grid-3">
            <div className="card-dark reveal"><div className="ico"><svg className="icon" viewBox="0 0 24 24"><path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z" /></svg></div><h3>Content guardrails</h3><p>Prevents access to inappropriate content — no matter how a question is phrased.</p></div>
            <div className="card-dark reveal" data-d="1"><div className="ico"><svg className="icon" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg></div><h3>No open internet</h3><p>No browser, no open search. What your child can access is intentional and learning-only.</p></div>
            <div className="card-dark reveal" data-d="2"><div className="ico"><svg className="icon" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg></div><h3>Full parent visibility</h3><p>See exactly what topics your child engages with. No hidden conversations.</p></div>
            <div className="card-dark reveal"><div className="ico"><svg className="icon" viewBox="0 0 24 24"><path d="M13 2L3 14h7l-1 8 10-12h-7z" fill="currentColor" stroke="none" /></svg></div><h3>Supervised interactions</h3><p>Every interaction is purpose-driven and curriculum-focused, in a structured context.</p></div>
            <div className="card-dark reveal" data-d="1"><div className="ico"><svg className="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><path d="M9 9h.01M15 9h.01" /></svg></div><h3>Designed for children</h3><p>Language, tone and responses calibrated to be patient, encouraging and age-appropriate.</p></div>
            <div className="card-dark reveal" data-d="2"><div className="ico"><svg className="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" /></svg></div><h3>Responsible by design</h3><p>Supports healthy study habits — never maximising screen time at any cost.</p></div>
          </div>
        </div>
      </section>

      {/* ── SCHOOLS ── */}
      <section className="schools" id="schools">
        <div className="wrap">
          <div className="sec-head center reveal">
            <span className="eyebrow">For schools</span>
            <h2>Every student gets a tutor. Every teacher gets visibility.</h2>
            <p className="lead" style={{ margin: "0 auto" }}>Deploy GenEd Deskbots across classrooms and give every student a personalised companion — aligned to your curriculum, under your control.</p>
          </div>
          <div className="grid-4">
            <div className="card reveal"><div className="ico blue"><svg className="icon" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg></div><h3 style={{ fontSize: 18 }}>School-wide dashboard</h3><p>Progress across every student, class and subject from one place.</p></div>
            <div className="card reveal" data-d="1"><div className="ico green"><svg className="icon" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg></div><h3 style={{ fontSize: 18 }}>Your curriculum, built in</h3><p>Upload your syllabi; the device teaches to your school's standards.</p></div>
            <div className="card reveal" data-d="2"><div className="ico amber"><svg className="icon" viewBox="0 0 24 24"><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /></svg></div><h3 style={{ fontSize: 18 }}>Spot at-risk students</h3><p>See who's falling behind before results day, not after.</p></div>
            <div className="card reveal" data-d="3"><div className="ico coral"><svg className="icon" viewBox="0 0 24 24"><path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z" /></svg></div><h3 style={{ fontSize: 18 }}>Safe and controlled</h3><p>Fully managed by administration. No unsupervised internet, ever.</p></div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="dark-sec" id="how">
        <div className="wrap">
          <div className="sec-head center reveal">
            <span className="eyebrow" style={{ color: "var(--green-200)" }}>How it works</span>
            <h2>The device does the hard work. Your child just learns.</h2>
          </div>
          <div className="steps">
            <div className="step reveal"><div className="num">01</div><h4>They turn it on</h4><p>It greets them by name and picks up exactly where they left off. No login, no setup.</p></div>
            <div className="step reveal" data-d="1"><div className="num">02</div><h4>It reads their learning</h4><p>Watches how the student responds and builds a real-time picture of what they understand.</p></div>
            <div className="step reveal" data-d="2"><div className="num">03</div><h4>Keeps going until it clicks</h4><p>If one explanation misses, it tries another — a metaphor, a visual, a simpler example.</p></div>
            <div className="step reveal" data-d="3"><div className="num">04</div><h4>Parents see everything</h4><p>Every session syncs to the parent app. See what clicked and what still needs attention.</p></div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta" id="contact">
        <span className="ring r2" /><span className="ring r1" />
        <div className="wrap reveal">
          <h2>Give your child the learning companion they deserve.</h2>
          <p>GenEd is live and ready — a focused, distraction-free AI tutor that actually adapts to how your child learns.</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link className="btn btn-primary" href="/register">Get started free <svg className="icon" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg></Link>
            <a className="btn btn-ghost" style={{ borderColor: "rgba(255,255,255,.3)", color: "#fff" }} href="mailto:info@gened.ai">Talk to our team</a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer>
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <a href="#top" className="logo" aria-label="GenEd home"><Image src="/Logo.svg" alt="GenEd" width={140} height={28} /></a>
              <p>A dedicated AI learning device that helps every child learn confidently, safely and at their own pace.</p>
            </div>
            <div className="fcol"><h5>Product</h5><a href="#device">The Device</a><a href="#why">Why GenEd</a><a href="#parents">Parent App</a><a href="#safe">Safety</a></div>
            <div className="fcol"><h5>Company</h5><a href="#schools">For Schools</a><a href="#contact">Contact</a><a href="https://gened.ai" target="_blank" rel="noopener noreferrer">About</a><a href="https://gened.ai" target="_blank" rel="noopener noreferrer">Careers</a></div>
            <div className="fcol"><h5>Legal</h5><a href="https://gened.ai" target="_blank" rel="noopener noreferrer">Privacy</a><a href="https://gened.ai" target="_blank" rel="noopener noreferrer">Terms</a><a href="https://gened.ai" target="_blank" rel="noopener noreferrer">Child safety</a></div>
          </div>
          <div className="foot-bottom">
            <span>© {new Date().getFullYear()} GenEd. All rights reserved.</span>
            <span>Made for focused learning.</span>
          </div>
        </div>
      </footer>

      {/* ── VIDEO MODAL ── */}
      {showVideo && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setShowVideo(false)}>
          <div className="relative w-full max-w-4xl" style={{ aspectRatio: "16/9" }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setShowVideo(false)}
              className="absolute -top-10 right-0 text-white text-3xl leading-none hover:text-gray-300 transition-colors"
              aria-label="Close video"
            >
              ×
            </button>
            <iframe
              src="https://www.youtube.com/embed/wOncSCH9Bak?autoplay=1&rel=0"
              className="w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Meet the GenEd Device"
            />
          </div>
        </div>
      )}
    </div>
  );
}
