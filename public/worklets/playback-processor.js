// Downlink playback worklet for /ws/v3/voice (speech-pipeline-architecture.md §2 A8-A10).
//
// Owns the jitter buffer and is the source of truth for `played_until_ms`: it reports
// bytes actually pushed to the DAC, not bytes the main thread received off the socket
// (design doc §7.4 -- that distinction is what makes barge-in truncation honest).

const SAMPLE_RATE = 24000;
const JITTER_CHUNKS = 3; // ~120ms before playback starts, absorbing network jitter

class PlaybackProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._queue = [];
    this._readOffset = 0;
    this._playedSamples = 0;
    this._started = false;
    this._paused = false;
    this.port.onmessage = (event) => this._onMessage(event.data);
  }

  _onMessage(msg) {
    if (msg.type === "enqueue") {
      this._queue.push(new Int16Array(msg.pcm));
      if (!this._started && this._bufferedChunks() >= JITTER_CHUNKS) {
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
      this._readOffset = 0;
      this._started = false;
      this._paused = false;
    }
  }

  _bufferedChunks() {
    return this._queue.length;
  }

  process(_inputs, outputs) {
    const output = outputs[0][0];
    if (!output) return true;

    if (!this._started || this._paused) {
      output.fill(0);
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
        this._readOffset = 0;
      }
    }

    // Throttled position report -- once per render quantum is enough for the main
    // thread's played_until_ms bookkeeping without flooding postMessage.
    this.port.postMessage({
      type: "position",
      playedUntilMs: Math.round((this._playedSamples / SAMPLE_RATE) * 1000),
      queueEmpty: this._queue.length === 0,
    });

    return true;
  }
}

registerProcessor("playback-processor", PlaybackProcessor);
