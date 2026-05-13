# KIRA English Skill Modes — Execution Blueprint

**Team:** 1 Backend Engineer · 1 Frontend Engineer  
**Stack:** FastAPI · LangGraph · Gemini 2.0/2.5 Flash · Google Cloud TTS/STT · PostgreSQL · Qdrant · SSE · Mem0  
**Surface:** `/april-query` text/SSE mode — NOT the speech-to-speech endpoint

---

# 1. Feature Understanding

## What It Actually Does

Six English skill interaction modes layered on top of the existing chat+SSE pipeline. At its core: **Aanya gains a voice** (TTS output) and **ears** (STT input) within the existing text session — not replacing it, augmenting it. The student never leaves the chat. Audio interactions happen inline.

## Core User Problem

English teaching in a text-only AI tutor is fundamentally broken for Grade 3–8 students. Reading, pronunciation, listening comprehension, and speaking fluency cannot be assessed or developed through text exchange alone. This feature closes that gap without pulling students into a separate "voice app."

## User Expectations

- It feels like Aanya naturally reading aloud or asking the student to read — not a feature being activated
- Audio is fast, not lagging 3 seconds before playing
- Mic activation feels safe and clear — student knows when they're being recorded
- Mistakes are handled gently — no red "wrong" feedback, no score flashing
- Works on a Chromebook, mid-range Android, and a school desktop browser

## Explicit Behaviors (from spec)

| Mode | Trigger | Input | Output |
|------|---------|-------|--------|
| 1 — Para/Stanza Reading | Aanya or `Read to me` | Text content from RAG | TTS audio + text highlight + comprehension Q |
| 2 — Difficult Word | Aanya marks words inline | Tap on highlighted word | Word TTS + syllable split |
| 3 — Student Reads Aloud | Aanya or `I'll read` | STT from student mic | Fluency feedback, unit-matched |
| 4 — Karaoke | Aanya or `Practice pronunciation` | STT from student + optional TTS | Student attempts first, then Aanya model |
| 5 — Picture Description | Aanya or `Describe this image` | STT from student | Scaffolded vocabulary expansion |
| 6 — Listening Comprehension | Aanya-driven | TTS + inline MCQ/fill/free-form | Evaluation woven into conversation |

## Implicit Behaviors

- Aanya remembers longitudinal preference via Mem0 (which modes student gravitates toward)
- Dictation defaults by grade: spoken 3–5, typed option 6–8
- Mode 3 unit size is Aanya-chosen, sentence default, student-overridable
- Long silence mid-unit → gentle offer to help, not failure framing
- Audio controls must not visually dominate — reading stays primary
- Replay always allowed, softly offered by Aanya

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Student mic permission denied | Graceful fallback to text, Aanya continues without reading mode |
| STT returns empty/garbled | Aanya offers to repeat or asks student to try again — no error label |
| TTS fails mid-stream | Show text, offer replay, log silently |
| Student closes tab mid-recording | Audio upload cancelled, session row left incomplete — not surfaced to student |
| Very slow network | HTTP audio stream buffers progressively — show waveform indicator, don't freeze UI |
| Student taps difficult word during Aanya speaking | Queue the word playback after current audio ends |
| Grade boundary (exactly 5) | Default spoken dictation, typed offered as option |
| Long pause in Mode 3 (>4s) | Client detects silence, shows "Want help with this sentence?" |
| RAG returns no figure for Mode 5 | Aanya skips picture description, continues text-based scaffolding |
| MCQ widget appears mid-stream | Stream pauses at directive boundary, widget renders, stream resumes after student responds |

## Failure Cases

- GCS upload fails → session row created with null audio URI, analysis skipped, Aanya continues teaching — no crash
- Gemini analysis fails → feedback skipped or generic fallback ("Good effort!"), logged as analysis_error
- STT timeout → treat as silence, offer help
- TTS voice API quota exceeded → fallback to text only, no user-visible error

## Latency Expectations

| Operation | Target | Hard Limit |
|-----------|--------|-----------|
| Difficult word TTS tap-to-play | <600ms | 1.2s |
| Full response speaker button | <800ms | 1.5s |
| STT return (short utterance <15s) | <2s | 4s |
| Oral feedback from Aanya after STT | <3s total | 5s |
| MCQ widget render | <100ms | 300ms |
| Para TTS first audio chunk | <1s | 2s |

## UX Expectations

- No mode labels visible to student
- Mic state clearly indicated (animated icon, not just a static mic)
- Waveform or pulse during recording so student knows they're being heard
- Text highlight during TTS must be smooth — not jumpy
- Inline MCQ chips feel part of the chat, not a form
- Difficult words have subtle visual differentiation — not aggressive callout boxes

## Trust and Safety

- Students are minors (Grade 3–8). Audio recordings go to GCS. This has DPDP Act 2023 implications.
- Audio must not be accessible via public URLs — GCS signed URLs with short TTL only
- No audio playback of student voice back to student (creepy for kids)
- Mic must never silently activate — explicit visual state always shown
- Aanya must never frame mistakes harshly — feedback is always constructive

## Scalability Assumptions

- MVP scale: hundreds of concurrent sessions, not thousands
- GCS and Google Cloud TTS/STT scale horizontally — no custom infra needed
- `english_skill_sessions` will grow fast — index on `chat_session_id` and `skill_id` from day 1

---

## Functional Requirements

1. TTS playback of Aanya responses (full response + para-by-para + word-level)
2. Word-level difficulty tagging in Aanya response stream
3. Student mic capture, STT processing, result return to teaching_node
4. GCS audio upload for all student recordings
5. Inline interactive widgets (MCQ, fill-blank) mid-chat
6. Oral reading analysis (WER, fluency, pace) via jiwer + Gemini audio
7. Picture description mode via RAG figure retrieval
8. Grade-adaptive dictation mode routing
9. Silence detection client-side triggering Aanya assistance prompt
10. Longitudinal preference memory via Mem0

