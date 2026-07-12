# Fast Image Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the qweapi base image before RunningHub finishes high-resolution upscaling and replace synthetic percentage progress with real workflow stages.

**Architecture:** `/api/zerlum-image` generates the base image, submits (but does not poll) a RunningHub upscale task, and returns the base image plus a task id. A new status endpoint performs one RunningHub query per request; the canvas displays the base image and polls that endpoint until completion while preserving the base image on any upscale failure.

**Tech Stack:** React 19, TypeScript, Vite middleware, Vercel Node functions, Node test runner, qweapi Responses API, RunningHub AI App API.

---

### Task 1: Lock the new contracts with failing tests

**Files:**
- Modify: `tests/runninghub-image-routing.test.mjs`
- Modify: `tests/vercel-api-functions.test.mjs`
- Modify: `tests/unified-canvas-video-workflow.test.mjs`

- [ ] **Step 1: Add the failing backend contract tests**

Add assertions that the qweapi branch calls `submitRunningHubUpscale`, returns `upscaleTaskId` and `upscalePending: true`, and does not call `runRunningHubUpscale` unless `waitForUpscale === true`. Add assertions for `handleZerlumImageUpscaleStatus`, one-shot output querying, and the new Vercel route.

```js
assert.match(apiSource, /export async function handleZerlumImageUpscaleStatus/);
assert.match(apiImageHandlerBlock, /const waitForUpscale = body\.waitForUpscale === true/);
assert.match(apiImageHandlerBlock, /const submitted = await submitRunningHubUpscale/);
assert.match(apiImageHandlerBlock, /upscaleTaskId: submitted\.taskId/);
```

- [ ] **Step 2: Add the failing canvas tests**

Assert that `generateCanvasImage` sends the current prompt directly, includes `waitForUpscale: false`, displays the base URL before polling, calls `/api/zerlum-image-upscale-status`, and renders `生成原图中` / `高清放大中` without a percentage.

```js
assert.doesNotMatch(generateImageBlock, /requestCanvasGeneratedPrompt/);
assert.match(generateImageBlock, /waitForUpscale: false/);
assert.match(appSource, /\/api\/zerlum-image-upscale-status\?taskId=/);
assert.match(appSource, /生成原图中/);
assert.match(appSource, /高清放大中/);
```

- [ ] **Step 3: Run targeted tests and verify red**

Run:

```powershell
node --test tests/runninghub-image-routing.test.mjs tests/vercel-api-functions.test.mjs tests/unified-canvas-video-workflow.test.mjs
```

Expected: FAIL because the asynchronous task contract and route do not exist.

### Task 2: Split RunningHub submission from polling

**Files:**
- Modify: `api/_zerlum-server.ts`
- Modify: `vite.config.ts`
- Create: `api/zerlum-image-upscale-status.ts`

- [ ] **Step 1: Add shared submission and one-shot query helpers**

Refactor the current upscale function into these boundaries in both production and Vite implementations:

```ts
async function submitRunningHubUpscale(args: {
  apiKey: string;
  webappId: string;
  imageUrl: string;
  targetResolution: string;
  configuredNodeInfo: string;
}) {
  // upload input, build nodeInfoList, submit AI App
  return { taskId };
}

async function queryRunningHubUpscale(apiKey: string, taskId: string) {
  // query outputs once, then status once when no output exists
  return { status: "running" | "done" | "error", imageUrl, outputText };
}
```

Keep `runRunningHubUpscale` as the legacy synchronous wrapper: submit once, then call the existing polling loop when `waitForUpscale` is explicitly true.

- [ ] **Step 2: Return the base image and task id by default**

In both qweapi and RunningHub base-generation branches:

```ts
const waitForUpscale = body.waitForUpscale === true;

if (waitForUpscale) {
  const upscaled = await runRunningHubUpscale(...);
  return sendJson(response, 200, { imageUrl: upscaled.imageUrl, baseImageUrl, upscaled: true });
}

try {
  const submitted = await submitRunningHubUpscale(...);
  return sendJson(response, 200, {
    imageUrl: baseImageUrl,
    baseImageUrl,
    upscaled: false,
    upscalePending: true,
    upscaleTaskId: submitted.taskId,
  });
} catch (error) {
  return sendJson(response, 200, {
    imageUrl: baseImageUrl,
    baseImageUrl,
    upscaled: false,
    upscalePending: false,
    upscaleError: error instanceof Error ? error.message : "高清放大任务提交失败。",
  });
}
```

