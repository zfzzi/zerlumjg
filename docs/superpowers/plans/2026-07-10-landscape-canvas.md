# Landscape Canvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the unified canvas into a landscape scheme board with reliable connectors, explicit reference roles, landscape generation modes, and useful empty and failure states.

**Architecture:** Preserve the existing image/video node engine, version history, provider routing and mounted-view behavior. Add landscape semantics at the node and edge boundary, then fix connector geometry without changing canvas coordinate math. Keep video as an optional node action rather than a fourth workspace view.

**Tech Stack:** React 19, TypeScript, SVG edges, Pointer Events, existing RunningHub/OpenAI image routes, Ark Seedance video route, Node test runner.

---

## File map

- Modify `src/App.tsx`: canvas roles, generation modes, node menu, empty state and prompt payloads.
- Create `src/views/canvas/canvas-model.ts`: canvas domain types and pure role/mode helpers.
- Create `src/views/canvas/CanvasNodeCard.tsx`: node rendering and node-local interactions.
- Create `src/views/canvas/LandscapeCanvasView.tsx`: canvas state, transforms, uploads, provider calls and orchestration.
- Modify `src/styles.css`: connector hit target, node menu, canvas empty state and focus styles.
- Modify `api/_zerlum-server.ts`: landscape prompt-generation wording.
- Modify `vite.config.ts`: same local prompt wording through shared helpers.
- Modify `tests/unified-canvas-video-workflow.test.mjs`: landscape roles and connector regression.
- Create `tests/landscape-canvas.test.mjs`: landscape task and empty-state contract.
- Modify `tests/canvas-image-fit-compare.test.mjs`: landscape visual prompt expectations.
- Modify `tests/video-generation-api.test.mjs`: landscape camera wording without architecture-only defaults.

### Task 1: Lock the connector bug with a failing regression test

**Files:**
- Modify: `tests/unified-canvas-video-workflow.test.mjs`
- Modify: `src/styles.css`

- [ ] **Step 1: Replace the old connector geometry assertion**

```js
test("canvas connector has a stable overlapping 48px hit target", () => {
  assert.match(stylesSource, /\.canvas-node-connector\s*\{[\s\S]*width:\s*48px;[\s\S]*height:\s*48px;/);
  assert.match(stylesSource, /\.canvas-node-connector\s*\{[\s\S]*right:\s*-24px;/);
  assert.doesNotMatch(stylesSource, /\.canvas-node-connector\s*\{[\s\S]*transform:\s*translate\(50%/);
  assert.match(stylesSource, /\.canvas-node-connector-icon\s*\{/);
  assert.match(stylesSource, /\.canvas-node:hover \.canvas-node-connector,[\s\S]*\.canvas-node:focus-within \.canvas-node-connector/);
});
```

- [ ] **Step 2: Run the test and verify current 32px geometry fails**

Run: `node --test tests/unified-canvas-video-workflow.test.mjs`

Expected: FAIL because the connector is 32px and translates outside the node.

- [ ] **Step 3: Implement stable connector geometry**

Use this structure:

```tsx
<button className="canvas-node-connector" type="button" aria-label={`从${node.title}创建方案分支`}>
  <span className="canvas-node-connector-icon" aria-hidden="true">
    <PlusCircle size={26} weight="bold" />
  </span>
</button>
```

Use this geometry:

```css
.canvas-node-connector {
  position: absolute;
  top: 50%;
  right: -24px;
  z-index: 6;
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  transform: translateY(-50%);
}

.canvas-node-connector-icon {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  color: var(--text);
  background: var(--surface-elevated);
  transition: transform 160ms cubic-bezier(0.16, 1, 0.3, 1), border-color 160ms ease;
}
```

Keep the 48px box fixed. Animate only `.canvas-node-connector-icon`.

- [ ] **Step 4: Keep the connector alive across related states**

Show and enable it for `.canvas-node:hover`, `.canvas-node.active`, `.canvas-node:focus-within`, `.canvas-node-connector:hover`, and `.canvas-node.menu-open`. Do not use a gap between the node border and hit box.

- [ ] **Step 5: Run the connector test**

Run: `node --test tests/unified-canvas-video-workflow.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/styles.css tests/unified-canvas-video-workflow.test.mjs
git commit -m "fix: stabilize canvas connector hit target"
```

### Task 2: Add landscape edge roles and scheme actions

**Files:**
- Modify: `src/App.tsx`
- Create: `tests/landscape-canvas.test.mjs`
- Modify: `tests/unified-canvas-video-workflow.test.mjs`

- [ ] **Step 1: Write failing landscape-role tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");

test("canvas expresses landscape reference roles", () => {
  for (const label of ["场地底图", "主场景", "风格参考", "材料参考", "植物参考", "视频首帧", "视频尾帧"]) {
    assert.match(app, new RegExp(label));
  }
});

