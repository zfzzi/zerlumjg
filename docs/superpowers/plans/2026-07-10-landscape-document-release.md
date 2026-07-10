# Landscape Document and Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert scheme generation, knowledge documentation, error states and final visual QA into a landscape-design delivery workflow that passes an explicit legacy-domain audit.

**Architecture:** Keep the existing per-page image document pipeline and PDF export, but drive it through a landscape evidence model and four visible stages. Replace lighting knowledge artifacts with landscape runtime documentation, then finish with automated, source-level and browser acceptance gates across all three workspaces.

**Tech Stack:** React 19, TypeScript, Vite 6, existing OpenAI-compatible document routes, Node test runner, browser verification.

---

## File map

- Modify `src/App.tsx`: four-stage document workflow, page retry and landscape copy.
- Create `src/views/document/document-model.ts`: outline/page parsing and stage derivation.
- Create `src/views/document/DocumentView.tsx`: document workspace rendering and page actions.
- Modify `src/styles.css`: document stage bar, page states, error/retry and responsive layout.
- Modify `api/_zerlum-server.ts`: landscape outline and page-output instructions.
- Modify `vite.config.ts`: identical local instructions through shared helpers.
- Delete `docs/lighting-current-national-standards.md`.
- Rewrite `docs/agent-knowledge-runtime.md`: landscape runtime and production boundaries.
- Rewrite `docs/desktop-knowledge-ingestion-plan.md`: landscape knowledge ingestion contract.
- Delete `knowledge/desktop-lighting-library/*`.
- Create `knowledge/landscape-design-library/README.md`.
- Rename or rewrite `scripts/*desktop-markdown*` to landscape terminology.
- Modify `package.json`: landscape ingest/search script names.
- Create `tests/landscape-document-workflow.test.mjs`.
- Create `tests/landscape-runtime-audit.test.mjs`.
- Modify existing document, knowledge and standards tests.

### Task 1: Replace outline and document prompts with landscape delivery rules

**Files:**
- Modify: `api/_zerlum-server.ts`
- Modify: `vite.config.ts`
- Modify: `tests/document-outline-agent.test.mjs`
- Modify: `tests/document-output-pages.test.mjs`
- Create: `tests/landscape-document-workflow.test.mjs`

- [ ] **Step 1: Write failing landscape outline assertions**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const server = await readFile(new URL("../api/_zerlum-server.ts", import.meta.url), "utf8");
const vite = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");

test("outline and page prompts use landscape evidence and page roles", () => {
  const source = server + vite;
  for (const phrase of ["场地问题和机会", "总体空间结构", "功能、游线与使用场景", "植物与季相策略", "材料、铺装和构筑物", "待复核项"]) {
    assert.match(source, new RegExp(phrase));
  }
  assert.doesNotMatch(source, /Lighting Skill 9 个 md|灯光策略图|Zerlum照明系统/);
});
```

- [ ] **Step 2: Run the tests and verify lighting prompts fail them**

Run: `node --test tests/landscape-document-workflow.test.mjs tests/document-outline-agent.test.mjs`

Expected: FAIL on missing landscape sections and legacy lighting matches.

- [ ] **Step 3: Implement the outline prompt**

The prompt must:

```text
Use only project brief, submitted site materials, confirmed Agent conclusions and canvas scheme outputs.
Separate project facts, design judgments and items pending review.
Choose page roles before page copy.
Include only sections supported by the project.
Use generated images for cover, directions, key nodes, comparison or experience pages.
Use diagrams, matrices, material/plant boards and concise text for analysis pages.
Never claim the Skill is a project source.
```

Use the page sequence from section 6.3 of the design spec as a pool, not a fixed template.

- [ ] **Step 4: Implement page-output prompt rules**

Require each page request to include project identity, page number, page role, approved outline, source labels and image-use decision. Prohibit invented site measurements, regulations, species suitability or construction facts.

- [ ] **Step 5: Run document prompt tests**

Run: `node --test tests/landscape-document-workflow.test.mjs tests/document-outline-agent.test.mjs tests/document-output-pages.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api/_zerlum-server.ts vite.config.ts tests/landscape-document-workflow.test.mjs tests/document-outline-agent.test.mjs tests/document-output-pages.test.mjs
git commit -m "feat: generate landscape scheme documents"
```

### Task 2: Make the document workspace a four-stage workflow

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Modify: `tests/landscape-document-workflow.test.mjs`
- Modify: `tests/document-output-pages.test.mjs`

- [ ] **Step 1: Add failing UI-stage assertions**

```js
test("document workspace exposes four explicit stages", async () => {
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  for (const label of ["资料确认", "大纲生成", "页面生成", "校对与导出"]) {
    assert.match(app, new RegExp(label));
  }
  assert.match(app, /重试本页/);
  assert.match(app, /继续生成其他页面/);
});
```

- [ ] **Step 2: Run the UI test and verify stages are missing**

Run: `node --test tests/landscape-document-workflow.test.mjs`

Expected: FAIL.

- [ ] **Step 3: Add a derived document stage**

```ts
type DocumentStage = "sources" | "outline" | "pages" | "review";

