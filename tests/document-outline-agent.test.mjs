import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const viteSource = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");
const apiServerSource = readFileSync(
  new URL("../api/_zerlum-server.ts", import.meta.url),
  "utf8",
);
const outlinePromptBlock = appSource.slice(
  appSource.indexOf("function buildOutlineAgentContext"),
  appSource.indexOf("async function requestDocumentAgent"),
);
const outlineSubmitBlock = appSource.slice(
  appSource.indexOf("async function handleDocumentAgentSubmit"),
  appSource.indexOf("async function handleGenerateDocumentOutput"),
);
const requestDocumentAgentBlock = appSource.slice(
  appSource.indexOf("async function requestDocumentAgent"),
  appSource.indexOf("async function handleDocumentAgentSubmit"),
);
const outlineProxyBlock = viteSource.slice(
  viteSource.indexOf("const outlineInstruction = isOutlineTask"),
  viteSource.indexOf("const enrichedMessage = isOutlineTask"),
);
const systemPromptBuilderBlock = viteSource.slice(
  viteSource.indexOf("function buildZerlumSystemPrompt"),
  viteSource.indexOf("async function readBody"),
);
const agentProxyBlock = viteSource.slice(
  viteSource.indexOf('server.middlewares.use("/api/zerlum-agent"'),
  viteSource.indexOf('server.middlewares.use("/api/zerlum-image"'),
);
const apiBuildAgentPromptBlock = apiServerSource.slice(
  apiServerSource.indexOf("function buildAgentPrompt"),
  apiServerSource.indexOf("function collectImageCandidates"),
);

test("outline prompt stays concise, landscape-specific, and material-driven", () => {
  assert.match(outlinePromptBlock, /你是 Zerlum 景观设计系统的大纲生成模块。/);
  assert.match(outlinePromptBlock, /对外说明身份时，只说“我是 Zerlum 景观设计系统”。/);
  assert.match(outlinePromptBlock, /项目依据只来自用户提交的项目简报与场地资料、Zerlum Agent 已确认结论和画布方案成果/);
  assert.match(outlinePromptBlock, /使用 Landscape Skill 组织景观设计方法、页面角色和质量检查/);
  assert.match(outlinePromptBlock, /Landscape Skill 只能作为专业方法约束，不能当作项目事实来源/);
  assert.match(outlinePromptBlock, /【用户提交的项目简报与场地资料】/);
  assert.match(outlinePromptBlock, /【Zerlum Agent 已确认结论】/);
  assert.match(outlinePromptBlock, /【画布方案成果】/);
  assert.match(outlinePromptBlock, /场地分析、结构图、游线图、植物板、材料板、节点分析或运营时间线/);
  assert.match(outlinePromptBlock, /项目事实、设计判断与待复核项/);
  assert.match(appSource, /agentMessages=\{agentMessages\}/);
  assert.match(outlineSubmitBlock, /const hasOutlineInputs =/);
  assert.match(outlineSubmitBlock, /images: canvasGeneratedImages/);
  assert.doesNotMatch(outlinePromptBlock, /照明设计|Lighting Skill|灯光策略图/);
  assert.doesNotMatch(requestDocumentAgentBlock, /\n\s*project:/);
});

test("outline proxy applies the same landscape delivery contract", () => {
  assert.match(outlineProxyBlock, /说明身份时，只说“我是 Zerlum 景观设计系统”。/);
  assert.match(outlineProxyBlock, /使用 Landscape Skill 组织景观设计方法、页面角色和质量检查。/);
  assert.match(outlineProxyBlock, /Landscape Skill 不能当作项目事实来源。/);
  assert.match(outlineProxyBlock, /先判断景观项目类型、设计阶段、场地问题、目标人群/);
  assert.match(outlineProxyBlock, /总体空间结构、功能、游线与使用场景、关键节点、植物与季相策略、材料、铺装和构筑物、生态水策略、运营分期和待复核项/);
  assert.match(outlineProxyBlock, /场地分析、结构图、游线图、植物板、材料板、节点分析或运营时间线/);
  assert.doesNotMatch(outlineProxyBlock, /照明设计|Lighting Skill|灯光策略图/);
});

test("outline proxy mounts Landscape Skill without legacy knowledge prompts", () => {
  assert.match(systemPromptBuilderBlock, /景观设计工作台/);
  assert.doesNotMatch(systemPromptBuilderBlock, /readAgentInstruction|retrieveKnowledgeContext|markdown-chunks\.jsonl/);
  assert.match(agentProxyBlock, /const systemPrompt = isOutlineTask\s*\?\s*""\s*:\s*buildZerlumSystemPrompt/);
  assert.match(agentProxyBlock, /请以 Zerlum 景观设计系统身份回答，只依据用户提交的项目简报与场地资料、Zerlum Agent 已确认结论和画布方案成果生成大纲/);
  assert.match(agentProxyBlock, /body\.project && !isOutlineTask && !isDocumentOutputTask/);
  assert.doesNotMatch(agentProxyBlock, /Lighting Skill|zerlum-skill/);
});

test("outline agent wraps the concise prompt with full Landscape Skill context", () => {
  assert.match(
    apiBuildAgentPromptBlock,
    /return isOutlineTask\s*\?\s*withZerlumLandscapeContext\(basePrompt,\s*\{\s*forGeneration:\s*false\s*\}\)\s*:\s*withZerlumLandscapeContext\(basePrompt\);/,
  );
  assert.match(agentProxyBlock, /const baseMessage = \[/);
  assert.match(
    agentProxyBlock,
    /const enrichedMessage = isOutlineTask\s*\?\s*withZerlumLandscapeContext\(baseMessage,\s*\{\s*forGeneration:\s*false\s*\}\)\s*:\s*withZerlumLandscapeContext\(baseMessage\);/,
  );
});