## Non-Functional Requirements

- All audio over HTTPS only
- GCS student audio via signed URLs (TTL: 15 min max)
- No PII in logs (no transcripts in plain log lines)
- Graceful degradation: every mode must fall back to text-only
- Browser support: Chrome 90+, Firefox 90+, Safari 15+ (MediaRecorder API)
- Mobile-responsive mic controls

## Technical Constraints

- Stays on `/april-query` SSE pipeline — no new real-time transport
- Existing SSE directive interceptor must be extended — not rewritten
- Google Cloud TTS (not Gemini Live) for one-way TTS — Gemini Live is bidirectional, wrong tool here
- jiwer for WER — lightweight, no ML infra needed
- No new LangGraph nodes unless strictly necessary — prefer extending teaching_node prompt + existing evaluator

## Unclear Parts of the Spec

1. **Difficult word TTS caching** — same word will be requested many times across sessions. Cache in Redis or re-call TTS every time?
2. **Karaoke word-by-word sync** — spec says word-by-word synchronized guidance but Phase 3 (word-level highlight) is dropped. Does Karaoke still need word-level sync or sentence-level is sufficient?
3. **Mode 6 MCQ generation** — does Aanya generate MCQ options at runtime (LLM call), or are options part of the directive payload she emits? Important for latency.
4. **Silence threshold for Mode 3** — 4 seconds is assumed. Confirm.
5. **Does Mode 4 (Karaoke) use the same passage as what's currently shown, or does Aanya select a specific sentence/line?**

---

## Critical Clarification Questions

1. **Karaoke granularity**: sentence-level or word-level sync given Phase 3 is dropped?
2. **Difficult word TTS caching**: hit GCS/Redis cache or fresh TTS call per tap?
3. **MCQ option generation**: runtime LLM or Aanya includes options in her directive?
4. **Silence threshold**: confirm 4s for Mode 3 long-pause detection.
5. **Mode 6 sub-mode selection**: does Aanya decide which sub-mode (dictation vs retell vs instruction following) based on LO, or are all available per session?

---

# 2. Lean Execution Strategy

## Fastest Safe Implementation Path

**Phase 0 — Foundation (unblocks everything)**
- GCS bucket setup + signed URL generation utility
- Google Cloud TTS wrapper (HTTP streaming response)
- Google Cloud STT wrapper (async, batch for MVP)
- New SSE events scaffolded in interceptor
- `english_skill_sessions` table migration

**Phase 1 — High value, low risk**
- Mode 2: Speaker button on responses (full TTS) — touches no existing logic
- Mode 2: Difficult word markup + tap pronunciation
- Mode 1: Para-wise TTS reading with text highlight

**Phase 2 — STT pipeline**
- Mode 3: Student reads aloud (sentence default), basic WER feedback
- Mode 5: Picture description (STT + Aanya scaffolding)

**Phase 3 — Evaluation layer**
- Mode 6: Listening comprehension + inline MCQ/fill widgets
- Mode 4: Karaoke (student first, then Aanya model)

**Phase 4 — Intelligence layer**
- Silence detection (Mode 3)
- Longitudinal preference via Mem0
- Grade-adaptive dictation routing

## What Can Be Simplified

- WER feedback: use jiwer only (no Gemini audio analysis for MVP of Mode 3 — add Gemini layer in Phase 3)
- TTS caching: in-memory LRU for difficult words within session (not Redis) for MVP
- MCQ generation: Aanya generates options inline in her response directive — no separate LLM call
- Audio upload: fire-and-forget background task, not awaited before feedback

## What Must NOT Be Simplified

- Mic permission handling — must be explicit, graceful, with clear UI state
- GCS signed URLs — never public audio URLs, even in dev
- Graceful degradation — every audio failure must silently fall to text
- No transcript logging in plain text — DPDP compliance from day 1
- Difficulty word selection — must come from Aanya's LLM output, not a static word list
- Silence detection — must be client-side (no server-side streaming STT for MVP)

## MVP Boundaries

**In MVP:**
- Modes 1, 2, 3, 5 (core reading/speaking loop)
- Full response TTS speaker button
- Difficult word tap pronunciation
- Student reads aloud → WER-based feedback
- Picture description speaking
- Grade-adaptive dictation type

**Post-MVP:**
- Mode 4 (Karaoke) — depends on TTS timing data infrastructure
- Mode 6 (Listening comprehension with inline widgets) — widget system is a frontend project
- Longitudinal Mem0 preference adaptation
- Gemini audio rubric analysis (oral expression scoring)

## Acceptable Technical Debt

- In-memory TTS cache for difficult words (replace with Redis later)
- Batch STT instead of streaming (acceptable for sentence-level reading)
- No retry queue for failed GCS uploads (log and move on)
- Single GCS bucket with flat prefix structure (proper folder policy later)

## Dangerous Technical Debt

- Skipping graceful mic fallback — breaks for 20% of school devices
- Using public GCS URLs — student audio exposure, legal risk
- Logging raw transcripts — DPDP violation
- Not indexing `english_skill_sessions.chat_session_id` — table will be slow within weeks

---

# 3. Task Breakdown

## Backend Engineer Ownership

