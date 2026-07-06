# Canvas Image Fit And Compare Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make uploaded and generated canvas images display fully in their nodes, and add a draggable before/after comparison for generated images.

**Architecture:** Keep the existing single-file CanvasView structure. Extend `VisualCanvasNode` and `VisualPreviewImage` with optional source image metadata, pass that metadata into the preview modal, and implement comparison entirely in React/CSS without new dependencies.

**Tech Stack:** React 19, TypeScript, Vite, Node test runner, CSS.

---

### Task 1: Lock Image Fit And Compare Contracts

**Files:**
- Test: `tests/canvas-image-fit-compare.test.mjs`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

test("canvas image nodes preserve full image content", () => {
  assert.match(stylesSource, /\.visual-node-image img[\s\S]*object-fit: contain/);
});

test("generated canvas nodes remember the source image for comparison", () => {
  assert.match(appSource, /sourceImageUrl\?: string/);
  assert.match(appSource, /sourceImageUrl:\s*imageNode\?\.imageUrl/);
});

test("preview modal exposes draggable generated image comparison", () => {
  assert.match(appSource, /comparisonSlider/);
  assert.match(appSource, /visual-preview-compare/);
  assert.match(stylesSource, /\.visual-preview-comparison-layer/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests\canvas-image-fit-compare.test.mjs`
Expected: FAIL because `sourceImageUrl`, `comparisonSlider`, and compare CSS do not exist yet.

- [ ] **Step 3: Implement minimal behavior**

In `src/App.tsx`, add optional `sourceImageUrl` and `sourceTitle` to `VisualCanvasNode`, add optional compare fields to `VisualPreviewImage`, store the source image when generation succeeds, and render a slider compare view when preview data contains a compare image.

In `src/styles.css`, change `.visual-node-image img` to `object-fit: contain`, add a neutral background for letterboxing, and add compare overlay CSS.

- [ ] **Step 4: Run verification**

Run:
```bash
node --test tests\canvas-image-fit-compare.test.mjs
pnpm exec tsc --noEmit
pnpm run build
```

Expected: all pass; Vite may keep the existing large chunk warning.

- [ ] **Step 5: Browser check**

Reload `http://127.0.0.1:5173/`, open the canvas, verify image nodes no longer crop images, and verify generated image preview exposes a before/after slider when a generated node has a source image.
