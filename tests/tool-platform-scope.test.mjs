import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const rootPath = fileURLToPath(new URL("..", import.meta.url));
const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const viteSource = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");
const apiServerSource = readFileSync(
  new URL("../api/_zerlum-server.ts", import.meta.url),
  "utf8",
);

const navItemsBlock = appSource.slice(
  appSource.indexOf("const navItems: NavItem[] = ["),
  appSource.indexOf("type AgentAttachment"),
);
const workspaceRenderBlock = appSource.slice(
  appSource.indexOf("function Workspace"),
  appSource.indexOf("function ThemeToggle"),
);

test("workspace navigation keeps zerlum agent plus image/video canvas and方案 tools", () => {
  assert.match(navItemsBlock, /id:\s*"agent"[\s\S]*label:\s*"zerlum agent"/);
  assert.match(navItemsBlock, /id:\s*"canvas"[\s\S]*label:\s*"AI无限画布"/);
  assert.match(navItemsBlock, /id:\s*"text"[\s\S]*label:\s*"文本制作"/);
  assert.doesNotMatch(
    navItemsBlock,
    /灯具库|数据库|知识库|灯具报价|协同中枢/,
  );
  assert.doesNotMatch(
    appSource,
    /type WorkspaceView =[\s\S]*\|\s*"(fixture|database|knowledge|quote|hub)"/,
  );
  assert.match(appSource, /persisted\.activeView \?\? "agent"/);
  assert.match(appSource, /setActiveView\("agent"\)/);
});

test("zerlum agent is rendered while removed workspace sections stay deleted", () => {
  assert.match(workspaceRenderBlock, /<AgentView/);
  assert.doesNotMatch(
    workspaceRenderBlock,
    /<FixtureView|<DatabaseView|<KnowledgeView|<QuoteView|<HubView/,
  );
  assert.match(appSource, /function AgentView\b/);
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

test("local uploaded markdown knowledge and bound agent instructions are removed", () => {
  const agentsRoot = join(rootPath, "agents");
  const knowledgeRoot = join(
    rootPath,
    "knowledge",
    "desktop-lighting-library",
  );
  const agentInstructionFiles = existsSync(agentsRoot)
    ? readdirSync(agentsRoot, { recursive: true })
        .map(String)
        .filter((path) => path.endsWith("agent.md") || path === "registry.json")
    : [];
  const knowledgeFiles = existsSync(knowledgeRoot)
    ? readdirSync(knowledgeRoot, { recursive: true }).map(String)
    : [];

  assert.deepEqual(agentInstructionFiles, []);
  assert.deepEqual(knowledgeFiles, []);
  assert.doesNotMatch(appSource, /desktopKnowledgeIndexJson|markdown-index\.json/);
});

test("agent proxy no longer binds local agent markdown or knowledge chunks", () => {
  for (const source of [viteSource, apiServerSource]) {
    assert.doesNotMatch(source, /readAgentInstruction/);
    assert.doesNotMatch(source, /loadKnowledgeChunks/);
    assert.doesNotMatch(source, /retrieveKnowledgeContext/);
    assert.doesNotMatch(source, /markdown-chunks\.jsonl/);
    assert.doesNotMatch(source, /已加载的 Zerlum Agent 规则/);
    assert.doesNotMatch(source, /agents\/lighting-visualization\/agent\.md/);
    assert.doesNotMatch(source, /结合 Zerlum 知识库/);
  }
  assert.doesNotMatch(viteSource, /open-local-folder|markdown-index\.json/);
});
