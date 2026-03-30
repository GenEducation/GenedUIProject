---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish']
inputDocuments: []
workflowType: 'prd'
classification:
  projectType: 'Web App & API Backend'
  domain: 'EdTech'
  complexity: 'High'
  projectContext: 'Greenfield'
---

# Product Requirements Document - GenEdUIProject

**Author:** SanjayAI
**Date:** 2026-03-22

## Executive Summary

GenEd is a personalized, adaptive learning platform designed to eliminate the **"Swiss Cheese Effect"**—the compounding foundational gaps that occur in fixed-pace classrooms. By utilizing a central **Socratic Mastery Engine**, GenEd ensures that students achieve true mastery of each concept before progressing, rather than just completing homework. The system supports four distinct user roles: Students (Younger/Elder), Parents, School/Partners, and GenEd Administrators, creating a unified ecosystem for learning and intervention.

### What Makes This Special

- **Socratic AI Tutor**: A pedological-first assistant that provokes thinking through guided prompts rather than giving direct answers. It operates within the student's Zone of Proximal Development (ZPD) to build confidence and persistence.
- **Central Mastery Brain**: A universal orchestration layer that normalizes content from NCERT, State Boards, and private partners into a single, high-resolution skill graph.
- **Diagnostic Intervention**: Provides teachers and parents with a "Knowledge X-Ray"—real-time insights into specific learning holes, enabling targeted human intervention.
- **Parent-Driven Governance**: Empowers parents to choose between standard GenEd curriculum or school-recommended tracks, all while maintaining consistent mastery tracking.

## Project Classification

- **Project Type**: Web App & API Backend (Multi-tenant Platform)
- **Domain**: EdTech (Adaptive Learning & Mastery-Based)
- **Complexity**: High (Dynamic ZPD calibration, cross-curriculum mapping)
- **Project Context**: Greenfield

## Success Criteria

### User Success

- **Student**: Moves from "missed concept" to "mastered" as evidenced by solving the AI's Socratic provocations without system intervention.
- **Parent**: Receives actionable insights into the *why* behind their child's learning struggle and successfully uses the **Scheduler** to guide study sessions.
- **Teacher**: Receives "Knowledge X-Rays" that pinpoint persistent gaps, allowing for targeted 1-on-1 human intervention.

### Engagement Success
- **Scheduled Completion**: 80%+ of parent-scheduled study sessions are initiated by the student on the companion device.
- **Alert Responsiveness**: Parents acknowledge or act on "Struggle/Disengaged" alerts within 1 hour of notification.

### Business Success

- **Partner Adoption**: High conversion rate of content providers who can successfully demonstrate their existing SCORM content on the GenEd platform.
- **Outcome Improvement**: Verifiable reduction in "Swiss Cheese" holes over a 6-month period compared to baseline school assessments.

### Technical Success

- **Provocation Fidelity**: The AI Tutor successfully guides students to the answer without revealing it in 90%+ of interactions.
- **Interoperability**: Seamless "plug-and-play" support for standard SCORM 1.2 packages within the Central Mastery Brain.

## Product Scope

### MVP - Minimum Viable Product (Phase 1)

- **Central Mastery Engine**: Basic skill graph mapping for NCERT/State Boards (Manual/AI-assisted).
- **Socratic AI Tutor**: Basic provocation engine for key subjects (text/voice).
- **Mastery Dashboards**: Visualizing learning outcomes for Students (Elder), Parents, and Schools.
- **Parental Control**: **Learning Scheduler** for younger children on companion devices.
- **Content Support**: PDF ingestion and curriculum mapping.
- **Companion Device Support**: Basic visual/voice feedback (Smile/Frown/Socratic prompts).

### Growth Features (Phase 2)
- **Swiss Cheese Detection**: Automated identification of conceptual holes using behavioral markers (FR1).
- **SCORM Support**: Provision for Partners to upload **SCORM 1.2** packages (FR8).
- **Intervention Alerts**: Real-time notifications for "Struggle," "Disengaged," or "Absent" behaviors (FR16, FR19).
- **Advanced Reports**: "Content Efficacy" reports and detailed pedagogical analytics (FR17).
- **Non-Functional Targets**: Implementation of strict performance latencies, system uptime guarantees, and formal scalability targets.
- **Advanced Behavioral Analysis**: Predictive modeling of student frustration vs. productive struggle.
- **xAPI (Tin Can) Support**: For tracking learning events outside the browser.
- **Advanced Teacher Dashboard**: Full classroom-level diagnostic heatmaps and cohort analysis.
- **Offline Sync**: Knowledge synchronization for devices in low-connectivity zones.

