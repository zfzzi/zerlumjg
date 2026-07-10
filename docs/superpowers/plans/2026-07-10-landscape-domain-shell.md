# Landscape Domain and Single-User Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the lighting-domain runtime and collaboration onboarding with a shared landscape project model, Landscape Skill, direct login, and a landscape-first Agent workspace.

**Architecture:** Keep `App` as the top-level orchestrator while moving landscape types/defaults and persistence into focused modules. Use one Landscape Skill loader from both production handlers and the Vite development proxy so domain prompts cannot drift. Remove collaboration concepts before redesigning the shell so every later canvas and document task consumes the same `LandscapeProject` context.

**Tech Stack:** React 19, TypeScript, Vite 6, Node test runner, existing Vercel-style API handlers, Motion, Phosphor Icons.

---

## File map

- Create `src/domain/landscape.ts`: canonical landscape project types, options, defaults, and pure normalization helpers.
- Create `src/state/workspace.ts`: versioned single-user persistence with safe migration from theme and profile only.
- Create `src/shell/WelcomeScreen.tsx`: welcome and authentication entry surface.
- Create `src/shell/AuthDialog.tsx`: login and registration form without onboarding side effects.
- Create `src/shell/WorkspaceHeader.tsx`: project identity, stage, navigation and account controls.
- Create `src/views/agent/AgentView.tsx`: project brief, chat, quick tasks and recent outcomes.
- Create `api/zerlum-landscape-skill/SKILL.md`: Landscape Skill routing contract.
- Create `api/zerlum-landscape-skill/references/*.md`: landscape design method and quality references.
- Create `api/zerlum-landscape-skill.js`: the only Skill loader and prompt wrapper.
- Modify `api/_zerlum-server.ts`: consume the new wrapper and landscape prompts.
- Modify `vite.config.ts`: consume the same wrapper and mirror production wording without a second domain implementation.
- Modify `vercel.json`: bundle the landscape Skill directory.
- Modify `src/App.tsx`: remove collaboration state, direct login to a default project, and adopt the landscape project contract.
- Modify `src/styles.css`: shared shell, welcome, login, Agent, and project-context styling.
- Modify `package.json`: add the repository test command.
- Create `tests/landscape-skill-runtime.test.mjs`: Skill package and runtime prompt contract.
- Create `tests/single-user-landscape-workspace.test.mjs`: direct login and collaboration-removal contract.
- Modify domain-sensitive existing tests to use landscape expectations.

### Task 1: Add a canonical test command

**Files:**
- Create: `tests/package-scripts.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing package-script test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("package exposes the complete Node test suite", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.scripts.test, "node --test tests/*.test.mjs");
});
```

- [ ] **Step 2: Run the test and verify the missing script fails**

Run: `node --test tests/package-scripts.test.mjs`

Expected: FAIL because `pkg.scripts.test` is `undefined`.

- [ ] **Step 3: Add the test script**

Add this entry under `scripts` in `package.json`:

```json
"test": "node --test tests/*.test.mjs"
```

- [ ] **Step 4: Run the focused test**

Run: `node --test tests/package-scripts.test.mjs`

Expected: PASS, 1 test and 0 failures.

- [ ] **Step 5: Commit**

```bash
git add package.json tests/package-scripts.test.mjs
git commit -m "test: add repository test command"
```

### Task 2: Replace the Lighting Skill package

**Files:**
- Delete: `api/zerlum-lighting-skill/SKILL.md`
- Delete: `api/zerlum-lighting-skill/references/*.md`
- Create: `api/zerlum-landscape-skill/SKILL.md`
- Create: `api/zerlum-landscape-skill/references/00-universal-landscape-thinking.md`
- Create: `api/zerlum-landscape-skill/references/01-site-analysis.md`
- Create: `api/zerlum-landscape-skill/references/02-spatial-program-circulation.md`
- Create: `api/zerlum-landscape-skill/references/03-users-scenarios-operations.md`
- Create: `api/zerlum-landscape-skill/references/04-grading-water-ecology.md`
- Create: `api/zerlum-landscape-skill/references/05-planting-seasonality.md`
- Create: `api/zerlum-landscape-skill/references/06-materials-details.md`
- Create: `api/zerlum-landscape-skill/references/07-project-typologies.md`
- Create: `api/zerlum-landscape-skill/references/08-visualization-prompts.md`
- Create: `api/zerlum-landscape-skill/references/09-document-delivery.md`
- Create: `api/zerlum-landscape-skill/references/10-quality-variation.md`
- Create: `tests/landscape-skill-runtime.test.mjs`

