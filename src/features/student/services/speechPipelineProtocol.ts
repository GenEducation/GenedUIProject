// Pure wire-framing for /ws/v3/voice. Mirrors core-service's
// core_service/voice/pipeline/protocol.py byte-for-byte -- kept in its own module,
// with no WebSocket/AudioContext dependency, so the framing itself is unit-testable.

export const DOWNLINK_AUDIO_FRAME_TYPE = 1;
export const DOWNLINK_HEADER_BYTES = 9; // u8 type + u32 utterance_id + u32 chunk_seq
export const UPLINK_HEADER_BYTES = 12; // u32 seq + u64 client_ts_ms

export function packUplinkFrame(seq: number, clientTsMs: number, pcm: ArrayBuffer): ArrayBuffer {
  const frame = new ArrayBuffer(UPLINK_HEADER_BYTES + pcm.byteLength);
  const view = new DataView(frame);
  view.setUint32(0, seq, false);
  view.setBigUint64(4, BigInt(clientTsMs), false);
  new Uint8Array(frame, UPLINK_HEADER_BYTES).set(new Uint8Array(pcm));
  return frame;
}

export interface DownlinkAudioFrame {
  frameType: number;
  utteranceId: number;
  chunkSeq: number;
  pcm: ArrayBuffer;
}

export function parseDownlinkFrame(frame: ArrayBuffer): DownlinkAudioFrame {
  const view = new DataView(frame);
  return {
    frameType: view.getUint8(0),
    utteranceId: view.getUint32(1, false),
    chunkSeq: view.getUint32(5, false),
    pcm: frame.slice(DOWNLINK_HEADER_BYTES),
  };
}

export function isDownlinkAudioFrame(frame: DownlinkAudioFrame): boolean {
  return frame.frameType === DOWNLINK_AUDIO_FRAME_TYPE;
}
