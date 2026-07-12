import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");
const apiServerSource = readFileSync(
  new URL("../api/_zerlum-server.ts", import.meta.url),
  "utf8",
);
const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const envExampleSource = readFileSync(
  new URL("../.env.example", import.meta.url),
  "utf8",
);
const agentProxyBlock = source.slice(
  source.indexOf('server.middlewares.use("/api/zerlum-agent"'),
  source.indexOf('server.middlewares.use("/api/zerlum-image"'),
);
const promptProxyBlock = source.slice(
  source.indexOf('server.middlewares.use("/api/zerlum-prompt"'),
  source.indexOf('server.middlewares.use("/api/zerlum-image"'),
);
const apiPromptHandlerBlock = apiServerSource.slice(
  apiServerSource.indexOf("export async function handleZerlumPrompt"),
  apiServerSource.indexOf("export async function handleZerlumImage"),
);
const apiAgentHandlerBlock = apiServerSource.slice(
  apiServerSource.indexOf("export async function handleZerlumAgent"),
  apiServerSource.indexOf("export async function handleZerlumPrompt"),
);
const apiAgentPromptBlock = apiServerSource.slice(
  apiServerSource.indexOf("function buildAgentPrompt"),
  apiServerSource.indexOf("function collectImageCandidates"),
);

