// voice_wire_v1 binary frames (ADR 0015 decisions 3-4). Header big-endian; PCM16 little-endian.
export const PROTOCOL = "voice_wire_v1";
export const FLAG_VOICED = 1, FLAG_PREROLL = 2, FLAG_GAP = 4;

export function encodeUplink({ seq, audioTsUs, pcm, voiced = false, preroll = false, gap = false, speechProb = 0 }) {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  const out = new Uint8Array(15 + bytes.length);
  const v = new DataView(out.buffer);
  v.setUint8(0, 1);
  v.setUint8(1, (voiced ? FLAG_VOICED : 0) | (preroll ? FLAG_PREROLL : 0) | (gap ? FLAG_GAP : 0));
  v.setUint32(2, seq);
  v.setBigUint64(6, BigInt(Math.max(0, Math.round(audioTsUs))));
  v.setUint8(14, Math.max(0, Math.min(255, Math.round(speechProb))));
  out.set(bytes, 15);
  return out.buffer;
}

export function decodeDownlink(buffer) {
  const v = new DataView(buffer);
  if (buffer.byteLength < 14 || v.getUint8(0) !== 2) throw new Error("not a downlink audio frame");
  return {
    final: (v.getUint8(1) & 1) === 1,
    responseNo: v.getUint32(2),
    segmentSeq: v.getUint32(6),
    chunk: v.getUint32(10),
    pcm: new Int16Array(buffer.slice(14)),
  };
}
