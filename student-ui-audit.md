# GenEd Student UI/UX Audit Report

**Date:** 2026-04-20
**Auditor:** Freya (WDS Designer)
**Scope:** `src/features/student`
**Criticality:** High

---

## 1. Executive Summary
The Student experience (`src/features/student`) is the heart of GenEd. Currently, it functions as a competent but visually standard EdTech platform. It heavily employs "Web 2.0" patterns: off-white backgrounds (`#F4F3EE`), forest green accents (`#1a3a2a`), and standard Lucide iconography. While usable, it lacks the **Scholarly Sanctuary** and **Premium Glassmorphic** identity defined in the PRD. The "Magic" (Socratic dialogue) is presented in a standard chat bubble interface, missing the opportunity for high-fidelity visual feedback and ceremonial subject activation.

---

## 2. Visual Identity & Brand Audit

### 2.1 Color Palette Evaluation
| Role | Current Implementation | Planned (UX Spec) | Deviation |
| :--- | :--- | :--- | :--- |
| **Foundation BG** | `#F4F3EE` (Beige/Bone) | `#FFFFFF` (Pure White) | **Significant**. The beige feels "lifestyle/safe" rather than "precise/academic". |
| **Primary Structure** | `#1a3a2a` (Forest Green) | `#042E5C` (Primary Navy) | **CRITICAL**. Navy is the key to high-trust academic authority. |
| **Action / Mastery** | `#2d6a4a` / `#bce4cc` | `#059F6D` (Emerald) | **Moderate**. Multiple shades of green create visual clutter and dilute brand focus. |
| **Surfaces** | Solid `#F4F3EE` or White | Glassmorphic / Layered | **High**. Missing the `backdrop-filter` depth. |

### 2.2 Typography Evaluation
- **Headings**: `StudentHome.tsx` and `StudentProfile.tsx` use `font-extrabold tracking-tight` with the Sans-serif stack (`Inter`). This is the primary "Identity Gap"—the mandatory **Playfair Display** (Serif) is missing from all feature headers.
- **Micro-copy**: Extensive use of `text-[10px] uppercase tracking-widest`. This is a clean pattern but needs to be balanced with more elegant typography to avoid looking "utilitarian."

---

## 3. Structural & Component Audit

### 3.1 Student Home & Dashboard (`StudentHome.tsx`)
- **The "Council Row" Gap**: The UI uses a generic 3-column grid for "Start New Chat." This misses the horizontal "Council of Experts" row metaphor intended to feel like a scholarly assembly.
- **Visual Noise**: The animated gradient text ("Hi [Username]") is a consumer-grade distraction.
- **Interaction**: Selecting an agent is a simple click-to-navigate. It lacks the 2.5s Emerald "Awakening" pulse ceremony.

### 3.2 Socratic Chat (`StudentChatMain.tsx`, `ChatMessageBubble.tsx`)
- **Interface**: Standard vertical chat list.
- **The "Pulse" Gap**: The AI "Thinking" indicator is a generic pulsing dot. It should feel like a scholarly reflection (a "bloom" or "ink-well" animation).
- **Mastery Feedback**: No "Glow-Fill" animation triggered on correct Socratic responses. The "Aha!" moment is purely textual.
- **Typography**: Message bubbles use `text-sm leading-relaxed`. This is functional but could benefit from a more "Manuscript-like" typesetting for AI prompts.

### 3.3 Student Profile (`StudentProfile.tsx`)
- **Structural Layout**: A standard 2-column "Settings" layout.
- **Identity Representation**: The "Student Identity" section uses generic boxes. It should feel like a "Scholar's Dossier."
- **Inconsistent Radii**: Uses `rounded-2xl`, `rounded-3xl`, and `rounded-full`. The "Sharp Borders" precision is lost in the "Softness."

---

## 4. UI/UX "Red Flags"
- **Identity Dissonance**: Labels like "Knowledge Threads" and "Socratic Guide" are excellent, but the visual shell (Forest Green/Beige) belongs to a different product category (e.g., a wellness app or a task manager).
- **Generic Iconography**: Heavy reliance on Lucide's `Zap`, `User`, `ShieldCheck`. These lack the bespoke scholarly fidelity requested.
- **Interaction Friction**: Transitioning between chat and dashboard feels like moving between two separate apps rather than deepening the same sanctuary experience.

---

## 5. BOLD Structural & Aesthetic Plan

### Phase A: The "Sanctuary" Reset (Aesthetic)
1.  **Brand Re-coloring**: Purge all `#F4F3EE` (Beige) and `#1a3a2a` (Forest Green). Enforce **Primary Navy** (`#042E5C`) for structure and **Emerald** (`#059F6D`) for mastery events.
2.  **Serif Authority**: Inject **Playfair Display** into all H1, H2, and Sidebar headers. 
3.  **Glass surfaces**: Convert Chat Sidebar and Chat Bubbles into true **GlassSanctuary** components (`backdrop-filter: blur(16px)` + `hsla(0, 0%, 100%, 0.05)`).

### Phase B: Structural Ceremony (The Magic)
1.  **The Council Carousel**: Redesign the "Start New Chat" section as a horizontal, high-intent carousel of scholarly figures.
2.  **The Awakening Ceremony**: Implement the 2.5s Emerald pulse and "light bloom" animation when a student enters a chat session.
3.  **The Glow-Fill Sidebar**: On correct Socratic answers, the corresponding subject agent in the sidebar should "fill" with liquid Emerald color.

### Phase C: Interaction High-Fidelity
1.  **Socratic Prompt Animation**: AI prompts should "bloom" onto the screen with a subtle manuscript-fade, emphasizing the value of each question.
2.  **The Digital Twin Dossier**: Redesign the Profile page to look like a high-end academic credential page (Dossier style), moving away from generic settings grids.

---
**Verdict:** The Student feature set is functionally complete but visually "standard." To achieve the Investor Showcase goals, it must be transformed from a "Learning Tool" into a **"Scholarly Sanctuary"** through surgical color alignment and the addition of high-fidelity ceremony animations.