### Vision (Phase 3)
- **Autonomous AI Tutoring**: AI tutors that match the pedagogical efficacy of top 1-on-1 human mentors.
- **Global Skill Marketplace**: A permissionless ecosystem for educators to map content to the GenEd Brain.

[... User Journeys and Risks remain unchanged ...]

## Functional Requirements

### Socratic Mastery Engine (The Brain)
- **FR1 [Phase 2]**: The System shall identify "Swiss Cheese" holes using behavioral markers (persistence, struggle points).
- **FR2 [MVP]**: The System shall formulate Socratic provocations that guide students without revealing answers.
- **FR3 [MVP]**: The System shall dynamically calibrate the Zone of Proximal Development (ZPD) for each student-session.
- **FR4 [MVP]**: The System shall trigger "Hint Escalation" when student frustration exceeds a predefined threshold.
- **FR5 [MVP]**: The System shall Maintain a "Digital Twin" progress profile for every student across devices.

### Curriculum & Content Management
- **FR6 [MVP]**: Administrators can upload and map NCERT/State Board PDFs to the Skill Graph.
- **FR7 [MVP]**: The System shall provide AI-assisted mapping suggestions during content ingestion.
- **FR8 [Phase 2]**: Partners can upload **SCORM 1.2** packages to their private, isolated namespace.
- **FR9 [MVP]**: The System shall version-control the Skill Graph to maintain historical progress during updates.

### Learning Experience (Student UI)
- **FR10 [MVP]**: Younger Students can receive voice-based pedagogical prompts from the companion device.
- **FR11 [MVP]**: Elder Students can switch seamlessly between **Voice and Text** interaction modes.
- **FR12 [MVP]**: The System shall provide multi-modal visual feedback (Smile/Frown/Thinker) on the companion device.

### Performance Insights & Mastery
- **FR13 [MVP]**: Elder Students can view a personalized dashboard showing verified learning outcomes and mastery status for specific subjects and topics.
- **FR14 [MVP]**: Parents and Schools can view "Learning Outcome" dashboards showing the mastery status of their enrolled/assigned students (Younger & Elder).
- **FR15 [MVP]**: The System shall provide a diagnostic "Knowledge X-Ray" detailing specific skills mastered vs. persistent gaps.
- **FR16 [Phase 2]**: Teachers and Parents can receive automated alerts for students requiring immediate 1-on-1 human intervention.
- **FR17 [Phase 2]**: Partners can view "Content Efficacy" reports for their private modules.

### Parent Control & Monitoring (Younger Kids)
- **FR18 [MVP]**: Parents can use a **"Learning Scheduler"** to assign specific subjects and topics to a younger student's companion device for designated time slots.
- **FR19 [Phase 2]**: The System shall generate real-time notifications for parents/schools if a student is:
    - **Struggling** (high frustration/lack of progress).
    - **Disengaged** (lack of attention/interaction detected via advanced behavioral analysis).
    - **Absent** (skipping a scheduled study session).

### Partner & Tenant Governance
- **FR20 [MVP]**: Partners can manage their private content libraries within a unique **Namespace**.
- **FR21 [MVP]**: The System shall ensure Partner content is only visible to their enrolled student sub-population.
- **FR22 [MVP]**: Partners can assign students to specific custom curriculum tracks.

## Non-Functional Requirements (Phase 2 & Beyond)

### Performance
- **NFR1 [Phase 2]**: AI text-based provocations shall return within **1.5 seconds** to maintain conversational flow.
- **NFR2 [Phase 2]**: Voice-to-voice interaction (STT -> Brain -> TTS) shall have a latency under **2.5 seconds**.
- **NFR3 [Phase 2]**: Parent and Admin dashboards should load core diagnostic mapping data within **2 seconds**.

### Security & Privacy
- **NFR4 [Phase 2 Core]**: All student PII must be encrypted at rest (AES-256) and in transit (TLS 1.3).
- **NFR5 [Phase 2]**: Strict database-level isolation using Row Level Security (RLS) to ensure Partner data is never leaked.
- **NFR6 [Phase 2]**: Secure authentication and consent mechanisms for all account activations for students under 18.

### Scalability & Reliability
- **NFR7 [Phase 2]**: The system must support **10,000+ simultaneous students** with no more than 20% degradation in latency.
- **NFR8 [Phase 2]**: 99.9% availability during peak learning hours (8:00 AM - 6:00 PM local time).
- **NFR9 [Phase 2]**: Student session state must be persisted every **30 seconds** to prevent progress loss.

### Accessibility
- **NFR10 [Phase 2]**: All web portals must adhere to **WCAG 2.1 Level AA**.
- **NFR11 [Phase 2]**: Specialized voice recognition optimization for diverse Indian accents.

