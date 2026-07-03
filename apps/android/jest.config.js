/**
 * Jest config for the Expo / React Native app.
 *
 * Uses the Expo-maintained `jest-expo` preset, which wires up babel-preset-expo
 * (already configured in babel.config.js) and the RN transform pipeline.
 */
const path = require("path");

module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  // Mirror the "@/*" -> "src/*" alias from tsconfig.json.
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // jest-expo ships a default ignore list; extend it so the RN/Expo ESM
  // packages this app depends on are still transpiled by Babel.
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-google-signin/.*|expo|expo-.*|@expo/.*|react-native-.*|lucide-react-native|zustand))",
  ],
  testMatch: ["**/__tests__/**/*.test.{ts,tsx}"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/__tests__/**",
  ],
  coverageDirectory: path.join(__dirname, "coverage"),
};
