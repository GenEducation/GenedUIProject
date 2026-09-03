// Downlink playback worklet for /ws/v3/voice (speech-pipeline-architecture.md §2 A8-A10).
//
// Owns the jitter buffer and is the source of truth for `played_until_ms`: it reports
// bytes actually pushed to the DAC, not bytes the main thread received off the socket
// (design doc §7.4 -- that distinction is what makes barge-in truncation honest).
//
// The queue is BOUNDED. It used to be a plain array that grew with whatever arrived,
// which is a real problem rather than a theoretical one: the server synthesizes several
// segments concurrently (SYNTH_LOOKAHEAD) and sends each one the moment it exists, at
// well above realtime, so the buffer routinely runs seconds ahead of playback and on a
// slow client or a hidden tab it simply keeps growing. Three consequences:
//
//   * memory grows without limit over a long lesson;
//   * a barge-in throws away more and more already-transmitted audio, so the provider
//     spend and the bandwidth were both wasted;
//   * `played_until_ms` diverges further and further from what was *sent*, which is
//     exactly the gap the heard-text reconciliation has to close.
//
// The fix is a target lead the SERVER respects (it stops synthesizing ahead once the
// client reports it has enough -- see BUFFER_REPORT_INTERVAL_MS) plus a hard ceiling
// here as a safety net. The ceiling never silently discards audio: dropping a chunk in
// the middle of an utterance is the same class of failure as dropping a TTS segment
// server-side -- the child hears a fluent sentence with a hole in it -- so an overflow
// is reported to the main thread and surfaced, not swallowed.

const SAMPLE_RATE = 24000;
const BYTES_PER_SAMPLE = 2;

// ~120ms before playback starts, absorbing network jitter. Expressed in milliseconds
// rather than "3 chunks" because chunk size is a server-side framing detail
// (_DOWNLINK_CHUNK_BYTES) and a jitter buffer measured in chunks silently changes
// duration whenever that constant is retuned.
const MIN_JITTER_MS = 120;

// What the server aims to keep buffered here. Comfortably more than MIN_JITTER_MS so a
// slow segment cannot starve playback, far less than the tens of seconds an unbounded
// queue reached.
const TARGET_LEAD_MS = 3000;

// The point at which the client asks the server to stop getting further ahead.
const MAX_LEAD_MS = 6000;

// Hard ceiling. Only reachable if the server ignores backpressure entirely (an older
// build, or a bug); at that point refusing audio is better than growing without bound,
// but it is reported rather than hidden.
const ABSOLUTE_MAX_MS = 30000;

const BUFFER_REPORT_INTERVAL_MS = 100;

class PlaybackProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._queue = [];
    this._queuedSamples = 0;
    this._readOffset = 0;
    this._playedSamples = 0;
    this._started = false;
    this._paused = false;
    this._droppedChunks = 0;
    this._lastReportMs = 0;
    this._elapsedMs = 0;
    this.port.onmessage = (event) => this._onMessage(event.data);
  }

  _bufferedMs() {
    return ((this._queuedSamples - this._readOffset) / SAMPLE_RATE) * 1000;
  }

  _onMessage(msg) {
    if (msg.type === "enqueue") {
      const chunk = new Int16Array(msg.pcm);
      if (this._bufferedMs() >= ABSOLUTE_MAX_MS) {
        // Never silent -- see the header. The main thread turns this into a visible
        // error, because a hole in the middle of an utterance that nobody reports is
        // indistinguishable to the child from the tutor simply being wrong.
        this._droppedChunks++;
        this.port.postMessage({
          type: "overflow",
          droppedChunks: this._droppedChunks,
          bufferedMs: Math.round(this._bufferedMs()),
        });
        return;
      }
      this._queue.push(chunk);
      this._queuedSamples += chunk.length;
      if (!this._started && this._bufferedMs() >= MIN_JITTER_MS) {
        this._started = true;
      }
    } else if (msg.type === "pause") {
      // An interruption the CLIENT believes in but the server has not confirmed yet.
      // Silences output instantly (design doc A11 -- never wait for a round trip) while
      // keeping the queue intact, because that belief is often wrong: the 400ms energy
      // gate fires on playback echo and room noise too. This used to be a "clear", and
      // since the server streams audio faster than real time the buffer routinely holds
      // several seconds of speech -- so a single false positive silently destroyed a
      // large chunk of the reply. That is what "it only ever speaks part of the
      // response" was.
      this._paused = true;
    } else if (msg.type === "resume") {
      // The server read the transcript and there was no interruption after all.
      this._paused = false;
    } else if (msg.type === "clear") {
      // A CONFIRMED cancel: this audio is genuinely stale, drop it.
      this._queue = [];
      this._queuedSamples = 0;
      this._readOffset = 0;
      this._started = false;
      this._paused = false;
    }
  }

  process(_inputs, outputs) {
    const output = outputs[0][0];
    if (!output) return true;

    this._elapsedMs += (output.length / sampleRate) * 1000;

    if (!this._started || this._paused) {
      output.fill(0);
      this._maybeReport();
      return true;
    }

    for (let i = 0; i < output.length; i++) {
      if (this._queue.length === 0) {
        output[i] = 0;
        continue;
      }
      const current = this._queue[0];
      output[i] = current[this._readOffset] / 0x8000;
      this._readOffset++;
      this._playedSamples++;
      if (this._readOffset >= current.length) {
        this._queue.shift();
        this._queuedSamples -= current.length;
        this._readOffset = 0;
      }
    }

    this._maybeReport();
    return true;
  }

  _maybeReport() {
    // Throttled: once per render quantum floods postMessage at 375Hz for a value the
    // main thread only forwards to the server every BUFFER_REPORT_INTERVAL_MS anyway.
    if (this._elapsedMs - this._lastReportMs < BUFFER_REPORT_INTERVAL_MS) return;
    this._lastReportMs = this._elapsedMs;
    const bufferedMs = Math.round(this._bufferedMs());
    this.port.postMessage({
      type: "position",
      playedUntilMs: Math.round((this._playedSamples / SAMPLE_RATE) * 1000),
      queueEmpty: this._queue.length === 0,
      bufferedMs,
      // The server's cue to stop or resume synthesizing ahead. Computed here rather than
      // on the main thread so the thresholds live next to the queue they describe.
      wantMore: bufferedMs < TARGET_LEAD_MS,
      saturated: bufferedMs >= MAX_LEAD_MS,
    });
  }
}

registerProcessor("playback-processor", PlaybackProcessor);
