# Fast Zerlum Outline Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent oversized Outline requests, remove duplicated material context, and stream qweapi output so users see the outline before the full response completes.

**Architecture:** `TextView` builds an Outline-only compact request: metadata and bounded text replace complete file Data URLs, while a bounded set of images is compressed separately. The production and Vite proxies enable streaming for both main Agent and Outline Chat Completions, leaving document-output Responses unchanged. Client-side byte preflight and status-specific messages prevent raw `Failed to fetch` and HTTP 413 failures.

**Tech Stack:** React 19, TypeScript, Vite middleware, Vercel Node functions, OpenAI-compatible streaming Chat Completions, Node test runner.

---

## File map

- `src/App.tsx`: compact Outline material/image preparation, request size guard, de-duplicated context, and readable errors.
- `api/_zerlum-server.ts`: production Outline streaming behavior.
- `vite.config.ts`: local middleware parity for Outline streaming.
- `tests/document-outline-agent.test.mjs`: request compaction, image bounds, no-duplicate text, and error contracts.
- `tests/ark-proxy-routing.test.mjs`: streaming Chat Completions routing contract.
- `tests/agent-stream-error.test.mjs`: readable network and 413 error behavior if its existing source slices are the closest contract boundary.

### Task 1: Lock request compaction and streaming with failing tests

**Files:**
- Modify: `tests/document-outline-agent.test.mjs`
- Modify: `tests/ark-proxy-routing.test.mjs`

- [ ] **Step 1: Add the compact material contract**

Add assertions requiring an Outline-specific serializer that drops `sourceDataUrl` and bounds text:

```js
test("outline sends compact materials without complete file data URLs", () => {
  assert.match(appSource, /const OUTLINE_MATERIAL_TEXT_LIMIT = 12_000;/);
  assert.match(appSource, /function prepareOutlineMaterialsForRequest/);
  assert.match(
    appSource,
    /\{\s*sourceDataUrl,\s*sourceText,\s*\.\.\.material\s*\}[\s\S]*sourceText: sourceText\?\.slice\(0, OUTLINE_MATERIAL_TEXT_LIMIT\)/,
  );
  assert.match(requestDocumentAgentBlock, /prepareOutlineMaterialsForRequest\(materials\)/);
  assert.doesNotMatch(outlinePromptBlock, /sourceText\.slice\(0, 6000\)/);
  assert.doesNotMatch(outlinePromptBlock, /【文本交付区上传资料】/);
});
```

- [ ] **Step 2: Add bounded image and byte-guard contracts**

```js
test("outline compresses data images and rejects oversized JSON before fetch", () => {
  assert.match(appSource, /const OUTLINE_DATA_IMAGE_LIMIT = 2;/);
  assert.match(appSource, /const OUTLINE_IMAGE_MAX_BYTES = 600_000;/);
  assert.match(appSource, /const OUTLINE_REQUEST_MAX_BYTES = 3_000_000;/);
  assert.match(appSource, /async function prepareOutlineImagesForRequest/);
  assert.match(appSource, /compressImageForAgentApi\([\s\S]*maxBytes: OUTLINE_IMAGE_MAX_BYTES/);
  assert.match(requestDocumentAgentBlock, /new TextEncoder\(\)\.encode\(requestBody\)\.byteLength/);
  assert.match(requestDocumentAgentBlock, /资料体积过大，请压缩或拆分资料后重试/);
});
```

- [ ] **Step 3: Change routing expectations from non-streaming to streaming**

Replace the existing Outline non-streaming expectation with:

```js
test("main agent and outline stream OpenAI chat tokens", () => {
  for (const backendBlock of [agentProxyBlock, apiAgentHandlerBlock]) {
    assert.match(
      backendBlock,
      /const streamOpenAiChat = useOpenAiChat && !isDocumentOutputTask;/,
    );
    assert.match(backendBlock, /stream: streamOpenAiChat/);
    assert.match(backendBlock, /await pipeResponseBody\(upstream, response\)/);
  }
});
```

Keep assertions proving document-output remains `stream: false`.

- [ ] **Step 4: Add readable error assertions**

```js
test("outline surfaces actionable request-size and network errors", () => {
  assert.match(requestDocumentAgentBlock, /response\.status === 413/);
  assert.match(requestDocumentAgentBlock, /资料体积过大，请压缩或拆分资料后重试/);
  assert.match(outlineSubmitBlock, /Failed to fetch/);
  assert.match(outlineSubmitBlock, /若资料较小，请检查网络/);
});
```