- [ ] **Step 3: Add the production and local status routes**

Create `api/zerlum-image-upscale-status.ts` importing `handleZerlumImageUpscaleStatus` with `maxDuration: 30`. Add equivalent Vite middleware before the video route. The handler accepts GET or POST, validates `taskId`, verifies `RUNNINGHUB_UPSCALE_API_KEY`, calls the one-shot query, and returns HTTP 200 with `running`, `done`, or `error`.

- [ ] **Step 4: Run backend contract tests and verify green**

Run:

```powershell
node --test tests/runninghub-image-routing.test.mjs tests/vercel-api-functions.test.mjs
```

Expected: all targeted backend tests pass.

### Task 3: Display the base image and poll in the canvas

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add a bounded image-upscale polling helper**

Add constants for a three-second interval and five-minute deadline, then add:

```ts
async function pollCanvasImageUpscale({ nodeId, versionId, taskId, baseImageUrl }) {
  while (Date.now() < deadline) {
    await new Promise<void>(resolve => {
      window.setTimeout(resolve, IMAGE_UPSCALE_POLL_INTERVAL_MS);
    });
    const response = await fetch(`/api/zerlum-image-upscale-status?taskId=${encodeURIComponent(taskId)}`);
    const payload = await response.json();
    if (payload.status === "done" && payload.imageUrl) {
      updateCanvasVersion(nodeId, versionId, version => ({ ...version, url: payload.imageUrl, status: "done", progress: 100, outputText: "高清放大完成。" }));
      return;
    }
    if (!response.ok || payload.status === "error") throw new Error(payload.error || "高清放大失败。");
  }
  throw new Error("高清放大等待超时。");
}
```

The catch path must keep `baseImageUrl`, set `status: "done"`, and show `原图可用，高清放大未完成`.

- [ ] **Step 2: Remove implicit prompt regeneration**

In `generateCanvasImage`, use `userPrompt` directly. Keep `requestCanvasGeneratedPrompt` only for the explicit “一键生成提示词” action. Send `waitForUpscale: false` in the image request.

- [ ] **Step 3: Show the base image before polling**

After `/api/zerlum-image` returns, measure the base image and update the version immediately:

```ts
updateCanvasVersion(node.id, versionId, version => ({
  ...version,
  url: payload.imageUrl ?? "",
  status: payload.upscaleTaskId ? "submitted" : "done",
  progress: payload.upscaleTaskId ? 72 : 100,
  taskId: payload.upscaleTaskId,
  outputText: payload.upscaleTaskId ? "高清放大中" : payload.upscaleError || "原图生成完成。",
}));
```

Await the polling helper only after the base URL is visible.

- [ ] **Step 4: Replace synthetic percentage copy with stage copy**

For image nodes, render `生成原图中` when there is no URL and `高清放大中` when a base URL plus task id exists. Retain percentage UI for video nodes only.

- [ ] **Step 5: Run canvas tests and verify green**

Run:

```powershell
node --test tests/unified-canvas-video-workflow.test.mjs tests/runninghub-image-routing.test.mjs
```

Expected: all targeted canvas and routing tests pass.

### Task 4: Verify, commit, deploy, and measure production

**Files:**
- Modify only if verification exposes a defect.

- [ ] **Step 1: Run the full regression suite**

Run `corepack pnpm test`.

Expected: zero failures; the existing optional Vercel bundle test may remain skipped.

- [ ] **Step 2: Run the production build and API type check**

Run:

```powershell
corepack pnpm build
corepack pnpm exec tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --lib ES2022,DOM --skipLibCheck api/_zerlum-server.ts api/zerlum-image-upscale-status.ts
```

Expected: both commands exit 0.

- [ ] **Step 3: Commit and push**

Commit implementation and tests with `feat: show generated images before upscale`, then push `HEAD:main` to the `publish` remote.

- [ ] **Step 4: Verify Vercel and the live browser**

Wait for the Git-triggered production deployment to become `Ready`. On `https://www.yehuiai.com`, verify the stage labels, base image preview, successful status polling, final high-resolution replacement, and an empty browser error/warning log.

- [ ] **Step 5: Compare production timing**

Use Vercel logs to record the qweapi request start and first status-poll request. Acceptance: the browser receives and displays the base image before the RunningHub task reaches `done`; no single image function remains open while polling RunningHub.
