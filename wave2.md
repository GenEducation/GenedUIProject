 # Wave 2 — State & Intelligence API Contracts

## Scope

Wave 2 defines:

* interaction APIs
* conversational action semantics
* STT ownership
* synchronization contracts
* highlighting behavior
* widget rendering schemas
* audio format guarantees

Wave 2 assumes Wave 1 contracts are already frozen.

This wave locks:

* frontend/backend behavioral APIs
* evaluation ownership
* interaction rendering semantics
* synchronization guarantees
* audio interoperability

---

# 1. `/conversation-action` Contract

## 1.1 Endpoint

```http
POST /session/{id}/conversation-action
```

---

## 1.2 Purpose

Frontend-originated conversational state events.

This endpoint exists to communicate:

* playback lifecycle events
* interaction lifecycle events
* silence detection
* pacing requests
* conversational control signals

This endpoint does NOT:

* inject arbitrary prompts
* override orchestration
* execute LLM instructions

---

## 1.3 Allowed Conversation Actions

```typescript
type ConversationAction =
  | 'playback_complete'
  | 'silence_detected'
  | 'repeat_requested'
  | 'slower_requested'
  | 'interaction_skipped';
```

No additional values allowed without schema update.

---

## 1.4 Request Contract

```json
{
  "type": "repeat_requested",
  "directive_id": "uuid",
  "timestamp": "2026-05-12T17:00:00Z"
}
```

---

## 1.5 Backend Behavior

Backend:

* validates directive ownership
* validates action enum
* appends conversational state
* optionally routes event into orchestration memory

Backend must NOT:

* directly mutate frontend state
* inject playback behavior
* block SSE stream

---

## 1.6 Failure Handling

| Failure              | Backend Response |
| -------------------- | ---------------- |
| invalid enum         | 400              |
| missing directive    | 404              |
| unauthorized session | 403              |
| malformed payload    | 400              |

---

# 2. `/oral-result` Contract

## 2.1 Endpoint

```http
POST /session/{id}/oral-result
```

---

## 2.2 Ownership Rules

Frontend NEVER sends:

* transcript
* source_text
* WER inputs
* fluency metrics

Frontend ONLY sends:

* directive_id
* uploaded audio reference

Backend owns:

* STT
* transcript generation
* canonical source lookup
* WER computation
* scoring
* analysis generation

---

## 2.3 Request Contract

```json
{
  "directive_id": "uuid",
  "gcs_uri": "gs://bucket/audio.webm"
}
```

---

## 2.4 Backend Flow

1. Validate session ownership
2. Lookup canonical source_text using directive_id
3. Pull audio from GCS
4. Run STT (`en-IN`)
5. Compute WER using jiwer
6. Compute pacing/fluency metrics
7. Return OralReadingAnalysis

---

## 2.5 OralReadingAnalysis Schema

```json
{
  "directive_id": "uuid",
  "wer": 0.18,
  "pace_wpm": 92,
  "fluency": "good",
  "feedback": "That was good. Let's try one word together.",
  "difficult_words": [
    "environment"
  ]
}
```

---

## 2.6 Backend Constraints

Backend must NEVER:

* persist raw audio permanently
* expose transcript to frontend state unnecessarily
* log transcripts in structured logs

---

# 3. `/comprehension-answer` Contract

## 3.1 Endpoint

```http
POST /session/{id}/comprehension-answer
```

---

## 3.2 Purpose

Stores lightweight listening comprehension responses.

Supported interaction types:

* MCQ
* fill-in-blank
* short free-form
* retell

---

## 3.3 Request Contract

```json
{
  "directive_id": "uuid",
  "interaction_type": "mcq",
  "answer": "Ran"
}
```

---

## 3.4 Backend Behavior

Backend:

* validates interaction type
* validates ownership
* stores answer
* computes correctness if structured
* emits skill_result event if required

---

## 3.5 Failure Rules

| Failure                 | Response |
| ----------------------- | -------- |
| invalid answer schema   | 400      |
| directive missing       | 404      |
| unsupported interaction | 400      |

---

# 4. Frontend-Triggered Conversational Event Rules

## 4.1 Purpose

Frontend conversational events exist ONLY to communicate:

* pacing
* interruptions
* completion
* conversational intent

They are NOT generic orchestration overrides.

---

## 4.2 Allowed Triggers

| Action              | Trigger                        |
| ------------------- | ------------------------------ |
| playback_complete   | audio ends naturally           |
| silence_detected    | prolonged recording inactivity |
| repeat_requested    | replay button pressed          |
| slower_requested    | slower playback selected       |
| interaction_skipped | user dismisses interaction     |

