import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const viteSource = readFileSync(join(root, "vite.config.ts"), "utf8");
const apiServerSource = readFileSync(join(root, "api", "_zerlum-server.ts"), "utf8");
const skillHelperSource = readFileSync(join(root, "api", "zerlum-skill.js"), "utf8");
const skillHelperTypes = readFileSync(join(root, "api", "zerlum-skill.d.ts"), "utf8");
const vercelConfig = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
const agentContextRoot = join(root, "api", "zerlum-agent-context");
const removedAgentContextFiles = [
  "zerlum-photo-analysis-lite.md",
  "平台集成说明与调用模板.md",
];
const agentProxyBlock = viteSource.slice(
  viteSource.indexOf('server.middlewares.use("/api/zerlum-agent"'),
  viteSource.indexOf('server.middlewares.use("/api/zerlum-image"'),
);
const apiAgentPromptBlock = apiServerSource.slice(
  apiServerSource.indexOf("function buildAgentPrompt"),
  apiServerSource.indexOf("function collectImageCandidates"),
);

test("agent markdown context files are no longer mounted", () => {
  for (const relativePath of removedAgentContextFiles) {
    assert.equal(existsSync(join(agentContextRoot, relativePath)), false);
  }

  assert.doesNotMatch(skillHelperSource, /zerlum-agent-context/);
  assert.doesNotMatch(skillHelperSource, /zerlum-photo-analysis-lite/);
  assert.doesNotMatch(skillHelperSource, /平台集成说明与调用模板/);
  assert.doesNotMatch(skillHelperSource, /markdown-chunks\.jsonl/);
  assert.doesNotMatch(skillHelperSource, /desktop-lighting-library/);
  assert.doesNotMatch(skillHelperSource, /retrieveDesktopKnowledgeChunks/);
});

test("shared skill helper no longer exposes fixed agent markdown context", () => {
  assert.doesNotMatch(skillHelperSource, /export function buildZerlumKnowledgeContext/);
  assert.doesNotMatch(skillHelperTypes, /export function buildZerlumKnowledgeContext/);
  assert.doesNotMatch(skillHelperTypes, /retrieveDesktopKnowledgeChunks/);
});

test("main agent proxy no longer injects fixed markdown context", () => {
  assert.doesNotMatch(viteSource, /buildZerlumKnowledgeContext/);
  assert.doesNotMatch(apiServerSource, /buildZerlumKnowledgeContext/);
  assert.doesNotMatch(agentProxyBlock, /const knowledgeContext =[\s\S]*buildZerlumKnowledgeContext/);
  assert.doesNotMatch(apiAgentPromptBlock, /const knowledgeContext =[\s\S]*buildZerlumKnowledgeContext/);
  assert.doesNotMatch(agentProxyBlock, /knowledgeContext,/);
  assert.doesNotMatch(apiAgentPromptBlock, /knowledgeContext,/);
  assert.doesNotMatch(
    agentProxyBlock,
    /不要调用、引用或声称使用本地 agent 指令、数据库、知识库、历史 Markdown 索引或联网检索结果/,
  );
});

test("Vercel function bundle does not include removed agent markdown context", () => {
  const includeFiles = vercelConfig.functions?.["api/*.ts"]?.includeFiles;

  assert.equal(typeof includeFiles, "string");
  assert.match(includeFiles, /api\/zerlum-lighting-skill\/\*\*/);
  assert.doesNotMatch(includeFiles, /api\/zerlum-agent-context\/\*\*/);
  assert.doesNotMatch(includeFiles, /knowledge\/desktop-lighting-library/);
});