function getDocumentStage(outline: string, pages: DocumentOutputPage[]): DocumentStage {
  if (!outline.trim()) return "sources";
  if (!pages.length) return "outline";
  if (pages.some((page) => page.status === "idle" || page.status === "streaming")) return "pages";
  return "review";
}
```

Render one horizontal stage indicator at desktop widths and a compact current-stage label on narrow widths.

- [ ] **Step 4: Add page-level retry**

Extract `generateDocumentPage(pageId)` from the existing loop. `retryDocumentPage(pageId)` resets only that page to `streaming`, retains other page results and invokes the same request path. A failed page exposes both `重试本页` and `继续生成其他页面`.

- [ ] **Step 5: Improve empty and export states**

Sources state explains accepted inputs. Outline state shows editable structure. Pages state shows per-page progress. Review state shows export readiness and a list of failed or pending pages.

- [ ] **Step 6: Run document tests and build**

Run: `node --test tests/landscape-document-workflow.test.mjs tests/document-output-pages.test.mjs tests/document-outline-agent.test.mjs`

Expected: PASS.

Run: `corepack pnpm run build`

Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/styles.css tests/landscape-document-workflow.test.mjs tests/document-output-pages.test.mjs
git commit -m "feat: add landscape document delivery stages"
```

### Task 3: Replace lighting knowledge artifacts and scripts

**Files:**
- Delete: `docs/lighting-current-national-standards.md`
- Rewrite: `docs/agent-knowledge-runtime.md`
- Rewrite: `docs/desktop-knowledge-ingestion-plan.md`
- Delete: `knowledge/desktop-lighting-library/markdown-index.json`
- Delete: `knowledge/desktop-lighting-library/markdown-chunks.jsonl`
- Delete: `knowledge/desktop-lighting-library/markdown-summary.md`
- Create: `knowledge/landscape-design-library/README.md`
- Rename: `scripts/build-desktop-markdown-index.mjs` to `scripts/build-landscape-markdown-index.mjs`
- Rename: `scripts/ingest-desktop-markdown.ps1` to `scripts/ingest-landscape-markdown.ps1`
- Rename: `scripts/search-desktop-markdown.mjs` to `scripts/search-landscape-markdown.mjs`
- Rename: `scripts/search-desktop-markdown.ps1` to `scripts/search-landscape-markdown.ps1`
- Modify: `package.json`
- Replace: `tests/desktop-standard-dedupe.test.mjs` with `tests/landscape-knowledge-runtime.test.mjs`
- Modify: `tests/agent-knowledge-library.test.mjs`

- [ ] **Step 1: Write the failing knowledge-runtime test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

