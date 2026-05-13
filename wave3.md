# Wave 3 — Persistence & State Machine Contracts

## Scope

Wave 3 defines:

* database schemas
* persistence rules
* frontend runtime state machines
* upload/storage lifecycle
* retention/deletion rules
* caching behavior
* longitudinal memory contracts

Wave 3 assumes:

* Wave 1 contracts are frozen
* Wave 2 APIs and schemas are frozen
* `blueprint.md` DB schema is canonical

This wave locks:

* durable state ownership
* runtime lifecycle behavior
* storage guarantees
* retention boundaries
* cache semantics
* memory persistence semantics

---

# 1. `english_skill_sessions` Schema Contract

## 1.1 Purpose

Canonical persistence table for:

* English skill interactions
* reading/listening sessions
* conversational skill events
* comprehension interactions
* oral reading analyses

---

## 1.2 Schema

```sql
CREATE TABLE english_skill_sessions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_session_id         UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    student_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id                VARCHAR(30) REFERENCES skills_table(skill_id),
    directive_id            UUID NOT NULL,
    mode                    VARCHAR(30) NOT NULL,
    source_text             TEXT NOT NULL,
    student_audio_gcs_uri   VARCHAR,
    tts_audio_gcs_uri       VARCHAR,
    student_transcript      TEXT,
    audio_duration_sec      FLOAT,
    wer                     FLOAT,
    substitutions           INT,
    insertions              INT,
    deletions               INT,
    words_per_minute        FLOAT,
    accuracy_score          FLOAT,
    fluency_score           FLOAT,
    expression_score        FLOAT,
    comprehension_score     FLOAT,
    overall_score           FLOAT,
    sub_mode                VARCHAR(30),
    interaction_type        VARCHAR(20),  -- 'mcq' | 'fill_blank' | 'free_form' | 'spoken'
    student_response        TEXT,         -- typed or transcribed answer
    correct_answer          TEXT,
    is_correct              BOOLEAN,
    gemini_analysis         JSONB,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ess_chat_session ON english_skill_sessions(chat_session_id);
CREATE INDEX idx_ess_student ON english_skill_sessions(student_id);
CREATE INDEX idx_ess_skill ON english_skill_sessions(skill_id);
CREATE INDEX idx_ess_mode ON english_skill_sessions(mode);
```

---

## 1.3 SQLAlchemy Mapping Notes

Aligned to existing ORM conventions:

* `id`, `chat_session_id`, `student_id`, `directive_id` → `Uuid` type
* `skill_id` → `String(30)`, FK to `skills_table.skill_id`
* `mode` → `String(30)`
* Scores (`wer`, `fluency_score`, etc.) → `Float` or `Numeric`
* `gemini_analysis` → `JSONB`
* `created_at` → `DateTime(timezone=True), server_default=func.now()`
* All foreign keys use `ondelete="CASCADE"`

---

## 1.4 Ownership Rules

Backend owns:

* inserts
* updates
* scoring persistence
* directive mapping

Frontend owns NOTHING in persistence layer.

---

## 1.5 Non-Persisted Data

The following must NOT be permanently persisted:

* raw audio
* AudioContext state
* frontend playback position
* intermediate STT artifacts

---

# 2. `directive_id` Persistence Strategy

## 2.1 Purpose

Every interactive skill directive receives:

```text
directive_id
```

This becomes the canonical correlation key across:

* SSE events
* playback
* uploads
* oral analysis
* comprehension interactions
* memory

---

## 2.2 Lifecycle

```text
teaching_node emits directive
→ interceptor persists directive row
→ directive_id attached everywhere
→ frontend references directive_id only
```

---

## 2.3 Guarantees

`directive_id` must be:

* globally unique
* immutable
* stable for session lifetime

---

# 3. Session Persistence Granularity

## 3.1 Persisted Events

Persist ONLY pedagogically meaningful interactions.

Examples:

* oral reading analysis
* comprehension answer
* difficult-word struggle
* replay preference trends
* pacing preference

---

## 3.2 Non-Persisted Events

Do NOT persist:

* every playback click
* every pause event
* buffering telemetry
* AudioContext state
* temporary frontend state

These belong in telemetry, not relational persistence.

---

# 4. Canonical Audio State Machine

## 4.1 Purpose

Frontend playback behavior must follow a single deterministic runtime state machine.

No ad-hoc playback state allowed.

---

## 4.2 Audio State Machine

```typescript
type AudioState =
  | 'idle'
  | 'loading'
  | 'buffering'
  | 'playing'
  | 'paused'
  | 'stopped'
  | 'completed'
  | 'error';
```

---

## 4.3 State Transition Rules

| Current   | Allowed Next                         |
| --------- | ------------------------------------ |
| idle      | loading                              |
| loading   | buffering / playing / error          |
| buffering | playing / error                      |
| playing   | paused / stopped / completed / error |
| paused    | playing / stopped                    |
| stopped   | idle                                 |
| completed | idle                                 |
| error     | idle                                 |

---

## 4.4 Illegal States

Frontend must NEVER allow:

* multiple simultaneous playing states
* playback + recording simultaneously
* dangling buffering state

