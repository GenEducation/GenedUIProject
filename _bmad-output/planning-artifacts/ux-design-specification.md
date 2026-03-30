---
stepsCompleted: ['step-01-init', 'step-02-context', 'step-03-core', 'step-04-emotion', 'step-05-inspiration', 'step-06-design-system', 'step-07-experience', 'step-08-visual-foundation', 'step-09-design-directions', 'step-10-user-journeys']
inputDocuments: ['prd.md', 'architecture.md', 'implementation_plan.md', 'gened.ai-brand', 'design-directions']
workflowType: 'ux'
project_name: 'GenEd Portal'
user_name: 'Amantya'
date: '2026-03-23'
---

# UX Design Specification GenEd Portal

**Author:** Amantya
**Date:** 2026-03-23

---

<!-- UX design content will be appended sequentially through collaborative workflow steps -->

## Step 2: UX Discovery & Vision

### Executive Summary & Project Vision
To create an AI-powered educational ecosystem where subjects are embodied by specialized **Socratic Agents**. GenEd is not a single tutor; it is a **Council of Experts** (e.g., The Math Alchemist, The Chronicler of History) that students, parents, and schools can explicitly onboard and activate for focused learning journeys.

### Target Users & Persona Needs
- **Arjun (Younger Student)**: Activates 'Subject Buddies' with unique visual personalities and voice tones.
- **Mrs. Sharma (Parent)**: Onboards new subject agents to Arjun's learning track and monitors 'Agent-specific Mastery.'
- **School Partners**: Manage the curriculum mapping for the entire 'Agent Roster' at a school level.

### Key Design Challenges
- **The Activation Journey**: Designing a seamless onboarding flow where 'activating' an agent feels like unlocking a new level in a game.
- **Multi-Agent Coherence**: Ensuring that while 'The Math Alchemist' looks different from 'The Science Sage,' they both share the **Premium Glassmorphic** DNAs.
- **Context Handoff**: UX for transitioning between different subject agents without losing the core 'Student Persona' context.

### Design Opportunities: Subject-as-Agent
- **Subject Figures**: Specialized icons representing 'Scholarly Figures' (e.g., a Geometric Owl for Math). They are clean, precise, and monochrome.
- **Mastery Badges**: Traditional, premium medal/stamp-like icons for mastery milestones.

## Design System Foundation: High-Trust Precision

### 1.1 Design System Choice: Custom Vanilla CSS
- **Selection**: Custom CSS Modules + Global Design Tokens (HSL/Solid).
- **Rationale**: We are merging the established **GenEd.ai brand** with an academic, high-trust interface. Vanilla CSS allows us to achieve pixel-perfect shadows and clean, sharp borders.

### 1.2 Brand Palette (gened.ai Integration)
We will use the core colors from `gened.ai` as solid, functional layers. No neons or glows:

| Color Role | Hex / Token | Usage |
| :--- | :--- | :--- |
| **Primary Navy** | `#042E5C` | Sidebar, main brand surfaces, and text headings. |
| **Accent Emerald** | `#059F6D` | Primary CTAs, progress bars, and success icons. |
| **Body Slate** | `#334155` | Primary body text for maximum readability. |
| **Pure White** | `#FFFFFF` | Main app background (Modern Zen direction). |
| **Soft Grey** | `#F1F5F9` | Card backgrounds and subtle separators. |

### 1.3 Subject-Agent Visuals
Subject Agents are no longer 'neons.' They are now represented by:
- **Direction A (Academic)**: Detailed, woodcut-style or monochrome high-fidelity icons.
- **Direction B (Minimalist)**: Precise outline icons (2px stroke) in Charcoal/Navy.

### 1.4 Typography & Texture
- **Headings (Academic)**: **Playfair Display** (High-end Serif).
- **Headings (Minimalist)**: **Poppins** (Geometric Sans-serif).
- **Body**: **Inter** (Universal readability for educational content).
- **Soft Shadows**: `0 4px 6px -1px rgb(0 0 0 / 0.1)`. No glows or intense blurs.
- **Sharp Borders**: Consistent `1px` borders for all cards.