test("connector menu offers landscape scheme actions", () => {
  for (const label of ["生成方案图", "添加参考", "创建方向变体", "局部深化", "生成漫游"]) {
    assert.match(app, new RegExp(label));
  }
});
```

- [ ] **Step 2: Run the tests and verify labels are missing**

Run: `node --test tests/landscape-canvas.test.mjs`

Expected: FAIL.

- [ ] **Step 3: Replace the edge-role type**

```ts
type CanvasEdgeRole =
  | "site-base"
  | "main-scene"
  | "style-reference"
  | "material-reference"
  | "planting-reference"
  | "first-frame"
  | "last-frame";

const canvasEdgeRoleLabels: Record<CanvasEdgeRole, string> = {
  "site-base": "场地底图",
  "main-scene": "主场景",
  "style-reference": "风格参考",
  "material-reference": "材料参考",
  "planting-reference": "植物参考",
  "first-frame": "视频首帧",
  "last-frame": "视频尾帧",
};
```

Keep video connection validation, but infer `main-scene` for the first image source and require explicit roles for additional image references.

- [ ] **Step 4: Replace the connector menu actions**

Map actions as follows:

```ts
type CanvasBranchAction = "scheme-image" | "reference" | "variation" | "detail" | "walkthrough";
```

`scheme-image`, `variation`, and `detail` create image nodes with prompt seeds; `reference` opens image upload; `walkthrough` creates a connected video node.

- [ ] **Step 5: Run landscape and existing canvas tests**

Run: `node --test tests/landscape-canvas.test.mjs tests/unified-canvas-video-workflow.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx tests/landscape-canvas.test.mjs tests/unified-canvas-video-workflow.test.mjs
git commit -m "feat: add landscape canvas relationships"
```

### Task 3: Add landscape generation modes and prompt payloads

**Files:**
- Modify: `src/App.tsx`
- Modify: `api/_zerlum-server.ts`
- Modify: `vite.config.ts`
- Modify: `tests/landscape-canvas.test.mjs`
- Modify: `tests/canvas-image-fit-compare.test.mjs`
- Modify: `tests/ark-proxy-routing.test.mjs`

- [ ] **Step 1: Write failing generation-mode tests**

```js
test("image nodes carry an explicit landscape generation mode", () => {
  assert.match(app, /type LandscapeGenerationMode =/);
  assert.match(app, /"preserve" \| "concept" \| "local-edit" \| "variation" \| "season-time" \| "free"/);
  assert.match(app, /generationMode:/);
});
```

Extend API tests to require the exact priority sentence `用户明确要求 > 项目资料 > 画布显式关系` and to reject `夜景效果图` as the default task name.

- [ ] **Step 2: Run focused tests and verify the mode is absent**

Run: `node --test tests/landscape-canvas.test.mjs tests/canvas-image-fit-compare.test.mjs tests/ark-proxy-routing.test.mjs`

Expected: FAIL.

- [ ] **Step 3: Add mode to canvas node parameters**

```ts
type LandscapeGenerationMode =
  | "preserve"
  | "concept"
  | "local-edit"
  | "variation"
  | "season-time"
  | "free";

type CanvasNodeParams = {
  generationMode: LandscapeGenerationMode;
  aspectRatio: string;
  resolution: string;
  imageCount: string;
  duration?: string;
  cameraPresetId?: string;
};
```

Default uploaded-image branches to `preserve`, direction branches to `variation`, detail branches to `local-edit`, and blank nodes to `free`.

- [ ] **Step 4: Send mode and role metadata to prompt generation**

Include `generationMode`, node title, and each connected image role in `/api/zerlum-prompt`. The prompt endpoint must state what may and may not change for each mode. Preserve user prompt text and do not silently replace it.

- [ ] **Step 5: Update prompt UI labels**

Image placeholder: `描述空间、植物、材料、季节与使用场景`.

Mode labels: `保留结构`, `概念改造`, `局部深化`, `方向变体`, `季节时间`, `自由生成`.

- [ ] **Step 6: Run the focused suite**

Run: `node --test tests/landscape-canvas.test.mjs tests/canvas-image-fit-compare.test.mjs tests/ark-proxy-routing.test.mjs tests/runninghub-image-routing.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx api/_zerlum-server.ts vite.config.ts tests/landscape-canvas.test.mjs tests/canvas-image-fit-compare.test.mjs tests/ark-proxy-routing.test.mjs tests/runninghub-image-routing.test.mjs
git commit -m "feat: add landscape image generation modes"
```

### Task 4: Add a useful canvas empty state and contained failure states

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Modify: `tests/landscape-canvas.test.mjs`
- Modify: `tests/unified-canvas-video-workflow.test.mjs`

- [ ] **Step 1: Write failing empty and error-state tests**

```js
test("empty landscape canvas offers four direct starts", () => {
  for (const label of ["上传场地底图", "上传现状照片", "添加意向参考", "创建方案图节点"]) {
    assert.match(app, new RegExp(label));
  }
});