- [ ] **Step 1: Write the failing Skill inventory test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const skillFiles = [
  "api/zerlum-landscape-skill/SKILL.md",
  "api/zerlum-landscape-skill/references/00-universal-landscape-thinking.md",
  "api/zerlum-landscape-skill/references/01-site-analysis.md",
  "api/zerlum-landscape-skill/references/02-spatial-program-circulation.md",
  "api/zerlum-landscape-skill/references/03-users-scenarios-operations.md",
  "api/zerlum-landscape-skill/references/04-grading-water-ecology.md",
  "api/zerlum-landscape-skill/references/05-planting-seasonality.md",
  "api/zerlum-landscape-skill/references/06-materials-details.md",
  "api/zerlum-landscape-skill/references/07-project-typologies.md",
  "api/zerlum-landscape-skill/references/08-visualization-prompts.md",
  "api/zerlum-landscape-skill/references/09-document-delivery.md",
  "api/zerlum-landscape-skill/references/10-quality-variation.md",
];

test("backend ships the complete landscape design skill package", async () => {
  await Promise.all(skillFiles.map((path) => access(new URL(path, root))));
  const markdown = await Promise.all(skillFiles.map((path) => readFile(new URL(path, root), "utf8")));
  assert.match(markdown.join("\n"), /场地分析/);
  assert.match(markdown.join("\n"), /空间结构/);
  assert.match(markdown.join("\n"), /植物群落/);
  assert.match(markdown.join("\n"), /竖向|排水/);
  assert.doesNotMatch(markdown.join("\n"), /Lighting Skill|立面照明|酒店大堂照明/);
});
```

- [ ] **Step 2: Run the test and verify the package is absent**

Run: `node --test tests/landscape-skill-runtime.test.mjs`

Expected: FAIL with `ENOENT` for `api/zerlum-landscape-skill/SKILL.md`.

- [ ] **Step 3: Write the Landscape Skill entry**

Use this exact front matter and routing contract in `SKILL.md`:

```md
---
name: zerlum-landscape-design
description: Landscape design guidance for site analysis, spatial planning, circulation, planting, materials, ecological strategy, visualization, and scheme delivery.
---

# Zerlum Landscape Design Skill

用户明确要求、项目简报和场地资料优先。Skill 提供判断框架，不是项目事实、固定风格模板或规范合规证明。

每次任务先识别：项目类型、设计阶段、场地条件、用户目标、可用依据、缺失信息和期望输出。只加载与当前任务相关的参考文件，并在事实不足时明确假设和待复核项。
```

- [ ] **Step 4: Write the eleven focused references**

Each reference must contain `Purpose`, `Read First`, `Design Actions`, `Constraints`, `Failure Signals`, and `Output Guidance` sections. Encode these exact responsibilities:

```text
00: evidence hierarchy, design question, alternatives, human scale, buildability
01: context, boundaries, access, terrain, water, vegetation, climate, problems/opportunities
02: spatial structure, program adjacency, circulation hierarchy, arrival, pause and sequence
03: user groups, time-based scenarios, capacity, accessibility, maintenance and operations
04: grading logic, drainage path, sponge measures, water edge, habitat and professional review
05: community structure, canopy/shrub/ground layers, seasonality, maturity and regional suitability
06: material response, paving scale, edge details, structures, durability and maintenance
07: residential, commercial, park, waterfront, hospitality, campus and cultural-tourism differences
08: preserve-vs-redesign modes, camera, scale, planting realism, material realism and prompt output
09: evidence-driven outline, page roles, image use, delivery completeness and export checks
10: user-intent compliance, assumptions, differentiation variables and pre-response rubric
```

- [ ] **Step 5: Remove the old Skill directory and run the test**

Run: `node --test tests/landscape-skill-runtime.test.mjs`

Expected: PASS, and `Test-Path api/zerlum-lighting-skill` returns `False`.

- [ ] **Step 6: Commit**

```bash
git add api/zerlum-landscape-skill tests/landscape-skill-runtime.test.mjs
git add -u api/zerlum-lighting-skill
git commit -m "feat: replace lighting skill with landscape guidance"
```

### Task 3: Create one landscape prompt runtime

**Files:**
- Delete: `api/zerlum-skill.js`
- Create: `api/zerlum-landscape-skill.js`
- Delete: `api/zerlum-skill.d.ts`
- Create: `api/zerlum-landscape-skill.d.ts`
- Modify: `api/_zerlum-server.ts`
- Modify: `vite.config.ts`
- Modify: `vercel.json`
- Modify: `tests/landscape-skill-runtime.test.mjs`
- Modify: `tests/backend-skill-md-integration.test.mjs`
- Modify: `tests/ark-proxy-routing.test.mjs`

- [ ] **Step 1: Extend the failing runtime contract**

```js
test("local and production routes use one landscape prompt wrapper", async () => {
  const loader = await readFile(new URL("api/zerlum-landscape-skill.js", root), "utf8");
  const server = await readFile(new URL("api/_zerlum-server.ts", root), "utf8");
  const vite = await readFile(new URL("vite.config.ts", root), "utf8");
  const vercel = await readFile(new URL("vercel.json", root), "utf8");
  assert.match(loader, /withZerlumLandscapeContext/);
  assert.match(loader, /withZerlumLandscapeGenerationPrompt/);
  assert.match(server, /from "\.\/zerlum-landscape-skill\.js"/);
  assert.match(vite, /from "\.\/api\/zerlum-landscape-skill\.js"/);
  assert.match(vercel, /api\/zerlum-landscape-skill\/\*\*/);
  assert.doesNotMatch(server + vite + loader, /统一灯光设计|Lighting Skill/);
});
```

- [ ] **Step 2: Run the focused test and verify imports fail**

Run: `node --test tests/landscape-skill-runtime.test.mjs`

Expected: FAIL because the new loader does not exist.

- [ ] **Step 3: Implement the loader**

Create `api/zerlum-landscape-skill.js` with this public API:

```js
import { readFileSync } from "node:fs";