- [ ] **Step 5: Run focused tests and verify red**

Run:

```powershell
node --test tests/document-outline-agent.test.mjs tests/ark-proxy-routing.test.mjs
```

Expected: failures for missing compact serializers, request guard, streaming Outline routing, and readable errors.

- [ ] **Step 6: Commit red tests**

```powershell
git add tests/document-outline-agent.test.mjs tests/ark-proxy-routing.test.mjs
git commit -m "test: define fast outline request contract"
```

### Task 2: Compact materials and images before the Outline request

**Files:**
- Modify: `src/App.tsx`
- Test: `tests/document-outline-agent.test.mjs`

- [ ] **Step 1: Add limits and configurable image compression**

Add constants near the existing Agent media limits:

```ts
const OUTLINE_MATERIAL_TEXT_LIMIT = 12_000;
const OUTLINE_DATA_IMAGE_LIMIT = 2;
const OUTLINE_REMOTE_IMAGE_LIMIT = 8;
const OUTLINE_IMAGE_MAX_BYTES = 600_000;
const OUTLINE_REQUEST_MAX_BYTES = 3_000_000;
```

Extend the existing compressor without changing default Agent behavior:

```ts
async function compressImageForAgentApi(
  imageUrl: string,
  options: { maxBytes?: number; maxSide?: number } = {},
) {
  const maxBytes = options.maxBytes ?? AGENT_IMAGE_MAX_BYTES;
  const maxSide = options.maxSide ?? AGENT_IMAGE_MAX_SIDE;
  // Existing resize loop uses maxBytes and maxSide instead of fixed constants.
}
```

- [ ] **Step 2: Add the compact material serializer**

```ts
function prepareOutlineMaterialsForRequest(materials: ProjectMaterial[]) {
  return materials.slice(0, 12).map(
    ({ sourceDataUrl, sourceText, ...material }) => ({
      ...material,
      sourceText: sourceText?.slice(0, OUTLINE_MATERIAL_TEXT_LIMIT),
    }),
  );
}
```

The destructured `sourceDataUrl` is intentionally discarded.

- [ ] **Step 3: Add the bounded image serializer**

```ts
async function prepareOutlineImagesForRequest(
  materials: ProjectMaterial[],
  canvasImages: CanvasGeneratedImage[],
) {
  const materialImages = materials
    .filter((item) => item.sourceDataUrl?.startsWith("data:image/"))
    .map((item) => ({ imageUrl: item.sourceDataUrl ?? "", label: item.name }));
  const candidates = [...materialImages, ...canvasImages];
  const remote = candidates
    .filter((item) => /^https?:\/\//i.test(item.imageUrl))
    .slice(0, OUTLINE_REMOTE_IMAGE_LIMIT);
  const dataImages = candidates
    .filter((item) => item.imageUrl.startsWith("data:image/"))
    .slice(0, OUTLINE_DATA_IMAGE_LIMIT);
  const compressed = await Promise.all(
    dataImages.map(async (item) => {
      try {
        const imageUrl = await compressImageForAgentApi(item.imageUrl, {
          maxBytes: OUTLINE_IMAGE_MAX_BYTES,
        });

        if (estimateDataUrlBytes(imageUrl) > OUTLINE_IMAGE_MAX_BYTES) {
          return null;
        }

        return {
          ...item,
          imageUrl,
        };
      } catch {
        return null;
      }
    }),
  );

  return [...remote, ...compressed.filter((item) => item !== null)];
}
```

- [ ] **Step 4: Use compact values and preflight the JSON**

Inside `requestDocumentAgent`:

```ts
const requestMaterials =
  agentTask === "outline"
    ? prepareOutlineMaterialsForRequest(materials)
    : materials;
const requestImages =
  agentTask === "outline"
    ? await prepareOutlineImagesForRequest(materials, images)
    : images;
const requestBody = JSON.stringify({
  view: "text",
  agentTask,
  message,
  materials: requestMaterials,
  images: requestImages,
});

if (
  agentTask === "outline" &&
  new TextEncoder().encode(requestBody).byteLength > OUTLINE_REQUEST_MAX_BYTES
) {
  throw new Error("资料体积过大，请压缩或拆分资料后重试。");
}
```

Send `requestBody` directly in `fetch`.

- [ ] **Step 5: Remove duplicated material text from the frontend prompt**

Delete `materialContent`, `【文本交付区上传资料】`, and its value from `buildOutlineAgentContext`. Keep `【已上传项目资料清单】`; the backend adds each compact `sourceText` exactly once.