test("node generation errors stay inside the failed node", () => {
  assert.match(app, /className="canvas-node-error"/);
  assert.match(app, /重试当前节点/);
});
```

- [ ] **Step 2: Run the tests and verify the state is absent**

Run: `node --test tests/landscape-canvas.test.mjs`

Expected: FAIL.

- [ ] **Step 3: Render the empty state only when no nodes exist**

Use a centered but compact panel with four buttons. Each button must perform its named action; do not render a decorative card grid. Hide the panel as soon as a node is created.

- [ ] **Step 4: Add node-contained failure and retry**

Persist `errorText` on the failed generation version. Render the message below the media and keep prompt, references, parameters, and previous versions. Retry creates a new version and leaves the failed record available.

- [ ] **Step 5: Add keyboard and reduced-motion behavior**

Connector `Enter` opens the branch menu; `Escape` closes it and restores focus. Disable connector icon scale animation under `prefers-reduced-motion: reduce`.

- [ ] **Step 6: Run canvas tests and build**

Run: `node --test tests/landscape-canvas.test.mjs tests/unified-canvas-video-workflow.test.mjs tests/canvas-image-fit-compare.test.mjs`

Expected: PASS.

Run: `corepack pnpm run build`

Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/styles.css tests/landscape-canvas.test.mjs tests/unified-canvas-video-workflow.test.mjs
git commit -m "feat: finish landscape canvas workflow"
```

### Task 5: Extract the canvas model and node card

**Files:**
- Create: `src/views/canvas/canvas-model.ts`
- Create: `src/views/canvas/CanvasNodeCard.tsx`
- Create: `src/views/canvas/LandscapeCanvasView.tsx`
- Modify: `src/App.tsx`
- Modify: `tests/landscape-component-boundaries.test.mjs`

- [ ] **Step 1: Extend the failing boundary test**

```js
test("canvas node UI and pure model live outside App", async () => {
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(app, /from "\.\/views\/canvas\/CanvasNodeCard"/);
  assert.match(app, /from "\.\/views\/canvas\/canvas-model"/);
  assert.match(app, /from "\.\/views\/canvas\/LandscapeCanvasView"/);
  assert.doesNotMatch(app, /function CanvasNodeCard\(/);
  assert.doesNotMatch(app, /function UnifiedCanvasView\(/);
});
```

- [ ] **Step 2: Run the boundary test and verify inline canvas code fails it**

Run: `node --test tests/landscape-component-boundaries.test.mjs`

Expected: FAIL.

- [ ] **Step 3: Extract pure canvas contracts**

Move `CanvasEdgeRole`, `LandscapeGenerationMode`, node/edge types, role labels, generation-mode labels, size helpers and connection validation into `canvas-model.ts`. The module must not import React or access browser globals.

- [ ] **Step 4: Extract `CanvasNodeCard`**

Move node rendering, prompt controls, connector events, version selection and node-local error UI into `CanvasNodeCard.tsx`. Remove the legacy permission-derived `canGenerate` prop; generation is disabled only by node state, missing prompt or missing required source. Keep canvas-wide node arrays, transforms, uploads and provider calls in the parent view.

- [ ] **Step 5: Extract `LandscapeCanvasView`**

Move the current `UnifiedCanvasView` state, transforms, uploads, context menus, preview, generation requests and edge rendering into `LandscapeCanvasView.tsx`. Export one component whose props are `project` and `onGeneratedImagesChange`; all canvas-internal state remains encapsulated in this module.

- [ ] **Step 6: Run boundary and canvas tests**

Run: `node --test tests/landscape-component-boundaries.test.mjs tests/landscape-canvas.test.mjs tests/unified-canvas-video-workflow.test.mjs`

Expected: PASS.

Run: `corepack pnpm run build`

Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/views/canvas tests/landscape-component-boundaries.test.mjs
git commit -m "refactor: split landscape canvas node model"
```

### Task 6: Canvas phase verification

**Files:**
- Modify only for defects proven by verification.

- [ ] **Step 1: Run all canvas and provider tests**

Run:

```powershell
node --test tests/landscape-canvas.test.mjs tests/unified-canvas-video-workflow.test.mjs tests/canvas-image-fit-compare.test.mjs tests/runninghub-image-routing.test.mjs tests/video-generation-api.test.mjs tests/video-image-path-workspace.test.mjs
```

Expected: all pass.

- [ ] **Step 2: Run the full suite and build**

Run: `corepack pnpm test`

Expected: 0 failures.

Run: `corepack pnpm run build`

Expected: exit 0.

- [ ] **Step 3: Browser-verify connector behavior**

At desktop width and a narrow width, create an image node, move the pointer from the node across the connector, click to open the menu, close it with Escape, drag a connection, and verify the target highlight. Confirm no console error and no disappearing connector while the pointer is inside its 48px box.

- [ ] **Step 4: Commit a scoped correction only if verification proved a defect**

```bash
git add src/App.tsx src/styles.css tests
git commit -m "fix: close landscape canvas verification gaps"
```

Skip this commit when no correction is needed.
