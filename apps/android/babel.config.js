module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    env: {
      // Strip console.log/debug/info from release builds (keep error/warn so real
      // failures still surface) — Play Store compliance review, issue M3. Requires
      // `npm install` to pull in babel-plugin-transform-remove-console before it
      // takes effect.
      production: {
        plugins: [
          ["transform-remove-console", { exclude: ["error", "warn"] }],
        ],
      },
    },
  };
};
