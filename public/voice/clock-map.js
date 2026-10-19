// The audio clock as the session worker can read it (ADR 0015 decision 6). A worker cannot read `AudioContext.currentTime`, but
// every capture frame carries the audio-clock time at which the audio thread posted it (`postTs`), and the worker knows when it
// arrived on its own monotonic clock. A frame is never delivered early, so the pair with the largest (postTs - arrival) is the
// one that was delivered fastest, and that difference is the offset between the two clocks to within the fastest delivery
// (well under a millisecond). It is the maximum over a sliding window, so drift cannot accumulate. Wall clocks are never used.
// Pure: times are arguments.

export class ClockMap {
  constructor({ windowS = 10, staleS = 1.5 } = {}) {
    this.windowS = windowS; this.staleS = staleS;
    this.q = [];                 // [arrival, offset], offsets decreasing from the front: a monotonic deque for the window maximum
    this.last = -Infinity;
  }
  observe(postTs, arrivalS) {
    const offset = postTs - arrivalS;
    while (this.q.length && this.q[this.q.length - 1][1] <= offset) this.q.pop();
    this.q.push([arrivalS, offset]);
    this.last = arrivalS;
    while (this.q[0][0] < arrivalS - this.windowS) this.q.shift();
  }
  // The audio-clock time (seconds) at worker time `nowS`, or null when no frame has arrived lately (nothing to read it from).
  audioNow(nowS) {
    if (!this.q.length || nowS - this.last > this.staleS) return null;
    return nowS + this.q[0][1];
  }
}
