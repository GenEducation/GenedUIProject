"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import "./pre-order.css";
import { DeviceScrollScene } from "@/features/preorder/components/DeviceScrollScene";
import { PreorderModal } from "@/features/preorder/components/PreorderModal";
import type { PreorderFeature } from "@/features/preorder/types";

const FEATURES: PreorderFeature[] = [
  {
    index: "01",
    title: "Distraction-free by design",
    body: "No browser. No apps. No games. The hardware enforces the focus no parental control ever could.",
  },
  {
    index: "02",
    title: "Adapts until it clicks",
    body: "It reads how your child responds and tries a new angle — a metaphor, a visual — when something isn't landing.",
  },
  {
    index: "03",
    title: "Always there, 24/7",
    body: "10pm before an exam or a quiet Sunday — patient, ready, and never too tired to explain it once more.",
  },
  {
    index: "04",
    title: "Syncs with the parent app",
    body: "Everything it learns about your child's progress, in plain language, in your pocket.",
  },
  {
    index: "05",
    title: "Safe by design",
    body: "Content guardrails, no open internet, and full parent visibility into every session.",
  },
];

export default function PreOrderPage() {
  const [open, setOpen] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  // Close the video modal on Escape.
  useEffect(() => {
    if (!showVideo) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setShowVideo(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showVideo]);

  return (
    <div className="gened-preorder">
      {/* Fonts — React 19 hoists & dedupes these into <head> */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..900;1,9..144,400..700&family=Manrope:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      {/* ── STICKY HEADER — persistent Pre-order CTA ── */}
      <header className="po-header">
        <div className="po-wrap">
          <Link href="/" className="po-logo" aria-label="GenEd home">
            <Image src="/Logo.svg" alt="GenEd" width={140} height={28} priority />
          </Link>
          <div className="po-header-cta">
            <Link href="/" className="po-back">
              <svg viewBox="0 0 24 24">
                <path d="M19 12H5M11 6l-6 6 6 6" />
              </svg>
              <span>Website</span>
            </Link>
            <button
              type="button"
              className="po-btn po-btn-primary"
              onClick={() => setOpen(true)}
            >
              Place pre-order
            </button>
          </div>
        </div>
      </header>

      {/* ── INTRO ── */}
      <section className="po-intro">
        <div className="po-wrap">
          <span className="po-eyebrow">
            <span className="dot" /> Now taking pre-orders
          </span>
          <h1>
            The tutor that sits on the desk. <em>Yours to reserve.</em>
          </h1>
          <p>
            A dedicated AI learning device — not a phone, not a tablet. Scroll to
            watch it come to life, and reserve one for your child today.
          </p>
          <div className="po-intro-actions">
            <button
              type="button"
              className="po-btn po-btn-ghost"
              onClick={() => setShowVideo(true)}
            >
              <svg viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" fill="currentColor" stroke="none" />
              </svg>
              Meet the device
            </button>
          </div>
          <div className="po-scrollhint">
            Scroll to wake it
            <svg viewBox="0 0 24 24">
              <path d="M12 5v14M6 13l6 6 6-6" />
            </svg>
          </div>
        </div>
      </section>

      {/* ── DEVICE SCROLL STAGE ── */}
      <DeviceScrollScene features={FEATURES} />

      {/* ── REASSURANCE STRIP ── */}
      <section className="po-strip">
        <div className="po-wrap">
          <div className="po-strip-grid">
            <div className="po-chip">
              <span className="po-chip-ico">
                <svg viewBox="0 0 24 24">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
              <h4>₹500 to reserve</h4>
              <p>A refundable ₹500 deposit holds your place.</p>
            </div>
            <div className="po-chip">
              <span className="po-chip-ico">
                <svg viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </span>
              <h4>Priority delivery</h4>
              <p>Pre-orders ship first, in the order reserved.</p>
            </div>
            <div className="po-chip">
              <span className="po-chip-ico">
                <svg viewBox="0 0 24 24">
                  <path d="M21 12a9 9 0 11-6.2-8.6" />
                  <path d="M22 4l-10 10-3-3" />
                </svg>
              </span>
              <h4>Cancel anytime</h4>
              <p>Your deposit is refunded in full if you cancel.</p>
            </div>
            <div className="po-chip">
              <span className="po-chip-ico">
                <svg viewBox="0 0 24 24">
                  <path d="M12 2l3 6 6 .9-4.5 4.3 1 6.1L12 17l-5.5 2.3 1-6.1L3 8.9 9 8z" />
                </svg>
              </span>
              <h4>Founder pricing</h4>
              <p>Early reservers get our best launch price.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CLOSING CTA ── */}
      <section className="po-cta">
        <div className="po-wrap">
          <h2>
            Give your child a device that <em>only</em> teaches.
          </h2>
          <p>
            Reserve your GenEd Deskbot now. It takes a minute, a refundable
            ₹500 deposit, and puts you first in line.
          </p>
          <button
            type="button"
            className="po-btn po-btn-light po-btn-lg"
            onClick={() => setOpen(true)}
          >
            Place your pre-order
            <svg viewBox="0 0 24 24">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="po-footer">
        <div className="po-wrap">
          <p>© {new Date().getFullYear()} GenEd. All rights reserved.</p>
          <p>
            <Link href="/">← Back to gened.ai</Link>
          </p>
        </div>
      </footer>

      <PreorderModal isOpen={open} onClose={() => setOpen(false)} />

      {/* ── "Meet the device" video modal ── */}
      {showVideo && (
        <div
          className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowVideo(false)}
        >
          <div
            className="relative w-full max-w-4xl"
            style={{ aspectRatio: "16/9" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowVideo(false)}
              className="absolute -top-10 right-0 text-white text-3xl leading-none hover:text-gray-300 transition-colors"
              aria-label="Close video"
            >
              ×
            </button>
            <iframe
              src="https://www.youtube.com/embed/YrTt8OwvT3I?autoplay=1&rel=0"
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
