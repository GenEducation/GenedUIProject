---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics']
inputDocuments: ['prd.md', 'architecture.md', 'ux-design-specification.md']
---

# GenEd Portal - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for the GenEd Portal, decomposing the requirements from the PRD, Architecture Decision Document, and UX Design Specification into implementable stories. 

**Priority Focus**: Investor Showcase (Frontend-first with Mock Backend functionality).

## Requirements Inventory

### Functional Requirements

FR1: [Phase 2] Identify "Swiss Cheese" holes using behavioral markers (persistence, struggle points).
FR2: [MVP] Formulate Socratic provocations that guide students without revealing answers. (Showcase Priority)
FR3: [MVP] Dynamically calibrate the Zone of Proximal Development (ZPD) for each student-session. (Showcase Priority)
FR4: [MVP] Trigger "Hint Escalation" when student frustration exceeds a threshold.
FR5: [MVP] Maintain a "Digital Twin" progress profile for every student across devices.
FR6: [MVP] Administrators can upload and map NCERT/State Board PDFs to the Skill Graph.
FR7: [MVP] Provide AI-assisted mapping suggestions during content ingestion.
FR8: [Phase 2] Partners can upload SCORM 1.2 packages to their private, isolated namespace.
FR9: [MVP] Version-control the Skill Graph to maintain historical progress.
FR10: [MVP] Younger Students can receive voice-based pedagogical prompts from companion device. (Showcase Priority)
FR11: [MVP] Elder Students can switch seamlessly between Voice and Text interaction modes. (Showcase Priority)
FR12: [MVP] Provide multi-modal visual feedback (Smile/Frown/Thinker) on companion device. (Showcase Priority)
FR13: [MVP] Elder Students view personalized dashboard showing verified learning outcomes. (Showcase Priority)
FR14: [MVP] Parents/Schools view "Learning Outcome" dashboards showing student mastery. (Showcase Priority)
FR15: [MVP] Diagnostic "Knowledge X-Ray" detailing specific skills mastered vs. persistent gaps. (Showcase Priority)
FR16: [Phase 2] automated alerts for students requiring immediate human intervention.
FR17: [Phase 2] Partners view "Content Efficacy" reports.
FR18: [MVP] Parents use "Learning Scheduler" to assign subjects/topics to younger students. (Showcase Priority)
FR19: [Phase 2] Real-time notifications for Struggling, Disengaged, or Absent behaviors.
FR20: [MVP] Partners manage private content libraries within a unique Namespace.
FR21: [MVP] Ensure Partner content is only visible to their enrolled student sub-population.
FR22: [MVP] Partners assign students to specific custom curriculum tracks.

### NonFunctional Requirements

NFR1: [Phase 2] AI text provocations return within 1.5 seconds. (Showcase Priority - Feel)
NFR2: [Phase 2] Voice interaction latency under 2.5 seconds.
NFR3: [Phase 2] Dashboards load diagnostic data within 2 seconds.
NFR4: [Phase 2 Core] Student PII encrypted at rest (AES-256) and in transit (TLS 1.3).
NFR5: [Phase 2] Strict database-level isolation using Row Level Security (RLS).
NFR6: [Phase 2] Secure authentication and consent for students under 18.
NFR7: [Phase 2] Support 10,000+ simultaneous students.
NFR8: [Phase 2] 99.9% availability during peak learning hours.
NFR9: [Phase 2] Session state persisted every 30 seconds.
NFR10: [Phase 2] Web portals adhere to WCAG 2.1 Level AA. (Showcase Priority - Accessibility)
NFR11: [Phase 2] Specialized voice recognition for diverse Indian accents.

### Additional Requirements

- **Mono-repo Architecture**: Baseline the Auth and Core services with Docker Compose (Architecture Recommendation).
- **Frontend Stack**: Next.js 15 (App Router), Zustand, TanStack Query, Vanilla CSS (Refined Academic style).
- **Communication Patterns**: Sync REST (HTTP) for orchestration; WebSockets for real-time Socratic interactions.
- **Subject-as-Agent**: Visual representation as 'Scholarly Figures' (e.g., Geometry Owl, History Chronicler).
- **Investor Mocking**: Backend APIs must allow for 'Dummy' responses to demonstrate frontend interaction flow (User Priority).

### FR Coverage Map