---

## 4.3 Forbidden Behavior

Frontend must NEVER send:

* arbitrary prompts
* free-form orchestration instructions
* hidden LLM directives

---

# 5. Canonical Source Text Ownership

## 5.1 Backend Is Canonical Source Owner

Canonical student reading text exists ONLY on backend.

Frontend must never:

* generate canonical source text
* modify source text
* submit source text during scoring

---

## 5.2 directive_id Rule

Every reading interaction references:

```text
directive_id
```

Backend resolves:

```text
directive_id → source_text
```

This prevents:

* transcript spoofing
* frontend drift
* scoring inconsistency

---

# 6. TTS Timepoints Schema Contract

## 6.1 Purpose

Timepoints synchronize:

* highlighting
* karaoke guidance
* reading progression

---

## 6.2 Schema

```json
{
  "timepoints": [
    {
      "word": "The",
      "time_seconds": 0.0
    },
    {
      "word": "boy",
      "time_seconds": 0.42
    }
  ]
}
```

---

## 6.3 Backend Guarantees

Backend guarantees:

* monotonically increasing timestamps
* word order correctness
* stable ordering

Backend does NOT guarantee:

* millisecond-perfect synchronization
* phoneme alignment

---

# 7. Highlight Synchronization Contract

## 7.1 Frontend Synchronization Source

Frontend synchronization source:

```typescript
AudioContext.currentTime
```

NOT:

* setInterval timers
* SSE timing
* wall clock time

---

## 7.2 Synchronization Rule

Frontend highlight walks:

```text
timepoints[]
```

against playback progression.

---

## 7.3 Drift Handling

Frontend may tolerate:

```text
±150ms
```

before marking playback desync.

---

# 8. Highlight Granularity Rules

## 8.1 MVP Granularity

Default highlight granularity:

* phrase-level
* sentence-level

NOT:

* per-character
* animated karaoke bouncing

---

## 8.2 Word-Level Highlighting

Allowed ONLY for:

* beginner karaoke
* pronunciation focus

Must remain optional.

---

## 8.3 UX Constraints

Highlighting must:

* reduce cognitive load
* avoid rapid flashing
* remain readable

---

# 9. Audio Format Contract

## 9.1 Upload Format

Frontend upload requirements:

| Property              | Value |
| --------------------- | ----- |
| Container             | WebM  |
| Codec                 | Opus  |
| Channels              | Mono  |
| Preferred Sample Rate | 48kHz |

---

## 9.2 TTS Response Format

Backend TTS response:

```http
audio/mpeg
```

---

## 9.3 Fallback Support

Safari fallback allowed:

* audio/ogg

---

## 9.4 Unsupported Formats

Backend rejects:

* stereo uploads
* WAV uploads larger than limits
* unsupported codecs

---

# 10. Inline Interactive Widget Render Schema

## 10.1 Purpose

Defines frontend rendering schema for:

* MCQ widgets
* fill-in-blank
* lightweight comprehension interactions

---

## 10.2 Widget Philosophy

Widgets are:

* inline conversational interactions
* lightweight
* embedded in chat flow

Widgets are NOT:

* quiz screens
* full-page modals
* exam UI

---

## 10.3 Widget Schema

```json
{
  "directive_id": "uuid",
  "widget_type": "mcq",
  "question": "What did the boy do?",
  "options": [
    {
      "id": "a",
      "label": "Ran"
    },
    {
      "id": "b",
      "label": "Slept"
    }
  ],
  "allow_retry": true
}
```

---

## 10.4 Supported Widget Types

```typescript
type WidgetType =
  | 'mcq'
  | 'fill_blank'
  | 'retell'
  | 'free_response';
```

---

## 10.5 Frontend Constraints

Frontend must:

* render inline only
* preserve conversational flow
* support mobile rendering
* avoid full-screen interruptions

---

## 10.6 Retry Semantics

Retry messaging must NEVER say:

* "Incorrect"
* "Wrong"

Preferred:

* "Want to try once more?"
* "Let's hear it again."

---

# Wave 2 Exit Criteria

Wave 2 is considered locked only when:

* interaction endpoint schemas frozen
* conversation-action semantics frozen
* STT ownership frozen
* source_text ownership frozen
* highlighting model frozen
* widget schemas frozen
* audio format guarantees frozen
* frontend/backend evaluation ownership frozen
* no unresolved interaction ambiguity remains