// Read-aloud capture (W1): the microphone -> 16 kHz mono 16-bit PCM frames of 20 ms, posted to the page, which sends them
// straight to the socket. Nothing is recorded, stored or kept: a frame lives only until it is sent. Linear interpolation is
// enough for recognising a few read-aloud sentences; the voice lesson has its own, stricter capture path.
"use strict";

const OUT_RATE = 16000;
const FRAME = 320;

class PcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.step = sampleRate / OUT_RATE;   // input samples per output sample
    this.pos = 0;                         // fractional read position inside `this.tail`
    this.tail = new Float32Array(0);
    this.out = new Int16Array(FRAME);
    this.n = 0;
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;
    const merged = new Float32Array(this.tail.length + channel.length);
    merged.set(this.tail);
    merged.set(channel, this.tail.length);
    let pos = this.pos;
    while (pos + 1 < merged.length) {
      const i = Math.floor(pos);
      const frac = pos - i;
      const sample = merged[i] * (1 - frac) + merged[i + 1] * frac;
      this.out[this.n++] = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
      if (this.n === FRAME) {
        const frame = this.out.slice().buffer;
        this.port.postMessage(frame, [frame]);
        this.n = 0;
      }
      pos += this.step;
    }
    const keep = Math.floor(pos);
    this.tail = merged.slice(keep);
    this.pos = pos - keep;
    return true;
  }
}

registerProcessor("pcm-capture", PcmCapture);
