import { nanoid } from "nanoid";
import { createBrowserMetricsRepository } from "./browserRepo.js";
import { createMetricsCollector } from "./collector.js";

export const metricsCollector = createMetricsCollector({
  repo: createBrowserMetricsRepository(),
  clock: { now: () => Date.now() },
  newId: () => nanoid(12),
});
