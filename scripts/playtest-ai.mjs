import { fileURLToPath } from "node:url";
import { createServer } from "vite";

/**
 * Loads `src/ai/run.ts` through Vite so `@server` aliases resolve.
 * No extra runner package — Vite is already a workspace dependency.
 */
const root = fileURLToPath(new URL("..", import.meta.url));
const server = await createServer({
  configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
  root,
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});

try {
  await server.ssrLoadModule("/src/ai/run.ts");
} finally {
  await server.close();
}
