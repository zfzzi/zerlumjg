import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const rootPath = fileURLToPath(new URL("..", import.meta.url));
const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const workspaceHeaderSource = readFileSync(
  new URL("../src/shell/WorkspaceHeader.tsx", import.meta.url),
  "utf8",
);
const viteSource = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");
const apiServerSource = readFileSync(
  new URL("../api/_zerlum-server.ts", import.meta.url),
  "utf8",
);

const navItemsBlock = workspaceHeaderSource.slice(
  workspaceHeaderSource.indexOf("export const workspaceNavItems = ["),
  workspaceHeaderSource.indexOf("export type WorkspaceHeaderProps"),
);
const workspaceRenderBlock = appSource.slice(
  appSource.indexOf("function Workspace"),
  appSource.indexOf("function ThemeToggle"),
);

test("workspace navigation keeps the three landscape work surfaces", () => {
  assert.match(navItemsBlock, /id:\s*"agent"[\s\S]*label:\s*"景观 Agent"/);
  assert.match(navItemsBlock, /id:\s*"canvas"[\s\S]*label:\s*"方案画布"/);
  assert.match(navItemsBlock, /id:\s*"text"[\s\S]*label:\s*"文本交付"/);
  assert.doesNotMatch(
    navItemsBlock,
    /灯具库|数据库|知识库|灯具报价|协同中枢/,
  );
  assert.doesNotMatch(
    appSource,
    /type WorkspaceView =[\s\S]*\|\s*"(fixture|database|knowledge|quote|hub)"/,
  );
  assert.match(appSource, /useState<WorkspaceView>\(\s*persisted\.activeView/);
  assert.match(appSource, /setActiveView\("agent"\)/);
});

test("zerlum agent is rendered while removed workspace sections stay deleted", () => {
  assert.match(workspaceRenderBlock, /<AgentView/);
  assert.doesNotMatch(
    workspaceRenderBlock,
    /<FixtureView|<DatabaseView|<KnowledgeView|<QuoteView|<HubView/,
  );
  assert.match(appSource, /function AgentWorkspaceContent\b/);
  assert.doesNotMatch(
    appSource,
    /function (FixtureView|DatabaseView|KnowledgeView|QuoteView|HubView)\b/,
  );
  assert.doesNotMatch(
    workspaceRenderBlock,
    /activeView === "(fixture|database|knowledge|quote|hub)"/,
  );
  assert.match(workspaceRenderBlock, /activeView === "agent"/);
  assert.match(workspaceRenderBlock, /activeView === "canvas"/);
  assert.match(workspaceRenderBlock, /activeView === "text"/);
});

test("desktop markdown and fixed agent markdown context are no longer mounted", () => {
  const agentsRoot = join(rootPath, "agents");
  const agentContextRoot = join(rootPath, "api", "zerlum-agent-context");
  const oldKnowledgeRoot = join(
    rootPath,
    "knowledge",
    "desktop-lighting-library",
  );
  const landscapeKnowledgeRoot = join(
    rootPath,
    "knowledge",
    "landscape-design-library",
  );
  const agentInstructionFiles = existsSync(agentsRoot)
    ? readdirSync(agentsRoot, { recursive: true })
        .map(String)
        .filter((path) => path.endsWith("agent.md") || path === "registry.json")
    : [];
  const agentContextFiles = existsSync(agentContextRoot)
    ? readdirSync(agentContextRoot, { recursive: true }).map(String)
    : [];

  assert.deepEqual(agentInstructionFiles, []);
  assert.deepEqual(agentContextFiles.sort(), []);
  assert.equal(existsSync(oldKnowledgeRoot), false);
  assert.equal(existsSync(landscapeKnowledgeRoot), true);
  assert.doesNotMatch(appSource, /desktopKnowledgeIndexJson|markdown-index\.json/);
});

test("agent proxy does not restore removed markdown instructions or context", () => {
  for (const source of [viteSource, apiServerSource]) {
    assert.doesNotMatch(source, /readAgentInstruction/);
    assert.doesNotMatch(source, /buildZerlumKnowledgeContext/);
    assert.doesNotMatch(source, /已加载的 Zerlum Agent 规则/);
    assert.doesNotMatch(source, /agents\/lighting-visualization\/agent\.md/);
    assert.doesNotMatch(source, /desktop-lighting-library|markdown-chunks\.jsonl|markdown-index\.json/);
  }
  assert.doesNotMatch(viteSource, /Zerlum 桌面照明知识库|open-local-folder|markdown-index\.json/);
});
