# GenEd Analytics UI/UX Audit Report

**Date:** 2026-04-20
**Auditor:** Freya (WDS Designer)
**Scope:** `src/components/analytics`
**Exclusions:** `ConceptHeatmap.tsx`, `LearningScheduler.tsx`
**Criticality:** High

---

## 1. Executive Summary
The Analytics components (`src/components/analytics`) represent the analytical brain of GenEd. While technically sophisticated (using Recharts and Framer Motion), the visual language remains firmly in the "SaaS Dashboard" territory. It heavily utilizes **Forest Green** (`#1a3a2a`) and **Sans-serif** typography (Inter), failing to leverage the **Refined Academic** identity. The "Knowledge X-Ray" vision is currently a standard radar chart, missing the "Layered Depth" and "Glassmorphic" precision intended for the Investor Showcase.

---

## 2. Visual Identity & Brand Audit

### 2.1 Color Palette Evaluation
| Role | Current Implementation | Planned (UX Spec) | Deviation |
| :--- | :--- | :--- | :--- |
| **Foundation BG** | `#FBFBFA` (Off-white) | `#FFFFFF` (Pure White) | **Significant**. Reduces the "Zen" and "Clinical" feel. |
| **Primary Structural** | `#1a3a2a` (Forest Green) | `#042E5C` (Primary Navy) | **CRITICAL**. Forest Green feels "eco/organic"; Navy provides the "Institutional Authority." |
| **Success / Mastery** | `#059669` (Emerald) | `#059F6D` (Emerald) | **Matched**. Good alignment on the emerald action color. |
| **Data Visualization** | Standard Recharts palettes | Monochrome + Emerald Pulse | **High**. Too colorful/generic for a "High-Trust" academic tool. |

### 2.2 Typography Evaluation
- **Headings**: The `StudentAnalyticsDashboard` and `SkillMasteryView` headers are all Sans-serif (`Inter`). The mandatory **Playfair Display** (Serif) is entirely missing, stripping the UI of its scholarly weight.
- **Data Points**: Numbers are bold and clear, but use a generic sans-serif. High-trust academic data should feel "Manifold" or "Clinical."

---

## 3. Structural & Component Audit

### 3.1 Analytics Dashboard (`StudentAnalyticsDashboard.tsx`)
- **Generic Pattern**: The top-level metrics use a standard 3-column `MetricCard` grid.
- **The "Subject Switcher"**: Implemented as a standard HTML `<select>`. This lacks the "Ceremony" of a scholarly subject selection.
- **Tab Switcher**: Uses a standard toggle pill. Functional, but misses the "Layered Depth" metaphor.

### 3.2 Skill Mastery View (`SkillMasteryView.tsx`)
- **Radar Chart**: A standard `RadarChart` from Recharts. While functional, it feels "Corporate" rather than "Diagnostic." It lacks the "X-Ray" aesthetic (translucency, fine lines, sharp points).
- **Competency List**: Uses a standard nested accordion/list pattern.
- **"See Why" Justification**: The justification box is a solid `#F4F3EE` (Beige) rectangle. It should feel like a "Manuscript Note" or a "Footnote" on a glass surface.

### 3.3 Chapter Mastery View (`ChapterMasteryView.tsx` / `UnitCard.tsx`)
- **Unit Cards**: Large, rounded cards (`rounded-[40px]`). The radius is extremely large, creating a "soft" feel that contradicts the "Academic Precision" (Sharp Borders) requirement.
- **Status Indicators**: Uses standard pill labels. Effective but generic.

---

## 4. UI/UX "Red Flags"
- **Identity Dissonance**: Labels like "Knowledge X-Ray" and "Cognitive Skill Development" are used, but the visual execution is a standard business chart.
- **Inconsistent Depth**: The UI alternates between very flat surfaces and heavy shadows (`shadow-xl` on hover). Lacks a consistent "Layered Depth" protocol.
- **Missing Zen**: The density of information in the accordion lists feels "Busy" rather than "Airy."

---

## 5. BOLD Structural & Aesthetic Plan

### Phase A: The "Authority" Reset (Aesthetic)
1.  **Purge the Forest**: Replace all `#1a3a2a` (Forest Green) with **Primary Navy** (`#042E5C`). 
2.  **Serif Authority**: Inject **Playfair Display** (Serif) into all H2 and H3 headers.
3.  **Monochrome Data**: Standardize data visualizations on a Navy-to-Emerald spectrum, eliminating generic multi-color charts.

### Phase B: Structural Re-Engineering (The X-Ray)
1.  **The Glass X-Ray**: Convert the Radar Chart and Unit Cards into **GlassSanctuary** components (`backdrop-filter: blur(12px)` + `hsla(0, 0%, 100%, 0.1)`).
2.  **The Subject Lexicon**: Redesign the subject switcher as a high-fidelity "Lexicon" or "Registry" instead of a dropdown.
3.  **High-Density Skill Graph**: Move beyond radar charts. Propose a "Honeycomb" or "Neural Map" SVG for the "Knowledge X-Ray" to physically represent the "Swiss Cheese" metaphor.

### Phase C: Interaction High-Fidelity
1.  **The Diagnostic Pulse**: When analytics data loads, use an "Emerald Scanning" line animation rather than a generic spinner.
2.  **Layered Justification**: "See Why" justifications should appear as a "Layer" behind the glass surface, utilizing the depth-of-field effect.

---
**Verdict:** The Analytics suite is a functional powerhouse that "looks like a Jira board." To meet the **Investor Showcase** standard, it must be transformed into a **"High-Trust Diagnostic Sanctuary"** through surgical color alignment and the adoption of "Clinical Academic" visual metaphors.
