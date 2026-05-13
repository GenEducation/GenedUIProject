 # Wave 1 — Core Primitives Contracts

## Scope

Wave 1 locks the foundational runtime contracts between:

* Backend orchestration
* SSE transport
* Frontend interaction runtime
* Audio streaming layer

No implementation should begin before these contracts are frozen.

This wave defines:

* transport ownership
* event schemas
* directive grammar
* playback lifecycle
* interruption semantics
* SSE recovery behavior
* browser audio constraints

---

# 1. Audio Architecture Contract

## 1.1 Transport Boundary

### Rule

SSE is the control plane only.
HTTP is the audio data plane only.

These responsibilities must never mix.

---

## 1.2 SSE Responsibilities

SSE may carry:

* orchestration state
* directives
* playback intent
* interaction state
* control events
* timing metadata

SSE must NEVER carry:

* audio bytes
* base64 audio
* audio chunks
* binary payloads

---

## 1.3 HTTP Audio Responsibilities

HTTP endpoints own:

* TTS byte streaming
* difficult-word pronunciation playback
* browser media playback source

All media payloads travel over HTTP streaming responses only.

---

## 1.4 Canonical Playback Flow

```text
teaching_node
→ emits <<SPEAK_PARA:{"directive_id":"..."}>>
→ SSE interceptor emits tts_start
→ frontend receives directive_id + timing metadata
→ frontend calls:
   GET /audio/tts?directive_id=...
→ backend streams audio response
→ frontend plays audio via Web Audio API
→ frontend POSTs playback_complete to /conversation-action
```

---

## 1.5 Ownership Rules

| Concern               | Owner    |
| --------------------- | -------- |
| Playback lifecycle    | Frontend |
| Audio generation      | Backend  |
| Audio streaming       | Backend  |
| Playback completion   | Frontend |
| Orchestration intent  | Backend  |
| Highlight rendering   | Frontend |
| Canonical source text | Backend  |
| Evaluation/scoring    | Backend  |

---

# 2. `/audio/tts` Contract

## 2.1 Endpoint

```http
GET /audio/tts?directive_id=<uuid>
```

---

## 2.2 Request Contract

### Query Params

| Field        | Type | Required | Notes                          |
| ------------ | ---- | -------- | ------------------------------ |
| directive_id | UUID | Yes      | References persisted directive |

---

## 2.3 Authentication

* JWT required
* Session ownership validated
* Directive ownership validated

---

## 2.4 Response Contract

### Content-Type

```http
audio/mpeg
```

Primary browser-compatible streaming format.

---

## 2.5 Streaming Behavior

Backend streams audio progressively.

Frontend must support:

* partial buffering
* progressive playback
* slow network conditions

Backend is NOT responsible for:

* playback state
* retry UI
* synchronization rendering

---

## 2.6 Failure Behavior

| Failure              | Backend Behavior | Frontend Behavior                |
| -------------------- | ---------------- | -------------------------------- |
| TTS provider timeout | return 5xx       | graceful text fallback           |
| directive_id missing | 404              | disable playback UI              |
| auth failure         | 401              | refresh/login flow               |
| network interruption | terminate stream | stop playback + retry affordance |

---

# 3. Audio Interruption & Cancellation Contract

## 3.1 Single Active Playback Rule

Only ONE active playback session may exist at a time.

Starting a new playback must:

1. stop previous playback
2. clear previous playback state
3. begin new playback

---

## 3.2 Playback Cancellation Sources

Playback may terminate from:

* user pressing stop
* new playback request
* route change
* SSE reconnection reset
* browser audio interruption
* tab unload

---

## 3.3 Frontend Cancellation Rules

Frontend owns:

* AudioContext cleanup
* source node cleanup
* playback timer cleanup
* highlight cleanup

Backend owns NOTHING after HTTP stream delivery begins.

---

## 3.4 Orchestration Constraint

Backend orchestration must NEVER synchronously wait for playback completion.

`playback_complete` affects:

* frontend pacing
* conversational continuation

It does NOT block:

* LangGraph execution
* SSE orchestration runtime