| Task | Phase |
|------|-------|
| GCS bucket + signed URL utility | 0 |
| Google Cloud TTS async wrapper (HTTP streaming response) | 0 |
| Google Cloud STT async wrapper (batch, with word timestamps) | 0 |
| New SSE events: `tts_start`, `skill_action`, `recording_open`, `recording_closed`, `skill_result`, `skill_error` | 0 |
| DB migration: `assessment_skill` on `skills_table`, `english_skill_sessions` table | 0 |
| Extend SSE directive interceptor: `<<SPEAK_PARA>>`, `<<DIFFICULT_WORD>>`, `<<READ_ALOUD>>`, `<<KARAOKE>>`, `<<SHOW_FIGURE_DESCRIBE>>`, `<<LISTEN_COMPREHENSION>>` | 1 |
| Teaching node prompt: `ENGLISH SKILL DIRECTIVES` section | 1 |
| `/audio/tts` endpoint — streams TTS audio by `directive_id` | 1 |
| `/audio/word-tts` endpoint — takes word + grade, returns cached audio chunk | 1 |
| `/session/{id}/audio-upload` endpoint — generates signed upload URL + upload metadata | 2 |
| `/session/{id}/oral-result` endpoint — accepts `directive_id` + `gcs_uri`, performs backend-owned STT + WER analysis, runs jiwer, returns `OralReadingAnalysis` | 2 |
| `oral_reading_analyzer_node` — jiwer WER + pace calc | 2 |
| Conversation-action endpoint `POST /session/{id}/conversation-action` | 2 |
| `/session/{id}/comprehension-answer` endpoint | 3 |
| Mode 6 evaluation persistence in `english_skill_sessions` | 3 |
| Gemini audio rubric analysis (oral expression) | 3 |
| Mem0 preference logging (mode affinity tracking) | 4 |

## Frontend Engineer Ownership

| Task | Phase |
|------|-------|
| TTS audio player utility (HTTP audio stream playback) | 0 |
| MediaRecorder wrapper (permission handling, recording state, blob export) | 0 |
| New SSE event handlers for all 6 new events | 0 |
| Speaker button component on every response bubble | 1 |
| Difficult word inline highlight + tap-to-pronounce component | 1 |
| Waveform/pulse animation during TTS playback | 1 |
| Para-wise text highlight sync with TTS timing data | 1 |
| Mic activation UI (animated mic icon, recording state indicator) | 2 |
| Student reads aloud flow: `recording_open` → capture → `recording_closed` → upload | 2 |
| Silence detection (4s timeout, client-side) → triggers help prompt event | 2 |
| Picture description: figure display inline + mic prompt | 2 |
| Unit size controls: `Word` / `Sentence` / `Paragraph` affordance | 2 |
| Inline MCQ chip component (mid-chat, not a modal) | 3 |
| Fill-in-blank inline component | 3 |
| Karaoke flow: student attempt → optional Aanya model play | 3 |
| Longitudinal control affordances: `Read to me` / `I'll read` / `Repeat` / `Slower` | 4 |

## Shared Responsibilities

- SSE event contract (agree on payload schema before Phase 0 ends)
- Audio format agreement (WebM/Opus from browser → backend STT accepts it)
- Error taxonomy (what error codes mean what, how frontend reacts)
- Signed URL flow (backend generates, frontend fetches directly to GCS)

## Coordination Points

| Checkpoint | When | What |
|-----------|------|------|
| SSE payload schema review | End of Phase 0 | Both engineers sign off on all 6 new event shapes |
| TTS streaming contract | Before Phase 1 frontend starts | Audio encoding, streaming response behavior, playback guarantees |
| STT upload flow | Before Phase 2 | Multipart format, signed URL vs direct upload decision |
| MCQ directive schema | Before Phase 3 | What Aanya emits vs what frontend renders |

## Blocking Dependencies

- Frontend Phase 1 (speaker button) blocks on backend `/audio/tts` endpoint
- Frontend Phase 2 (reading aloud) blocks on backend `/session/audio-upload` + STT result endpoint
- Frontend Phase 3 (MCQ widgets) blocks on SSE directive schema for `<<LISTEN_COMPREHENSION>>`

---

# 4. Product & UX Breakdown

## User Flows

**Mode 1 — Para Reading Flow**
```
Aanya emits <<SPEAK_PARA:{"directive_id":"...","source_text":"...","para_index":1,"total":3}>>
→ SSE interceptor fires skill_action: {mode: speak_para}
→ Frontend starts TTS playback, highlights para 1
→ Audio playback ends → frontend POSTs playback_complete to /conversation-action
→ Aanya continues stream: comprehension question
→ Student answers → normal chat flow resumes
```

**Mode 3 — Student Reads Aloud Flow**
```
Aanya emits <<READ_ALOUD:{"directive_id":"...","mode":"sentence","source_text":"..."}>>
→ Frontend: recording_open event → show mic UI, display source text
→ Student reads → MediaRecorder captures
→ Student taps done OR silence detected (4s)
→ recording_closed → upload to GCS → POST to /oral-result
→ WER + feedback → Aanya receives as tool observation
→ Aanya gives gentle feedback
```

**Mode 6 — Listening Comprehension Flow**
```
Aanya emits <<LISTEN_COMPREHENSION:{"directive_id":"...","interaction_type":"mcq","question":"...","options":[{"id":"a","label":"Ran"},...],"correct_index":0}>>
→ SSE interceptor fires → chat pauses at directive
→ Frontend renders inline MCQ chips below Aanya's last message
→ Student taps answer → event sent to /session/{id}/comprehension-answer
→ Aanya stream resumes with response
```

## Screen States

| State | Description |
|-------|-------------|
| Default | Normal chat, speaker icon on response bubble |
| TTS playing | Waveform pulse on Aanya avatar, para highlighted, speaker icon becomes stop |
| Recording open | Mic icon animated (pulsing ring), text displayed for reading modes |
| Recording processing | Spinner on mic, "Listening..." label |
| Skill result pending | Brief skeleton on feedback area |
| MCQ active | Chips rendered inline, chat input disabled until answered |
| Error | Silent — Aanya continues text-only, no error UI shown to student |

