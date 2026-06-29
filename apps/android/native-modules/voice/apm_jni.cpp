// JNI bridge over the WebRTC AudioProcessingModule (AEC3 + NS + AGC2 + HPF).
//
// Built and linked into libvoiceapm.so per-ABI by scripts/build-webrtc-apm.sh against the
// standalone `webrtc-audio-processing` tree (v1.3). The modern API uses AudioProcessingBuilder
// and the EchoCanceller3 backend — the same echo canceller Chrome uses for
// getUserMedia({ echoCancellation: true }).
//
// All streams here are mono 16-bit PCM at the capture rate (16 kHz). The APM processes
// 10 ms frames (160 samples @ 16 kHz).

#include <jni.h>
#include <cstdint>
#include <vector>

#include "modules/audio_processing/include/audio_processing.h"

using webrtc::AudioProcessing;
using webrtc::AudioProcessingBuilder;
using webrtc::StreamConfig;

namespace {

struct ApmContext {
  rtc::scoped_refptr<AudioProcessing> apm;
  StreamConfig capture_config;
  StreamConfig render_config;
  int capture_rate;
  int render_rate;
};

}  // namespace

extern "C" {

JNIEXPORT jlong JNICALL
Java_ai_geneducation_app_VoiceAudioEngine_nativeCreate(
    JNIEnv* /*env*/, jobject /*thiz*/, jint captureRate, jint renderRate) {
  auto* ctx = new ApmContext();
  ctx->capture_rate = captureRate;
  ctx->render_rate = renderRate;
  ctx->capture_config = StreamConfig(captureRate, /*num_channels=*/1);
  ctx->render_config = StreamConfig(renderRate, /*num_channels=*/1);

  AudioProcessing::Config config;
  config.echo_canceller.enabled = true;        // AEC3
  config.echo_canceller.mobile_mode = false;   // full AEC3, not the legacy AECM
  config.noise_suppression.enabled = true;
  config.noise_suppression.level = AudioProcessing::Config::NoiseSuppression::kHigh;
  config.gain_controller2.enabled = true;      // AGC2 (adaptive digital)
  config.high_pass_filter.enabled = true;

  ctx->apm = AudioProcessingBuilder().Create();
  if (!ctx->apm) {
    delete ctx;
    return 0;
  }
  ctx->apm->ApplyConfig(config);
  return reinterpret_cast<jlong>(ctx);
}

JNIEXPORT void JNICALL
Java_ai_geneducation_app_VoiceAudioEngine_nativeProcessReverse(
    JNIEnv* env, jobject /*thiz*/, jlong handle, jshortArray far) {
  auto* ctx = reinterpret_cast<ApmContext*>(handle);
  if (!ctx || !ctx->apm) return;

  const jsize n = env->GetArrayLength(far);
  std::vector<int16_t> buf(n);
  env->GetShortArrayRegion(far, 0, n, reinterpret_cast<jshort*>(buf.data()));

  ctx->apm->ProcessReverseStream(
      buf.data(), ctx->render_config, ctx->render_config, buf.data());
}

JNIEXPORT jshortArray JNICALL
Java_ai_geneducation_app_VoiceAudioEngine_nativeProcessCapture(
    JNIEnv* env, jobject /*thiz*/, jlong handle, jshortArray near) {
  auto* ctx = reinterpret_cast<ApmContext*>(handle);
  const jsize n = env->GetArrayLength(near);
  std::vector<int16_t> buf(n);
  env->GetShortArrayRegion(near, 0, n, reinterpret_cast<jshort*>(buf.data()));

  if (ctx && ctx->apm) {
    ctx->apm->ProcessStream(
        buf.data(), ctx->capture_config, ctx->capture_config, buf.data());
  }

  jshortArray out = env->NewShortArray(n);
  env->SetShortArrayRegion(out, 0, n, reinterpret_cast<jshort*>(buf.data()));
  return out;
}

JNIEXPORT void JNICALL
Java_ai_geneducation_app_VoiceAudioEngine_nativeSetStreamDelayMs(
    JNIEnv* /*env*/, jobject /*thiz*/, jlong handle, jint delayMs) {
  auto* ctx = reinterpret_cast<ApmContext*>(handle);
  if (ctx && ctx->apm) ctx->apm->set_stream_delay_ms(delayMs);
}

JNIEXPORT void JNICALL
Java_ai_geneducation_app_VoiceAudioEngine_nativeDestroy(
    JNIEnv* /*env*/, jobject /*thiz*/, jlong handle) {
  auto* ctx = reinterpret_cast<ApmContext*>(handle);
  delete ctx;  // scoped_refptr releases the APM
}

}  // extern "C"
