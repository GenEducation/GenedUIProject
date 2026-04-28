# GenEd Auth UI/UX Audit Report

**Date:** 2026-04-20
**Auditor:** Freya (WDS Designer)
**Scope:** `src/features/auth`
**Criticality:** High

---

## 1. Executive Summary
The authentication experience (`src/features/auth`) is the gateway to the GenEd ecosystem. Currently, it presents a "Functional but Generic" interface that heavily relies on modern SaaS tropes (gradients, off-white backgrounds, heavy sans-serif typography) while neglecting the **Refined Academic** and **Scholarly Sanctuary** vision. The structural layout is a standard split-screen hero/form pattern, which lacks the emotional "ceremony" intended for a high-trust educational platform.

---

## 2. Visual Identity & Brand Audit

### 2.1 Color Palette Evaluation
| Role | Current Implementation | Planned (UX Spec) | Deviation |
| :--- | :--- | :--- | :--- |
| **Foundation BG** | `#F7F6F1` (Cream/Beige) | `#FFFFFF` (Pure White) | **Significant**. The cream color feels "lifestyle/organic" rather than "academic/precise". |
| **Primary Navy** | `#042e5c` | `#042E5C` | **Matched**. Correct implementation of brand navy. |
| **Accent Green** | `#2D5540` (Forest Green) | `#059F6D` (Emerald) | **Moderate**. Forest Green is used as the primary secondary color, which feels too dark and earthy. |
| **Input Fields** | Solid White with `#2D5540` borders | Glassmorphic / Subtle | **High**. Lacks the "Layered Depth" principle. |

### 2.2 Typography Evaluation
- **Heading 1 (Hero)**: Uses `font-extrabold tracking-tight`. While impactful, it uses the Sans-serif stack (`Inter`), completely ignoring the **Playfair Display** (Serif) which is mandatory for the "Academic Authority" look.
- **Labels**: Uses `text-[10px] font-bold uppercase tracking-[0.2em]`. This is a classic "modern UI" pattern but lacks the scholarly elegance of a well-typeset serif or a more clinical sans-serif.
- **Form Controls**: Standard sans-serif.

---

## 3. Structural & Component Audit

### 3.1 AuthHero (`AuthHero.tsx`)
- **Generic Element**: The rotating favicon is a playful but somewhat distracting element for a "Scholarly Sanctuary."
- **Visual Trope**: The "Step into your Scholarly Sanctuary" gradient uses a standard 3-color linear gradient (`#2D5540` -> `#50B4A8` -> `#4EB6BF`). This feels too "tech-startup" and not "premium institution."
- **Layout**: Standard left-aligned text with a decorative graphic.

### 3.2 Login / Register Forms (`SignIn.tsx`, `SignUp.tsx`)
- **Container**: Uses `bg-[#F9F8F4]` (Beige) with `rounded-[2.5rem]`. The radius is extremely large, creating a "soft/childish" feel rather than a "precise/professional" one.
- **Generic Inputs**: Standard input boxes with Tailwind `focus:ring`.
- **Button**: The "Accessing archive..." button uses a standard solid Navy with a Forest Green shadow. It lacks the "Glow" or "Bloom" animations requested for validation moments.

### 3.3 AuthFeatures (`AuthFeatures.tsx`)
- **The "Robo" Image**: Using a generic robot image (`/robo.png`) on the login page contradicts the "Subject-as-Agent" and "Scholarly Figure" (Owl, Alchemist) vision.
- **Feature Cards**: Standard 2x2 grid. Highly functional but lacks structural innovation.

---

## 4. UI/UX "Red Flags"
- **Identity Dissonance**: The copy uses high-trust language ("Scholarly Identity", "Archive", "Sanctuary"), but the visual language is standard modern web components.
- **Shadow Overload**: Excessive use of `shadow-xl` and custom color shadows (`shadow-[#0E1F2B]/5`).
- **Missing Ceremony**: There is no visual anticipation of the **Council of Experts** that students are about to encounter.

---

## 5. BOLD Structural & Aesthetic Plan

### Phase A: Aesthetic Realignment (Surgical)
1.  **Purge the Beige**: Replace all `#F7F6F1` and `#F9F8F4` with `#FFFFFF` (Pure White). Use subtle `#F8F9FA` for structure.
2.  **Serif Authority**: Force the "Step into your Scholarly Sanctuary" and form headings ("Welcome back") to use **Playfair Display** (Serif) with `italic` accents for scholarly emphasis.
3.  **Refined Accents**: Replace Forest Green (`#2D5540`) shadows/accents with the brand **Emerald** (`#059F6D`) and its translucent variants.

### Phase B: Structural Re-Engineering (The Ceremony)
1.  **The Silhouetted Council**: Replace the `AuthHero` graphic with a "Council of Experts" silhouette. As the user enters their credentials, specific agents (The Owl, The Alchemist) should subtly glow in the background.
2.  **GlassSanctuary Forms**: Redesign the `SignIn`/`SignUp` cards to be true **Glassmorphic** surfaces (`backdrop-filter: blur(16px)` + `hsla(0, 0%, 100%, 0.1)`).
3.  **Scholarly Inputs**: Replace standard text inputs with "Indented" fields that look like they are etched into the glass surface, using sharp 1px borders.

### Phase C: Interaction Polish
1.  **The Ink-well Button**: Redesign the primary CTA button. Instead of a solid hover, use a "Liquid Emerald" fill animation.
2.  **Pedagogical Nudges**: Instead of generic error messages ("compulsory"), use scholarly phrasing ("A username is required to identify your archive").

---
**Verdict:** The Auth feature is a robust functional skeleton but lacks the brand's "Soul." It is currently a generic gateway; it needs to be transformed into a **Ceremonial Entrance** to the GenEd Sanctuary.