---

# 5. Recording State Machine

## 5.1 Recording Runtime States

```typescript
type RecordingState =
  | 'idle'
  | 'permission_request'
  | 'ready'
  | 'recording'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'error';
```

---

## 5.2 Recording Rules

Recording may only start after:

* explicit `recording_open` event
* mic permission granted
* playback fully stopped

---

## 5.3 Upload Rules

Upload begins ONLY after:

* MediaRecorder finalized
* local blob completed

Frontend must never upload partial fragments.

---

# 6. Hardware Interrupt & Backgrounding State Machine

## 6.1 Purpose

Mobile browsers and low-end devices may interrupt:

* AudioContext
* MediaRecorder
* tab execution
* active playback

Frontend must recover gracefully.

---

## 6.2 Interrupt Sources

Supported interrupt handling:

* tab backgrounding
* app minimization
* Bluetooth disconnect
* output device change
* incoming phone call
* Chromebook sleep/wake

---

## 6.3 Required Frontend Behavior

Frontend must:

* safely stop recording
* safely stop playback
* emit conversation-action if required
* preserve directive_id
* avoid corrupted runtime state

---

## 6.4 Recovery Rules

Frontend recovery must:

* reset invalid AudioContext states
* clear dangling MediaRecorder state
* allow clean retry
* avoid infinite buffering loops

---

# 7. GCS Signed Upload Flow Contract

## 7.1 Upload Philosophy

Frontend uploads directly to GCS.

Backend never proxies audio blobs.

---

## 7.2 Upload Flow

```text
Frontend requests signed upload URL
→ backend validates session
→ backend returns signed URL + upload metadata
→ frontend PUTs audio directly to GCS
→ frontend POSTs gcs_uri to /oral-result
```

---

## 7.3 Backend Responsibilities

Backend owns:

* signed URL generation
* upload validation rules
* object naming
* retention policies

---

## 7.4 Frontend Responsibilities

Frontend owns:

* upload execution
* retry UI
* upload progress
* upload cancellation

---

# 8. GCS Object Naming Strategy

## 8.1 Canonical Object Path

```text
english-skills/
  {student_id}/
    {chat_session_id}/
      {directive_id}_{timestamp}.webm
```

---

## 8.2 Naming Rules

Object names must:

* be immutable
* contain no PII
* be collision-safe
* support lifecycle cleanup

---

# 9. GCS Retention Policy

## 9.1 Audio Persistence Philosophy

Student audio is temporary operational data.

It is NOT permanent educational archival data.

---

## 9.2 Retention Rules

Raw audio retention:

```text
Maximum: 30 days
```

Recommended default:

```text
7 days
```

---

## 9.3 Deletion Rules

Deletion must be:

* automated
* irreversible
* lifecycle-policy enforced

---

# 10. DPDP-Aligned Audio Deletion & Retention Policy

## 10.1 Principle

Retention must comply with:

* data minimization
* purpose limitation
* minor-sensitive handling

under:

```text
India DPDP Act 2023
```

---

## 10.2 Operational Rules

Backend must:

* avoid indefinite raw audio retention
* avoid transcript over-retention
* support deletion workflows
* avoid public audio exposure

---

## 10.3 Transcript Retention

Transcripts are:

* operational educational data
* NOT permanent identity records

Future cleanup/archive policy required.

---

# 11. TTS Caching Strategy

## 11.1 Cache Philosophy

TTS generation is expensive.

Replay requests should hit cache whenever possible.

---

## 11.2 Cache Key

```text
hash(text + voice + speed)
```

---

## 11.3 Cache Scope

Cache:

* paragraph playback
* difficult-word playback
* repeated chapter narration

Do NOT cache:

* personalized oral analyses

---

# 12. Difficult-Word Audio Cache Strategy

## 12.1 Cache Key

```text
hash(word + grade + speed)
```

---

## 12.2 Cache Constraints

Cache must:

* support replay
* support slow pronunciation
* remain low latency

---

# 13. Longitudinal Memory Fields

## 13.1 Purpose

Aanya adapts behavior over time using lightweight memory persistence.

---

## 13.2 Allowed Memory Fields

```typescript
interface EnglishSkillMemory {
  preferred_unit_size?: 'word' | 'sentence' | 'paragraph';
  replay_frequency?: number;
  preferred_speed?: 'slow' | 'normal';
  difficult_words?: string[];
  oral_reading_confidence?: 'low' | 'medium' | 'high';
}
```

---

## 13.3 Forbidden Memory

Do NOT persist:

* raw audio
* emotional inference
* biometric voice embeddings
* background household audio

---

## 13.4 Memory Ownership

Backend owns:

* memory persistence
* adaptation logic
* retrieval

Frontend only consumes behavior.

---

# Wave 3 Exit Criteria

Wave 3 is considered locked only when:

* persistence schema frozen
* state machines frozen
* upload lifecycle frozen
* retention policies frozen
* cache semantics frozen
* longitudinal memory fields frozen
* hardware interrupt recovery behavior frozen
* no unresolved FE/BE lifecycle ambiguity remains