test("agent proxy routes main and outline to Chat Completions and document output to Responses", () => {
  assert.match(
    source,
    /const openAiDefaultBaseUrl = "https:\/\/api\.openai\.com";/,
  );
  assert.match(
    source,
    /function resolveOpenAiChatEndpoint\(env: Record<string, string>, baseUrlKey = "OPENAI_BASE_URL"\)/,
  );
  assert.match(
    source,
    /function resolveOpenAiResponsesEndpoint\(env: Record<string, string>, baseUrlKey = "OPENAI_DOCUMENT_OUTPUT_BASE_URL"\)/,
  );
  assert.match(
    source,
    /env\[baseUrlKey\] \|\|\s*process\.env\[baseUrlKey\] \|\|\s*env\.OPENAI_BASE_URL \|\|\s*process\.env\.OPENAI_BASE_URL \|\|\s*openAiDefaultBaseUrl/,
  );
  assert.match(
    source,
    /return `\$\{baseUrl\}\/v1\/chat\/completions`;/,
  );
  assert.match(source, /const openAiDefaultAgentModel = "gpt-4o-mini";/);
  assert.match(
    agentProxyBlock,
    /const isDocumentOutputTask = view === "text" && agentTask === "document-output";/,
  );
  assert.match(
    agentProxyBlock,
    /const useOpenAiChat = \(view === "agent" && !isOutlineTask\) \|\| isOutlineTask;/,
  );
  assert.match(
    agentProxyBlock,
    /isDocumentOutputTask\s*\?\s*env\.OPENAI_DOCUMENT_OUTPUT_API_KEY \|\|\s*process\.env\.OPENAI_DOCUMENT_OUTPUT_API_KEY \|\|\s*env\.OPENAI_API_KEY \|\|\s*process\.env\.OPENAI_API_KEY/,
  );
  assert.match(
    agentProxyBlock,
    /const openAiChatEndpoint = resolveOpenAiChatEndpoint\(\s*env,\s*isOutlineTask \? "OPENAI_OUTLINE_BASE_URL" : "OPENAI_BASE_URL",\s*\);/,
  );
  assert.match(
    agentProxyBlock,
    /const documentOutputEndpoint = resolveOpenAiResponsesEndpoint\(env\);/,
  );
  assert.match(
    agentProxyBlock,
    /const upstreamEndpoint = isDocumentOutputTask\s*\?\s*documentOutputEndpoint\s*:\s*useOpenAiChat\s*\?\s*openAiChatEndpoint\s*:\s*arkEndpoint;/,
  );
  assert.match(agentProxyBlock, /const requestPayload = isDocumentOutputTask/);
  assert.match(agentProxyBlock, /messages:\s*\[\s*\{\s*role:\s*"user",\s*content:\s*openAiChatContent,/);
  assert.match(agentProxyBlock, /input:\s*\[\s*\{\s*role:\s*"user",\s*content,/);
  assert.match(agentProxyBlock, /fetch\(upstreamEndpoint,/);
});

test("agent proxy keeps Ark Responses for canvas and ordinary non-outline text routes", () => {
  assert.match(
    source,
    /const arkEndpoint = "https:\/\/ark\.cn-beijing\.volces\.com\/api\/v3\/responses";/,
  );
  assert.match(
    source,
    /const arkDefaultAgentModel = "doubao-seed-2-1-pro-260628";/,
  );
  assert.doesNotMatch(agentProxyBlock, /ARK_VISION_API_KEY/);
  assert.doesNotMatch(agentProxyBlock, /ARK_OUTLINE_API_KEY/);
  assert.doesNotMatch(agentProxyBlock, /ARK_OUTLINE_MODEL/);
  assert.doesNotMatch(agentProxyBlock, /ARK_TEXT_MODEL|ARK_VISION_MODEL/);
});

test("agent proxy sends Ark Responses image and text content for non-main routes", () => {
  assert.match(agentProxyBlock, /type:\s*"input_image"/);
  assert.match(agentProxyBlock, /image_url:\s*image\.imageUrl/);
  assert.match(agentProxyBlock, /type:\s*"input_text"/);
  assert.match(agentProxyBlock, /input:\s*\[\s*\{\s*role:\s*"user",\s*content,/);
});

test("canvas visual agent uses the evidence-led landscape design frame", () => {
  for (const backendBlock of [agentProxyBlock, apiAgentPromptBlock]) {
    assert.match(backendBlock, /方案画布景观设计框架/);
    assert.match(
      backendBlock,
      /根据用户任务选择输出形式：景观提示词、场地或画面分析、方向比较、节点深化或修改建议/,
    );
    assert.match(backendBlock, /保结构优化、概念改造、局部替换、方向变体、季节时间变化、自由生成还是视频漫游/);
    assert.match(backendBlock, /用户明确要求、项目资料和画布显式关系优先/);
    assert.match(backendBlock, /默认保持原图视角、透视、尺度、地形、建筑/);
    assert.match(backendBlock, /不得默认蓝调夜景或湿润地面/);
  }

  assert.match(
    appSource,
    /基于画布图片、节点关系和用户要求，生成或优化景观设计视觉提示词/,
  );
  assert.match(appSource, /保结构优化、概念改造、局部替换、方向变体、季节时间变化、自由生成或视频漫游/);
  assert.match(appSource, /用户明确要求、项目资料和画布显式关系优先/);
  assert.doesNotMatch(appSource, /夜景照明效果图提示词/);
});

test("outline uses a dedicated OpenAI-compatible channel with shared fallback", () => {
  assert.match(
    agentProxyBlock,
    /isOutlineTask\s*\?\s*env\.OPENAI_OUTLINE_API_KEY \|\|\s*process\.env\.OPENAI_OUTLINE_API_KEY \|\|\s*env\.OPENAI_API_KEY \|\|\s*process\.env\.OPENAI_API_KEY/,
  );
  assert.match(
    apiAgentHandlerBlock,
    /isOutlineTask\s*\?\s*envValue\(\s*"OPENAI_OUTLINE_API_KEY",\s*"OPENAI_API_KEY"/,
  );
  for (const backendBlock of [agentProxyBlock, apiAgentHandlerBlock]) {
    assert.match(backendBlock, /OPENAI_OUTLINE_BASE_URL/);
    assert.match(backendBlock, /OPENAI_OUTLINE_MODEL/);
  }
  assert.match(envExampleSource, /^OPENAI_OUTLINE_API_KEY=$/m);
  assert.match(
    envExampleSource,
    /^OPENAI_OUTLINE_BASE_URL=https:\/\/qweapi\.com$/m,
  );
});

test("canvas prompt proxy produces evidence-led landscape visualization prompts", () => {
  assert.match(promptProxyBlock, /server\.middlewares\.use\("\/api\/zerlum-prompt"/);
  assert.match(promptProxyBlock, /OPENAI_PROMPT_API_KEY/);
  assert.match(promptProxyBlock, /OPENAI_API_KEY/);
  assert.match(promptProxyBlock, /OPENAI_PROMPT_MODEL/);
  assert.match(promptProxyBlock, /resolveOpenAiChatEndpoint\(env,\s*"OPENAI_PROMPT_BASE_URL"\)/);
  assert.match(apiPromptHandlerBlock, /resolveOpenAiChatEndpoint\("OPENAI_PROMPT_BASE_URL"\)/);
  assert.doesNotMatch(promptProxyBlock, /resolveOpenAiResponsesEndpoint\(env,\s*"OPENAI_PROMPT_BASE_URL"\)/);
  assert.doesNotMatch(apiPromptHandlerBlock, /resolveOpenAiResponsesEndpoint\("OPENAI_PROMPT_BASE_URL"\)/);
  assert.doesNotMatch(promptProxyBlock, /ARK_PROMPT_API_KEY/);
  assert.doesNotMatch(promptProxyBlock, /ARK_PROMPT_ENDPOINT/);
  assert.match(promptProxyBlock, /type:\s*"image_url"/);
  assert.match(promptProxyBlock, /image_url:\s*\{\s*url:\s*image\.imageUrl,\s*\}/);
  assert.match(promptProxyBlock, /type:\s*"text"/);
  assert.match(promptProxyBlock, /messages:\s*\[\s*\{\s*role:\s*"user",\s*content:/);
  assert.match(promptProxyBlock, /extractOpenAiChatCompletionText\(JSON\.parse\(upstreamText\)\)/);
  assert.match(apiPromptHandlerBlock, /type:\s*"image_url"/);
  assert.match(apiPromptHandlerBlock, /image_url:\s*\{\s*url:\s*image\.imageUrl,\s*\}/);
  assert.match(apiPromptHandlerBlock, /type:\s*"text"/);
  assert.match(apiPromptHandlerBlock, /messages:\s*\[\s*\{\s*role:\s*"user",\s*content:/);
  assert.match(apiPromptHandlerBlock, /extractOpenAiChatCompletionText\(JSON\.parse\(upstreamText\)\)/);
  assert.match(promptProxyBlock, /可直接用于景观效果图生成/);
  assert.match(promptProxyBlock, /保结构优化、概念改造、局部替换、方向变体、季节时间变化还是自由生成/);
  assert.match(apiPromptHandlerBlock, /保结构优化、概念改造、局部替换、方向变体、季节时间变化还是自由生成/);
  assert.match(promptProxyBlock, /用户明确要求 > 项目资料 > 画布显式关系 > 已确认设计结论 > 方法框架/);
  assert.match(apiPromptHandlerBlock, /用户明确要求 > 项目资料 > 画布显式关系 > 已确认设计结论 > 方法框架/);
  assert.match(promptProxyBlock, /空间层次、功能和游线、植物群落与成熟度、材料尺度与接缝/);
  assert.match(apiPromptHandlerBlock, /空间层次、功能和游线、植物群落与成熟度、材料尺度与接缝/);
  assert.match(promptProxyBlock, /不得无依据增加路径、水景、构筑物、地形或大规模人群/);
  assert.match(apiPromptHandlerBlock, /不得无依据增加路径、水景、构筑物、地形或大规模人群/);
  assert.match(promptProxyBlock, /不要输出任何前缀/);
  assert.match(apiPromptHandlerBlock, /不要输出任何前缀/);
  assert.match(promptProxyBlock, /cleanCanvasPromptOutput\(prompt\)/);
  assert.match(apiPromptHandlerBlock, /cleanCanvasPromptOutput\(prompt\)/);
  assert.doesNotMatch(promptProxyBlock, /agents\/lighting-visualization|AI 无限画布夜景提示词模式/);
  assert.doesNotMatch(apiPromptHandlerBlock, /agents\/lighting-visualization|AI 无限画布夜景提示词模式/);
  assert.match(promptProxyBlock, /sendJson\(response,\s*200,\s*\{\s*prompt:/);
});

test("canvas visual agent compresses local images before submitting to the agent proxy", () => {
  assert.match(appSource, /const AGENT_IMAGE_MAX_BYTES = 900_000/);
  assert.match(appSource, /async function compressImageForAgentApi/);
  assert.match(appSource, /async function resolveImageUrlForAgentApi/);
  assert.match(appSource, /await resolveImageUrlForAgentApi\(node\.imageUrl\)/);
});

test("agent proxy converts content to Chat Completions parts for main agent", () => {
  assert.match(agentProxyBlock, /const openAiChatContent = \[/);
  assert.match(agentProxyBlock, /type:\s*"image_url"/);
  assert.match(agentProxyBlock, /image_url:\s*\{\s*url:\s*image\.imageUrl,\s*\}/);
  assert.match(agentProxyBlock, /type:\s*"input_audio"/);
  assert.match(agentProxyBlock, /input_audio:\s*\{\s*data:\s*audio\.audioBase64,\s*format:\s*"wav",\s*\}/);
  assert.match(agentProxyBlock, /type:\s*"text"/);
  assert.match(agentProxyBlock, /text:\s*enrichedMessage/);
});

test("main agent streams OpenAI chat tokens while outline wraps non-streaming results", () => {
  for (const backendSource of [source, apiServerSource]) {
    assert.match(backendSource, /function extractOpenAiChatCompletionText/);
  }

  for (const backendBlock of [agentProxyBlock, apiAgentHandlerBlock]) {
    assert.match(
      backendBlock,
      /const streamOpenAiChat = view === "agent" && useOpenAiChat && !isDocumentOutputTask;/,
    );
    assert.match(backendBlock, /useOpenAiChat\s*\?\s*\{\s*model: agentModel,\s*stream: streamOpenAiChat,\s*messages:/);
    const openAiChatResponseBlock = backendBlock.slice(
      backendBlock.indexOf("if (useOpenAiChat && !streamOpenAiChat) {"),
      backendBlock.indexOf("await pipeResponseBody"),
    );

    assert.match(openAiChatResponseBlock, /const upstreamText = await upstream\.text\(\);/);
    assert.match(openAiChatResponseBlock, /extractOpenAiChatCompletionText\(JSON\.parse\(upstreamText\)\)/);
    assert.match(openAiChatResponseBlock, /writeAgentTextEvent\(\s*response,\s*agentText/);
  }
});

test("main agent falls back to Ark when the OpenAI-compatible chat request cannot connect", () => {
  for (const backendBlock of [agentProxyBlock, apiAgentHandlerBlock]) {
    assert.match(backendBlock, /const arkApiKey =/);
    assert.match(backendBlock, /const arkAgentModel =/);
    assert.match(
      backendBlock,
      /const canFallbackToArkAgent = view === "agent" && useOpenAiChat && !isDocumentOutputTask && arkApiKey;/,
    );
    assert.match(
      backendBlock,
      /catch \(error\) \{[\s\S]*if \(canFallbackToArkAgent\) \{[\s\S]*upstream = await fetch\([^,]*arkEndpoint/,
    );
    assert.match(backendBlock, /Authorization: `Bearer \$\{arkApiKey\}`/);
    assert.match(backendBlock, /model: arkAgentModel/);
    assert.match(
      backendBlock,
      /input:\s*\[\s*\{\s*role:\s*"user",\s*content,/,
    );
  }
});

test("agent proxy does not reset headers after a streaming response starts", () => {
  for (const backendSource of [source, apiServerSource]) {
    assert.match(backendSource, /function sendAgentProxyError/);
    assert.match(backendSource, /headersSent/);
    assert.match(backendSource, /writableEnded/);
    assert.match(backendSource, /JSON\.stringify\(\{\s*error: message\s*\}\)/);
  }

  for (const backendBlock of [agentProxyBlock, apiAgentHandlerBlock]) {
    assert.match(backendBlock, /catch \(error\) \{[\s\S]*sendAgentProxyError\(response, error\);[\s\S]*\}/);
  }
});

test("outline agent uses the OpenAI-compatible qweapi model without Ark web search tools", () => {
  assert.match(
    agentProxyBlock,
    /isOutlineTask\s*\?\s*env\.OPENAI_OUTLINE_MODEL \|\|\s*process\.env\.OPENAI_OUTLINE_MODEL \|\|/,
  );
  assert.match(
    agentProxyBlock,
    /env\.OPENAI_AGENT_MODEL \|\|\s*process\.env\.OPENAI_AGENT_MODEL \|\|\s*openAiDefaultAgentModel/,
  );
  assert.doesNotMatch(agentProxyBlock, /web_search|requestTools/);
});

test("document output uses its OpenAI-compatible qweapi channel and gpt-image-2 model", () => {
  assert.match(
    agentProxyBlock,
    /isDocumentOutputTask\s*\?\s*env\.OPENAI_DOCUMENT_OUTPUT_MODEL \|\|\s*process\.env\.OPENAI_DOCUMENT_OUTPUT_MODEL \|\|\s*openAiDefaultDocumentOutputModel/,
  );
  assert.match(source, /const openAiDefaultDocumentOutputModel = "gpt-image-2";/);
  assert.match(source, /OPENAI_DOCUMENT_OUTPUT_BASE_URL/);
  assert.match(agentProxyBlock, /OPENAI_DOCUMENT_OUTPUT_API_KEY/);
  assert.match(agentProxyBlock, /stream:\s*false/);
  assert.match(agentProxyBlock, /const documentOutputContent = \[/);
  assert.match(agentProxyBlock, /input:\s*\[\s*\{\s*role:\s*"user",\s*content:\s*documentOutputContent/);
  assert.match(source, /function extractDocumentOutputText\(payload: unknown\)/);
  assert.match(source, /function writeAgentTextEvent/);
});

test("agent proxy forwards microphone audio as Ark Responses input audio", () => {
  assert.match(agentProxyBlock, /normalizeAgentAudio/);
  assert.match(agentProxyBlock, /type:\s*"input_audio"/);
  assert.match(agentProxyBlock, /audio_url:\s*audio\.audioUrl/);
  assert.match(agentProxyBlock, /audioBase64/);
});

test("environment template documents Agent, outline, and document routes", () => {
  const localEnv = envExampleSource;

  assert.match(localEnv, /^OPENAI_API_KEY=$/m);
  assert.match(localEnv, /^OPENAI_BASE_URL=https:\/\/qweapi\.com$/m);
  assert.match(localEnv, /^OPENAI_PROMPT_API_KEY=$/m);
  assert.match(localEnv, /^OPENAI_PROMPT_BASE_URL=https:\/\/qweapi\.com$/m);
  assert.match(localEnv, /^OPENAI_PROMPT_MODEL=gpt-5\.5$/m);
  assert.match(localEnv, /^OPENAI_AGENT_MODEL=gpt-5\.5$/m);
  assert.match(localEnv, /^OPENAI_OUTLINE_API_KEY=$/m);
  assert.match(localEnv, /^OPENAI_OUTLINE_BASE_URL=https:\/\/qweapi\.com$/m);
  assert.match(localEnv, /^OPENAI_OUTLINE_MODEL=gpt-5\.5$/m);
  assert.match(localEnv, /^OPENAI_DOCUMENT_OUTPUT_API_KEY=$/m);
  assert.match(localEnv, /^OPENAI_DOCUMENT_OUTPUT_BASE_URL=https:\/\/qweapi\.com$/m);
  assert.match(localEnv, /^OPENAI_DOCUMENT_OUTPUT_MODEL=gpt-image-2$/m);
  assert.match(localEnv, /^ARK_AGENT_MODEL=doubao-seed-2-1-pro-260628$/m);
});