## Loading States

- TTS first chunk: show waveform immediately (even before audio plays), hides latency perception
- STT processing: "Listening..." with animated dots — max 4s before timeout shown
- Para highlight: highlights word-group by word-group using TTS timepoint data, no jarring jumps

## Error States

- Mic permission denied: Aanya's next message naturally says "No problem, let's continue reading together" — no error banner
- TTS fail: text already visible, speaker icon resets quietly, log error
- STT empty result: Aanya: "I didn't quite catch that — want to try again?" — never "Error"
- GCS upload fail: session proceeds, analysis skipped, no student-visible change

## Empty States

- No RAG figure found for Mode 5: Aanya skips to text-based description prompt ("Imagine the scene...")
- No LO-matched content for Mode 1: Aanya reads first paragraph of current chapter section

## Mobile Responsiveness

- Mic button minimum tap target: 48×48px
- Difficult word tap target: minimum 4px padding on all sides
- MCQ chips wrap naturally on small screens
- TTS waveform collapses to simple pulse on screens <380px
- Inline figure (Mode 5) max width 100%, height auto

## Accessibility Essentials

- Mic button has `aria-label="Start recording"` / `aria-label="Stop recording"`
- TTS playback has keyboard control (spacebar pause/play when focused)
- MCQ chips are proper button elements, tab-navigable
- Difficult word pronunciation accessible via keyboard (Enter on focused word)
- All recording states announced via `aria-live="polite"`

## Minimal Design Requirements

- No new color palette needed — use existing Aanya UI tokens
- Waveform animation: CSS only, 3–5 bars, existing brand color
- Difficult word highlight: subtle underline with dot, distinct from regular emphasis
- Recording state: pulsing ring on mic icon (CSS keyframe)
- MCQ chips: pill shape, existing button component base

## UX Risks

| Risk | Mitigation |
|------|-----------|
| Student keeps mic open and never stops | Auto-stop after 60s, gentle "Ready to give feedback?" |
| TTS plays while student is still reading | Modes are exclusive — TTS and recording can never be active simultaneously |
| MCQ chips look like ads or popups | Chips must stay in chat flow, same width as chat bubble, no floating |
| Difficult word taps during TTS playback cause audio collision | Queue word TTS after current audio ends |
| Student confused about when to speak | Always show explicit "Your turn" or mic icon before recording opens |

---

# 5. Technical Architecture

## Architecture Overview

### TTS Transport Architecture

SSE is the control plane only.  
HTTP streaming is the audio data plane.

Flow:

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

Rules:
- No audio bytes in SSE ever
- SSE only carries orchestration state
- HTTP carries audio payloads
- Frontend owns playback lifecycle
- Backend orchestration never waits for audio completion

```
teaching_node (Aanya)
    │
    ├─ emits text stream with embedded directives
    │   <<SPEAK_PARA>>, <<DIFFICULT_WORD>>, <<READ_ALOUD>>,
    │   <<KARAOKE>>, <<SHOW_FIGURE_DESCRIBE>>, <<LISTEN_COMPREHENSION>>
    │
    ▼
SSE Directive Interceptor (existing, extended)
    │
    ├─ text tokens → client as text_delta (pre-existing)
    ├─ directive tokens → parsed, emitted as skill_action SSE event
    │
    ▼
Frontend SSE Consumer
    │
    ├─ skill_action → activates appropriate UI mode
    ├─ tts_start → frontend fetches /audio/tts and begins playback
    ├─ recording_open → MediaRecorder starts
    ├─ skill_result → renders feedback inline
    │
    ▼
Audio APIs (separate from SSE stream)
    ├─ GET /audio/tts?directive_id=... → streaming audio response
    ├─ GET /audio/word-tts?word=...&grade=... → cached word audio
    ├─ POST /session/{id}/audio-upload → returns signed upload URL + metadata
    └─ POST /session/{id}/oral-result → jiwer analysis → OralReadingAnalysis
```

## Why This Architecture Is Sufficient

- Reuses existing SSE pipeline — no new transport, no WebSocket upgrade
- Audio served via separate HTTP endpoints — keeps SSE stream clean
- GCS for storage — zero infra to maintain
- jiwer runs in-process — no separate ML service
- Directive pattern already proven (`MATH_DRAW`) — extension, not invention

## Where It May Break Later

- Frontend playback synchronization drift on slow devices or unstable networks.  
Fix later: adaptive buffering and playback calibration. **Fix now**: TTS audio served via separate endpoint, not embedded in SSE.
- jiwer in-process on large paragraphs adds latency to the response cycle. **Fix later**: background task, result pushed via SSE `skill_result` event.
- In-memory difficult word TTS cache grows unbounded in long sessions. **Fix later**: LRU eviction or Redis.

## What Should Be Designed for Future Scaling Now

- `english_skill_sessions` table indexes — do this now, not later
- GCS path structure: `english-skills/{student_id}/{chat_session_id}/{directive_id}_{ts}.webm` — hierarchical from day 1
- Signed URL generation as a utility function — not inline in endpoint handlers
- Audio upload as a background task — never block the SSE stream

## What Can Safely Wait

- Gemini audio rubric (expression scoring) — jiwer WER is sufficient for MVP
- Redis TTS cache — in-memory LRU is fine at current scale
- Streaming STT (currently batch) — batch is fine for sentence-level reading

---

# 6. Backend Engineering Plan

## Endpoint Inventory

### `/oral-result` Contract

Frontend never sends transcript or source_text.

Request:
```json
{
  "directive_id": "uuid",
  "gcs_uri": "gs://..."
}
```