test("repository knowledge runtime is landscape-only", async () => {
  await access(new URL("../knowledge/landscape-design-library/README.md", import.meta.url));
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.scripts["ingest:landscape-md"], "powershell -ExecutionPolicy Bypass -File scripts/ingest-landscape-markdown.ps1");
  assert.equal(pkg.scripts["search:landscape-md"], "powershell -ExecutionPolicy Bypass -File scripts/search-landscape-markdown.ps1");
});
```

- [ ] **Step 2: Run the test and verify landscape artifacts are absent**

Run: `node --test tests/landscape-knowledge-runtime.test.mjs`

Expected: FAIL with `ENOENT`.

- [ ] **Step 3: Rewrite runtime documentation**

`docs/agent-knowledge-runtime.md` must document the Landscape Skill path, project evidence priority, the three workspace routes and professional-review boundaries. `docs/desktop-knowledge-ingestion-plan.md` must define source, privacy, project type, knowledge level and review-status fields without claiming a source corpus that is not present.

- [ ] **Step 4: Create an honest landscape knowledge directory**

The new README states that the deployed first-party knowledge consists of the reviewed Skill references. It provides exact ingest and search commands but contains no invented case counts, standards or source paths.

- [ ] **Step 5: Rename scripts and constants**

Replace lighting directory names, summaries and command examples with `landscape-design-library`. Keep the existing safety behavior that excludes internal plans and does not execute binary or script attachments.

- [ ] **Step 6: Run knowledge tests**

Run: `node --test tests/landscape-knowledge-runtime.test.mjs tests/agent-knowledge-library.test.mjs tests/tool-platform-scope.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add docs knowledge scripts package.json tests/landscape-knowledge-runtime.test.mjs tests/agent-knowledge-library.test.mjs tests/tool-platform-scope.test.mjs
git add -u docs knowledge scripts tests/desktop-standard-dedupe.test.mjs
git commit -m "docs: replace lighting knowledge runtime"
```

### Task 4: Add a strict legacy-domain audit

**Files:**
- Create: `tests/landscape-runtime-audit.test.mjs`
- Modify: any runtime file with an unexplained legacy match.

- [ ] **Step 1: Write the failing audit**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const runtimeFiles = [
  "src/App.tsx",
  "src/styles.css",
  "api/_zerlum-server.ts",
  "api/zerlum-landscape-skill.js",
  "vite.config.ts",
  "vercel.json",
  "index.html",
  "package.json",
];

test("active runtime contains no legacy lighting workbench identity", async () => {
  const source = (await Promise.all(runtimeFiles.map((path) => readFile(new URL(`../${path}`, import.meta.url), "utf8")))).join("\n");
  for (const phrase of ["照明设计工具台", "Zerlum照明系统", "Lighting Skill", "zerlum-lighting-skill", "未命名照明项目", "夜景效果图生成"]) {
    assert.equal(source.includes(phrase), false, `legacy runtime phrase: ${phrase}`);
  }
});
```

- [ ] **Step 2: Run the audit and list every current match**

Run: `node --test tests/landscape-runtime-audit.test.mjs`

Expected: FAIL until all active runtime phrases are removed.

- [ ] **Step 3: Remove each active runtime residue**

Do not replace third-party identifiers such as `lightningcss`. Historical design and plan documents may describe the migration, but active runtime and current user-facing documentation may not identify the product as a lighting workbench.

- [ ] **Step 4: Run the audit again**

Run: `node --test tests/landscape-runtime-audit.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/landscape-runtime-audit.test.mjs src api vite.config.ts vercel.json index.html package.json
git commit -m "test: enforce landscape-only runtime"
```

### Task 5: Final responsive, accessibility and copy polish

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Modify: `src/components/Dock.tsx`
- Modify: `src/components/Dock.css`
- Create: `tests/landscape-accessibility-ui.test.mjs`