const skillFiles = [
  "./zerlum-landscape-skill/SKILL.md",
  ...Array.from({ length: 11 }, (_, index) => {
    const names = [
      "00-universal-landscape-thinking",
      "01-site-analysis",
      "02-spatial-program-circulation",
      "03-users-scenarios-operations",
      "04-grading-water-ecology",
      "05-planting-seasonality",
      "06-materials-details",
      "07-project-typologies",
      "08-visualization-prompts",
      "09-document-delivery",
      "10-quality-variation",
    ];
    return `./zerlum-landscape-skill/references/${names[index]}.md`;
  }),
];

const skillMarkdown = skillFiles
  .map((path) => readFileSync(new URL(path, import.meta.url), "utf8").trim())
  .join("\n\n---\n\n");

const compactGenerationContext = [
  "【Zerlum 景观生成约束】",
  "先判断任务是保结构优化、概念改造、局部替换、方向变体、季节时间变化或自由生成。",
  "用户要求、项目资料和画布关系优先。默认保持视角、透视、尺度和未要求改变的主体。",
  "控制空间层次、植物成熟度、材料真实性、人尺度、季节、天气和使用场景。",
  "不得默认蓝调夜景，不得无依据增加路径、水景、构筑物或地形。",
].join("\n");

export function getZerlumLandscapeSkillMarkdown() {
  return skillMarkdown;
}

export function withZerlumLandscapeContext(prompt, { compact = false } = {}) {
  const context = compact ? compactGenerationContext : skillMarkdown;
  return [context, "【当前任务】", String(prompt ?? "").trim()].filter(Boolean).join("\n\n");
}

