import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * The `src/server` override is the architectural boundary from the SPDD, not a
 * style preference: the reducer stays pure so a match can be replayed from its
 * action log. `src/architecture/engine-purity.test.ts` enforces the same rule.
 */
export default tseslint.config(
  { ignores: ["dist", "node_modules", "coverage"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
  },
  {
    files: ["src/server/**/*.ts"],
    languageOptions: {
      globals: {},
    },
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "window", message: "The game engine must not touch the DOM." },
        { name: "document", message: "The game engine must not touch the DOM." },
        { name: "localStorage", message: "Persistence is an adapter, not a rules source." },
        { name: "sessionStorage", message: "Persistence is an adapter, not a rules source." },
        { name: "fetch", message: "The game engine must not perform I/O." },
        { name: "WebSocket", message: "Networking is an adapter, not a rules source." },
      ],
      "no-restricted-properties": [
        "error",
        { object: "Math", property: "random", message: "Inject an RNG instead." },
        { object: "Date", property: "now", message: "Nondeterminism must be passed in explicitly." },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: "The game engine must not depend on React." },
            { name: "react-dom", message: "The game engine must not depend on React." },
            { name: "react-router", message: "The game engine must not depend on the match UI router." },
            { name: "react-router-dom", message: "The game engine must not depend on the match UI router." },
            { name: "zustand", message: "The game engine must not depend on Zustand." },
            { name: "peerjs", message: "The game engine must not depend on PeerJS." },
            { name: "nanoid", message: "Ids entering the engine are supplied by the caller." },
            { name: "@/metrics", message: "Metrics is an adapter, not a rules source." },
            { name: "@client/metrics", message: "Metrics is an adapter, not a rules source." },
          ],
          patterns: [
            {
              group: [
                "@/ui/*",
                "@/store/*",
                "@/networking/*",
                "@/decks/*",
                "@/app/*",
                "@/metrics/*",
                "@client/*",
              ],
            },
          ],
        },
      ],
    },
  },
);
