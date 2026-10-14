# Voice audio pipeline (vendored)

Unmodified copy of the backend's reference browser client for `voice_wire_v1`:
`backend/tools/voice_dev/src/voice_dev/static/audio/` at commit `4eb29b6` plus the uncommitted VAD v4 / echo-aware work of 2026-10-13 (branch `feat/voice-multilingual-m1`;
`vad-worklet.js` is new and is loaded before `capture-worklet.js`).

Served as static files (not bundled) because `pipeline.js` loads its audio worklets
(`capture-worklet.js`, `playback-worklet.js`) and its session worker (`session-worker.js`)
by URL relative to itself. The lesson screen loads it from
`src/features/learning/voice/loadPipeline.ts`.

Do not edit these files here. To update, copy the folder again from the backend and
bump the commit above. Protocol: backend ADR 0015 (voice wire protocol and events).