- [ ] **Step 1: Write failing source-level accessibility checks**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("landscape shell includes navigation, focus and reduced-motion contracts", async () => {
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
  assert.match(app, /aria-label="Zerlum 景观设计工作台导航"/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(max-width: 760px\)/);
});
```

- [ ] **Step 2: Run the test and verify missing contracts fail**

Run: `node --test tests/landscape-accessibility-ui.test.mjs`

Expected: FAIL until all four contracts exist.

- [ ] **Step 3: Implement desktop and narrow layouts**

Agent side panels collapse into drawers below 1180px. Document columns become a single current-stage surface below 960px. At 760px, the top navigation remains horizontally usable, all primary actions are at least 44px high, and no heading or prompt control overflows.

- [ ] **Step 4: Implement focus and reduced motion**

Every icon-only button has an accessible label. Use a visible 2px focus outline with offset. Under reduced motion, remove Prism rotation, entrance translation, connector scaling and large blur transitions while keeping content visible.

- [ ] **Step 5: Distill copy**

Remove repeated introductions and generic “高端、智能、赋能” language. Use labels that describe the action and object. Keep the three main navigation labels stable.

- [ ] **Step 6: Run the UI test and build**

Run: `node --test tests/landscape-accessibility-ui.test.mjs tests/landscape-shell-ui.test.mjs tests/landscape-canvas.test.mjs tests/landscape-document-workflow.test.mjs`

Expected: PASS.

Run: `corepack pnpm run build`

Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add src tests/landscape-accessibility-ui.test.mjs
git commit -m "feat: polish landscape workspace usability"
```

### Task 6: Extract the document model and view

**Files:**
- Create: `src/views/document/document-model.ts`
- Create: `src/views/document/DocumentView.tsx`
- Modify: `src/App.tsx`
- Modify: `tests/landscape-component-boundaries.test.mjs`

- [ ] **Step 1: Extend the failing boundary test**

```js
test("document model and view live outside App", async () => {
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(app, /from "\.\/views\/document\/DocumentView"/);
  assert.match(app, /from "\.\/views\/document\/document-model"/);
  assert.doesNotMatch(app, /function TextView\(/);
});
```

- [ ] **Step 2: Run the boundary test and verify inline document code fails it**

Run: `node --test tests/landscape-component-boundaries.test.mjs`

Expected: FAIL.

- [ ] **Step 3: Extract pure document helpers**

Move document outline/page types, page splitting, page title parsing, `getDocumentStage`, result parsing and page error formatting into `document-model.ts`. Keep it free of React and network access.

- [ ] **Step 4: Extract `DocumentView`**

Move the four-stage layout, source upload, outline editor, page status cards, retry actions and export readiness UI into `DocumentView.tsx`. Accept project context, materials, Agent messages, canvas outputs, document state and callbacks through explicit props.

- [ ] **Step 5: Run boundary, document and build checks**

Run: `node --test tests/landscape-component-boundaries.test.mjs tests/landscape-document-workflow.test.mjs tests/document-outline-agent.test.mjs tests/document-output-pages.test.mjs`

Expected: PASS.

Run: `corepack pnpm run build`

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/views/document tests/landscape-component-boundaries.test.mjs
git commit -m "refactor: split landscape document view"
```

### Task 7: Release verification

**Files:**
- Create: `docs/landscape-release-checklist.md`
- Modify only for defects proven by verification.

- [ ] **Step 1: Run the complete automated suite**

Run: `corepack pnpm test`

Expected: all tests pass with 0 failures.

- [ ] **Step 2: Run the production build**

Run: `corepack pnpm run build`

Expected: TypeScript and Vite exit 0.

- [ ] **Step 3: Run the active-runtime audit**

Run:

```powershell
rg -n "照明设计工具台|Zerlum照明系统|Lighting Skill|zerlum-lighting-skill|未命名照明项目|夜景效果图生成" src api knowledge scripts vite.config.ts vercel.json index.html package.json
```

Expected: no matches.

- [ ] **Step 4: Browser-verify the critical desktop flow**

Use a fresh local session: welcome → login → Agent → fill project context → upload a material → canvas → create and connect a node → open branch menu → document → create or edit outline → inspect page states. Verify visible state after every action and record console warnings or errors.

- [ ] **Step 5: Browser-verify a narrow viewport and reduced motion**

Verify the same three workspaces at 760px or narrower. Confirm no horizontal overflow, clipped menus, unreachable actions or hidden focus. Enable reduced motion and confirm content remains visible.

- [ ] **Step 6: Write the release checklist with evidence**

Record the exact test count, build exit code, runtime audit result, verified URLs, viewport sizes, browser console result and any known external production dependency such as a real server-side auth provider.

- [ ] **Step 7: Commit**

```bash
git add docs/landscape-release-checklist.md
git commit -m "docs: record landscape workspace release verification"
```