Backend:
1. Validates session ownership
2. Looks up canonical `source_text` using `directive_id`
3. Pulls audio from GCS
4. Runs STT (`en-IN`)
5. Runs jiwer against `source_text`
6. Returns `OralReadingAnalysis`

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/audio/tts` | Stream TTS audio by `directive_id` | JWT |
| GET | `/audio/word-tts` | Cached word pronunciation audio | JWT |
| POST | `/session/{id}/audio-upload` | Generate signed GCS upload URL + metadata | JWT |
| POST | `/session/{id}/oral-result` | Backend STT + WER analysis from uploaded audio | JWT |
| POST | `/session/{id}/comprehension-answer` | Store listening comprehension response | JWT |
| POST | `/session/{id}/conversation-action` | Structured conversational state events | JWT |
| GET | `/session/{id}/skill-sessions` | Retrieve skill session history | JWT |

## DB Schema

```sql
-- skills_table is immutable taxonomy (already exists).
-- Add assessment_skill classification if required via migration or JSONB extension.
-- Values: 'reading_aloud' | 'listening_comprehension' | 'recitation' | 'spelling'

-- English skill sessions
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
# "directive_id has no uniqueness guarantee","Retries/reconnects may create duplicate interaction rows.","Add UNIQUE(chat_session_id, directive_id, mode)." "mode and interaction_type are unrestricted VARCHARs","Typos create inconsistent production analytics/data.","Add CHECK constraints or PostgreSQL ENUMs."
## New Directive Schema (for teaching_node prompt)

Canonical format: `<<DIRECTIVE_NAME:{json_payload}>>`

```
<<SPEAK_PARA:{"directive_id":"uuid","source_text":"...","para_index":1,"total":3,"highlight":true}>>

<<DIFFICULT_WORD:{"directive_id":"uuid","word":"environment","syllables":["en","vi","ron","ment"],"phonetic":"ɪˈnɔːrməs","slow_available":true}>>

<<READ_ALOUD:{"directive_id":"uuid","mode":"sentence","source_text":"...","grade":5}>>

<<KARAOKE:{"directive_id":"uuid","mode":"sentence","source_text":"..."}>>

<<SHOW_FIGURE_DESCRIBE:{"directive_id":"uuid","figure_id":"ncert_fig_uuid","prompt":"What do you see?"}>>

<<LISTEN_COMPREHENSION:{"directive_id":"uuid","interaction_type":"mcq","question":"...","options":[{"id":"a","label":"Ran"},{"id":"b","label":"Slept"}],"correct_index":0}>>

<<LISTEN_COMPREHENSION:{"directive_id":"uuid","interaction_type":"fill_blank","sentence":"The ___ ran fast.","answer":"dog"}>>

<<LISTEN_COMPREHENSION:{"directive_id":"uuid","interaction_type":"retell","prompt":"Tell me what you just heard."}>>
```

## Validation Rules

- `source_text` field in directives: max 500 chars for `SPEAK_PARA`, max 200 for `READ_ALOUD` unit
- Audio upload: max 5MB, accept `audio/webm` and `audio/ogg` only
- MCQ options: 2–4 options, `correct_index` must be valid
- Grade: 3–8 only, reject outside range
- `directive_id`: UUID, validated against session existence

## Rate Limiting

