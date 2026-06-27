// Test preload: registers a global DOM (document, window, etc.) so tests can
// exercise DOM-touching code like el()/svgEl() and the renderers under `bun test`.
import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register();
