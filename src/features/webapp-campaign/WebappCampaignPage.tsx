"use client";

import { useCallback, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import "./campaign.css";
import { FONT_VARS } from "./fonts";
import { FeatureVideo } from "./film/FeatureFilm";
import { PILOT_TAGLINE } from "@/constants/campaign";
import { SeatsLeft } from "./SeatsLeft";
import { BetaSignupForm } from "./BetaSignupForm";
import { JoinSheet } from "./JoinSheet";
import { MetaPixel, trackMetaCustom } from "./MetaPixel";

/** What the pilot includes today, one line each. */
/** What the pilot gives a family: [lead, highlighted phrase, tail]. */
const FEATURES: [string, string, string][] = [
  ["A personal AI tutor, there for them ", "24/7", ""],
  ["", "Verified lessons", ", built on top teaching methods"],
  ["A ", "learning report", " after every single session"],
  ["", "AI insights", " that show exactly where to grow next"],
];

const showFilm = () => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth", block: "start" });

/** Ad landing page: the offer and its one button first, the demo film right below it, then the sign-up. */
export function WebappCampaignPage() {
  const [joining, setJoining] = useState(false);
  const openJoin = useCallback(() => {
    setJoining(true);
    trackMetaCustom("OpenJoinForm");
  }, []);
  const closeJoin = useCallback(() => setJoining(false), []);
  return (
    <div className={`gened-campaign ${FONT_VARS}`}>
      <MetaPixel />
      <header className="gc-header">
        <div className="gc-wrap gc-header-row">
          <Link href="/" className="gc-logo" aria-label="GenEd home">
            <Image src="/brand/gened-logo.png" alt="GenEd" width={132} height={40} priority />
          </Link>
        </div>
      </header>

      <section className="gc-hero">
        <div className="gc-wrap gc-hero-inner">
          <SeatsLeft className="gc-seats-hero" />
          <span className="gc-hero-sub">Class 6 to 9 · Maths, Science &amp; English</span>
          <h1>
            A personal AI tutor for your child. <em>You see every step.</em>
          </h1>
          <ul className="gc-points">
            {FEATURES.map(([lead, mark, tail], i) => (
              <li key={mark} style={{ "--i": i } as React.CSSProperties}>
                <span className="gc-points-tick">
                  <Check size={14} strokeWidth={3} aria-hidden />
                </span>
                <span>
                  {lead}
                  <mark>{mark}</mark>
                  {tail}
                </span>
              </li>
            ))}
          </ul>
          {/* eslint-disable-next-line no-restricted-syntax -- campaign-styled control (gc-btn), outside the app design system */}
          <button type="button" className="gc-btn gc-btn-citron gc-btn-lg gc-hero-cta" onClick={openJoin}>
            Join the free pilot
          </button>
          {/* eslint-disable-next-line no-restricted-syntax -- campaign-styled scroll cue, not a form control */}
          <button type="button" className="gc-hero-down" onClick={showFilm}>
            <span className="gc-hero-down-label">See it in action</span>
            <span className="gc-hero-down-track" aria-hidden>
              <ChevronDown size={18} strokeWidth={2.6} />
              <ChevronDown size={18} strokeWidth={2.6} />
            </span>
          </button>
        </div>
      </section>

      <div id="demo" className="gc-demo">
        <FeatureVideo onJoin={openJoin} />
      </div>

      <section id="join" className="gc-join">
        <div className="gc-wrap gc-join-grid">
          <div className="gc-join-copy">
            <span className="gc-eyebrow">{PILOT_TAGLINE}</span>
            <h2>
              Save your child&apos;s seat. <em>It takes a minute.</em>
            </h2>
            <SeatsLeft className="gc-seats-join" />
          </div>
          <BetaSignupForm />
        </div>
      </section>

      <footer className="gc-footer">
        <div className="gc-wrap gc-footer-row">
          <p>© {new Date().getFullYear()} GenEd. All rights reserved.</p>
          <Link href="/">← Back to gened.ai</Link>
        </div>
      </footer>
      <JoinSheet open={joining} onClose={closeJoin} />
    </div>
  );
}
