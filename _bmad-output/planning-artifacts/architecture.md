---
stepsCompleted: ['step-01-init', 'step-02-context', 'step-03-starter', 'step-04-decisions', 'step-05-patterns', 'step-06-structure', 'step-07-validation']
inputDocuments: ['prd.md', 'Existing RAG/Speech/Memory Context']
workflowType: 'architecture'
project_name: 'GenEd Portal'
user_name: 'Amantya'
date: '2026-03-23'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Documents Discovered

- **PRD**: [prd.md](file:///Users/amantya/Documents/GenEdUIProject/_bmad-output/planning-artifacts/prd.md) (Loaded)

## Project Context Analysis

### Microservice Architecture (Distributed System)
The GenEd Portal is structured as 4 independent services communicating via **FastAPI** (REST/WebSockets):

#### 1. Auth Service (Existing)
- **Identity IAM**: Handles JWT-based sessions, password management, and OAuth.
- **Role Authority**: Maps `user_id` to roles (`Student`, `Parent`, `Partner`, `Admin`).
- **Namespace Guard**: Manages `partner_id` headers to keep multitenant data isolated.

#### 2. RAG Service (Existing)
- **Content Retrieval**: Vector-search across ingested NCERT textbooks.
- **Source Citing**: Returns exact text chunks to the `Core` service for distillation.
- **Tech Stack**: Vector Database (Pinecone/Chroma) + Chunking Pipeline.

#### 3. Memory Service (Existing)
- **Interaction Ledger**: Stores raw transcripts and voice metadata.
- **Mastery analysis**: Background Celery worker using LLM-in-the-loop to "tag" logs.
- **Schema**: PostgreSQL JSONB for flexible pedagogical indicators.

#### 4. Core Service (New - The Orchestrator)
- **The Brain**: Orchestrates calls to `RAG` and `Memory` to formulate Socratic provocations.
- **Skill Graph**: PostgreSQL-based adjacency list for NCERT skill hierarchies.
- **Mapping Provider**: Exposes the Skill Graph hierarchy for content ingestion.
- **Scheduler**: Logic for time-based session unlocking for younger students.

### Content Ingestion Pipeline (AI-Assisted Mapping)
The system eliminates manual mapping drudgery by automating the link between "Raw Content" and "Skill Nodes."

1. **Extraction (RAG Service)**: When a Partner uploads a PDF/textbook, the RAG Service extracts semantic topics, learning objectives, and keywords using LLM-assisted parsing.
2. **Context Retrieval (Core Service)**: The RAG Service calls the Core Service to get the relevant branch of the **Skill Graph** (e.g., "6th Grade Math").
3. **AI Mapping (RAG Service / shared Worker)**: A specialized LLM chain compares the extracted Topics with the Skill Nodes and generates a **Confidence-Sorted Suggestion List**.
4. **Human-in-the-Loop (Partner/Admin Dashboard)**: The Administrator reviews the AI suggestions and "pins" the correct mapping, which is then stored in the **Core Service** database.

### Frontend Architecture (React.js + Next.js)
To deliver a premium, multi-persona experience, the frontend will be a **Next.js 15 (App Router)** application following the **Atomic Design** principle.

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | **Next.js** | Native SSR for fast initial loads and App Router for role-based layouts. |
| **State** | **Zustand** | Lightweight, fast, and async-friendly for tracking 'In-Session' ZPD state. |
| **Data Fetch** | **TanStack Query** | Automated caching and revalidation across the 4 microservices. |
| **Styling** | **Vanilla CSS** | Maximum flexibility and design control (using CSS Modules). |
| **Real-time** | **Native WebSockets** | Low-latency connection to the Socratic Orchestrator. |

#### Multi-Persona Layout Strategy
- **`app/(student)/`**: Playful, voice-centric layouts with high-contrast visual feedback.
- **`app/(parent)/`**: Information-dense dashboards with "Knowledge X-Ray" (D3/Recharts).
- **`app/(partner)/`**: Multi-tenant administration and content mapping management.
- **`app/(admin)/`**: Platform-wide monitoring and curriculum (Skill Graph) versioning.

- **Component Strategy**: Atomic Design (Atoms, Molecules, Organisms) to ensure the 'Mastery Bar' and 'Skill Chip' are consistent across all views.

### Requirements Overview

**Functional Requirements:**
- **Socratic Mastery Engine [MVP]**: Now serves as the **Orchestrator** between the RAG engine and the Memory Layer. It must transform raw RAG retrievals into Socratic provocations.
- **Multi-Persona Dashboards [MVP]**: Requires integration with the Memory Layer to visualize "past interactions" as learning outcomes.
- **Parental Controls [MVP]**: The "Learning Scheduler" must interface with the Socratic Orchestrator to set session goals.

**Non-Functional Requirements:**
- **Latency [Phase 2]**: Must account for the end-to-end RAG + Speech-to-Speech pipeline latency.
- **Security [Phase 2 Core]**: Ensuring existing Memory data is scoped to namespaces via RLS.

**Scale & Complexity:**
- High complexity: Integrating a structured Skill Graph with an unstructured RAG system.
- The Socratic Engine must "guide" the RAG results to ensure they aren't direct answers.

- **Primary domain**: EdTech (Adaptive Learning & LLM Orchestration)
- **Complexity level**: High
- **Estimated architectural components**: 8 (RAG, Memory, Socratic Engine, Speech, API, Auth, Ingest, Scheduler)

### API & Communication Patterns
To ensure low-latency Socratic interactions and robust inter-service coordination, we will follow these communication patterns:

| Pattern | Protocol | Use Case |
| :--- | :--- | :--- |
| **Sync REST** | FastAPI / HTTP | Core orchestrating RAG queries and Auth validation. |
| **Real-time** | WebSockets | Streaming Socratic provocations and Parent Scheduler state sync. |
| **Async Task** | Celery / Redis | Background "Mastery Tagging" and behavioral analysis. |
| **Documentation** | OpenAPI | Swagger-generated interactive documentation for all 4 services. |

- **Standards**: All services use **Pydantic V2** for request/response validation.
- **Inter-service Auth**: Every service-to-service call propagates the user's JWT in the `Authorization` header.

### Data Strategy: Mastery Tagging Schema
To eliminate the "Swiss Cheese effect," we will implement a background **Late-Binding Tagging** pipeline that transforms raw interaction logs into pedagogical indicators:

| Tag Field | Description | Architectural Use |
| :--- | :--- | :--- |
| **Concept_ID** | UID of the Skill Graph node being discussed. | Cross-mapping RAG to Curriculum. |
| **Confidence** | 0.0 to 1.0 (Student's grasp of the concept). | Drives "Knowledge X-Ray" UI. |
| **Interaction_Type** | `Struggle`, `Mastery`, `Confusion`, `Boredom`. | High-level behavioral analytics. |
| **ZPD_Delta** | Shift in complexity for the next provocation. | Recalibrates the Socratic Orchestrator. |

- **Storage**: Tags are stored in a `jsonb` column within the `student_memories` table for high-performance indexing and flexible schema evolution.

## Architecture Validation Results

### Coherence Validation ✅
- **Decision Compatibility**: PostgreSQL 18.3, FastAPI 0.135, and Next.js 16.2 are fully compatible.
- **Pattern Consistency**: Uniform use of Pydantic V2 and REST/WebSockets ensures cross-service data integrity.
- **Structure Alignment**: The mono-repo layout with a shared `shared/` directory prevents schema drift.

### Requirements Coverage Validation ✅
- **Functional Requirements**: All MVP FRs (Socratic Engine, Dashboards, Scheduler) are mapped to services.
- **Non-Functional Requirements**: Multi-tenancy is enforced at the DB level (RLS) and API level (JWT). Performance is managed via WebSockets and Celery async workers.

### Implementation Readiness Validation ✅
- **Decision Completeness**: All critical versions and patterns are documented.
- **Structure Completeness**: The project tree defines clear boundaries for AI implementation.

### Architecture Completeness Checklist
- [x] Project context thoroughly analyzed
- [x] Technology stack fully specified (Pg 18.3, Next 16, Python 3.12)
- [x] Integration patterns defined (REST/WebSockets/Celery)
- [x] Complete directory structure mapped to PRD requirements
- [x] Security (RLS + JWT) and Multi-tenancy addressed

### Architecture Readiness Assessment
**Overall Status: READY FOR IMPLEMENTATION**
**Confidence Level: HIGH**

**Key Strengths**:
- **Security First**: RLS provides a bulletproof foundation for Partner data isolation.
- **Distributed Intelligence**: Separation of Socratic logic (Core) from content (RAG) allows for pedagogical evolution without re-indexing.

**First Implementation Priority**:
Initialize the mono-repo structure and baseline the `Auth` and `Core` services with Docker Compose.

## Project Structure & Boundaries

### Complete Project Directory Structure
```
gened-portal/
├── apps/
│   └── web/                # React.js (Next.js) Frontend
│       ├── src/
│       │   ├── app/         # Persona-based layouts (student, parent, partner)
│       │   ├── components/  # Atomic Design (Atoms, Molecules, Organisms)
│       │   ├── hooks/       # Custom React hooks (useSocratic, useMastery)
│       │   └── store/       # Zustand State Management
│       └── public/          # Assets (icons, playful imagery)
├── services/
│   ├── core/               # Socratic Orchestrator & Skill Graph
│   │   ├── app/             # FastAPI App
│   │   ├── db/              # Postgres Migrations (Alembic)
│   │   └── tests/
│   ├── auth/               # IAM & Multitenant Gateway
│   ├── rag/                # Content Retrieval (NCERT Vector Store)
│   └── memory/             # Interaction Ledger & Mastery Tagging (Celery)
├── shared/                 # Shared Pydantic Schemas & Constants
├── .github/workflows/      # CI/CD (GitHub Actions)
├── docker-compose.yml      # Local Multi-service Orchestration
└── Makefile                # Unified dev commands (make dev, make test)
```

### Requirements to Structure Mapping
- **Socratic Mastery Engine [MVP]** → `services/core` (Orchestrator).
- **NCERT Content [MVP]** → `services/rag` (retrieval).
- **Mastery Dashboards [MVP]** → `apps/web` (UI) + `services/memory` (data).
- **Parent Scheduler [MVP]** → `services/core` (logic) + `apps/web` (controls).
- **Multitenancy [MVP]** → `services/auth` (IAM) + PostgreSQL RLS.

### Infrastructure & Deployment
The GenEd platform uses a container-first strategy to ensure environmental parity across development, staging, and production.

| Component | Strategy | Technology |
| :--- | :--- | :--- |
| **Containerization** | Multi-stage Docker builds | Docker / Docker Compose |
| **Orchestration** | Managed Containers | AWS ECS (Fargate) or Railway.app |
| **CI/CD** | Automated Pipeline | GitHub Actions |
| **Frontend Hosting** | Edge-optimized SSR | Vercel or AWS Amplify |
| **Observability** | Centralized Logging | Sentry (Errors) + Grafana (Metrics) |

- **Environment Management**: Mandatory use of **Pydantic Settings** for `.env` validation to prevent service startup with missing secrets.
- **Registry**: **GitHub Container Registry (GHCR)** for service image versioning.
- **Blue/Green Deployment**: Zero-downtime updates for the `Core` and `RAG` services to maintain active student sessions.