---

# 4. Frontend Playback Lifecycle Ownership

## 4.1 Frontend Is Authoritative Playback Runtime

Frontend owns:

* playback start
* playback stop
* buffering state
* playback progress
* completion detection
* interruption detection

Backend only emits intent.

---

## 4.2 Canonical Playback States

```typescript
PlaybackState =
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

## 4.3 Completion Rule

Frontend emits `playback_complete` via HTTP POST to `/conversation-action` ONLY after:

* audio stream fully completes
* playback reaches end
* no interruption occurred

---

# 5. Browser AudioContext Constraints

## 5.1 Browser Reality

Browsers may automatically:

* suspend AudioContext
* throttle playback
* kill MediaRecorder
* pause audio in background tabs

Especially on:

* Safari iOS
* Android Chrome
* Chromebook browsers

---

## 5.2 Frontend Required Behavior

Frontend must detect:

* AudioContext suspension
* tab backgrounding
* output device disconnect
* autoplay rejection

Frontend must recover gracefully.

---

## 5.3 Autoplay Constraint

Playback may only begin after:

* explicit user interaction
  OR
* previously unlocked AudioContext

Frontend must maintain unlocked audio session where possible.

---

# 6. SSE Event Inventory Contract

## 6.1 Pre-existing SSE Events

The following events already exist in the `/april-query` pipeline and are NOT new English-skill events:

* `text_delta` — streaming text tokens from Aanya
* `heartbeat` — keep-alive ping every 15 seconds

## 6.2 New SSE Events

Only these new events are valid for English skill modes:

```typescript
type SSEEvent =
  | 'text_delta'        // pre-existing
  | 'heartbeat'         // pre-existing
  | 'tts_start'
  | 'skill_action'
  | 'recording_open'
  | 'recording_closed'
  | 'skill_result'
  | 'skill_error';