- [ ] **Step 6: Run focused request tests and verify green**

```powershell
node --test tests/document-outline-agent.test.mjs
```

Expected: all Outline request compaction tests pass.

- [ ] **Step 7: Commit request compaction**

```powershell
git add src/App.tsx tests/document-outline-agent.test.mjs
git commit -m "fix: compact outline source requests"
```

### Task 3: Stream Outline output and normalize failures

**Files:**
- Modify: `api/_zerlum-server.ts`
- Modify: `vite.config.ts`
- Modify: `src/App.tsx`
- Test: `tests/ark-proxy-routing.test.mjs`
- Test: `tests/document-outline-agent.test.mjs`

- [ ] **Step 1: Enable streaming in both backend runtimes**

Replace the stream predicate in production and Vite:

```ts
const streamOpenAiChat = useOpenAiChat && !isDocumentOutputTask;
```

This sends `stream: true` for main Agent and Outline. Existing response piping handles the qweapi SSE after the document-output and non-streaming compatibility branches.

- [ ] **Step 2: Normalize HTTP 413 before parsing its body**

In `requestDocumentAgent`, before reading the fallback response body:

```ts
if (response.status === 413) {
  throw new Error("资料体积过大，请压缩或拆分资料后重试。");
}

if (!response.ok || !response.body) {
  const fallback = await response.text();
  throw new Error(parseApiErrorText(fallback, finalFallback));
}
```

- [ ] **Step 3: Normalize network failure in the Outline submit catch**

```ts
const rawMessage = error instanceof Error ? error.message : "";
const errorText = /Failed to fetch|NetworkError|Load failed/i.test(rawMessage)
  ? "大纲请求未能发送。请压缩或拆分资料后重试；若资料较小，请检查网络。"
  : normalizeAgentErrorMessage(rawMessage, "方案 Agent 连接失败，请稍后再试。");
```

Keep the existing outline state unchanged.

- [ ] **Step 4: Run routing and Outline tests**

```powershell
node --test tests/ark-proxy-routing.test.mjs tests/document-outline-agent.test.mjs tests/document-output-pages.test.mjs
```

Expected: all tests pass, with document-output still non-streaming.

- [ ] **Step 5: Commit streaming and errors**

```powershell
git add api/_zerlum-server.ts vite.config.ts src/App.tsx tests/ark-proxy-routing.test.mjs tests/document-outline-agent.test.mjs
git commit -m "fix: stream outline generation"
```

### Task 4: Verify, deploy, and measure production

**Files:**
- Modify only if verification exposes a defect.

- [ ] **Step 1: Run full regression and builds**

```powershell
npm test
npm run build
corepack pnpm exec tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --lib ES2022,DOM --skipLibCheck api/_zerlum-server.ts
```

Expected: zero failures and all commands exit 0.

- [ ] **Step 2: Build Vercel output and verify function bundle**

Run `npx vercel build --yes` with the existing temporary Corepack pnpm shim in `PATH`, then:

```powershell
$env:CHECK_VERCEL_OUTPUT='1'
node --test tests/vercel-api-functions.test.mjs
```

Expected: Vercel build succeeds and all function-bundle tests pass.

- [ ] **Step 3: Scan, push, and wait for Ready**

```powershell
$secretPattern = 'github' + '_pat_|' + 's' + 'k-[A-Za-z0-9]{20,}'
git grep -n -E $secretPattern -- ':!*.lock'
git push publish HEAD:main
npx vercel list yehuiai11-web --yes
```

Expected: no credential matches and the new production deployment reaches `Ready` with `www.yehuiai.com` aliased.

- [ ] **Step 4: Measure the live streaming request**

POST synthetic, non-sensitive Outline data containing one compact text material. Record:

- UTF-8 request bytes;
- HTTP status;
- milliseconds to the first non-empty SSE content delta;
- milliseconds to `[DONE]`;
- presence of `【整套排版风格】` and `第 1 页`.

Expected: request is below 3,000,000 bytes, HTTP 200, first content arrives before `[DONE]`, and both required output markers exist.

- [ ] **Step 5: Verify browser and logs**

Reload the production text-delivery view and confirm the browser error/warning log is empty. Check Vercel logs for a successful POST and no new 413 response.

- [ ] **Step 6: Verify repository state**

```powershell
$local = git rev-parse HEAD
$remote = ((git ls-remote publish refs/heads/main) -split '\s+')[0]
git status --porcelain
```

Expected: local and remote SHAs match and the worktree is clean.
