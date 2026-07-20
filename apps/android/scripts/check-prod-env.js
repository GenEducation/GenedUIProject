#!/usr/bin/env node
/**
 * Guards against shipping a Play Store release that talks to the dev backend
 * (Play Store compliance review, issue H4). Run before building a release AAB:
 *   npm run verify:prod-env
 */
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env.production");

if (!fs.existsSync(envPath)) {
  console.error(`FAIL: ${envPath} does not exist — release builds need a production env file.`);
  process.exit(1);
}

const contents = fs.readFileSync(envPath, "utf8");

if (/-dev-/.test(contents)) {
  console.error("FAIL: .env.production contains a \"-dev-\" host. Replace it with the production gateway URL before releasing.");
  process.exit(1);
}

if (/REPLACE_WITH_PRODUCTION/.test(contents)) {
  console.error("FAIL: .env.production still has an unfilled placeholder value.");
  process.exit(1);
}

console.log("OK: .env.production looks production-ready.");