FR1: Epic 5 - Identify "Swiss Cheese" holes using behavioral markers.
FR2: Epic 2 - Formulate Socratic provocations (Showcase Priority).
FR3: Epic 2 - Dynamically calibrate ZPD (Showcase Priority).
FR4: Epic 5 - Trigger "Hint Escalation" when frustration exceeds threshold.
FR5: Epic 5 - Maintain "Digital Twin" progress profile.
FR6: Epic 4 - Upload and map NCERT/State Board PDFs.
FR7: Epic 4 - AI-assisted mapping suggestions.
FR8: Epic 4 - Partner SCORM 1.2 package support.
FR9: Epic 4 - Skill Graph version control.
FR10: Epic 2 - Younger Student voice prompts (Showcase Priority).
FR11: Epic 2 - Elder Student voice/text modes (Showcase Priority).
FR12: Epic 2 - Visual feedback prompts (Showcase Priority).
FR13: Epic 2 - Elder Student outcome dashboard (Showcase Priority).
FR14: Epic 3 - Parent/School mastery dashboards (Showcase Priority).
FR15: Epic 3 - Diagnostic "Knowledge X-Ray" (Showcase Priority).
FR16: Epic 5 - Automated intervention alerts.
FR17: Epic 4 - Partner "Content Efficacy" reports.
FR18: Epic 3 - Parent "Learning Scheduler" for younger students (Showcase Priority).
FR19: Epic 5 - Real-time "Struggle/Disengaged" notifications.
FR20: Epic 4 - Partner private Namespace management.
FR21: Epic 4 - Partner content isolation.
FR22: Epic 4 - Partner curriculum track assignment.

## Epic 1: System Foundation & Identity

*Users can authenticate into their respective personas within a secure, multi-tenant mono-repo baseline with a mock-ready API structure.*

### Story 1.1: Mono-repo Architecture & Baseline
As a Developer,  
I want a unified containerized workspace for Next.js and FastAPI,  
So that I can develop all services in parallel with environment parity.

**Acceptance Criteria:**
**Given** a clean development environment  
**When** I run `make dev`  
**Then** Docker Compose starts `auth`, `core`, and `web` services  
**And** all services can communicate over the internal bridge network.

### Story 1.2: Multi-tenant JWT Authentication Service
As a User,  
I want to log in as a Student, Parent, or Partner,  
So that I can access my role-specific dashboard and data namespace.

**Acceptance Criteria:**
**Given** a valid set of multi-tenant credentials  
**When** I POST to `/api/auth/login`  
**Then** the service returns a JWT containing `role`, `partner_id`, and `user_id`  
**And** subsequent requests to protected endpoints are authorized based on these claims.

### Story 1.3: Investor Showcase Mock Proxy
As an Investor,  
I want to see a 'Demo Mode' that uses 'gold' dummy data,  
So that I can experience the full UX flow even before backend services are fully functional.

**Acceptance Criteria:**
**Given** the application is running in `INVESTOR_DEMO=true` mode  
**When** any frontend service makes a call to a mockable endpoint (e.g., `/api/socratic/prompt`)  
**Then** the API returns a predefined static JSON response representing 'Mastery' or 'Struggle'  
**And** the UI reflects this mock data with 100% fidelity.

### Story 1.4: Refined Academic Design Tokens
As a Student,  
I want the UI to utilize the GenEd Navy and Emerald color palette,  
So that the portal feels scholarly, professional, and high-trust.

**Acceptance Criteria:**
**Given** the Next.js frontend baseline  
**When** I view the Global CSS or Tailwind/tokens config  
**Then** I see variables for `--color-navy: #042E5C`, `--color-emerald: #059F6D`, and `--font-serif: "Playfair Display"`  
**And** all new components inherit these tokens by default.

## Epic 2: Socratic Student Portal (The 'Magic')

*Students can 'awaken' subject agents and engage in rhythmic Socratic dialogue with voice/text feedback.*

### Story 2.1: Subject-Agent Activation "Ceremony"
As Arjun (Student),  
I want to 'awaken' a subject agent from the Council Row,  
So that I can begin a focused Socratic learning journey.

**Acceptance Criteria:**
**Given** the student is on the main dashboard  
**When** I select a subject icon (e.g., Math Owl) from the Council Row  
**Then** the UI performs a 2px Emerald 'Awakening' pulse  
**And** the chat interface initializes with a welcoming Socratic prompt from that specific agent.

