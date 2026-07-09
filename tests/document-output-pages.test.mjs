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
const outputHandlerBlock = appSource.slice(
  appSource.indexOf("async function handleGenerateDocumentOutput"),
  appSource.indexOf("function handleExportDocument"),
);
const requestDocumentAgentBlock = appSource.slice(
  appSource.indexOf("async function requestDocumentAgent"),
  appSource.indexOf("async function handleDocumentAgentSubmit"),
);
const previewBlock = appSource.slice(
  appSource.indexOf('<aside className="document-preview-panel document-preview">'),
  appSource.indexOf("<div className=\"document-export-bar\">"),
);
const agentProxyBlock = viteSource.slice(
  viteSource.indexOf('server.middlewares.use("/api/zerlum-agent"'),
  viteSource.indexOf('server.middlewares.use("/api/zerlum-image"'),
);

test("document output splits paginated outlines and sends one image2 request per page", () => {
  assert.match(appSource, /type DocumentOutputPage = DocumentOutlinePage & \{/);
  assert.match(appSource, /function splitDocumentOutlinePages\(outline: string\)/);
  assert.match(appSource, /function buildDocumentPageImagePrompt\(/);
  assert.match(appSource, /严格按大纲中的“页面类型”设计本页。/);
  assert.match(appSource, /如果本页不是效果图页，不要把画布生成图铺满当作主视觉。/);
  assert.match(appSource, /只有大纲明确写成效果图页、重点空间渲染页或前后对比页时，才把效果图作为主视觉。/);
  assert.match(appSource, /非效果图页优先使用概念叙事、材质\/光影板、平面\/节点分析、灯光策略图、动线或时间线等高级方案表达。/);
  assert.match(appSource, /可以少量引用画布生成图作为局部裁切、氛围证据或辅助图，不要机械铺满整页。/);
  assert.doesNotMatch(appSource, /图面或效果图区域/);
  assert.match(appSource, /sourceDataUrl\?: string/);
  assert.match(appSource, /sourceText\?: string/);
  assert.match(appSource, /readProjectMaterialSource\(file\)/);
  assert.match(appSource, /canvasGeneratedImages=\{canvasGeneratedImages\}/);
  assert.match(outputHandlerBlock, /const outputPages = splitDocumentOutlinePages\(outline\);/);
  assert.match(outputHandlerBlock, /for \(const page of outputPages\)/);
  assert.match(outputHandlerBlock, /buildDocumentPageImagePrompt\(page, outputPages\.length\)/);
  assert.match(outputHandlerBlock, /agentTask: "document-output"/);
  assert.match(outputHandlerBlock, /images: canvasGeneratedImages/);
  assert.match(outputHandlerBlock, /setDocumentOutputPages/);
});

test("document output preview renders one generated image card per outline page", () => {
  assert.match(appSource, /const \[documentOutputPages, setDocumentOutputPages\] = useState<DocumentOutputPage\[\]>\(\[\]\);/);
  assert.match(appSource, /documentOutputPages=\{documentOutputPages\}/);
  assert.match(appSource, /setDocumentOutputPages=\{setDocumentOutputPages\}/);
  assert.match(previewBlock, /documentOutputPages\.map\(\(page\) =>/);
  assert.match(previewBlock, /<img\s+src=\{page\.imageUrl\}/);
  assert.match(previewBlock, /第 \{page\.pageNumber\} 页/);
});

test("document output generation can be paused while streaming", () => {
  assert.match(appSource, /const outputAbortControllerRef = useRef<AbortController \| null>\(null\);/);
  assert.match(requestDocumentAgentBlock, /signal\?: AbortSignal/);
  assert.match(requestDocumentAgentBlock, /signal,/);
  assert.match(outputHandlerBlock, /const controller = new AbortController\(\);/);
  assert.match(outputHandlerBlock, /outputAbortControllerRef\.current = controller;/);
  assert.match(outputHandlerBlock, /signal: controller\.signal/);
  assert.match(outputHandlerBlock, /controller\.signal\.aborted/);
  assert.match(appSource, /function handlePauseDocumentOutput\(\)/);
  assert.match(appSource, /outputAbortControllerRef\.current\?\.abort\(\)/);
  assert.match(appSource, /aria-label="暂停生成方案文本"/);
  assert.match(appSource, />\s*暂停\s*<\/button>/);
});

test("document output skips a stalled page and continues remaining pages", () => {
  assert.match(outputHandlerBlock, /const failedSummaries: string\[\] = \[\];/);
  assert.match(outputHandlerBlock, /catch \(pageError\)/);
  assert.match(outputHandlerBlock, /formatDocumentPageError\(pageError\)/);
  assert.match(outputHandlerBlock, /status: "error"/);
  assert.match(outputHandlerBlock, /failedSummaries\.push/);
  assert.match(outputHandlerBlock, /continue;/);
  assert.match(outputHandlerBlock, /部分页面生成失败/);
});

test("document output proxy returns page image metadata instead of plain text only", () => {
  assert.match(viteSource, /function collectDocumentOutputImages\(value: unknown\): string\[\]/);
  assert.match(viteSource, /function extractDocumentOutputResult\(payload: unknown\)/);
  assert.match(viteSource, /kind: "document-output-page"/);
  assert.match(viteSource, /function normalizeProjectMaterialInputs\(value: unknown\)/);
  assert.match(viteSource, /type:\s*"input_file"/);
  assert.match(viteSource, /file_data:\s*material\.sourceDataUrl/);
  assert.match(viteSource, /const documentOutputContent = \[/);
  assert.match(viteSource, /input:\s*\[\s*\{\s*role:\s*"user",\s*content:\s*documentOutputContent/);
  assert.match(
    agentProxyBlock,
    /isDocumentOutputTask\s*\?\s*`\\n\\n当前项目：\$\{body\.project\.name \|\| "未命名项目"\}。`/,
  );
  assert.match(agentProxyBlock, /JSON\.stringify\(extractDocumentOutputResult\(JSON\.parse\(upstreamText\)\)\)/);
  assert.match(agentProxyBlock, /writeAgentTextEvent\(response, documentText\);/);
  assert.doesNotMatch(appSource, /promptText:\s*payload\.revisedPrompt/);
});

test("document output proxy times out stalled image2 requests", () => {
  assert.match(viteSource, /const openAiDefaultDocumentOutputTimeoutMs = 600_000;/);
  assert.match(apiServerSource, /const openAiDefaultDocumentOutputTimeoutMs = 600_000;/);
  assert.match(viteSource, /function resolveDocumentOutputTimeoutMs/);
  assert.match(viteSource, /OPENAI_DOCUMENT_OUTPUT_TIMEOUT_MS/);
  assert.match(agentProxyBlock, /const upstreamController = isDocumentOutputTask\s*\?\s*new AbortController\(\)/);
  assert.match(agentProxyBlock, /const upstreamTimeout = isDocumentOutputTask/);
  assert.match(agentProxyBlock, /signal: upstreamController\?\.signal/);
  assert.match(agentProxyBlock, /clearTimeout\(upstreamTimeout\)/);
  assert.match(agentProxyBlock, /image2 请求超时/);
});
