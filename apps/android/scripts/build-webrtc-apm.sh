#!/usr/bin/env bash
# Build the WebRTC AudioProcessingModule (AEC3) into libvoiceapm.so for each Android ABI.
#
# Produces android/app/src/main/jniLibs/<abi>/libvoiceapm.so — the native engine that
# VoiceAudioEngine.kt loads via System.loadLibrary("voiceapm"). The .so files are committed,
# so this only needs re-running when the WebRTC pin, the NDK, or apm_jni.cpp changes.
#
# Requirements: Android NDK (path via $ANDROID_NDK_HOME or auto-detected), meson + ninja
# (`pip install --user meson ninja`), git. Cross-compiles with the NDK's clang per ABI; the
# upstream library is meson-based (v1.3) and pulls abseil via its subproject wrap.
#
# The build (meson) output goes to a scratch dir; only the final stripped .so is vendored.
set -euo pipefail

PIN="v1.3"
API="24"   # must be <= app minSdkVersion
REPO="https://gitlab.freedesktop.org/pulseaudio/webrtc-audio-processing.git"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CPP="$SCRIPT_DIR/../android/app/src/main/cpp"
SRC="$CPP/third_party/webrtc-audio-processing"
JNILIBS="$SCRIPT_DIR/../android/app/src/main/jniLibs"
BUILD_ROOT="${TMPDIR:-/tmp}/voiceapm-build"

# NDK toolchain (Windows host shown; adjust prebuilt dir for linux/darwin if needed).
NDK="${ANDROID_NDK_HOME:-$ANDROID_HOME/ndk/27.1.12297006}"
HOSTTAG="$(uname -s | grep -qi mingw && echo windows-x86_64 || (uname -s | grep -qi darwin && echo darwin-x86_64 || echo linux-x86_64))"
NDKBIN="$NDK/toolchains/llvm/prebuilt/$HOSTTAG/bin"
EXE=""; [ "$HOSTTAG" = "windows-x86_64" ] && EXE=".cmd"

# abi -> meson cpu_family,cpu | clang triple prefix
abi_triple() { case "$1" in
  arm64-v8a)   echo "aarch64 aarch64 aarch64-linux-android$API" ;;
  armeabi-v7a) echo "arm armv7 armv7a-linux-androideabi$API" ;;
  x86_64)      echo "x86_64 x86_64 x86_64-linux-android$API" ;;
esac; }

if [ ! -d "$SRC/.git" ]; then
  echo "[build-webrtc-apm] cloning $REPO@$PIN"
  rm -rf "$SRC"; mkdir -p "$(dirname "$SRC")"
  git clone --depth 1 --branch "$PIN" "$REPO" "$SRC"
fi

meson() { python -m mesonbuild.mesonmain "$@"; }

for ABI in arm64-v8a armeabi-v7a x86_64; do
  read -r FAMILY CPU TRIPLE <<<"$(abi_triple "$ABI")"
  echo "==== $ABI ($TRIPLE) ===="
  CROSS="$BUILD_ROOT/$ABI.cross"; BDIR="$BUILD_ROOT/$ABI"; mkdir -p "$BUILD_ROOT"
  cat > "$CROSS" <<EOF
[binaries]
c = '$NDKBIN/${TRIPLE}-clang$EXE'
cpp = '$NDKBIN/${TRIPLE}-clang++$EXE'
ar = '$NDKBIN/llvm-ar$EXE'
strip = '$NDKBIN/llvm-strip$EXE'
[host_machine]
system = 'android'
cpu_family = '$FAMILY'
cpu = '$CPU'
endian = 'little'
EOF

  rm -rf "$BDIR"
  meson setup "$BDIR" --cross-file "$CROSS" --default-library=static \
    --buildtype=release -Dgnustl=disabled
  meson compile -C "$BDIR"

  # Compile the JNI bridge and statically link the APM + abseil + deps into libvoiceapm.so.
  CXX="$NDKBIN/${TRIPLE}-clang++$EXE"
  "$CXX" -std=c++17 -fPIC -O2 -DWEBRTC_POSIX -DWEBRTC_ANDROID \
    -I "$SRC/webrtc" -I "$SRC/subprojects/abseil-cpp-20230125.1" \
    -c "$CPP/apm_jni.cpp" -o "$BDIR/apm_jni.o"
  ARCHIVES=$(find "$BDIR" -name '*.a')
  # 16KB page alignment is required for shared libs on Android 15+ devices.
  "$CXX" -shared -o "$BDIR/libvoiceapm.so" "$BDIR/apm_jni.o" \
    -Wl,--start-group $ARCHIVES -Wl,--end-group \
    -llog -static-libstdc++ -Wl,--gc-sections \
    -Wl,-z,max-page-size=16384 -Wl,-z,common-page-size=16384

  mkdir -p "$JNILIBS/$ABI"
  "$NDKBIN/llvm-strip$EXE" --strip-unneeded "$BDIR/libvoiceapm.so" -o "$JNILIBS/$ABI/libvoiceapm.so"
  echo "[build-webrtc-apm] -> $JNILIBS/$ABI/libvoiceapm.so"
done

echo "[build-webrtc-apm] done."
