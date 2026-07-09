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
const workspaceTextViewBlock = appSource.slice(
  appSource.indexOf("{activeView === \"text\" && ("),
  appSource.indexOf("function ThemeToggle"),
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
const apiBuildAgentPromptBlock = apiServerSource.slice(
  apiServerSource.indexOf("function buildAgentPrompt"),
  apiServerSource.indexOf("function collectImageCandidates"),
);

test("outline prompt stays concise and material-driven", () => {
  assert.match(outlinePromptBlock, /你是 Zerlum照明系统的大纲生成模块。/);
  assert.match(outlinePromptBlock, /对外说明身份时，只说“我是 Zerlum照明系统”。/);
  assert.match(outlinePromptBlock, /你的信息只来自用户提交资料、Zerlum Agent 聊天输出和画布生成图片。/);
  assert.match(outlinePromptBlock, /同时遵循已挂载的 Lighting Skill 9 个 md 作为照明设计专业约束。/);
  assert.match(outlinePromptBlock, /不要调用或引用任何 agent\.md、数据库或联网检索结果。/);
  assert.match(outlinePromptBlock, /Lighting Skill 只能作为专业方法约束，不能当作项目事实来源。/);
  assert.match(outlinePromptBlock, /如果已收到任一来源，就只根据这些显式输入生成简洁大纲。/);
  assert.match(outlinePromptBlock, /如果目前没有收到用户提交资料、Agent 输出或画布图片，就回复：目前没有收到可用于生成大纲的资料。/);
  assert.match(outlinePromptBlock, /【用户提交资料内容】/);
  assert.match(outlinePromptBlock, /【Zerlum Agent 聊天输出】/);
  assert.match(outlinePromptBlock, /【画布生成图片】/);
  assert.match(outlinePromptBlock, /版式默认 16:9 横屏。/);
  assert.match(outlinePromptBlock, /大纲开头必须先写清楚排版风格和字体要求。/);
  assert.match(outlinePromptBlock, /先判断项目类型、空间气质、目标受众和显式资料里可推导的表达风格。/);
  assert.match(outlinePromptBlock, /给出 2-3 条视觉路线，并选择最适合本项目的一条作为整套方案基调。/);
  assert.match(outlinePromptBlock, /不要让整套方案全篇都放画布生成效果图。/);
  assert.match(outlinePromptBlock, /效果图页只用于封面、重点空间、关键体验或前后对比等必要页面。/);
  assert.match(outlinePromptBlock, /其余页面应使用概念叙事、材质\/光影板、平面\/节点分析、灯光策略图、动线或时间线等页面类型。/);
  assert.match(outlinePromptBlock, /每页必须标注页面类型、主要视觉元素、是否使用画布生成图以及使用方式。/);
  assert.match(outlinePromptBlock, /随后逐页写清楚每页的排版内容、版面位置和图文层级。/);
  assert.match(workspaceTextViewBlock, /agentMessages=\{agentMessages\}/);
  assert.match(outlineSubmitBlock, /const hasOutlineInputs =/);
  assert.match(outlineSubmitBlock, /images: canvasGeneratedImages/);
  assert.match(outlineSubmitBlock, /我是 Zerlum照明系统。我的信息只来自用户提交资料、Zerlum Agent 聊天输出和画布生成图片。目前没有收到可用于生成大纲的资料。/);
  assert.doesNotMatch(outlinePromptBlock, /我是 Zerlum Outline Agent/);
  assert.doesNotMatch(outlineSubmitBlock, /我是 Zerlum Outline Agent/);
  assert.doesNotMatch(outlinePromptBlock, /当前项目基础信息|项目名称：|项目类型：|客户名称：|项目阶段：/);
  assert.doesNotMatch(outlinePromptBlock, /数据库可调用内容|知识库调用方向|缺失资料提醒|本章目的|必要的联网检索结果/);
  assert.doesNotMatch(outlineSubmitBlock, /输出格式固定为：章节名称 \/ 本章目的/);
});

test("outline proxy constraints do not force verbose chapter explanations", () => {
  assert.match(outlineProxyBlock, /说明身份时，只说“我是 Zerlum照明系统”。/);
  assert.match(outlineProxyBlock, /你的信息只来自用户提交资料、Zerlum Agent 聊天输出和画布生成图片。/);
  assert.match(outlineProxyBlock, /必须遵循已挂载的 Lighting Skill 9 个 md 作为照明设计专业约束。/);
  assert.match(outlineProxyBlock, /不得调用、引用或声称使用任何 agent\.md、数据库或联网检索结果。/);
  assert.match(outlineProxyBlock, /Lighting Skill 不能当作项目事实来源。/);
  assert.match(outlineProxyBlock, /收到任一来源时，输出简洁大纲；没有资料、Agent 输出或画布图片时，只说明目前没有收到可用于生成大纲的资料。/);
  assert.match(outlineProxyBlock, /版式默认 16:9 横屏。/);
  assert.match(outlineProxyBlock, /大纲开头必须先写清楚排版风格和字体要求。/);
  assert.match(outlineProxyBlock, /先判断项目类型、空间气质、目标受众和显式资料里可推导的表达风格。/);
  assert.match(outlineProxyBlock, /给出 2-3 条视觉路线，并选择最适合本项目的一条作为整套方案基调。/);
  assert.match(outlineProxyBlock, /不要让整套方案全篇都放画布生成效果图。/);
  assert.match(outlineProxyBlock, /效果图页只用于封面、重点空间、关键体验或前后对比等必要页面。/);
  assert.match(outlineProxyBlock, /其余页面应使用概念叙事、材质\/光影板、平面\/节点分析、灯光策略图、动线或时间线等页面类型。/);
  assert.match(outlineProxyBlock, /每页必须标注页面类型、主要视觉元素、是否使用画布生成图以及使用方式。/);
  assert.match(outlineProxyBlock, /随后逐页写清楚每页的排版内容、版面位置和图文层级。/);
  assert.doesNotMatch(outlineProxyBlock, /我是 Zerlum Outline Agent|Zerlum Outline Agent 身份/);
  assert.doesNotMatch(outlineProxyBlock, /当前项目基础信息|当前项目：/);
  assert.doesNotMatch(outlineProxyBlock, /章节名称 \/ 本章目的|缺失资料提醒|数据库项目案例索引|Zerlum 知识库和必要的联网检索结果/);
});

test("outline proxy mounts Lighting Skill but bypasses local agent knowledge prompts", () => {
  assert.match(systemPromptBuilderBlock, /照明设计工具平台/);
  assert.doesNotMatch(systemPromptBuilderBlock, /readAgentInstruction/);
  assert.doesNotMatch(systemPromptBuilderBlock, /retrieveKnowledgeContext/);
  assert.doesNotMatch(systemPromptBuilderBlock, /markdown-chunks\.jsonl/);
  assert.match(agentProxyBlock, /const systemPrompt = isOutlineTask\s*\?\s*""\s*:\s*buildZerlumSystemPrompt/);
  assert.match(agentProxyBlock, /isOutlineTask\s*\?\s*"请以 Zerlum照明系统身份回答，只依据用户提交资料、Zerlum Agent 聊天输出和画布生成图片生成大纲，同时遵循已挂载 Lighting Skill 9 个 md 的照明设计方法。"/);
  assert.match(agentProxyBlock, /body\.project && !isOutlineTask && !isDocumentOutputTask/);
  assert.doesNotMatch(agentProxyBlock, /Zerlum Outline Agent 身份/);
  assert.doesNotMatch(agentProxyBlock, /includeAgentInstructions: !isOutlineTask/);
  assert.doesNotMatch(requestDocumentAgentBlock, /\n\s*project:/);
});

test("outline agent wraps the concise prompt with full Lighting Skill context", () => {
  assert.match(
    apiBuildAgentPromptBlock,
    /return isOutlineTask\s*\?\s*withZerlumSkillContext\(basePrompt,\s*\{\s*forGeneration:\s*false\s*\}\)\s*:\s*withZerlumSkillContext\(basePrompt\);/,
  );
  assert.match(agentProxyBlock, /const baseMessage = \[/);
  assert.match(
    agentProxyBlock,
    /const enrichedMessage = isOutlineTask\s*\?\s*withZerlumSkillContext\(baseMessage,\s*\{\s*forGeneration:\s*false\s*\}\)\s*:\s*withZerlumSkillContext\(baseMessage\);/,
  );
});
