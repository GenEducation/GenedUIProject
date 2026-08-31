import { describe, expect, it } from "vitest";

import {
  DOWNLINK_AUDIO_FRAME_TYPE,
  DOWNLINK_HEADER_BYTES,
  UPLINK_HEADER_BYTES,
  isDownlinkAudioFrame,
  packUplinkFrame,
  parseDownlinkFrame,
} from "../speechPipelineProtocol";

describe("packUplinkFrame", () => {
  it("writes seq and client_ts_ms big-endian, then the raw PCM bytes", () => {
    const pcm = new Uint8Array([0x01, 0x02, 0x03, 0x04]).buffer;
    const frame = packUplinkFrame(42, 1_700_000_000_000, pcm);
    const view = new DataView(frame);

    expect(frame.byteLength).toBe(UPLINK_HEADER_BYTES + 4);
    expect(view.getUint32(0, false)).toBe(42);
    expect(view.getBigUint64(4, false)).toBe(1_700_000_000_000n);
    expect(new Uint8Array(frame, UPLINK_HEADER_BYTES)).toEqual(new Uint8Array(pcm));
  });

  it("is pure — the same seq packs identically every call, incrementing is the caller's job", () => {
    const pcm = new ArrayBuffer(0);
    const a = packUplinkFrame(1, 0, pcm);
    const b = packUplinkFrame(1, 0, pcm);
    expect(new DataView(a).getUint32(0, false)).toBe(new DataView(b).getUint32(0, false));
  });
});

describe("parseDownlinkFrame", () => {
  it("round-trips a hand-built downlink frame matching protocol.py's >BII header", () => {
    const pcm = new Uint8Array([0xaa, 0xbb, 0xcc]);
    const frame = new ArrayBuffer(DOWNLINK_HEADER_BYTES + pcm.byteLength);
    const view = new DataView(frame);
    view.setUint8(0, DOWNLINK_AUDIO_FRAME_TYPE);
    view.setUint32(1, 7, false);
    view.setUint32(5, 3, false);
    new Uint8Array(frame, DOWNLINK_HEADER_BYTES).set(pcm);

    const parsed = parseDownlinkFrame(frame);

    expect(parsed.frameType).toBe(DOWNLINK_AUDIO_FRAME_TYPE);
    expect(parsed.utteranceId).toBe(7);
    expect(parsed.chunkSeq).toBe(3);
    expect(new Uint8Array(parsed.pcm)).toEqual(pcm);
  });

  it("isDownlinkAudioFrame is true only for the known frame type", () => {
    const frame = new ArrayBuffer(DOWNLINK_HEADER_BYTES);
    new DataView(frame).setUint8(0, DOWNLINK_AUDIO_FRAME_TYPE);
    expect(isDownlinkAudioFrame(parseDownlinkFrame(frame))).toBe(true);

    const other = new ArrayBuffer(DOWNLINK_HEADER_BYTES);
    new DataView(other).setUint8(0, 99);
    expect(isDownlinkAudioFrame(parseDownlinkFrame(other))).toBe(false);
  });
});
