/**
 * Expo config plugin — injects the native voice/AEC modules into the generated Android
 * project so they survive `expo prebuild` (which regenerates the gitignored android/ folder
 * from templates and would otherwise drop manually-added native code).
 *
 * Source of truth lives in ../native-modules/voice (tracked in git). On every prebuild this
 * plugin:
 *   1. copies the Kotlin modules into the app package,
 *   2. copies the prebuilt libvoiceapm.so per ABI into jniLibs,
 *   3. registers VoiceAudioPackage + AECPackage in MainApplication.kt,
 *   4. restricts abiFilters to the ABIs we ship a .so for.
 */
const {
  withDangerousMod,
  withMainApplication,
  withAppBuildGradle,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PKG_PATH = "ai/geneducation/app";
const SRC_DIR = path.join(__dirname, "..", "native-modules", "voice");

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, entry.name);
    const d = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

// 1 + 2: copy Kotlin sources and prebuilt .so into the generated project.
function withVoiceNativeFiles(config) {
  return withDangerousMod(config, [
    "android",
    (cfg) => {
      const androidRoot = cfg.modRequest.platformProjectRoot;
      const javaDir = path.join(androidRoot, "app/src/main/java", PKG_PATH);
      copyDir(path.join(SRC_DIR, "kotlin"), javaDir);
      copyDir(path.join(SRC_DIR, "jniLibs"), path.join(androidRoot, "app/src/main/jniLibs"));
      return cfg;
    },
  ]);
}

// 3: register the packages in MainApplication.kt (same package, so no imports needed).
function withPackageRegistration(config) {
  return withMainApplication(config, (cfg) => {
    let src = cfg.modResults.contents;
    const anchor = "PackageList(this).packages.apply {";
    if (!src.includes("VoiceAudioPackage()") && src.includes(anchor)) {
      src = src.replace(
        anchor,
        `${anchor}\n              add(AECPackage())\n              add(VoiceAudioPackage())`
      );
      cfg.modResults.contents = src;
    }
    return cfg;
  });
}

// 4: limit packaged ABIs to the ones we ship libvoiceapm.so for.
function withAbiFilters(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    // Always enforce arm64-only for smaller APK size (~65 MB vs ~120 MB).
    src = src.replace(
      /ndk\s*\{[^}]*abiFilters[^}]*\}/,
      `ndk { abiFilters "arm64-v8a" }`
    );
    if (!src.includes("abiFilters")) {
      src = src.replace(
        /defaultConfig\s*{/,
        `defaultConfig {\n        ndk { abiFilters "arm64-v8a" }`
      );
    }
    cfg.modResults.contents = src;
    return cfg;
  });
}

module.exports = function withVoiceEngine(config) {
  config = withVoiceNativeFiles(config);
  config = withPackageRegistration(config);
  config = withAbiFilters(config);
  return config;
};