### Story 2.2: Rhythmic Socratic Dialogue Engine
As Arjun,  
I want the agent to ask me guiding questions and pause for my thoughts,  
So that I can experience the 'Aha!' moment of self-discovery.

**Acceptance Criteria:**
**Given** an active Socratic session  
**When** the agent delivers a prompt  
**Then** the system waits for student input (Text or Voice) before proceeding  
**And** a 'Thinking' indicator appears when the student is composing their response.

### Story 2.3: Visual Mastery Feedback (The Glow-Fill)
As Arjun,  
I want to see my conceptual breakthroughs reflected visually in real-time,  
So that I feel a sense of accomplishment and momentum.

**Acceptance Criteria:**
**Given** a student correctly identifies a conceptual link  
**When** the Socratic agent validates the response  
**Then** the 'frosted' glass of the subject icon clears to reveal a 'Solid Emerald' fill  
**And** a celebratory micro-animation triggers (e.g., a subtle light-bloom).

### Story 2.4: Multi-modal (Voice/Text) Interaction Switcher
As Arjun,  
I want to switch between typing and talking to my agent,  
So that I can learn in the mode that fits my current environment.

**Acceptance Criteria:**
**Given** the chat interface is open  
**When** I click the 'Microphone' icon  
**Then** the input switch to a voice-listening state with a rhythmic visual pulse  
**And** I can toggle back to the keyboard at any time. (Note: Initial implementation uses mock STT for showcase).

### Story 2.5: Student Mastery Dashboard (The 'Medals')
As Arjun,  
I want to view my verified learning outcomes and medals,  
So that I can celebrate my progress across all subjects.

**Acceptance Criteria:**
**Given** I navigate to the 'My Mastery' tab  
**When** the page loads  
**Then** I see high-fidelity 'Scholarly Figures' for all active subjects  
**And** each subject displays a progress bar showing 'Mastery Credits' earned.

## Epic 3: Knowledge X-Ray & Parent Insights (The 'Value')

*Parents can visualize learning gaps in real-time and manage their child's 'Learning Scheduler.'*

### Story 3.1: The Knowledge X-Ray (Concept Heatmap)
As Mrs. Sharma (Parent),  
I want to see a visual map of Arjun's learning gaps in real-time,  
So that I can understand where he is struggling and identify specific goals for intervention.

**Acceptance Criteria:**
**Given** the Parent 'X-Ray' view is active  
**When** the dashboard renders  
**Then** a high-density skill-graph (D3 or Recharts) displays the conceptual nodes  
**And** 'Mastered' nodes are Solid Emerald while 'Gaps' are shown as Frosted Grey/Translucent.

### Story 3.2: Parent Learning Scheduler
As Mrs. Sharma,  
I want to assign 'Math Alchemist' or 'History Chronicler' to specific 45-minute slots,  
So that Arjun's companion device unlocks the correct agent at the scheduled time.

**Acceptance Criteria:**
**Given** a parent is in the Scheduler interface  
**When** I drag a 'Subject Token' into a time-slot on the weekly calendar  
**Then** the `core` service persists this change to Arjun's 'Digital Twin' profile  
**And** the UI reflects the updated session goals immediately.

### Story 3.3: Mastery Milestone Notifications
As Mrs. Sharma,  
I want to receive real-time alerts when Arjun achieves a 'Breakthrough,'  
So that I can acknowledge his success and reinforce his learning.

**Acceptance Criteria:**
**Given** the `memory` service detects a 'Mastery' event for a Concept_ID  
**When** the event is processed  
**Then** a push-notification or sidebar alert appears for the parent  
**And** the alert says 'Breakthrough Achieved! Arjun mastered Fractions' with a direct link to the X-Ray.

### Story 3.4: Multi-student Mastery Overview (The Guide View)
As a Parent with multiple children,  
I want a centralized view of their collective mastery levels,  
So that I can manage my time and interventions across the family.

**Acceptance Criteria:**
**Given** I have multiple students enrolled in my profile  
**When** I load the main 'Guide' dashboard  
**Then** I see high-level summary cards for each student  
**And** each card aggregates the 'Global Mastery %' and 'Active Gaps' for quick comparison.

## Epic 4: Partner Operations & Scale

*Partners can upload NCERT content, manage their private namespaces, and map curriculum to the Skill Graph.*

