 # Wave 4 — Production & Reliability Contracts

## Scope

Wave 4 defines:

* failure handling behavior
* production reliability guarantees
* security boundaries
* observability contracts
* deployment controls
* rollout constraints
* integration validation flows

Wave 4 assumes:

* Wave 1 contracts are frozen
* Wave 2 contracts are frozen
* Wave 3 persistence/state contracts are frozen

This wave locks:

* operational safety
* monitoring semantics
* degradation behavior
* deployment guardrails
* telemetry ownership
* production debugging visibility

---

# 1. TTS Fallback Behavior

## 1.1 Failure Philosophy

TTS failure must degrade gracefully.

English learning flow must continue even if audio fails.

---

## 1.2 Supported Failure Types

| Failure                      | Expected Behavior                |
| ---------------------------- | -------------------------------- |
| TTS provider timeout         | fallback to text-only            |
| partial audio stream failure | stop playback + retry affordance |
| unsupported browser playback | disable playback controls        |
| AudioContext crash           | reset player state               |
| network buffering timeout    | fallback to retry UI             |

---

## 1.3 Frontend Rules

Frontend must:

* preserve visible text always
* avoid blank playback states
* expose retry affordance
* never freeze interaction UI

---

## 1.4 Backend Rules

Backend must:

* fail fast on provider timeout
* avoid infinite stream hangs
* emit skill_error if required

---

# 2. STT Failure Handling Behavior

## 2.1 Failure Philosophy

Student speaking flow must remain psychologically safe.

STT failures must NEVER feel like:

* punishment
* hard grading
* broken assessment flow

---

## 2.2 Supported Failure Types

| Failure              | Behavior             |
| -------------------- | -------------------- |
| upload failure       | allow retry          |
| STT provider timeout | soft retry messaging |
| unsupported audio    | graceful error       |
| empty transcript     | ask student to retry |
| noisy audio          | gentle assistance    |

---

## 2.3 Retry Messaging Constraints

Forbidden:

* "Incorrect"
* "Failed"
* "Bad recording"

Preferred:

* "Let's try once more."
* "I couldn't hear that clearly."

---

# 3. Slow-Network Buffering Behavior

## 3.1 Frontend Expectations

Frontend must support:

* progressive audio buffering
* playback stall recovery
* network interruption handling

---

## 3.2 Buffering Rules

Frontend may:

* pause playback
* resume playback
* show lightweight buffering state

Frontend must NOT:

* reset conversation automatically
* lose playback state silently

---

## 3.3 Backend Rules

Backend must:

* support HTTP streaming
* avoid buffering entire audio response before send
* close dead streams safely

---

# 4. Audio Upload Validation Rules

## 4.1 Backend Validation

Backend validates:

* MIME type
* upload ownership
* session ownership
* max upload size
* allowed codec/container

---

## 4.2 Allowed Upload Formats

| Container | Codec |
| --------- | ----- |
| WebM      | Opus  |
| OGG       | Opus  |

---

## 4.3 Forbidden Uploads

Reject:

* executable payloads
* oversized audio
* malformed containers
* unsupported codecs

---

# 5. Rate Limiting Policy

## 5.1 Rate-Limited Endpoints

| Endpoint             | Protection                 |
| -------------------- | -------------------------- |
| /audio/tts           | replay abuse protection    |
| /audio/word-tts      | rapid tap abuse protection |
| /oral-result         | upload abuse protection    |
| /conversation-action | spam protection            |

---

## 5.2 Design Philosophy

Rate limiting must:

* prevent abuse
* avoid punishing normal students
* remain invisible during healthy usage

---

## 5.3 Backend Rules

Backend must:

* use sliding-window limits
* log rate-limit hits
* avoid hard-locking legitimate users

---

# 6. JWT/Auth Expectations

## 6.1 Protected Endpoints

All English skill endpoints require:

```text
JWT authentication
```

---

## 6.2 Backend Validation

Backend validates:

* session ownership
* directive ownership
* upload ownership

---

## 6.3 Forbidden Access Patterns

Reject:

* cross-session access
* arbitrary directive access
* unsigned upload access

---

# 7. STT Provider Configuration

## 7.1 Initial Provider

Primary provider:

```text
Google Cloud Speech-to-Text
```

---

## 7.2 Required Configuration

| Setting               | Value          |
| --------------------- | -------------- |
| Language              | en-IN          |
| Model                 | default/latest |
| Word timestamps       | enabled        |
| Automatic punctuation | enabled        |

---

## 7.3 Provider Isolation

Frontend must NEVER know:

* provider implementation
* provider credentials
* provider-specific logic

---

