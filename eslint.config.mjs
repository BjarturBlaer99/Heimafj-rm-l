import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// Keep the Hooks checks enabled by the previous Next 15 configuration. Adopting
// additional React Compiler checks is separate from this framework migration.
const existingHookRules = new Set([
  "react-hooks/rules-of-hooks",
  "react-hooks/exhaustive-deps"
]);

const compatibleVitals = nextVitals.map((config) => {
  if (!config.rules) return config;
  return {
    ...config,
    rules: Object.fromEntries(
      Object.entries(config.rules).filter(([name]) =>
        !name.startsWith("react-hooks/") || existingHookRules.has(name)
      )
    )
  };
});

const config = [
  ...compatibleVitals,
  ...nextTypescript,
  { ignores: ["mobile/**", "scripts/**"] }
];

export default config;