### Story 4.1: Partner Namespace & Tenant Management
As a Partner Admin,  
I want to manage my own 'School Workspace' and roster,  
So that I can isolate my students and curriculum within a private namespace.

**Acceptance Criteria:**
**Given** an authenticated Partner account  
**When** I access the 'Workspace Management' view  
**Then** I can define metadata for my 'School/Tenant'  
**And** I see a filterable roster of students belonging exclusively to my namespace.

### Story 4.2: AI-Assisted Content Ingestion (PDF to Skill)
As a Content Curator,  
I want to upload NCERT/State Board PDFs and have the system extract topics,  
So that I can rapidly onboard new textbooks into the GenEd Skill Graph.

**Acceptance Criteria:**
**Given** a PDF document for ingestion  
**When** I upload it via the Partner Dashboard  
**Then** the (mocked) extraction service returns a list of semantic learning objectives  
**And** the UI displays these objectives as 'Unmapped Items' ready for review.

### Story 4.3: Skill Graph Mapping & "Pinning" Interface
As a Content Curator,  
I want to 'pin' extracted topics to the Universal Skill Graph nodes,  
So that I can ensure the Socratic agents have the correct context for every concept.

**Acceptance Criteria:**
**Given** a list of unmapped learning objectives  
**When** I use the dual-pane 'Mapping' interface  
**Then** I can drag an objective to a specific node in the 6th Grade Math Skill Graph (for example)  
**And** the 'pinned' status is saved to the `core` service.

### Story 4.4: Content Efficacy Reports (The Loop)
As a Partner,  
I want to see 'Mastery Conversion' analytics for my modules,  
So that I can optimize my curriculum based on actual student performance.

**Acceptance Criteria:**
**Given** student interaction data exists in my namespace  
**When** I load the 'Content Performance' report  
**Then** I see modules ranked by 'Success in Closing Gaps'  
**And** a visualization shows the before/after 'Swiss Cheese' density for students using my content.

## Epic 5: Adaptive Intelligence & Showcase Mocking

*Enables the 'Investor Demo' mode where behavioral struggle and mastery events are simulated by the mock engine.*

### Story 5.1: Behavioral "Struggle" Detection (Mock Logic)
As the Socratic Engine,  
I want to identify frustration patterns based on student interaction timings and error counts,  
So that I can trigger an 'Intervention Alert' for parents or a 'Socratic Nudge.'

**Acceptance Criteria:**
**Given** a sequence of student responses  
**When** 3+ incorrect conceptual links are made within 2 minutes of the same prompt  
**Then** the engine identifies a 'Struggle' state  
**And** the `memory` service tags the interaction as `Interaction_Type: Struggle`.

### Story 5.2: Dynamic ZPD Calibration Engine (Showcase Simulator)
As the Socratic Engine,  
I want to adjust the complexity of the next prompt based on the student's mastery level,  
So that I can demonstrate the 'Self-Adaptive' nature of the platform to investors.

**Acceptance Criteria:**
**Given** the completion of a concept node  
**When** the next prompt is requested  
**Then** the `difficulty_score` of the prompt is adjusted (+/- 10%) based on the `Confidence` rating of the previous node  
**And** the UI reflects the change in the 'Zone of Proximal Development' tracker.

### Story 5.3: Hint Escalation & Socratic Nudge Workflow
As Arjun (Student),  
I want to receive a 'Nudge' when the system detects I'm stuck,  
So that I can continue my conceptual discovery without being given the direct answer.

**Acceptance Criteria:**
**Given** the engine has identified a 'Struggle' state (from Story 5.1)  
**When** the next prompt is delivered  
**Then** a 'Socratic Nudge' (conceptual hint) is appended to the message  
**And** the hint is prioritized to be pedagogical rather than answer-revealing.

### Story 5.4: Investor Showcase Scenario Registry (The 'Director's Panel')
As a Founder,  
I want to force specific 'Mastery' or 'Struggle' scenarios via a hidden config,  
So that I can perform a consistently impressive and focused demo for investors.

**Acceptance Criteria:**
**Given** the application is in `SHOWCASE_MODE=true`  
**When** I use the 'Director's Panel' or a specific header to set a scenario (e.g., 'Force_Mastery')  
**Then** all subsequent Socratic responses are forced to be 'Success' validations  
**And** the UI state reflects a rapid closing of 'Swiss Cheese' gaps.
