// This checks disclosure configuration only. Provider contracts, RLS deployment,
// retention and operational procedures still require the documented review.
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const ts = require("typescript");
const code = ts.transpileModule(readFileSync(join(__dirname, "../lib/privacy-config.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const config = {};
new Function("exports", code)(config);
const state = config.getPrivacyDeployment();
console.log(`Website registration: ${state.registrationOpen ? "enabled" : "closed"}`);
if (state.missing.length) console.log(`Missing verified disclosure settings: ${state.missing.join(", ")}`);
console.log("Review docs/privacy-launch-readiness.md before opening public registration. This check is not legal certification and does not configure Supabase signup.");
process.exitCode = state.registrationOpen ? 0 : 1;
