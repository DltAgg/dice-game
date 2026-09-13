import { afterEach, beforeEach } from "vitest";
import {
  clearOverlayLookups,
  reapplyRememberedOverlays,
} from "../content/runtimeOverlay.js";
import { installDefaultTestCatalogue, installSharedBehaviorCards } from "./fixtures/kit.js";

beforeEach(() => {
  clearOverlayLookups();
  installDefaultTestCatalogue();
  installSharedBehaviorCards();
  reapplyRememberedOverlays();
});

afterEach(() => {
  clearOverlayLookups();
});
