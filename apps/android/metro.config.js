// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Allow .html files to be bundled as assets (e.g. tutorial-walkthrough.html via require())
config.resolver.assetExts = [...(config.resolver.assetExts ?? []), "html"];

// `react-native-audio-api` ships Apple-only ffmpeg `.xcframework` bundles that
// contain macOS-style symlinks. On Windows, Metro's file watcher can't `lstat`
// those symlinks and crashes with EACCES while crawling node_modules. These
// files are never needed for Android/JS bundling, so exclude them from Metro's
// file map (blockList is what metro-file-map uses as its ignore pattern).
const blockList = /react-native-audio-api[\\/].*\.xcframework[\\/].*/;

const existing = config.resolver.blockList;
config.resolver.blockList = Array.isArray(existing)
  ? [...existing, blockList]
  : existing
    ? [existing, blockList]
    : [blockList];

module.exports = config;