## Visual Design Foundation

### Color System & Semantic Mapping
We implement a **Dark-First Glassmorphic** theme that leverages the `gened.ai` primary navy as the 'void' and vibrant neons as the 'life.'

| Token | HSL / Hex | Semantic Use |
| :--- | :--- | :--- |
| `--color-bg` | `#042E5C` | The universal foundational background. |
| `--color-accent` | `#059F6D` | Brand-level actions (Save, Continue, Activate). |
| `--color-surface` | `hsla(0, 0%, 100%, 0.05)` | The 'frosted' surface for all content cards. |
| `--color-success` | `hsl(150, 100%, 50%)` | Correct Socratic response. |
| `--color-error` | `hsl(0, 100%, 65%)` | Critical alerts (Rarely used in Socratic mode). |

### Typography System
- **Primary Typeface**: **Poppins** (Weights: 400, 600, 700). Used for 'Subject Agent' names and jumbo 'Aha!' moments.
- **Secondary Typeface**: **Inter** (Weights: 400, 500). Used for all educational text, transcripts, and dashboard data.
- **Scale**: Minor Third (1.2). H1: 2.488rem, H2: 2.074rem, Base: 1rem.

### Spacing & Layout Foundation
- **Grid**: 8px hard grid. All padding/margin must be multiples of 8.
- **Layout Principle**: **'Layered Depth'**. Elements never sit flat; they float using `box-shadow` and `backdrop-filter`.
- **Containers**: Max-width content areas (1200px) with generous 32px side padding to feel 'Airy.'

### Accessibility Considerations
- **Contrast**: All text over glass must meet WCAG AA (using semi-opaque dark overlays behind light text).
- **Focus States**: High-visibility neon 'rings' around keyboard-accessible elements.
- **Motion**: `prefers-reduced-motion` toggle to simplify the glass-opening animations.

### Chosen Direction: 'Refined Academic GenEd'
We have strictly aligned with the **GenEd.ai brand identity**, utilizing a **Light Academic Precision** direction:
- **Style**: High-trust, scholarly, and professional. 
- **Layout**: Airy and clean with a white background (#FFFFFF). No heavy navy-blocks or neons.
- **Palette**: Strictly Primary Navy (#042E5C) for structure and Emerald (#059F6D) for action/success.

### Design Rationale
- **Scholarly Authority**: The serif headings evoke the feeling of a prestigious institution.
- **Brand Coherence**: Using the exact codes from `gened.ai` ensures a seamless transition for existing users.
- **Low Cognitive Load**: The minimalist white-space-first approach keeps the student focused on the Socratic prompts without visual noise.

## 2. User Journey Flows (Finalized)

### 2.1 The 'Activation to Mastery' Path
The core journey for Arjun (Student) and Mrs. Sharma (Parent):

1. **Discovery (Parent)**: Mrs. Sharma sees a 'New Subject Available' notification on her Emerald dashboard.
2. **Onboarding (Parent)**: She clicks 'Activate Math Alchemist' and assigns a schedule.
3. **Activation (Student)**: Arjun sees the Math Agent 'Awaken' with a glassmorphic pulse on his Navy dashboard.
4. **Socratic Dialogue**: Arjun interacts with the Agent. Every correct conceptual leap triggers a 'Glow-Fill.'
5. **Mastery (X-Ray)**: The Parent X-Ray updates in real-time. Mrs. Sharma receives a 'Mastery Milestone' alert when the node turns solid emerald.

### 2.2 Critical Success Moments
- **The 'Aha' Pulse**: The visual transition when a student answers a Socratic prompt correctly.
- **The 'Gap' Closing**: When the 'frosted' glass clears up to reveal a mastered concept icon.
