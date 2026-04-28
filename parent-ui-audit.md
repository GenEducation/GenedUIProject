# GenEd Parent UI/UX Audit Report

**Date:** 2026-04-20
**Auditor:** Freya (WDS Designer)
**Scope:** `src/features/parent`
**Exclusions:** `ConceptHeatmap.tsx`, `LearningScheduler.tsx`
**Criticality:** High

---

## 1. Executive Summary
The Parent experience (`src/features/parent`) is designed to provide high-level insights and governance. Currently, it functions as a "Wellness Dashboard"—heavy on forest greens, off-whites, and soft rounded corners. While functional and cleanly coded, it suffers from **Brand Drift**: it fails to project the "High-Trust Academic Authority" and "Modern Zen" identity defined in the PRD. The UI feels more like a health-tracking app than a prestigious educational oversight portal.

---

## 2. Visual Identity & Brand Audit

### 2.1 Color Palette Evaluation
| Role | Current Implementation | Planned (UX Spec) | Deviation |
| :--- | :--- | :--- | :--- |
| **Foundation BG** | `#FBFBFA` (Eggshell) | `#FFFFFF` (Pure White) | **Significant**. The eggshell color reduces the "Clinical Precision" and "Zen" feel. |
| **Primary Structural** | `#1a3a2a` (Forest Green) | `#042E5C` (Primary Navy) | **CRITICAL**. Forest green projects "nature/growth" but Navy projects "authority/expertise". |
| **Accent / Action** | `#059669` (Emerald) | `#059F6D` (Emerald) | **Matched**. Good alignment on the emerald success color. |
| **Secondary Accents** | `#F4F3EE` (Beige) | `#F8F9FA` (Academic Grey) | **Moderate**. Beige is too "soft" for the academic vision. |

### 2.2 Typography Evaluation
- **Heading 1 & 2**: Uses `font-black tracking-tight` with the Sans-serif stack (`Inter`). This is the primary "Identity Gap"—the mandatory **Playfair Display** (Serif) is missing from all feature headers.
- **Labels**: Uses `text-[10px] font-black uppercase tracking-[0.25em]`. This is a strong pattern but feels "Utility-Heavy" without the contrast of a sophisticated serif.

---

## 3. Structural & Component Audit

### 3.1 Parent Home & Sidebar (`ParentHome.tsx`)
- **Generic Element**: The sidebar uses standard `rounded-2xl` buttons with standard Lucide icons (`Users`, `BarChart2`).
- **Identity Gap**: The "Academic Overseer" label is excellent copy, but the visual container (Forest Green/White) doesn't match the "Sanctuary" vibe.
- **Navigation**: The student switcher is a standard vertical list. It lacks the "Guardian/Guide" emotional weight intended for the Investor Showcase.

### 3.2 Parent Profile & Connections (`ParentProfileView.tsx`)
- **Visual Pattern**: Standard "Account Settings" layout.
- **Aesthetic**: The use of gradients (`from-[#1a3a2a] to-[#059669]`) on the avatar is a modern consumer trope that contradicts the "Zen Academic" low-cognitive-load goal.
- **Cards**: Standard `shadow-sm` and `border-[#1a3a2a]/5`. Functional but lacks the "Layered Depth" and "Glassmorphism" defined in the UX Spec.

### 3.3 Chat Monitoring (`ParentChatExploration.tsx`, `ParentSessionList.tsx`)
- **Interface**: Standard master-detail view.
- **Generic Patterns**: The `ParentSessionList` uses a standard list of buttons with `MessageSquare` icons. 
- **The "Insight" Gap**: There is no visual distinction between a "Mastery" session and a "Struggle" session in the list view, which is a key requirement for the "Knowledge X-Ray" vision.

---

## 4. UI/UX "Red Flags"
- **Identity Dissonance**: High-fidelity labels like "Learning Subject" and "Active Monitoring" are trapped in a low-fidelity, generic container.
- **Generic Iconography**: Heavy reliance on Lucide's `Clock`, `User`, `Mail`. These are functional but lack the bespoke scholarly fidelity (Woodcut/Monochrome) requested.
- **Interaction Friction**: The transitions between "Insight Dashboard" and "Chat Explorations" are simple tab-switches. They lack the "Ceremonial Depth" expected from a premium platform.

---

## 5. BOLD Structural & Aesthetic Plan

### Phase A: The "Authority" Reset (Aesthetic)
1.  **Purge the Forest**: Replace all `#1a3a2a` (Forest Green) with **Primary Navy** (`#042E5C`). This immediately elevates the trust level.
2.  **Serif Foundation**: Inject **Playfair Display** into all H1, H2, and Sidebar headers. Use `italic` for secondary labels (e.g., *Academic Overseer*).
3.  **Zen Backgrounds**: Standardize on `#FFFFFF` (Pure White) for all main content areas. Use `#F8F9FA` for secondary surfaces.

### Phase B: Structural Re-Engineering (The Guide)
1.  **The Guardian Header**: Redesign the global header to use **GlassSanctuary** components (backdrop blur + 1px emerald border).
2.  **The Scholarly Roster**: Redesign the student switcher in the sidebar to feel like a **"Family Repository"** rather than a simple user list.
3.  **Mastery-Coded Sessions**: Add visual indicators to the `ParentSessionList` (e.g., a subtle Emerald glow for mastered sessions vs. a Frosted pulse for active gaps) to provide immediate "X-Ray" value.

### Phase C: Interaction High-Fidelity
1.  **The X-Ray Transition**: Implement a custom "scanning" animation when transitioning between students or subjects.
2.  **Dossier Profile**: Redesign the Profile page as a **"Parent Ledger"**, using high-precision typography and sharp borders instead of soft gradients and rounded cards.

---
**Verdict:** The Parent feature set is a high-functioning "Wellness App" that needs to be transformed into a **"High-Trust Scholarly Overseer"** through surgical color alignment and the addition of high-fidelity pedagogical visual metaphors.