# 8. WER Computation Pipeline

## 8.1 Canonical Pipeline

```text
source_text
↓
normalize text
↓
STT transcript
↓
normalize transcript
↓
jiwer
↓
OralReadingAnalysis
```

---

## 8.2 Normalization Rules

Normalization removes:

* punctuation noise
* casing differences
* repeated spaces

---

## 8.3 Forbidden Scoring Behavior

Backend must NOT:

* over-penalize hesitation
* over-penalize fillers
* present harsh numerical grading to children

---

# 9. Figure Retrieval Contract

## 9.1 Purpose

Supports:

* picture description mode
* vocabulary expansion
* chapter figure discussions

---

## 9.2 Retrieval Inputs

Retrieval may use:

* chapter_id
* figure_id
* nearby text chunk
* lesson metadata

---

## 9.3 Backend Guarantees

Backend guarantees:

* correct figure ownership
* chapter alignment
* safe asset delivery

---

# 10. Figure Asset Serving Strategy

## 10.1 Asset Delivery

Figures served via:

```text
signed CDN/GCS URLs
```

---

## 10.2 Constraints

Assets must:

* avoid public enumeration
* support caching
* support mobile rendering

---

# 11. Structured Logging Schema

## 11.1 Logging Philosophy

Logs exist for:

* debugging
* latency tracing
* production diagnosis

Logs are NOT learning records.

---

## 11.2 Required Structured Fields

```json
{
  "session_id": "uuid",
  "directive_id": "uuid",
  "event_type": "tts_start",
  "latency_ms": 1200
}
```

---

## 11.3 Forbidden Logging

Never log:

* raw audio
* transcripts
* full student responses
* authentication tokens

---

# 12. Metric & Event Naming Conventions

## 12.1 Metric Philosophy

Metrics must:

* support debugging
* support reliability analysis
* support rollout validation

---

## 12.2 Required Metrics

| Metric               | Purpose                |
| -------------------- | ---------------------- |
| tts_latency_ms       | TTS latency            |
| stt_latency_ms       | STT latency            |
| upload_failure_rate  | upload reliability     |
| playback_desync_rate | frontend sync quality  |
| oral_retry_rate      | student retry friction |

---

## 12.3 Naming Rules

Metrics/events must:

* use snake_case
* remain stable
* avoid provider-specific names

---

# 13. Client-Side Latency & Audio Desync Reporting

## 13.1 Purpose

Backend cannot directly observe:

* playback drift
* buffering quality
* AudioContext failures
* frontend rendering lag

Frontend telemetry is required.

---

## 13.2 Required Client Events

```typescript
type ClientTelemetryEvent =
  | 'playback_desync_detected'
  | 'audio_context_suspended'
  | 'recording_interrupted'
  | 'playback_buffering_started'
  | 'playback_buffering_resolved';
```

---

## 13.3 Payload Contract

```json
{
  "directive_id": "uuid",
  "event_type": "playback_desync_detected",
  "playback_position_ms": 2400,
  "browser": "Chrome",
  "device_type": "Android"
}
```

---

# 14. Feature Flag Boundaries

## 14.1 Purpose

English skill features must support:

* staged rollout
* rollback
* partial exposure

---

## 14.2 Recommended Flags

| Flag                  | Purpose              |
| --------------------- | -------------------- |
| english_modes_enabled | master switch        |
| karaoke_enabled       | karaoke rollout      |
| oral_reading_enabled  | oral-reading rollout |
| figure_mode_enabled   | figure rollout       |

---

## 14.3 Rollback Constraints

Feature disable must:

* fail gracefully
* preserve normal /april-query
* avoid conversation crashes

---

# 15. Golden-Path Integration Flow

## 15.1 Goal

Defines minimum end-to-end production validation flow.

---

## 15.2 Golden Path

```text
Student opens chapter
→ Aanya emits SPEAK_PARA
→ frontend receives tts_start
→ frontend streams TTS audio
→ highlighting synchronizes
→ playback_complete emitted
→ Aanya asks question
→ student records answer
→ audio uploaded to GCS
→ oral-result processed
→ skill_result rendered
```

---

## 15.3 Minimum Production Validation

Before rollout validate:

* SSE stability
* playback synchronization
* upload flow
* STT scoring
* retry behavior
* mobile browser behavior
* Safari compatibility
* slow-network recovery

---

# Wave 4 Exit Criteria

Wave 4 is considered locked only when:

* fallback behavior frozen
* reliability semantics frozen
* validation rules frozen
* telemetry contracts frozen
* logging rules frozen
* rollout strategy frozen
* golden-path integration validated
* no unresolved production ambiguity remains