- `/audio/tts`: 30 req/min per student session
- `/audio/word-tts`: 60 req/min per student session (cache hits don't count)
- `/session/{id}/audio-upload`: 10 req/min (prevents rapid retry loops)

## Error Taxonomy

| Code | Meaning | Frontend Behavior |
|------|---------|------------------|
| AUDIO_TTS_FAILED | GCP TTS API error | Fall to text silently |
| AUDIO_STT_FAILED | GCP STT API error | Offer retry, then text fallback |
| AUDIO_UPLOAD_FAILED | GCS write failed | Continue session, log |
| ANALYSIS_FAILED | jiwer or Gemini error | Generic encouragement feedback |
| MIC_PERMISSION_DENIED | Client-side only | Aanya continues text-only |
| DIRECTIVE_PARSE_ERROR | Malformed directive | Skip directive, log, continue |

## Logging Strategy

- Log directive type + `directive_id` — never log text content of student audio or transcripts
- Log analysis scores (non-PII) at INFO level
- Log GCS URI (not content) at DEBUG
- Error logs include `session_id` + `directive_id` for traceability

## Backend Implementation Order

1. GCS utility + signed URL generator
2. TTS wrapper (async, HTTP streaming response)
3. STT wrapper (async, batch)
4. DB migration (schema above)
5. SSE interceptor: 6 new directives
6. `/audio/tts` + `/audio/word-tts` endpoints
7. Teaching node prompt: `ENGLISH SKILL DIRECTIVES` block
8. `/session/{id}/audio-upload` endpoint
9. `/session/{id}/oral-result` endpoint (jiwer WER)
10. `/session/{id}/comprehension-answer` endpoint
11. Conversation-action endpoint
12. Mem0 preference logging (Phase 4)

## Backend Testing Plan

- Unit: TTS wrapper mocked — test HTTP audio streaming response + error fallback
- Unit: jiwer WER calculation against known inputs
- Unit: SSE directive parser — each of 6 directives, malformed inputs
- Integration: full Mode 3 flow (upload → STT → oral-result → SSE skill_result)
- Integration: Mode 6 MCQ answer storage
- Load: 20 concurrent TTS requests (confirm GCP quota behavior)

---

# 7. Frontend Engineering Plan

## Component Hierarchy

```
ChatView
├── MessageList
│   ├── AanyaMessage
│   │   ├── MessageText (with DifficultyWordSpan components)
│   │   ├── SpeakerButton (full response TTS)
│   │   ├── ParaHighlight (active during SPEAK_PARA)
│   │   └── InlineInteraction
│   │       ├── MCQChips
│   │       ├── FillBlankInput
│   │       └── RetellPrompt
│   └── StudentMessage
├── SkillActionOverlay (contextual, not modal)
│   ├── ReadingDisplay (Mode 3 — shows source text)
│   ├── PictureDescribeDisplay (Mode 5 — shows figure)
│   └── KaraokeDisplay (Mode 4)
├── MicControls
│   ├── MicButton (animated states)
│   ├── SilenceDetector (client-side timer)
│   └── UnitSwitcher (Word / Sentence / Paragraph)
└── AudioEngine (singleton)
    ├── TTSPlayer (HTTP audio stream playback)
    └── RecorderManager (MediaRecorder wrapper)
```

## State Management

```typescript
// New slice in existing state store
interface EnglishSkillState {
  activeMode: EnglishMode | null;
  ttsPlaying: boolean;
  activeAudioDirectiveId: string | null;
  recordingState: 'idle' | 'open' | 'recording' | 'processing';
  currentDirective: DirectivePayload | null;
  pendingInteraction: MCQState | FillBlankState | RetellState | null;
  silenceTimer: NodeJS.Timeout | null;
  unitSize: 'word' | 'sentence' | 'paragraph';
}
```

Key rules:
- `ttsPlaying` and `recordingState !== 'idle'` must be mutually exclusive
- `pendingInteraction !== null` disables chat input
- SSE stream processing is paused when `pendingInteraction` is active until student answers

## SSE Event Handlers

```typescript
// New handlers to register alongside existing ones (text_delta, heartbeat are pre-existing)
'skill_action'     → parse directive, update activeMode, render UI state
'tts_start'         → fetch /audio/tts?directive_id=... and begin playback
'recording_open'   → request mic permission, start MicControls UI
'recording_closed' → stop recording, upload to GCS, POST to oral-result
'skill_result'     → render feedback inline as Aanya message
'skill_error'      → silently log, clear state, continue
```

## Audio Engine Design

```typescript
class TTSPlayer {
  private audioContext: AudioContext;
  private sourceNode: AudioBufferSourceNode | null = null;
  private playing = false;

  async playStream(url: string): Promise<void>
  stop(): void
  pause(): void
}
class RecorderManager {
  private recorder: MediaRecorder | null = null;
  
  async requestPermission(): Promise<boolean>
  start(onSilence: () => void, silenceMs = 4000): void
  stop(): Promise<<Blob>>               // returns WebM blob
  getSilenceDetector(): Timer         // client-side silence timer
}
```

## Silence Detection

Client-side, no server involvement:
```typescript
// On recording start
const silenceTimer = setTimeout(() => {
  emitConversationAction({ type: 'silence_detected', directive_id: current.id });
  showHelpOffer(); // "Want me to help with this sentence?"
}, 4000);

// Reset on audio input detected (Web Audio API analyser node)
audioAnalyser.onActivityDetected = () => clearTimeout(silenceTimer);
```

## Difficult Word Rendering

Aanya's response text is post-processed before render:
```typescript
// teaching_node emits <<DIFFICULT_WORD>> directives separately
// Frontend maps word → DifficultyWordSpan
// Rendered inline with existing text, subtle underline
<span 
  className="difficult-word" 
  onClick={() => playWordTTS(word, syllables)}
  role="button"
  aria-label={`Pronounce: ${word}`}
>
  {word}
</span>
```

Do not parse response text for difficult words — wait for explicit directive.

## Para Highlight Sync

Google Cloud TTS returns word-level timepoints when SSML timepoint marks are used.  
Backend enriches SSE event with timing data:
```typescript
// SSE payload from tts_start
{
  directive_id: "...",
  timepoints: [
    { word: "The", time_seconds: 0.0 },
    { word: "boy", time_seconds: 0.42 }
  ],
  estimated_ms: 3200
}

// Frontend separately streams audio:
GET /audio/tts?directive_id=...

// Frontend: as audio plays, walk timepoint array
// Highlight current word span using AudioContext.currentTime
```

## API Integration Strategy

- All audio endpoints use `fetch` with `credentials: 'include'` — same JWT auth as existing
- GCS upload: use signed URL from `/audio-upload`, PUT directly to GCS from browser — never proxy audio through backend
- STT result polling not needed — `/oral-result` is synchronous for MVP (<4s)
- MCQ answer: fire-and-forget POST, no loading state shown

## Frontend Implementation Order

1. AudioEngine (TTSPlayer + RecorderManager) — pure utility, no UI
2. New SSE event handlers wired up
3. SpeakerButton on AanyaMessage (Mode 2 — full response)
4. DifficultyWordSpan (Mode 2 — word tap)
5. ParaHighlight + TTS sync (Mode 1)
6. MicControls + ReadingDisplay (Mode 3)
7. SilenceDetector integration
8. UnitSwitcher controls
9. PictureDescribeDisplay (Mode 5)
10. MCQChips + FillBlankInput + RetellPrompt (Mode 6)
11. KaraokeDisplay (Mode 4)

---

# 8. QA Strategy

## Critical Test Scenarios (Must Pass Before Ship)

| # | Scenario | Mode | Pass Condition |
|---|----------|------|---------------|
| 1 | TTS plays full response correctly | 2 | Audio plays, no distortion, stops cleanly |
| 2 | Difficult word tap plays pronunciation | 2 | Correct word audio, not full response |
| 3 | Two audio interactions can't play simultaneously | All | Starting new TTS stops previous |
| 4 | Mic permission denied — session continues | 3 | No crash, Aanya continues text-only |
| 5 | Student reads sentence, gets feedback | 3 | WER calculated, Aanya feedback shown |
| 6 | GCS upload fails silently | 3 | No error shown to student, session continues |
| 7 | MCQ answer recorded and acknowledged | 6 | Aanya responds to correct/incorrect naturally |
| 8 | 4s silence triggers help offer | 3 | "Want me to help?" appears, mic stays open |
| 9 | Para highlight syncs with audio | 1 | Highlight moves word-group by word-group |
| 10 | STT returns empty — graceful retry offer | 3 | "Didn't catch that" message, not error |

## Edge Case Tests

- Tapping difficult word while TTS is mid-playback → queued correctly
- Student submits audio under 1 second → treated as silence, offer retry
- MCQ rendered mid-stream — stream resumes after answer
- Grade 5 student — both spoken and typed dictation offered
- No figure returned from RAG for Mode 5 — fallback text prompt shown
- Silence-detected conversation action emitted mid-student-reading — Aanya queues it, doesn't interrupt

## Regression Risks

- Existing `MATH_DRAW` directive parsing must still work (new directives share the parser)
- Existing `skill_evaluator_node` scoring must not be affected
- Chat input disabled during MCQ must re-enable after answer — test stuck states
- SSE stream must not drop mid-directive (test slow network via DevTools throttling)

## Manual QA Checklist

- [ ] Test on Chrome (desktop), Safari (desktop), Chrome (Android)
- [ ] Test with slow 3G throttling in DevTools
- [ ] Test mic denial flow on each browser
- [ ] Test with school-typical content: NCERT Class 5 English chapter
- [ ] Verify no transcripts appear in server logs
- [ ] Verify GCS audio URLs are signed, not public
- [ ] Verify MCQ chat input re-enables after answer
- [ ] Verify TTS and recording are mutually exclusive (cannot trigger both)

## What Can Be Deferred

- Safari iOS testing (target school devices are primarily Android/Chromebook)
- Screen reader full compliance (ARIA basics are sufficient for Phase 1)
- Gemini audio expression scoring (jiwer WER is sufficient for QA)

---

# 9. Analytics & Observability

## Essential Events to Track

| Event | Properties |
|-------|-----------|
| `skill_mode_triggered` | mode, trigger_type (aanya/student), grade, session_id |
| `tts_played` | mode, directive_id, duration_sec, completed (bool) |
| `recording_started` | mode, unit_size, session_id |
| `recording_submitted` | mode, duration_sec, unit_size |
| `oral_result_returned` | wer, wpm, mode, grade |
| `mcq_answered` | submode, is_correct, grade, skill_id |
| `skill_action_error` | error_code, mode, directive_id |
| `mic_permission_denied` | browser, session_id |
| `silence_detected` | unit_size, pause_duration_sec |
| `difficult_word_tapped` | word, grade, session_id |

## Funnel Metrics

- Mode activation rate per session (how often English skill modes are used)
- Completion rate per mode (skill_mode_triggered → skill_result received)
- Drop-off point per mode (where do students stop?)
- MCQ accuracy rate by grade and sub-mode
- WER distribution by grade

## Error Metrics

- TTS failure rate (target <1%)
- STT empty result rate (target <5%)
- GCS upload failure rate (target <0.5%)
- Directive parse error rate (target 0%)

## Performance Metrics

- TTS first chunk latency (p50, p95)
- STT turnaround time (p50, p95)
- oral-result endpoint latency (p50, p95)

## Minimal Dashboards

1. **Mode health dashboard**: error rates per mode, completion rates, latency p95
2. **Student engagement**: mode activation frequency, WER trends by grade
3. **Infrastructure**: GCS upload success rate, GCP TTS/STT quota utilization

---

# 10. What Small Teams Usually Miss

## Common Mistakes Relevant Here

| Mistake | Risk | Prevention |
|---------|------|-----------|
| Proxying audio through backend | Doubles latency, saturates server bandwidth | Direct GCS PUT from browser via signed URL |
| Not handling MediaRecorder stop race condition | Audio blob arrives after component unmounts → crash | Always await blob in cleanup handler |
| TTS and recording active simultaneously | Audio feedback loop, UX confusion | Mutex in AudioEngine — enforce at state level |
| SSE stream processing not paused during MCQ | Aanya continues speaking while student answers | `pendingInteraction` flag gates stream processing |
| Raw transcripts in structured logs | DPDP violation | Never log `transcript` field, only session_id + score |
| Public GCS URLs in any environment | Audio exposure in school context | Signed URL utility is the only path to audio — no exceptions |
| Long pause detection via server-side STT | Requires streaming STT — overengineered for MVP | Client-side silence timer is correct and sufficient |
| Difficult word TTS re-called on every tap | Latency + GCP quota burn | In-memory LRU cache keyed on (word + grade) within session |
| Chat input not re-enabled after MCQ answer | Student stuck, session abandoned | State machine test: `pendingInteraction → null` on every answer path |
| TTS audio format mismatch | Silent playback failures across browsers | Test WebM/Opus decode on Chrome + Safari before Phase 1 ships |

## Hidden Production Issues

- **GCP TTS quota**: default quota is low for new projects. Request quota increase before launch — not after users start hitting limits.
- **MediaRecorder API**: not available in all browsers without HTTPS. School environments on HTTP intranets will silently fail. Ensure HTTPS everywhere.
- **AudioContext suspended state**: browsers suspend AudioContext until user gesture. First TTS play must be triggered by a user interaction event, not programmatically on page load.
- **STT language model**: for Indian English students reading NCERT content, use `en-IN` language code — not `en-US`. WER will be dramatically different.
- **Difficult word directive volume**: if teaching_node over-tags words, every response becomes a tap-farm. Prompt constraint: max 3 difficult words per response.

---

# 11. Final Checklists

## Backend Engineer Checklist

### Phase 0
- [ ] GCS bucket created with correct IAM (service account, no public access)
- [ ] Signed URL utility function (TTL: 15 min)
- [ ] Google Cloud TTS wrapper (HTTP streaming response)
- [ ] Google Cloud STT async wrapper (batch, `en-IN` model)
- [ ] DB migration applied to staging
- [ ] SSE interceptor scaffolded for 6 new directive types
- [ ] SSE event payload schemas documented and shared with frontend

### Phase 1
- [ ] `/audio/tts` endpoint live (JWT protected)
- [ ] `/audio/word-tts` endpoint live (in-memory LRU cache)
- [ ] `ENGLISH SKILL DIRECTIVES` block added to teaching_node prompt
- [ ] `<<SPEAK_PARA>>` + `<<DIFFICULT_WORD>>` directives parsed and emitting correct SSE events
- [ ] Manual test: Aanya emits SPEAK_PARA → SSE fires → audio endpoint returns audio

### Phase 2
- [ ] `/session/{id}/audio-upload` endpoint (returns signed upload URL + metadata)
- [ ] `/session/{id}/oral-result` endpoint (jiwer WER, OralReadingAnalysis schema)
- [ ] `<<READ_ALOUD>>` directive parsed
- [ ] `<<SHOW_FIGURE_DESCRIBE>>` directive parsed, figure retrieved from RAG
- [ ] `english_skill_sessions` rows created for each interaction
- [ ] No transcripts in logs (verified)

### Phase 3
- [ ] `<<LISTEN_COMPREHENSION>>` directive parsed (mcq, fill_blank, retell sub-modes)
- [ ] `/session/{id}/comprehension-answer` endpoint live
- [ ] MCQ answer persisted in `english_skill_sessions`
- [ ] Conversation-action endpoint live

### Phase 4
- [ ] Mode affinity preference logged to Mem0 per interaction
- [ ] Mem0 read in ZPD/teaching_node for preference-adaptive suggestions

---

## Frontend Engineer Checklist

### Phase 0
- [ ] TTSPlayer class (HTTP audio stream playback, play/stop/pause)
- [ ] RecorderManager class (permission, start/stop, WebM blob)
- [ ] All 6 new SSE event handlers registered (handlers can be stubs initially)
- [ ] AudioContext suspended-state handled (first play on user gesture)
- [ ] Mutual exclusion: TTS playing and recording cannot be active simultaneously

### Phase 1
- [ ] SpeakerButton on every AanyaMessage (triggers `/audio/tts`)
- [ ] DifficultyWordSpan component (tap → `/audio/word-tts`, queued behind current TTS)
- [ ] ParaHighlight component (highlights current para, syncs with TTS timepoints)
- [ ] Waveform/pulse animation during TTS playback
- [ ] TTS stops on new message received

### Phase 2
- [ ] MicButton with animated recording state (pulsing ring)
- [ ] ReadingDisplay: shows source text + unit controls (Word/Sentence/Paragraph)
- [ ] UnitSwitcher: updates state, Aanya's directive respected unless overridden
- [ ] SilenceDetector: 4s client-side timer, triggers help offer event
- [ ] Recording upload: PUT to GCS signed URL directly from browser
- [ ] POST to `/oral-result` after upload, render skill_result inline
- [ ] PictureDescribeDisplay: inline figure + mic prompt

### Phase 3
- [ ] MCQChips: pill buttons, inline chat position, disables chat input
- [ ] FillBlankInput: inline text field mid-message
- [ ] RetellPrompt: mic button with free-form text fallback
- [ ] Chat input re-enables after every interaction type
- [ ] SSE stream processing resumes after answer submitted

### Phase 4
- [ ] Contextual affordances: `Read to me` / `I'll read` / `Repeat` / `Slower` near chunks
- [ ] Student preference signal sent to backend on each affordance tap

---

## Launch Checklist

- [ ] GCP TTS/STT quota increase requested and confirmed
- [ ] HTTPS enforced on all environments (MediaRecorder requires it)
- [ ] GCS signed URL TTL set to 15 min max
- [ ] STT language model set to `en-IN`
- [ ] No public GCS bucket access — verified via GCP console
- [ ] Difficult word max-per-response constraint in teaching_node prompt (≤3)
- [ ] Manual QA checklist completed on Chrome + Android Chrome
- [ ] `english_skill_sessions` table indexes confirmed on staging
- [ ] Error taxonomy agreed between frontend and backend
- [ ] Analytics events firing correctly (spot check 3 modes in staging)

---

## Production Readiness Checklist

- [ ] All audio endpoints return correct `Content-Type` headers
- [ ] TTS endpoint handles GCP errors gracefully (500 → frontend falls back to text)
- [ ] STT endpoint handles empty result gracefully
- [ ] GCS upload failure logged but session not broken
- [ ] Rate limits active on audio endpoints
- [ ] Transcript data never appears in any log sink
- [ ] `english_skill_sessions` has row-level entries for all completed interactions
- [ ] Monitoring dashboard live: error rates per mode, TTS latency p95

---

## Must Not Forget

- [ ] AudioContext gesture requirement — test that first TTS play is always from a click/tap
- [ ] `en-IN` STT model — not `en-US`
- [ ] Mutual exclusion: TTS and recording never active simultaneously
- [ ] MCQ chips must re-enable chat input on answer — test every path
- [ ] Direct GCS upload from browser (never proxy audio through FastAPI)
- [ ] Difficult word TTS cached in session — not re-fetched per tap
- [ ] GCP quota raised before any load testing
- [ ] Signed URLs only — no permanent GCS audio links ever
- [ ] Backend must never block orchestration waiting for playback completion
- [ ] `playback_complete` only affects frontend conversational pacing
- [ ] HTTP carries audio payloads only
- [ ] Audio playback lifecycle is frontend-owned
- [ ] SSE carries orchestration only, never media payloads