```

No other SSE event types are permitted without contract update.

---

## 6.3 `tts_start` Contract

### Payload

```json
{
  "directive_id": "uuid",
  "estimated_ms": 3200,
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

## 6.4 `recording_open` Contract

```json
{
  "directive_id": "uuid",
  "mode": "sentence",
  "expected_duration_ms": 15000
}
```

---

## 6.5 `recording_closed` Contract

```json
{
  "directive_id": "uuid",
  "mode": "sentence",
  "reason": "user_stopped"
}
```

---

## 6.6 `skill_result` Contract

```json
{
  "directive_id": "uuid",
  "result_type": "oral_reading_feedback",
  "payload": {
    "wer": 0.18,
    "pace_wpm": 92,
    "fluency": "good",
    "feedback": "That was good. Let's try one word together.",
    "difficult_words": [
      "environment"
    ]
  }
}
```

---

## 6.7 `skill_error` Contract

```json
{
  "directive_id": "uuid",
  "error_type": "tts_failure",
  "message": "Playback unavailable"
}
```

---

# 7. `playback_complete` Lifecycle Contract

## 7.1 Source of Truth

`playback_complete` is frontend-originated.

Backend NEVER emits it.

---

## 7.2 Trigger Conditions

Frontend emits only when:

* playback naturally finishes
* playback not interrupted
* active directive still valid

---

## 7.3 Invalid Conditions

Frontend must NOT emit `playback_complete` if:

* playback manually stopped
* route changed
* SSE disconnected
* another playback interrupted current playback
* AudioContext crashed

---

## 7.4 Delivery

```http
POST /session/{id}/conversation-action
```

Payload:

```json
{
  "type": "playback_complete",
  "directive_id": "uuid"
}
```

---

# 8. SSE Reconnection Recovery Contract

## 8.1 Frontend Responsibility

Frontend must detect SSE disconnects.

Detection methods:

* `EventSource.onerror`
* heartbeat timeout (30 seconds with no heartbeat)
* connection close

---

## 8.2 Reconnection Behavior

Frontend reconnects using exponential backoff.

Recommended:

| Attempt | Delay |
| ------- | ----- |
| 1       | 1s    |
| 2       | 2s    |
| 3       | 5s    |
| 4+      | 10s   |

---

## 8.3 Playback During Reconnection

Existing audio playback MAY continue.

Frontend must:

* preserve current directive_id
* preserve playback position
* preserve interaction state

---

## 8.4 Post-Reconnect Behavior

Backend must resume:

* active conversation stream
* pending directives

Frontend must NOT replay:

* already completed playback
* already handled directives

---

# 9. SSE Heartbeat & Keep-Alive Contract

## 9.1 Heartbeat Frequency

Backend emits:

```text
event: heartbeat
data: {}
```

every:

```text
15 seconds
```

---

## 9.2 Frontend Timeout Rule

If frontend receives NO heartbeat for:

```text
30 seconds
```

Frontend must:

1. mark SSE degraded
2. stop requesting new playback
3. begin reconnect flow

---

## 9.3 Heartbeat Purpose

Heartbeats exist to:

* keep school firewalls alive
* detect dead SSE sessions
* detect stalled proxies
* avoid silent disconnection

---

# 10. Directive Grammar Contract

## 10.1 Directive Philosophy

Directives are:

* structured orchestration instructions
* embedded inside teaching_node output
* intercepted before user rendering

Directives are NOT rendered to users.

---

## 10.2 Allowed Directives

```text
<<SPEAK_PARA>>
<<DIFFICULT_WORD>>
<<READ_ALOUD>>
<<LISTEN_COMPREHENSION>>
<<SHOW_FIGURE_DESCRIBE>>
<<KARAOKE>>
```

No additional directives allowed without schema update.

---

## 10.3 Directive Syntax

Canonical format:

```text
<<DIRECTIVE_NAME:{json_payload}>>
```

Example:

```text
<<SPEAK_PARA:{"directive_id":"abc123","source_text":"Paragraph text","estimated_ms":3200}>>
```

---

## 10.4 Parsing Rules

Directive parser must:

* support streaming-safe parsing
* tolerate chunk boundaries
* reject malformed JSON
* fail gracefully
* never crash SSE stream

---

## 10.5 Invalid Directive Handling

Invalid directives:

* logged
* ignored
* converted to skill_error event

Conversation stream must continue.

---

# 11. Directive Payload Schema Contract

## 11.1 `SPEAK_PARA`

```json
{
  "directive_id": "uuid",
  "source_text": "Paragraph text",
  "para_index": 1,
  "total": 3,
  "estimated_ms": 3200
}
```

---

## 11.2 `DIFFICULT_WORD`

```json
{
  "directive_id": "uuid",
  "word": "environment",
  "syllables": ["en", "vi", "ron", "ment"],
  "phonetic": "ɪnˈvaɪrənmənt",
  "slow_available": true
}
```

---

## 11.3 `READ_ALOUD`

```json
{
  "directive_id": "uuid",
  "mode": "sentence",
  "source_text": "The quick brown fox"
}
```

---

## 11.4 `LISTEN_COMPREHENSION`

```json
{
  "directive_id": "uuid",
  "interaction_type": "mcq",
  "question": "What did the boy do?",
  "options": [
    {
      "id": "a",
      "label": "Ran"
    },
    {
      "id": "b",
      "label": "Slept"
    },
    {
      "id": "c",
      "label": "Ate"
    }
  ],
  "correct_index": 0
}
```

---

## 11.5 `SHOW_FIGURE_DESCRIBE`

```json
{
  "directive_id": "uuid",
  "figure_id": "uuid",
  "prompt": "What do you see in this image?"
}
```

---

## 11.6 `KARAOKE`

```json
{
  "directive_id": "uuid",
  "mode": "sentence",
  "source_text": "This is a sample sentence"
}
```

---

# Wave 1 Exit Criteria

Wave 1 is considered locked only when:

* SSE event schemas frozen
* directive grammar frozen
* frontend/backend payload schemas frozen
* playback lifecycle ownership frozen
* SSE recovery behavior frozen
* AudioContext behavior agreed
* `/audio/tts` contract frozen
* interruption semantics frozen
* no unresolved FE/BE ambiguity remains