export function withZerlumLandscapeGenerationPrompt(prompt) {
  return [compactGenerationContext, "【用户原始生成提示词】", String(prompt ?? "").trim()]
    .filter(Boolean)
    .join("\n\n");
}
```

- [ ] **Step 4: Replace all production and Vite imports and calls**

Use only:

```ts
import {
  withZerlumLandscapeContext,
  withZerlumLandscapeGenerationPrompt,
} from "./zerlum-landscape-skill.js";
```

For the Vite config, use the `./api/` import path. Replace the old helper names everywhere, rewrite the Agent, canvas, prompt, outline, document and video instructions to match sections 9–10 of the design spec, and keep provider routing unchanged.

- [ ] **Step 5: Update declarations and deployment bundle**

Declare the three exported functions in `api/zerlum-landscape-skill.d.ts`, remove `api/zerlum-skill.d.ts`, and change every `includeFiles` entry in `vercel.json` to `api/zerlum-landscape-skill/**`.

- [ ] **Step 6: Run focused API tests**

Run: `node --test tests/landscape-skill-runtime.test.mjs tests/backend-skill-md-integration.test.mjs tests/ark-proxy-routing.test.mjs`

Expected: PASS with 0 failures and no legacy Lighting Skill assertion.

- [ ] **Step 7: Commit**

```bash
git add api vite.config.ts vercel.json tests/landscape-skill-runtime.test.mjs tests/backend-skill-md-integration.test.mjs tests/ark-proxy-routing.test.mjs
git commit -m "feat: route model calls through landscape skill"
```

### Task 4: Add the landscape project model and versioned persistence

**Files:**
- Create: `src/domain/landscape.ts`
- Create: `src/state/workspace.ts`
- Create: `tests/landscape-project-model.test.mjs`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write the failing domain source contract**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("workspace uses a single landscape project context", async () => {
  const domain = await readFile(new URL("../src/domain/landscape.ts", import.meta.url), "utf8");
  const state = await readFile(new URL("../src/state/workspace.ts", import.meta.url), "utf8");
  assert.match(domain, /export type LandscapeProject/);
  assert.match(domain, /location:/);
  assert.match(domain, /designStage:/);
  assert.match(domain, /brief:/);
  assert.match(state, /zerlum-landscape-workspace-v1/);
  assert.doesNotMatch(domain + state, /Collaboration|TeamMember|MemberRole|Permissions/);
});
```

- [ ] **Step 2: Run the test and verify the modules are absent**

Run: `node --test tests/landscape-project-model.test.mjs`

Expected: FAIL with `ENOENT` for `src/domain/landscape.ts`.

- [ ] **Step 3: Implement the domain module**

```ts
export type DesignStage = "前期研究" | "概念方案" | "方案深化" | "汇报交付";

export type LandscapeProjectBrief = {
  goals: string;
  users: string;
  siteScope: string;
  constraints: string;
};

export type LandscapeProject = {
  id: string;
  name: string;
  type: string;
  location: string;
  designStage: DesignStage;
  client: string;
  updatedAt: string;
  brief: LandscapeProjectBrief;
};

export const landscapeProjectTypes = [
  "居住景观", "商业景观", "城市公园", "滨水景观", "酒店度假", "校园景观", "文旅景观", "其他",
] as const;

export function createLandscapeProject(now = new Date()): LandscapeProject {
  return {
    id: `landscape-${now.getTime()}`,
    name: "未命名景观项目",
    type: "其他",
    location: "",
    designStage: "概念方案",
    client: "",
    updatedAt: now.toISOString().slice(0, 10),
    brief: { goals: "", users: "", siteScope: "", constraints: "" },
  };
}
```

- [ ] **Step 4: Implement versioned state**

```ts
import { createLandscapeProject, type LandscapeProject } from "../domain/landscape";

export const LANDSCAPE_STORAGE_KEY = "zerlum-landscape-workspace-v1";

export type WorkspaceSession = {
  displayName: string;
  email: string;
  avatarUrl?: string;
};

export type WorkspaceState = {
  theme: "dark" | "light";
  activeView: "agent" | "canvas" | "text";
  session: WorkspaceSession | null;
  projects: LandscapeProject[];
  activeProjectId: string;
};

export function createWorkspaceState(): WorkspaceState {
  const project = createLandscapeProject();
  return { theme: "dark", activeView: "agent", session: null, projects: [project], activeProjectId: project.id };
}
```

Add guarded `readWorkspaceState()` and `writeWorkspaceState()` functions that validate the parsed shape, keep only theme and display information from the old key, and never import old projects or collaboration data. `writeWorkspaceState()` must return `{ ok: true }` or `{ ok: false, message: "本地存储空间不足，请移除大型资料后重试。" }` instead of silently swallowing a quota error.

- [ ] **Step 5: Run the domain test**

Run: `node --test tests/landscape-project-model.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain/landscape.ts src/state/workspace.ts src/App.tsx tests/landscape-project-model.test.mjs
git commit -m "feat: add landscape project context"
```

### Task 5: Remove collaboration and make login direct

**Files:**
- Modify: `src/App.tsx`
- Modify: `tests/workspace-admin-profile-project.test.mjs`
- Create: `tests/single-user-landscape-workspace.test.mjs`

- [ ] **Step 1: Write the failing direct-entry tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");

test("login creates a single-user landscape session and enters Agent", () => {
  assert.match(app, /setSession\(\{[\s\S]*displayName:/);
  assert.match(app, /setActiveView\("agent"\)/);
  assert.doesNotMatch(app, /setOnboardingOpen\(true\)/);
});

test("workspace contains no collaboration onboarding", () => {
  assert.doesNotMatch(app, /OnboardingDialog|OnboardingStep|Collaboration|TeamMember|MemberRole|Permissions/);
  assert.doesNotMatch(app, /项目码|创建项目空间|打开项目空间|独自创作/);
});
```

- [ ] **Step 2: Run the tests and verify legacy onboarding fails them**

Run: `node --test tests/single-user-landscape-workspace.test.mjs`

Expected: FAIL with matches for `OnboardingDialog` and collaboration types.

- [ ] **Step 3: Remove collaboration types, state and UI**

Delete `OnboardingStep`, `MemberRole`, `Collaboration`, `TeamMember`, `Permissions`, `buildMembers`, `getPermissions`, onboarding drafts, member selectors and permission gates. Replace `Session` with `WorkspaceSession` and project types with `LandscapeProject` imports.

- [ ] **Step 4: Make authentication enter the workspace**

The submit handler must follow this shape:

```ts
function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const displayName = authForm.username.trim() || authForm.email.trim().split("@")[0] || "Zerlum 用户";
  setSession({ displayName, email: authForm.email.trim() });
  setActiveView("agent");
  setAuthOpen(false);
}
```

Ensure `projects` always contains `createLandscapeProject()` when a new session starts.

- [ ] **Step 5: Update project/profile tests for single-user behavior**

Replace administrator permission assertions with project metadata and profile persistence assertions. Keep avatar size resilience and project material behavior.

- [ ] **Step 6: Run focused tests and build**

Run: `node --test tests/single-user-landscape-workspace.test.mjs tests/workspace-admin-profile-project.test.mjs tests/project-materials-panel.test.mjs`

Expected: PASS.

Run: `corepack pnpm run build`

Expected: TypeScript and Vite exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx tests/single-user-landscape-workspace.test.mjs tests/workspace-admin-profile-project.test.mjs tests/project-materials-panel.test.mjs
git commit -m "feat: enter landscape workspace after login"
```

### Task 6: Redesign the welcome, shell and Agent empty state

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Modify: `src/components/Dock.tsx`
- Modify: `src/components/Dock.css`
- Modify: `tests/tool-platform-scope.test.mjs`
- Modify: `tests/workspace-heading-visibility.test.mjs`
- Create: `tests/landscape-shell-ui.test.mjs`

- [ ] **Step 1: Write failing shell-content tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("welcome and workspace share the landscape product language", async () => {
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(app, /从场地到方案/);
  assert.match(app, /景观 Agent/);
  assert.match(app, /方案画布/);
  assert.match(app, /文本交付/);
  assert.match(app, /分析场地问题与机会/);
  assert.match(app, /提出概念方向/);
  assert.doesNotMatch(app, /Welcome Zerlum|照明设计工具台/);
});
```

- [ ] **Step 2: Run the test and verify old labels fail**

Run: `node --test tests/landscape-shell-ui.test.mjs`

Expected: FAIL because the new labels and actions are missing.

- [ ] **Step 3: Update navigation and welcome content**

Use exactly these navigation items:

```ts
const navItems = [
  { id: "agent", label: "景观 Agent", icon: ChatCircleText },
  { id: "canvas", label: "方案画布", icon: ImageIcon },
  { id: "text", label: "文本交付", icon: FileText },
] satisfies NavItem[];
```

Welcome uses heading `从场地到方案`, supporting text `理解场地，推演方向，完成表达。`, and action `进入 Zerlum`.

- [ ] **Step 4: Give Agent a useful first-run state**

Render quick-action buttons for the six tasks in section 6.1 of the design spec. Clicking a quick action fills the composer and focuses it; it does not auto-submit.

- [ ] **Step 5: Add project brief and recent-outcome panels**

The left panel edits project type, location, design stage, client, goals, users, site scope and constraints. The right panel shows the most recent assistant conclusions under `设计方向`, `设计节点` and `待确认项`; when no conclusion exists, it explains which Agent actions will create one. Persist edits through `writeWorkspaceState()` and surface its returned quota message in an inline status region.

- [ ] **Step 6: Restyle the shell**

Introduce graphite surfaces and a restrained moss state color using CSS variables:

```css
.theme-dark {
  --page: #0c0e0d;
  --surface: #121513;
  --surface-elevated: #181c19;
  --surface-soft: #202521;
  --line: rgb(232 240 234 / 0.1);
  --line-strong: rgb(232 240 234 / 0.22);
  --text: #f1f4f1;
  --muted: #aab2ac;
  --accent: #8da68f;
  --accent-ink: #0d120e;
}
```

Use 12–16px card radii, remove wide decorative shadows, keep top-bar controls at least 40px high, and add a reduced-motion block that disables nonessential transforms.

- [ ] **Step 7: Run shell tests and build**

Run: `node --test tests/landscape-shell-ui.test.mjs tests/tool-platform-scope.test.mjs tests/workspace-heading-visibility.test.mjs tests/agent-chat-ui.test.mjs`

Expected: PASS.

Run: `corepack pnpm run build`

Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx src/styles.css src/components/Dock.tsx src/components/Dock.css tests/landscape-shell-ui.test.mjs tests/tool-platform-scope.test.mjs tests/workspace-heading-visibility.test.mjs
git commit -m "feat: redesign landscape workspace shell"
```

### Task 7: Extract shell and Agent components from App

**Files:**
- Create: `src/shell/WelcomeScreen.tsx`
- Create: `src/shell/AuthDialog.tsx`
- Create: `src/shell/WorkspaceHeader.tsx`
- Create: `src/views/agent/AgentView.tsx`
- Modify: `src/App.tsx`
- Create: `tests/landscape-component-boundaries.test.mjs`

- [ ] **Step 1: Write the failing boundary test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("App delegates shell and Agent rendering to focused modules", async () => {
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(app, /from "\.\/shell\/WelcomeScreen"/);
  assert.match(app, /from "\.\/shell\/AuthDialog"/);
  assert.match(app, /from "\.\/shell\/WorkspaceHeader"/);
  assert.match(app, /from "\.\/views\/agent\/AgentView"/);
  assert.doesNotMatch(app, /function WelcomeScreen\(/);
  assert.doesNotMatch(app, /function AuthDialog\(/);
  assert.doesNotMatch(app, /function AgentView\(/);
});
```

- [ ] **Step 2: Run the boundary test and verify inline components fail it**

Run: `node --test tests/landscape-component-boundaries.test.mjs`

Expected: FAIL.

- [ ] **Step 3: Extract `WelcomeScreen`, `AuthDialog` and `WorkspaceHeader`**

Move their JSX and local presentation logic unchanged after the landscape redesign. `AuthDialog` only submits account fields and never opens an onboarding flow. Define explicit props for session, project, navigation, theme and callbacks. Keep state ownership in `App`.

- [ ] **Step 4: Extract `AgentView`**

Move project brief, material upload, conversation, quick tasks and recent outcomes into `src/views/agent/AgentView.tsx`. Export an `AgentViewProps` type that consumes `LandscapeProject`, `ProjectMaterial[]`, message state and callbacks without importing persistence functions.

- [ ] **Step 5: Run boundary, Agent and build checks**

Run: `node --test tests/landscape-component-boundaries.test.mjs tests/agent-chat-ui.test.mjs tests/agent-voice-input.test.mjs tests/project-materials-panel.test.mjs`

Expected: PASS.

Run: `corepack pnpm run build`

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/shell src/views/agent tests/landscape-component-boundaries.test.mjs
git commit -m "refactor: split landscape shell and agent view"
```

### Task 8: Phase verification

**Files:**
- Modify only if verification exposes a scoped defect.

- [ ] **Step 1: Run all tests**

Run: `corepack pnpm test`

Expected: all tests pass, 0 failures.

- [ ] **Step 2: Run the production build**

Run: `corepack pnpm run build`

Expected: `tsc` and `vite build` exit 0.

- [ ] **Step 3: Audit legacy domain text in active runtime files**

Run:

```powershell
rg -n "照明设计|Lighting Skill|zerlum-lighting-skill|项目码|创建项目空间|TeamMember|Collaboration" src api vite.config.ts vercel.json tests
```

Expected: no unexplained matches. Historical design documents are excluded from this runtime audit.

- [ ] **Step 4: Commit any verification-only correction**

```bash
git add src api tests vite.config.ts vercel.json package.json
git commit -m "fix: close landscape shell verification gaps"
```

Skip this commit if verification required no correction.
