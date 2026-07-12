# Dedicated Zerlum Outline Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bind Zerlum Outline to its own qweapi channel and make it generate only a unified layout-style specification plus a paginated outline from the explicitly supplied text-delivery sources.

**Architecture:** The existing `/api/zerlum-agent` route continues to dispatch `view: "text"`, `agentTask: "outline"`, but resolves a dedicated Outline key, base URL, and model before falling back to the shared Agent channel. `TextView` aggregates project brief fields, uploaded materials, recent Agent conversation, canvas results, the current request, and any existing outline into one explicit context. The Outline response remains structured Markdown so the current page splitter automatically carries the shared style block into every page-generation prompt.

**Tech Stack:** React 19, TypeScript, Vite middleware, Vercel Node functions, OpenAI-compatible Chat Completions, Node test runner, Vercel CLI.

---

## File map

- `api/_zerlum-server.ts`: production Outline routing, dedicated environment resolution, and authoritative Outline output constraints.
- `vite.config.ts`: local middleware parity for the same routing and prompt contract.
- `src/App.tsx`: explicit source aggregation, empty-input decision, Outline request payload, and downstream structured Markdown flow.
- `.env.example`: secret-free documentation for the dedicated Outline channel.
- `tests/ark-proxy-routing.test.mjs`: local and production API-routing contracts.
- `tests/document-outline-agent.test.mjs`: input-boundary, output-contract, and empty-input contracts.

### Task 1: Lock the dedicated Outline API contract

**Files:**
- Modify: `tests/ark-proxy-routing.test.mjs`
- Modify: `tests/document-outline-agent.test.mjs`

- [ ] **Step 1: Add failing API-routing assertions**

Add a test that requires both runtimes to prefer the Outline-specific key and base URL while retaining shared fallbacks:

```js
test("outline uses a dedicated OpenAI-compatible channel with shared fallback", () => {
  for (const backendBlock of [agentProxyBlock, apiAgentHandlerBlock]) {
    assert.match(
      backendBlock,
      /isOutlineTask[\s\S]*OPENAI_OUTLINE_API_KEY[\s\S]*OPENAI_API_KEY/,
    );
    assert.match(
      backendBlock,
      /isOutlineTask[\s\S]*OPENAI_OUTLINE_BASE_URL/,
    );
  }

  assert.match(localEnv, /^OPENAI_OUTLINE_API_KEY=$/m);
  assert.match(localEnv, /^OPENAI_OUTLINE_BASE_URL=https:\/\/qweapi\.com$/m);
});
```

- [ ] **Step 2: Add failing Outline responsibility assertions**

Extend `tests/document-outline-agent.test.mjs` to require the fixed Markdown contract and all approved sources:

```js
test("outline selects one shared layout style and paginates explicit sources", () => {
  assert.match(outlinePromptBlock, /【整套排版风格】/);
  assert.match(outlinePromptBlock, /主色、辅助色、强调色/);
  assert.match(outlinePromptBlock, /网格、页边距、留白和对齐/);
  assert.match(outlinePromptBlock, /每页使用“第 N 页/);
  assert.match(outlinePromptBlock, /【左侧项目简报】/);
  assert.match(outlinePromptBlock, /【Zerlum Agent 有效对话】/);
  assert.match(outlinePromptBlock, /【方案画布成果】/);
  assert.match(outlinePromptBlock, /【当前已有大纲】/);
  assert.doesNotMatch(outlinePromptBlock, /先用一句话说明身份/);
});
```

- [ ] **Step 3: Run the focused tests and verify red**

Run:

```powershell
node --test tests/ark-proxy-routing.test.mjs tests/document-outline-agent.test.mjs
```

Expected: failures for missing `OPENAI_OUTLINE_API_KEY`, `OPENAI_OUTLINE_BASE_URL`, project-brief context, the mandatory `【整套排版风格】` block, and the strict paginated output contract.

- [ ] **Step 4: Commit the red tests**

```powershell
git add tests/ark-proxy-routing.test.mjs tests/document-outline-agent.test.mjs
git commit -m "test: define dedicated outline agent contract"
```

### Task 2: Route Outline through its dedicated qweapi channel

**Files:**
- Modify: `api/_zerlum-server.ts`
- Modify: `vite.config.ts`
- Modify: `.env.example`
- Test: `tests/ark-proxy-routing.test.mjs`

- [ ] **Step 1: Implement production key and endpoint selection**

In `handleZerlumAgent`, select the key and missing-key label explicitly:

```ts
const apiKey = isDocumentOutputTask
  ? envValue("OPENAI_DOCUMENT_OUTPUT_API_KEY", "CONCEPT_TEXT_IMAGE_API_KEY", "OPENAI_API_KEY")
  : isOutlineTask
    ? envValue("OPENAI_OUTLINE_API_KEY", "OPENAI_API_KEY", "CONCEPT_OUTLINE_ARK_CHAT_API_KEY")
    : useOpenAiChat
      ? envValue("OPENAI_API_KEY", "CONCEPT_OUTLINE_ARK_CHAT_API_KEY")
      : arkApiKey;

const missingKeyName = isDocumentOutputTask
  ? "OPENAI_DOCUMENT_OUTPUT_API_KEY"
  : isOutlineTask
    ? "OPENAI_OUTLINE_API_KEY"
    : useOpenAiChat
      ? "OPENAI_API_KEY"
      : "ARK_API_KEY";
```

Resolve the endpoint with the dedicated base URL only for Outline:

```ts
const upstreamEndpoint = isDocumentOutputTask
  ? resolveOpenAiResponsesEndpoint()
  : useOpenAiChat
    ? resolveOpenAiChatEndpoint(
        isOutlineTask ? "OPENAI_OUTLINE_BASE_URL" : "OPENAI_BASE_URL",
      )
    : envValue("ARK_RESPONSES_ENDPOINT") || arkEndpoint;
```

- [ ] **Step 2: Implement identical Vite middleware selection**

Use the local environment equivalents and resolve the endpoint with:

```ts
const openAiChatEndpoint = resolveOpenAiChatEndpoint(
  env,
  isOutlineTask ? "OPENAI_OUTLINE_BASE_URL" : "OPENAI_BASE_URL",
);
```

The Outline key order must be `OPENAI_OUTLINE_API_KEY`, then `OPENAI_API_KEY`; ordinary Agent requests must continue to start with `OPENAI_API_KEY`.

- [ ] **Step 3: Document the new secret-free variables**

Add beside `OPENAI_OUTLINE_MODEL` in `.env.example`:

```dotenv
OPENAI_OUTLINE_API_KEY=
OPENAI_OUTLINE_BASE_URL=https://qweapi.com
OPENAI_OUTLINE_MODEL=gpt-5.5
```

- [ ] **Step 4: Run routing tests and verify green**

Run:

```powershell
node --test tests/ark-proxy-routing.test.mjs
```

Expected: all routing tests pass and ordinary Agent/document-output assertions remain unchanged.

- [ ] **Step 5: Commit the routing implementation**

```powershell
git add api/_zerlum-server.ts vite.config.ts .env.example tests/ark-proxy-routing.test.mjs
git commit -m "feat: isolate outline API channel"
```

### Task 3: Enforce explicit sources and a unified layout-style contract

**Files:**
- Modify: `src/App.tsx`
- Modify: `api/_zerlum-server.ts`
- Modify: `vite.config.ts`
- Test: `tests/document-outline-agent.test.mjs`

- [ ] **Step 1: Aggregate the project brief and full recent Agent conversation**

Inside `buildOutlineAgentContext`, add a project block built from the `project` prop:

```ts
const projectBrief = [
  `项目名称：${project.name || "未填写"}`,
  `项目类型：${project.type || "未填写"}`,
  `项目地点：${project.location || "未填写"}`,
  `设计阶段：${project.designStage || "未填写"}`,
  `客户或委托方：${project.client || "未填写"}`,
  `项目目标：${project.brief.goals || "未填写"}`,
  `使用人群：${project.brief.users || "未填写"}`,
  `场地范围：${project.brief.siteScope || "未填写"}`,
  `已知限制：${project.brief.constraints || "未填写"}`,
].join("\n");
```

Replace assistant-only extraction with recent valid user and assistant messages:

```ts
const agentConversationSummary = agentMessages
  .filter((item) => item.status !== "error" && item.text.trim())
  .slice(-12)
  .map((item, index) =>
    `${index + 1}. ${item.role === "user" ? "用户" : "Zerlum Agent"}：${item.text.trim().slice(0, 3000)}`,
  )
  .join("\n\n") || "暂无有效对话。";
```

Keep uploaded material contents, canvas image labels, the current request, and the existing outline as separate named sections.

- [ ] **Step 2: Make the output contract deterministic**

Replace the free-form style instructions in `buildOutlineAgentContext` with explicit requirements:

```ts
"只输出结构化 Markdown，不输出身份说明、正文示例、推理过程或额外解释。",
"输出必须以【整套排版风格】开头，并确定唯一一套整案风格，不要提供多个候选路线。",
"整套排版风格必须写明：16:9 横屏、风格名称与依据、主色/辅助色/强调色及比例、中文与西文字体方向、标题与正文字级、网格/页边距/留白/对齐、图片处理、图表/图标/分析图语言。",
"排版风格之后，每页使用“第 N 页：页面标题”作为标题。",
"每页必须写明：页面类型、本页目的、关键信息、主要视觉元素、版面位置与图文层级、画布生成图使用方式、资料依据/设计判断/待复核项。",
```

Use the same authoritative constraints in `outlineInstruction` in both backend runtimes so direct API callers receive the same behavior.

- [ ] **Step 3: Tighten the empty-input decision**

Add a meaningful project-brief check that ignores untouched defaults but accepts user-entered fields or a renamed project:

```ts
const hasProjectBriefInput = Boolean(
  (project.name && project.name !== "未命名景观项目") ||
    project.location.trim() ||
    project.client.trim() ||
    project.brief.goals.trim() ||
    project.brief.users.trim() ||
    project.brief.siteScope.trim() ||
    project.brief.constraints.trim(),
);

const hasOutlineInputs =
  hasProjectBriefInput ||
  materials.length > 0 ||
  agentMessages.some((item) => item.status !== "error" && item.text.trim()) ||
  canvasGeneratedImages.some((image) => image.imageUrl.trim()) ||
  outline.trim();
```

The current user request controls the operation but does not by itself count as project evidence.

- [ ] **Step 4: Preserve existing outline on empty upstream output**

Do not clear `outline` before the request. Clear only generated output pages, and replace the outline only after non-empty text arrives:

```ts
const previousOutline = outline.trim();

setDocumentOutput("");
setDocumentOutputPages([]);

await requestDocumentAgent({
  message: agentPrompt,
  assistantId,
  onText: (text) => {
    if (text.trim()) setOutline(text);
  },
  finalFallback: previousOutline || "方案 Agent 暂时没有返回可用大纲。",
  agentTask: "outline",
  images: canvasGeneratedImages,
});
```

- [ ] **Step 5: Run Outline tests and verify green**

Run:

```powershell
node --test tests/document-outline-agent.test.mjs tests/document-output-pages.test.mjs tests/landscape-document-workflow.test.mjs
```

Expected: all Outline and downstream page-generation tests pass.

- [ ] **Step 6: Commit the responsibility and source implementation**

```powershell
git add src/App.tsx api/_zerlum-server.ts vite.config.ts tests/document-outline-agent.test.mjs
git commit -m "feat: make outline select document layout style"
```

### Task 4: Verify, configure production, deploy, and test the live route

**Files:**
- Modify only if verification exposes a defect.

- [ ] **Step 1: Run the full regression suite**

Run:

```powershell
npm test
```

Expected: zero failures; the optional Vercel bundle test may be skipped until the next step.

- [ ] **Step 2: Run TypeScript and production builds**

Run:

```powershell
npm run build
corepack pnpm exec tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --lib ES2022,DOM --skipLibCheck api/_zerlum-server.ts
npx vercel build --yes
```

Expected: all commands exit 0 and `.vercel/output/functions/api/zerlum-agent.func` exists.

- [ ] **Step 3: Configure the production-only Outline channel**

Read the credential directly from the current user request at execution time without printing or persisting it in tracked files, and set these Vercel production variables:

```text
OPENAI_OUTLINE_API_KEY (encrypted production value supplied by the user)
OPENAI_OUTLINE_BASE_URL=https://qweapi.com
```

Keep `OPENAI_OUTLINE_MODEL` unchanged. Confirm only the variable names and environments with `npx vercel env ls`; never print encrypted values.

- [ ] **Step 4: Push and wait for production Ready**

Push all commits to the publishing remote:

```powershell
git push publish HEAD:main
npx vercel list yehuiai11-web --yes
```

Expected: the Git-triggered production deployment reaches `Ready` and aliases include `https://www.yehuiai.com`.

- [ ] **Step 5: Exercise the live Outline route with synthetic data**

POST a small non-sensitive request to `/api/zerlum-agent` with `view: "text"`, `agentTask: "outline"`, one synthetic project brief, and one synthetic material. Verify the SSE text contains:

```text
【整套排版风格】
第 1 页
```

The result must not contain an identity preamble or unsupported external facts.

- [ ] **Step 6: Verify the browser and deployment logs**

Reload `https://www.yehuiai.com`, open the text-delivery view, and verify no new browser error/warning logs. Check Vercel logs for a successful Outline request and confirm no secret appears in source changes:

```powershell
git diff HEAD~3..HEAD | Select-String -Pattern 'github_pat_|sk-[A-Za-z0-9]'
git status --short
```

Expected: no secret matches and the worktree is clean.
