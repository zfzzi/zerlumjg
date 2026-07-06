import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(
  new URL("../src/App.tsx", import.meta.url),
  "utf8",
);
const viteSource = readFileSync(
  new URL("../vite.config.ts", import.meta.url),
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
const outlineProxyBlock = viteSource.slice(
  viteSource.indexOf("const outlineInstruction = isOutlineTask"),
  viteSource.indexOf("const enrichedMessage = ["),
);
const systemPromptBuilderBlock = viteSource.slice(
  viteSource.indexOf("function buildZerlumSystemPrompt"),
  viteSource.indexOf("async function readBody"),
);
const agentProxyBlock = viteSource.slice(
  viteSource.indexOf('server.middlewares.use("/api/zerlum-agent"'),
  viteSource.indexOf('server.middlewares.use("/api/zerlum-image"'),
);

test("outline prompt stays concise and material-driven", () => {
  assert.match(outlinePromptBlock, /你是 Zerlum照明系统的大纲生成模块。/);
  assert.match(outlinePromptBlock, /对外说明身份时，只说“我是 Zerlum照明系统”。/);
  assert.match(outlinePromptBlock, /你的信息只来自用户上传资料和当前项目基础信息。/);
  assert.match(outlinePromptBlock, /不要调用或引用任何 agent\.md、Zerlum 知识库、数据库或联网检索结果。/);
  assert.match(outlinePromptBlock, /如果已收到用户上传资料，就只根据这些资料和项目基础信息生成简洁大纲。/);
  assert.match(outlinePromptBlock, /如果目前没有收到用户上传资料，就回复：目前没有收到资料，请先上传项目资料后再生成大纲。/);
  assert.match(outlinePromptBlock, /版式默认 16:9 横屏。/);
  assert.match(outlinePromptBlock, /大纲开头必须先写清楚排版风格和字体要求。/);
  assert.match(outlinePromptBlock, /随后逐页写清楚每页的排版内容、版面位置和图文层级。/);
  assert.match(outlineSubmitBlock, /if \(!materials\.length\)/);
  assert.match(outlineSubmitBlock, /我是 Zerlum照明系统。我的信息只来自用户上传资料和当前项目基础信息。目前没有收到资料，请先上传项目资料后再生成大纲。/);
  assert.doesNotMatch(outlinePromptBlock, /我是 Zerlum Outline Agent/);
  assert.doesNotMatch(outlineSubmitBlock, /我是 Zerlum Outline Agent/);
  assert.doesNotMatch(outlinePromptBlock, /数据库可调用内容|知识库调用方向|缺失资料提醒|本章目的|必要的联网检索结果/);
  assert.doesNotMatch(outlineSubmitBlock, /输出格式固定为：章节名称 \/ 本章目的/);
});

test("outline proxy constraints do not force verbose chapter explanations", () => {
  assert.match(outlineProxyBlock, /说明身份时，只说“我是 Zerlum照明系统”。/);
  assert.match(outlineProxyBlock, /不得调用、引用或声称使用任何 agent\.md、Zerlum 知识库、数据库或联网检索结果。/);
  assert.match(outlineProxyBlock, /收到资料时，输出简洁大纲；没有资料时，只说明目前没有收到资料。/);
  assert.match(outlineProxyBlock, /版式默认 16:9 横屏。/);
  assert.match(outlineProxyBlock, /大纲开头必须先写清楚排版风格和字体要求。/);
  assert.match(outlineProxyBlock, /随后逐页写清楚每页的排版内容、版面位置和图文层级。/);
  assert.doesNotMatch(outlineProxyBlock, /我是 Zerlum Outline Agent|Zerlum Outline Agent 身份/);
  assert.doesNotMatch(outlineProxyBlock, /章节名称 \/ 本章目的|缺失资料提醒|数据库项目案例索引|Zerlum 知识库和必要的联网检索结果/);
});

test("outline proxy bypasses local agent and knowledge prompts", () => {
  assert.match(systemPromptBuilderBlock, /includeAgentInstructions\?: boolean/);
  assert.match(
    systemPromptBuilderBlock,
    /const agentInstructions = includeAgentInstructions\s*\?\s*routes/,
  );
  assert.match(agentProxyBlock, /const systemPrompt = isOutlineTask\s*\?\s*""\s*:\s*buildZerlumSystemPrompt/);
  assert.match(agentProxyBlock, /isOutlineTask\s*\?\s*"请以 Zerlum照明系统身份回答，只依据用户上传资料和当前项目基础信息生成大纲。"/);
  assert.doesNotMatch(agentProxyBlock, /Zerlum Outline Agent 身份/);
  assert.doesNotMatch(agentProxyBlock, /includeAgentInstructions: !isOutlineTask/);
});
