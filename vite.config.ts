import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { spawn } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const arkEndpoint = "https://ark.cn-beijing.volces.com/api/v3/responses";
const arkVideoTasksEndpoint = "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks";
const openAiDefaultBaseUrl = "https://api.openai.com";
const arkDefaultAgentModel = "doubao-seed-2-1-pro-260628";
const arkDefaultVideoModel = "doubao-seedance-2-0-260128";
const arkDefaultVideoWaitTimeoutMs = 300_000;
const arkDefaultVideoPollIntervalMs = 5_000;
const openAiDefaultAgentModel = "gpt-4o-mini";
const openAiDefaultDocumentOutputModel = "gpt-image-2";
const openAiDefaultDocumentOutputTimeoutMs = 180_000;
const runningHubBaseUrl = "https://www.runninghub.ai";
const runningHubDefaultImageEndpoint =
  `${runningHubBaseUrl}/openapi/v2/rhart-imagine-image-quality/edit`;
const runningHubDefaultImageModel = "rhart-imagine-image-quality/edit";
const runningHubImageUploadEndpoint =
  `${runningHubBaseUrl}/openapi/v2/media/upload/binary`;
const runningHubImageQueryEndpoint = `${runningHubBaseUrl}/openapi/v2/query`;
const runningHubAppUploadEndpoint = `${runningHubBaseUrl}/task/openapi/upload`;
const runningHubAppRunEndpoint =
  `${runningHubBaseUrl}/task/openapi/ai-app/run`;
const runningHubAppOutputsEndpoint =
  `${runningHubBaseUrl}/task/openapi/outputs`;
const runningHubAppStatusEndpoint = `${runningHubBaseUrl}/task/openapi/status`;
const runningHubAppDemoEndpoint = `${runningHubBaseUrl}/api/webapp/apiCallDemo`;
const runningHubDefaultUpscaleWebappId = "2063809922772594690";
const runningHubDefaultUpscaleAppPath = `/run/ai-app/${runningHubDefaultUpscaleWebappId}`;
const runningHubDefaultResolution = "1k";
const runningHubDefaultUpscaleResolution = "4k";
const runningHubUpscaleResolutionValues = {
  "2k": "0.2",
  "4k": "0.4",
  "6k": "0.6",
  "8k": "0.8",
} as const;
const runningHubDefaultAspectRatio = "1:1";
const defaultZerlumRoot = "E:\\zerlum";
const localKnowledgeRoot = process.cwd();
const localDesktopKnowledgeIndexRoot = join(
  localKnowledgeRoot,
  "knowledge",
  "desktop-lighting-library",
);
const localDesktopKnowledgeIndexPath = join(
  localDesktopKnowledgeIndexRoot,
  "markdown-index.json",
);

function resolveOpenAiChatEndpoint(env: Record<string, string>, baseUrlKey = "OPENAI_BASE_URL") {
  const configuredBaseUrl =
    env[baseUrlKey] ||
    process.env[baseUrlKey] ||
    env.OPENAI_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    openAiDefaultBaseUrl;
  const baseUrl = configuredBaseUrl.replace(/\/+$/, "");

  if (baseUrl.endsWith("/v1/chat/completions")) {
    return baseUrl;
  }

  return `${baseUrl}/v1/chat/completions`;
}

function resolveOpenAiResponsesEndpoint(env: Record<string, string>, baseUrlKey = "OPENAI_DOCUMENT_OUTPUT_BASE_URL") {
  const configuredBaseUrl =
    env[baseUrlKey] ||
    process.env[baseUrlKey] ||
    env.OPENAI_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    openAiDefaultBaseUrl;
  let baseUrl = configuredBaseUrl.replace(/\/+$/, "");

  if (baseUrl.endsWith("/v1/responses")) {
    return baseUrl;
  }

  if (baseUrl.endsWith("/v1/chat/completions")) {
    baseUrl = baseUrl.slice(0, -"/v1/chat/completions".length);
  }

  return `${baseUrl}/v1/responses`;
}

function resolveDocumentOutputTimeoutMs(env: Record<string, string>) {
  const configured =
    env.OPENAI_DOCUMENT_OUTPUT_TIMEOUT_MS ||
    process.env.OPENAI_DOCUMENT_OUTPUT_TIMEOUT_MS;
  const parsed = configured ? Number(configured) : NaN;

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : openAiDefaultDocumentOutputTimeoutMs;
}

function resolveRunningHubUpscaleWebappId(env: Record<string, string>) {
  const configuredAppPath =
    env.RUNNINGHUB_UPSCALE_APP_PATH ||
    process.env.RUNNINGHUB_UPSCALE_APP_PATH ||
    runningHubDefaultUpscaleAppPath;
  const appIdFromPath = configuredAppPath.match(/(?:run\/ai-app|ai-detail)\/(\d+)/)?.[1];

  return (
    appIdFromPath ||
    env.RUNNINGHUB_UPSCALE_WEBAPP_ID ||
    process.env.RUNNINGHUB_UPSCALE_WEBAPP_ID ||
    runningHubDefaultUpscaleWebappId
  );
}

function resolveRunningHubEndpoint(endpoint: string) {
  const normalized = endpoint.trim();

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  return normalized.startsWith("/")
    ? `${runningHubBaseUrl}${normalized}`
    : `${runningHubBaseUrl}/${normalized}`;
}

function collectDocumentOutputText(value: unknown): string[] {
  if (typeof value === "string") {
    return value.trim() ? [value] : [];
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectDocumentOutputText(item));
  }

  const record = value as Record<string, unknown>;
  const fragments: string[] = [];

  ["output_text", "text", "content", "revised_prompt"].forEach((key) => {
    if (key in record) {
      fragments.push(...collectDocumentOutputText(record[key]));
    }
  });

  return fragments;
}

function normalizeDocumentOutputImage(value: unknown, key = "") {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();

  if (/^data:image\//i.test(trimmed) || /^https?:\/\/.+\.(?:png|jpe?g|webp|gif)(?:\?|$)/i.test(trimmed)) {
    return trimmed;
  }

  if (
    (key === "b64_json" || key === "result") &&
    trimmed.length > 200 &&
    /^[A-Za-z0-9+/=\s]+$/.test(trimmed)
  ) {
    return `data:image/png;base64,${trimmed.replace(/\s/g, "")}`;
  }

  return "";
}

function collectDocumentOutputImages(value: unknown): string[] {
  if (typeof value === "string") {
    const image = normalizeDocumentOutputImage(value);

    return image ? [image] : [];
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectDocumentOutputImages(item));
  }

  const record = value as Record<string, unknown>;
  const images: string[] = [];

  ["result", "image_url", "url", "b64_json"].forEach((key) => {
    const image = normalizeDocumentOutputImage(record[key], key);

    if (image) {
      images.push(image);
    }
  });

  Object.values(record).forEach((item) => {
    images.push(...collectDocumentOutputImages(item));
  });

  return [...new Set(images)];
}

function extractDocumentOutputText(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const record = payload as Record<string, unknown>;
  const textFragments = collectDocumentOutputText(record.output_text);

  if (textFragments.length) {
    return textFragments.join("").trim();
  }

  const outputFragments = Array.isArray(record.output)
    ? record.output.flatMap((item) => collectDocumentOutputText(item))
    : [];

  if (outputFragments.length) {
    return outputFragments.join("\n\n").trim();
  }

  return "模型已返回结果，但没有可显示的文本内容。";
}

function cleanCanvasPromptOutput(prompt: string) {
  let cleanPrompt = prompt
    .trim()
    .replace(/^```(?:[\w-]+)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const prefixPatterns = [
    /^(?:#+\s*)?(?:最终)?(?:夜景效果图)?提示词\s*[:：]\s*/i,
    /^根据[^，。:：\n]{0,120}[，。:：]\s*/i,
    /^(?:以下是|下面是|这是|我将为你生成|我将生成)[^：:\n]{0,80}[:：\n]\s*/i,
  ];
  let previousPrompt = "";

  while (cleanPrompt && cleanPrompt !== previousPrompt) {
    previousPrompt = cleanPrompt;

    for (const pattern of prefixPatterns) {
      cleanPrompt = cleanPrompt.replace(pattern, "").trim();
    }
  }

  return cleanPrompt;
}

function extractDocumentOutputResult(payload: unknown) {
  const text = extractDocumentOutputText(payload);
  const images = collectDocumentOutputImages(payload);

  return {
    kind: "document-output-page",
    text,
    images,
  };
}

function writeAgentTextEvent(response: { write: (chunk: string) => void }, text: string) {
  response.write(
    `data: ${JSON.stringify({
      choices: [
        {
          delta: {
            content: text,
          },
        },
      ],
    })}\n\n`,
  );
  response.write("data: [DONE]\n\n");
}

type KnowledgeChunk = {
  title?: string;
  heading?: string;
  relativePath?: string;
  collection?: string;
  platformViews?: string[];
  agentRoutes?: string[];
  privacyLevel?: string;
  trust?: string;
  needsAudit?: boolean;
  standardStatus?: string;
  text?: string;
  searchText?: string;
};

const routeHints: Record<string, string[]> = {
  "lighting-foundation": [
    "标准",
    "规范",
    "照明",
    "照度",
    "亮度",
    "色温",
    "显色",
    "眩光",
    "光通量",
    "GB",
    "CJJ",
  ],
  "indoor-lighting": [
    "室内",
    "办公",
    "商业",
    "酒店",
    "住宅",
    "学校",
    "医院",
    "展陈",
    "中庭",
    "客房",
  ],
  "outdoor-landscape-lighting": [
    "室外",
    "景观",
    "夜景",
    "立面",
    "建筑",
    "园区",
    "广场",
    "滨水",
    "桥梁",
    "文旅",
    "夜游",
  ],
  "road-tunnel-lighting": ["道路", "隧道", "车行", "桥下", "交通", "路灯"],
  "emergency-lighting": ["消防", "应急", "疏散", "安全出口", "备用电源"],
  "fixture-compliance": [
    "灯具",
    "光源",
    "LED",
    "驱动",
    "报价",
    "选型",
    "检测",
    "认证",
    "能效",
    "IP",
    "IK",
  ],
  "scheme-case-research": [
    "方案",
    "案例",
    "文本",
    "设计说明",
    "竞标",
    "汇报",
    "奖项",
    "商业综合体",
    "MALL",
  ],
  "lighting-visualization": [
    "效果图",
    "画布",
    "提示词",
    "图生图",
    "渲染",
    "视觉",
    "镜头",
    "分镜",
    "夜游",
    "AI无限画布",
  ],
};

const viewAgentRoutes: Record<string, string[]> = {
  agent: [
    "lighting-foundation",
    "indoor-lighting",
    "outdoor-landscape-lighting",
    "road-tunnel-lighting",
    "emergency-lighting",
    "fixture-compliance",
    "scheme-case-research",
    "lighting-visualization",
  ],
  canvas: ["lighting-visualization", "scheme-case-research", "outdoor-landscape-lighting", "indoor-lighting"],
  image: ["lighting-visualization", "scheme-case-research", "outdoor-landscape-lighting", "indoor-lighting"],
  text: ["scheme-case-research", "lighting-foundation", "indoor-lighting", "outdoor-landscape-lighting"],
};

function resolveZerlumRoot(env: Record<string, string>) {
  const configured =
    env.ZERLUM_KNOWLEDGE_ROOT ||
    process.env.ZERLUM_KNOWLEDGE_ROOT ||
    env.ZERLUM_ROOT ||
    process.env.ZERLUM_ROOT;

  if (configured && existsSync(configured)) {
    return configured;
  }

  if (existsSync(defaultZerlumRoot)) {
    return defaultZerlumRoot;
  }

  return localKnowledgeRoot;
}

function readTextFile(path: string) {
  try {
    return existsSync(path) ? readFileSync(path, "utf8") : "";
  } catch {
    return "";
  }
}

function readDesktopKnowledgeSourceRoot() {
  try {
    const index = JSON.parse(
      readFileSync(localDesktopKnowledgeIndexPath, "utf8"),
    ) as { sourceRoot?: string };

    return typeof index.sourceRoot === "string" ? index.sourceRoot : "";
  } catch {
    return "";
  }
}

function normalizePathForCompare(path: string) {
  return resolve(path).replace(/\//g, "\\").toLowerCase();
}

function isPathInside(candidate: string, root: string) {
  if (!root) {
    return false;
  }

  const normalizedCandidate = normalizePathForCompare(candidate);
  const normalizedRoot = normalizePathForCompare(root);
  const rootWithSlash = normalizedRoot.endsWith("\\")
    ? normalizedRoot
    : `${normalizedRoot}\\`;

  return (
    normalizedCandidate === normalizedRoot ||
    normalizedCandidate.startsWith(rootWithSlash)
  );
}

function resolveOpenableFolder(requestedPath: string) {
  if (!requestedPath.trim() || !existsSync(requestedPath)) {
    return "";
  }

  const stat = statSync(requestedPath);

  return stat.isDirectory() ? requestedPath : dirname(requestedPath);
}

function openFolderInExplorer(folderPath: string) {
  const child = spawn("explorer.exe", [folderPath], {
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  });

  child.unref();
}

function readAgentInstruction(root: string, agentId: string) {
  const externalPath = join(root, "agents", agentId, "agent.md");
  const localPath = join(localKnowledgeRoot, "agents", agentId, "agent.md");
  const content = readTextFile(externalPath) || readTextFile(localPath);

  return content
    ? `## Agent: ${agentId}\n${content.slice(0, 9000)}`
    : "";
}

function loadKnowledgeChunks(root: string): KnowledgeChunk[] {
  const externalPath = join(
    root,
    "knowledge",
    "indexes",
    "desktop-lighting-library",
    "markdown-chunks.jsonl",
  );
  const localPath = join(
    localKnowledgeRoot,
    "knowledge",
    "desktop-lighting-library",
    "markdown-chunks.jsonl",
  );
  const content = readTextFile(externalPath) || readTextFile(localPath);

  if (!content.trim()) {
    return [];
  }

  return content
    .split(/\r?\n/)
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as KnowledgeChunk];
      } catch {
        return [];
      }
    });
}

function extractSearchTerms(text: string) {
  const normalized = text.toLowerCase();
  const asciiTerms =
    normalized.match(/[a-z0-9][a-z0-9+./-]{1,}/gi)?.map((item) => item.toLowerCase()) ?? [];
  const domainTerms = [
    ...new Set(
      Object.values(routeHints)
        .flat()
        .filter((term) => normalized.includes(term.toLowerCase())),
    ),
  ];

  return [...new Set([...domainTerms, ...asciiTerms])].slice(0, 28);
}

function inferAgentRoutes(message: string, view = "agent") {
  const normalized = message.toLowerCase();
  const baseRoutes = viewAgentRoutes[view] ?? viewAgentRoutes.agent;
  const scored = Object.entries(routeHints)
    .map(([route, hints]) => ({
      route,
      score: hints.filter((hint) => normalized.includes(hint.toLowerCase())).length,
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.route);

  return [
    "lighting-foundation",
    ...new Set([...baseRoutes, ...scored]),
  ].slice(0, view === "agent" ? 5 : 4);
}

function countOccurrences(text: string, term: string) {
  if (!term) {
    return 0;
  }

  let count = 0;
  let index = text.indexOf(term);

  while (index !== -1) {
    count += 1;
    index = text.indexOf(term, index + term.length);
  }

  return count;
}

function scoreKnowledgeChunk(
  chunk: KnowledgeChunk,
  terms: string[],
  view: string,
  routes: string[],
) {
  const text = `${chunk.title ?? ""} ${chunk.heading ?? ""} ${
    chunk.searchText ?? chunk.text ?? ""
  }`.toLowerCase();
  const chunkRoutes = chunk.agentRoutes ?? [];
  const chunkViews = chunk.platformViews ?? [];
  let score = 0;

  for (const term of terms) {
    score += countOccurrences(text, term.toLowerCase());
  }

  if (chunkViews.includes(view)) {
    score += 5;
  }

  score += chunkRoutes.filter((route) => routes.includes(route)).length * 4;

  if (view === "canvas" || view === "image") {
    if (chunk.collection === "design-techniques") score += 4;
    if (chunk.collection === "project-cases") score += 3;
    if (chunk.collection === "standards-audit") score -= 4;
  }

  if (view === "agent" && chunk.collection === "standards-audit") {
    score += 1;
  }

  return score;
}

function retrieveKnowledgeContext(
  root: string,
  message: string,
  view: string,
  routes: string[],
) {
  const chunks = loadKnowledgeChunks(root);
  const terms = extractSearchTerms(message);

  if (chunks.length === 0 || terms.length === 0) {
    return {
      citations: [] as KnowledgeChunk[],
      contextText: "",
    };
  }

  const citations = chunks
    .map((chunk) => ({
      chunk,
      score: scoreKnowledgeChunk(chunk, terms, view, routes),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, view === "agent" ? 8 : 6)
    .map((item) => item.chunk);

  const contextText = citations
    .map((chunk, index) => {
      const auditNote = chunk.needsAudit
        ? "注意：该资料需要现行标准版本审计，不能直接作为合规依据。"
        : "";
      return [
        `### Zerlum知识片段 ${index + 1}`,
        `来源：${chunk.relativePath ?? "未知"}`,
        `集合：${chunk.collection ?? "unclassified"}；路由：${(chunk.agentRoutes ?? []).join(", ")}`,
        `标题：${chunk.title ?? ""} / ${chunk.heading ?? ""}`,
        auditNote,
        String(chunk.text ?? "").slice(0, 1400),
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  return { citations, contextText };
}

function buildZerlumSystemPrompt({
  root,
  view,
  message,
  includeAgentInstructions = true,
}: {
  root: string;
  view: string;
  message: string;
  includeAgentInstructions?: boolean;
}) {
  const routes = inferAgentRoutes(message, view);
  const agentInstructions = includeAgentInstructions ? routes
    .map((route) => readAgentInstruction(root, route))
    .filter(Boolean)
    .join("\n\n---\n\n") : "";
  const { citations, contextText } = retrieveKnowledgeContext(
    root,
    message,
    view,
    routes,
  );

  const identity = [
    "你是 Zerlum 平台中的专业照明 Agent，不是通用聊天机器人。",
    "你必须明确知道：你的资料、案例、设计方法和规范提示来自 Zerlum 知识库。",
    includeAgentInstructions
      ? "回答时优先使用 Zerlum 知识库和已加载的 Agent 规则；知识库没有依据时要明确说明需要补充资料或复核。"
      : "回答时优先使用用户上传资料、当前项目基础信息和 Zerlum 知识库；不要引用本地 agent.md 规则。",
    "涉及中国境内规范、标准、消防、道路交通、灯具认证、能效或施工图审查时，不得仅凭经验给最终合规结论。",
    "引用 standards-audit 中的旧规范或版本不明资料时，只能作为待审计线索，必须提示复核现行标准。",
  ].join("\n");

  const sourceNotice = citations.length
    ? `本次已从 Zerlum 知识库召回 ${citations.length} 条资料。回答末尾用“Zerlum知识库引用”列出关键来源路径。`
    : includeAgentInstructions
      ? "本次未召回到足够相关的 Zerlum 知识库资料；请基于 Agent 规则回答，并提示需要补充资料。"
      : "本次未召回到足够相关的 Zerlum 知识库资料；请基于用户上传资料和当前项目基础信息回答。";
  const agentRuleSection = includeAgentInstructions
    ? [
        "【已加载的 Zerlum Agent 规则】",
        agentInstructions || "未找到本地 Agent 规则，请按 Zerlum 照明专业助手身份谨慎回答。",
      ]
    : [];

  return [
    identity,
    "",
    sourceNotice,
    "",
    ...agentRuleSection,
    "",
    contextText ? "【Zerlum 知识库检索结果】" : "",
    contextText,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function readBody(request: NodeJS.ReadableStream) {
  const chunks: Uint8Array[] = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

function sendJson(
  response: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body?: string) => void },
  statusCode: number,
  payload: unknown,
) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
}

function collectImageCandidates(value: unknown, keyHint = ""): string[] {
  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    const hint = keyHint.toLowerCase();
    const trimmed = value.trim();

    if (trimmed.startsWith("data:image/")) {
      return [trimmed];
    }

    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("oss://") ||
      trimmed.startsWith("tos://")
    ) {
      return hint.includes("image") ||
        hint.includes("url") ||
        /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(trimmed)
        ? [trimmed]
        : [];
    }

    if (
      (hint.includes("b64") ||
        hint.includes("base64") ||
        hint === "result" ||
        hint.includes("image")) &&
      /^[A-Za-z0-9+/=\r\n]+$/.test(trimmed) &&
      trimmed.length > 600
    ) {
      return [`data:image/png;base64,${trimmed.replace(/\s/g, "")}`];
    }

    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectImageCandidates(item, keyHint));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    return Object.entries(record).flatMap(([key, item]) =>
      collectImageCandidates(item, key),
    );
  }

  return [];
}

function collectOutputText(value: unknown): string[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectOutputText(item));
  }

  const record = value as Record<string, unknown>;
  const fragments: string[] = [];

  ["text", "output_text", "content"].forEach((key) => {
    if (typeof record[key] === "string") {
      fragments.push(record[key] as string);
    }
  });

  Object.values(record).forEach((item) => {
    if (item && typeof item === "object") {
      fragments.push(...collectOutputText(item));
    }
  });

  return fragments;
}

function normalizeVideoRatio(value: unknown) {
  const normalized = String(value ?? "").trim().toLowerCase();

  return ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16", "adaptive"].includes(
    normalized,
  )
    ? normalized
    : "16:9";
}

function normalizeVideoResolution(value: unknown) {
  const normalized = String(value ?? "").trim().toLowerCase();

  return ["480p", "720p", "1080p"].includes(normalized)
    ? normalized
    : "1080p";
}

function normalizeVideoDuration(value: unknown) {
  const match = String(value ?? "").match(/\d+/);
  const parsed = match ? Number(match[0]) : NaN;

  if (!Number.isFinite(parsed)) {
    return 8;
  }

  return Math.min(15, Math.max(4, Math.round(parsed)));
}

function resolveVideoWaitTimeoutMs(env: Record<string, string>) {
  const configured =
    env.ARK_VIDEO_WAIT_TIMEOUT_MS ||
    process.env.ARK_VIDEO_WAIT_TIMEOUT_MS;
  const parsed = configured ? Number(configured) : NaN;

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : arkDefaultVideoWaitTimeoutMs;
}

function resolveVideoPollIntervalMs(env: Record<string, string>) {
  const configured =
    env.ARK_VIDEO_POLL_INTERVAL_MS ||
    process.env.ARK_VIDEO_POLL_INTERVAL_MS;
  const parsed = configured ? Number(configured) : NaN;

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : arkDefaultVideoPollIntervalMs;
}

function collectVideoCandidates(value: unknown, keyHint = ""): string[] {
  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    const hint = keyHint.toLowerCase();
    const trimmed = value.trim();

    if (trimmed.startsWith("data:video/")) {
      return [trimmed];
    }

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return hint.includes("video") ||
        hint.includes("url") ||
        /\.(mp4|mov|webm|m3u8)(\?|#|$)/i.test(trimmed)
        ? [trimmed]
        : [];
    }

    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectVideoCandidates(item, keyHint));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    return Object.entries(record).flatMap(([key, item]) =>
      collectVideoCandidates(item, key),
    );
  }

  return [];
}

function extractArkErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return typeof payload === "string" ? payload.slice(0, 600) : "";
  }

  const record = payload as Record<string, unknown>;

  if (record.error && typeof record.error === "object") {
    const errorRecord = record.error as Record<string, unknown>;
    const message = findScalarByKey(errorRecord, ["message", "msg", "code"]);

    if (message) {
      return message;
    }
  }

  return findScalarByKey(payload, ["message", "msg", "error", "code"]);
}

async function parseArkJsonResponse(
  response: Response,
  fallbackMessage: string,
) {
  const text = await response.text();
  let payload: unknown = {};

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    throw new Error(
      extractArkErrorMessage(payload) ||
        (typeof payload === "string" ? payload.slice(0, 600) : "") ||
        `${fallbackMessage}: ${response.status}`,
    );
  }

  return payload;
}

function normalizeArkVideoReferences(
  value: unknown,
  type: "image_url" | "video_url" | "audio_url",
  role: "reference_image" | "reference_video" | "reference_audio",
) {
  const items = Array.isArray(value) ? value : value ? [value] : [];
  const fieldNames =
    type === "image_url"
      ? ["url", "imageUrl", "image_url", "src"]
      : type === "video_url"
        ? ["url", "videoUrl", "video_url", "src"]
        : ["url", "audioUrl", "audio_url", "src"];
  const schemePattern =
    type === "image_url"
      ? /^(https?:\/\/|data:image\/)/i
      : type === "video_url"
        ? /^(https?:\/\/|data:video\/)/i
        : /^(https?:\/\/|data:audio\/)/i;

  return items
    .flatMap((item) => {
      if (typeof item === "string") {
        return [{ url: item.trim(), type, role }];
      }

      if (!item || typeof item !== "object") {
        return [];
      }

      const record = item as Record<string, unknown>;
      const url =
        fieldNames
          .map((fieldName) => record[fieldName])
          .find((fieldValue) => typeof fieldValue === "string") ?? "";

      return [{ url: String(url).trim(), type, role }];
    })
    .filter((item) => schemePattern.test(item.url))
    .slice(0, 4);
}

function formatVideoPathInstructions(value: unknown) {
  if (!Array.isArray(value)) {
    return "";
  }

  const lines = value
    .map((path, pathIndex) => {
      if (!Array.isArray(path)) {
        return "";
      }

      const points = path
        .map((point) => {
          if (!point || typeof point !== "object") {
            return "";
          }

          const record = point as Record<string, unknown>;
          const x = Number(record.x);
          const y = Number(record.y);

          if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return "";
          }

          return `(${x.toFixed(1)}%, ${y.toFixed(1)}%)`;
        })
        .filter(Boolean);

      return points.length > 1
        ? `路径 ${pathIndex + 1}：${points.join(" -> ")}`
        : "";
    })
    .filter(Boolean);

  return lines.length
    ? ["【参考图片运动路径标注】", ...lines].join("\n")
    : "";
}

function buildArkVideoContent({
  prompt,
  referenceImages,
  referenceVideos,
  referenceAudio,
  imagePaths,
}: {
  prompt: string;
  referenceImages: ReturnType<typeof normalizeArkVideoReferences>;
  referenceVideos: ReturnType<typeof normalizeArkVideoReferences>;
  referenceAudio: ReturnType<typeof normalizeArkVideoReferences>;
  imagePaths: unknown;
}) {
  const text = [prompt, formatVideoPathInstructions(imagePaths)]
    .filter(Boolean)
    .join("\n\n");
  const references = [
    ...referenceImages,
    ...referenceVideos,
    ...referenceAudio,
  ].map((reference) => ({
    type: reference.type,
    [reference.type]: {
      url: reference.url,
    },
    role: reference.role,
  }));

  return [
    {
      type: "text",
      text,
    },
    ...references,
  ];
}

function extractArkVideoTaskId(payload: unknown) {
  return findScalarByKey(payload, ["taskId", "task_id", "id"]);
}

function extractArkVideoStatus(payload: unknown) {
  const status = findScalarByKey(payload, [
    "status",
    "taskStatus",
    "state",
    "phase",
  ]);

  return status ? status.toUpperCase() : "";
}

function extractArkVideoResult(payload: unknown) {
  const outputText = collectOutputText(payload).join("\n\n").trim();
  const videoUrl = collectVideoCandidates(payload)[0] ?? "";

  return {
    taskId: extractArkVideoTaskId(payload),
    status: extractArkVideoStatus(payload),
    videoUrl,
    outputText,
  };
}

async function queryArkVideoTask({
  endpoint,
  apiKey,
  taskId,
}: {
  endpoint: string;
  apiKey: string;
  taskId: string;
}) {
  const upstream = await fetch(
    `${endpoint.replace(/\/+$/, "")}/${encodeURIComponent(taskId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    },
  );

  return parseArkJsonResponse(upstream, "视频任务查询失败");
}

async function waitForArkVideoTask({
  endpoint,
  apiKey,
  taskId,
  timeoutMs,
  pollIntervalMs,
}: {
  endpoint: string;
  apiKey: string;
  taskId: string;
  timeoutMs: number;
  pollIntervalMs: number;
}) {
  const deadline = Date.now() + timeoutMs;
  let latestPayload: unknown = null;

  while (Date.now() < deadline) {
    await sleep(Math.min(pollIntervalMs, Math.max(250, deadline - Date.now())));

    latestPayload = await queryArkVideoTask({ endpoint, apiKey, taskId });

    const result = extractArkVideoResult(latestPayload);

    if (result.videoUrl || isSuccessfulRunningStatus(result.status)) {
      return {
        ...result,
        taskId: result.taskId || taskId,
        status: "done",
        outputText: result.outputText || "视频已生成。",
      };
    }

    if (isFailedRunningStatus(result.status)) {
      throw new Error(result.outputText || "视频任务生成失败。");
    }
  }

  const result = extractArkVideoResult(latestPayload);

  return {
    ...result,
    taskId: result.taskId || taskId,
    status: "running",
    outputText: result.outputText || "视频任务已提交，生成仍在进行。",
  };
}

function normalizeAgentImages(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((item) => {
      if (typeof item === "string") {
        return [{ imageUrl: item, label: "" }];
      }

      if (!item || typeof item !== "object") {
        return [];
      }

      const record = item as Record<string, unknown>;
      const imageUrl =
        typeof record.imageUrl === "string"
          ? record.imageUrl
          : typeof record.url === "string"
            ? record.url
            : "";
      const label = typeof record.label === "string" ? record.label : "";
      const nodeId = typeof record.nodeId === "string" ? record.nodeId : "";
      const edgeId = typeof record.edgeId === "string" ? record.edgeId : "";
      const targetNodeId = typeof record.targetNodeId === "string" ? record.targetNodeId : "";
      const role = typeof record.role === "string" ? record.role : "";
      const mentionToken =
        typeof record.mentionToken === "string" ? record.mentionToken : "";

      return [
        {
          imageUrl,
          label,
          nodeId,
          edgeId,
          targetNodeId,
          role,
          mentionToken,
          mentioned: record.mentioned === true,
        },
      ];
    })
    .filter(({ imageUrl }) =>
      /^(data:image\/|https?:\/\/)/i.test(imageUrl.trim()),
    )
    .slice(0, 4);
}

function normalizeProjectMaterialInputs(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((item) => {
      if (!item || typeof item !== "object") {
        return [];
      }

      const record = item as Record<string, unknown>;
      const name = typeof record.name === "string" ? record.name : "项目资料";
      const type = typeof record.type === "string" ? record.type : "";
      const sourceMimeType =
        typeof record.sourceMimeType === "string"
          ? record.sourceMimeType
          : type || "application/octet-stream";
      const sourceDataUrl =
        typeof record.sourceDataUrl === "string" &&
        /^data:[^,]+;base64,/i.test(record.sourceDataUrl.trim())
          ? record.sourceDataUrl.trim()
          : "";
      const sourceText =
        typeof record.sourceText === "string" ? record.sourceText.trim() : "";

      return [
        {
          name,
          type,
          sourceDataUrl,
          sourceText,
          sourceMimeType,
        },
      ];
    })
    .filter((material) => material.sourceDataUrl || material.sourceText || material.name)
    .slice(0, 8);
}

function buildDocumentMaterialContent(
  materials: ReturnType<typeof normalizeProjectMaterialInputs>,
) {
  return materials.flatMap((material, index) => {
    const label = `项目资料 ${index + 1}：${material.name}`;
    const content: Array<Record<string, string>> = [];

    if (/^data:image\//i.test(material.sourceDataUrl)) {
      content.push({
        type: "input_image",
        image_url: material.sourceDataUrl,
      });
    } else if (material.sourceDataUrl) {
      content.push({
        type: "input_file",
        filename: material.name,
        file_data: material.sourceDataUrl,
      });
    }

    if (material.sourceText) {
      content.push({
        type: "input_text",
        text: `【${label} 源文本】\n${material.sourceText.slice(0, 120_000)}`,
      });
    }

    return content;
  });
}

function normalizeAgentAudio(value: unknown) {
  const items = Array.isArray(value) ? value : value ? [value] : [];

  return items
    .flatMap((item) => {
      if (typeof item === "string") {
        return [{ audioUrl: item, label: "" }];
      }

      if (!item || typeof item !== "object") {
        return [];
      }

      const record = item as Record<string, unknown>;
      const audioUrl =
        typeof record.audioUrl === "string"
          ? record.audioUrl
          : typeof record.audio_url === "string"
            ? record.audio_url
            : typeof record.url === "string"
              ? record.url
              : typeof record.dataUrl === "string"
                ? record.dataUrl
                : "";
      const label = typeof record.label === "string" ? record.label : "";
      const audioBase64 = audioUrl.startsWith("data:audio/")
        ? audioUrl.replace(/^data:audio\/[^;]+;base64,/i, "")
        : "";

      return [{ audioUrl, audioBase64, label }];
    })
    .filter(({ audioUrl }) =>
      /^(data:audio\/|https?:\/\/)/i.test(audioUrl.trim()),
    )
    .slice(0, 2);
}

type RunningHubNodeInfo = {
  nodeId?: string | number;
  fieldName?: string;
  fieldValue?: unknown;
  fieldType?: string;
  nodeName?: string;
  description?: string;
  descriptionEn?: string;
  fieldData?: unknown;
  [key: string]: unknown;
};

type ImageFilePayload = {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function extractTopLevelCode(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "";
  }

  const code = (payload as Record<string, unknown>).code;

  return typeof code === "string" || typeof code === "number"
    ? String(code)
    : "";
}

function findScalarByKey(value: unknown, keyNames: string[]): string {
  const normalizedKeys = new Set(keyNames.map((key) => key.toLowerCase()));

  function visit(item: unknown): string {
    if (!item || typeof item !== "object") {
      return "";
    }

    if (Array.isArray(item)) {
      for (const entry of item) {
        const result = visit(entry);

        if (result) {
          return result;
        }
      }

      return "";
    }

    const record = item as Record<string, unknown>;

    for (const [key, entry] of Object.entries(record)) {
      if (
        normalizedKeys.has(key.toLowerCase()) &&
        (typeof entry === "string" || typeof entry === "number")
      ) {
        return String(entry);
      }
    }

    for (const entry of Object.values(record)) {
      const result = visit(entry);

      if (result) {
        return result;
      }
    }

    return "";
  }

  return visit(value);
}

function extractRunningHubMessage(payload: unknown) {
  const message = findScalarByKey(payload, [
    "errorMessage",
    "message",
    "msg",
    "error",
  ]).trim();

  return /^(success|ok|成功)$/i.test(message) ? "" : message;
}

function assertRunningHubAccepted(payload: unknown, fallbackMessage: string) {
  const code = extractTopLevelCode(payload);

  if (code && code !== "0" && code !== "200") {
    throw new Error(extractRunningHubMessage(payload) || fallbackMessage);
  }
}

async function parseRunningHubResponse(
  response: Response,
  fallbackMessage: string,
) {
  const text = await response.text();
  let payload: unknown = {};

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    throw new Error(
      extractRunningHubMessage(payload) ||
        (typeof payload === "string" ? payload.slice(0, 600) : "") ||
        `${fallbackMessage}: ${response.status}`,
    );
  }

  return payload;
}

async function postRunningHubJson(
  endpoint: string,
  apiKey: string,
  payload: Record<string, unknown>,
) {
  const upstream = await fetch(resolveRunningHubEndpoint(endpoint), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseRunningHubResponse(upstream, "RunningHub request failed");
}

function extractTaskId(payload: unknown) {
  return findScalarByKey(payload, ["taskId", "task_id"]);
}

function extractRunningStatus(payload: unknown) {
  const explicitStatus = findScalarByKey(payload, ["taskStatus", "status"]);

  if (explicitStatus) {
    return explicitStatus.toUpperCase();
  }

  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const data = (payload as Record<string, unknown>).data;

    if (typeof data === "string") {
      return data.toUpperCase();
    }
  }

  return "";
}

function isFailedRunningStatus(status: string) {
  return /FAIL|FAILED|ERROR|CANCEL|TIMEOUT|失败|错误|异常|取消/.test(status);
}

function isSuccessfulRunningStatus(status: string) {
  return /SUCCESS|SUCCEEDED|COMPLETED|COMPLETE|FINISHED|DONE|成功/.test(status);
}

function describePayloadShape(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return typeof payload;
  }

  const record = payload as Record<string, unknown>;
  const data = record.data;
  const dataKeys =
    data && typeof data === "object" && !Array.isArray(data)
      ? Object.keys(data as Record<string, unknown>).slice(0, 8)
      : [];

  return [
    `code=${String(record.code ?? "")}`,
    `msg=${String(record.msg ?? record.message ?? "")}`,
    `keys=${Object.keys(record).slice(0, 8).join(",")}`,
    dataKeys.length ? `dataKeys=${dataKeys.join(",")}` : "",
  ]
    .filter(Boolean)
    .join("；");
}

function isRunningMessage(message: string) {
  return /running|waiting|queue|processing|generating|pending|not.*finish|执行中|生成中|排队|等待/i.test(
    message,
  );
}

function firstOutputImageUrl(payload: unknown, excludedUrls: string[] = []) {
  const excluded = new Set(excludedUrls.filter(Boolean));

  return collectImageCandidates(payload).find((candidate) => !excluded.has(candidate)) ?? "";
}

function normalizeUpscaleResolution(value: string) {
  const normalized = value.trim().toLowerCase();

  return ["2k", "4k", "6k", "8k"].includes(normalized)
    ? normalized
    : runningHubDefaultUpscaleResolution;
}

function normalizeUpscaleResolutionValue(value: string) {
  const normalizedResolution =
    normalizeUpscaleResolution(value) as keyof typeof runningHubUpscaleResolutionValues;

  return runningHubUpscaleResolutionValues[normalizedResolution];
}

function normalizeRunningHubImageAspectRatio(value: string | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (["adaptive", "auto", "source", "same-as-source"].includes(normalized)) {
    return "auto";
  }

  return ["21:9", "16:9", "4:3", "3:2", "1:1", "2:3", "3:4", "9:16"].includes(
    normalized,
  )
    ? normalized
    : "";
}

function formatResolutionLabel(value: string) {
  return normalizeUpscaleResolution(value).toUpperCase();
}

function inferImageExtension(mimeType: string) {
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
    return "jpg";
  }

  if (mimeType.includes("webp")) {
    return "webp";
  }

  if (mimeType.includes("gif")) {
    return "gif";
  }

  return "png";
}

function parseDataImageUrl(imageUrl: string, fallbackName: string): ImageFilePayload | null {
  const match = imageUrl.match(/^data:(image\/[^;,]+)(?:;[^,]*)?;base64,(.+)$/);

  if (!match) {
    return null;
  }

  const mimeType = match[1].toLowerCase();
  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");

  return {
    buffer,
    mimeType,
    fileName: `${fallbackName}.${inferImageExtension(mimeType)}`,
  };
}

async function readImagePayload(
  imageUrl: string,
  fallbackName: string,
): Promise<ImageFilePayload> {
  const dataPayload = parseDataImageUrl(imageUrl, fallbackName);

  if (dataPayload) {
    return dataPayload;
  }

  if (!/^https?:\/\//i.test(imageUrl)) {
    throw new Error("图片地址必须是可访问的 URL 或 data:image 数据。");
  }

  const upstream = await fetch(imageUrl);

  if (!upstream.ok) {
    throw new Error(`读取图片失败：${upstream.status}`);
  }

  const mimeType =
    upstream.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ||
    "image/png";
  const buffer = Buffer.from(await upstream.arrayBuffer());
  let fileName = "";

  try {
    const urlFileName = decodeURIComponent(
      new URL(imageUrl).pathname.split("/").pop() || "",
    );

    if (/\.(png|jpe?g|webp|gif)$/i.test(urlFileName)) {
      fileName = urlFileName.replace(/[^\w.-]/g, "_");
    }
  } catch {
    fileName = "";
  }

  return {
    buffer,
    mimeType,
    fileName: fileName || `${fallbackName}.${inferImageExtension(mimeType)}`,
  };
}

async function uploadRunningHubModelImage(apiKey: string, imageUrl: string) {
  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  const image = await readImagePayload(imageUrl, "zerlum-reference");
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([image.buffer], { type: image.mimeType }),
    image.fileName,
  );

  const upstream = await fetch(runningHubImageUploadEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });
  const payload = await parseRunningHubResponse(
    upstream,
    "RunningHub image upload failed",
  );
  assertRunningHubAccepted(payload, "RunningHub image upload failed");

  const uploadedUrl =
    findScalarByKey(payload, ["download_url", "downloadUrl", "url"]) ||
    firstOutputImageUrl(payload);

  if (!uploadedUrl) {
    throw new Error("RunningHub 上传成功但没有返回图片地址。");
  }

  return uploadedUrl;
}

async function uploadRunningHubAppImage(apiKey: string, imageUrl: string) {
  const image = await readImagePayload(imageUrl, "zerlum-upscale-input");
  const formData = new FormData();
  formData.append("apiKey", apiKey);
  formData.append("fileType", "input");
  formData.append(
    "file",
    new Blob([image.buffer], { type: image.mimeType }),
    image.fileName,
  );

  const upstream = await fetch(runningHubAppUploadEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });
  const payload = await parseRunningHubResponse(
    upstream,
    "RunningHub AI App resource upload failed",
  );
  assertRunningHubAccepted(payload, "RunningHub AI App resource upload failed");

  const fileName = findScalarByKey(payload, ["fileName", "filename"]);

  if (!fileName) {
    throw new Error("RunningHub AI App 上传成功但没有返回 fileName。");
  }

  return fileName;
}

async function pollRunningHubModelResult(
  apiKey: string,
  queryEndpoint: string,
  taskId: string,
  excludedUrls: string[] = [],
) {
  for (let index = 0; index < 120; index += 1) {
    await sleep(index === 0 ? 1200 : 2500);

    const payload = await postRunningHubJson(queryEndpoint, apiKey, {
      taskId,
    });
    const code = extractTopLevelCode(payload);
    const message = extractRunningHubMessage(payload);

    if (code && code !== "0" && code !== "200" && !isRunningMessage(message)) {
      throw new Error(message || "RunningHub 图生图任务查询失败。");
    }

    const status = extractRunningStatus(payload);

    if (isFailedRunningStatus(status)) {
      throw new Error(message || `RunningHub 图生图任务失败：${status}`);
    }

    const imageUrl = firstOutputImageUrl(payload, excludedUrls);

    if (imageUrl) {
      return {
        imageUrl,
        payload,
      };
    }

    if (isSuccessfulRunningStatus(status)) {
      throw new Error("RunningHub 图生图任务完成但没有返回图片。");
    }
  }

  throw new Error("RunningHub 图生图任务等待超时。");
}

async function runRunningHubImageToImage({
  apiKey,
  endpoint,
  queryEndpoint,
  imageUrl,
  referenceImageUrls = [],
  prompt,
  aspectRatio,
}: {
  apiKey: string;
  endpoint: string;
  queryEndpoint: string;
  imageUrl: string;
  referenceImageUrls?: string[];
  prompt: string;
  aspectRatio?: string;
}) {
  const inputImageUrls = [
    imageUrl,
    ...referenceImageUrls,
  ]
    .map((url) => url.trim())
    .filter(Boolean);
  const uploadedImageUrls: string[] = [];

  for (const inputImageUrl of [...new Set(inputImageUrls)]) {
    uploadedImageUrls.push(
      await uploadRunningHubModelImage(apiKey, inputImageUrl),
    );
  }

  const uploadedImageUrl = uploadedImageUrls[0];
  const enrichedPrompt = [
    "根据参考图进行照明效果图图生图创作。",
    uploadedImageUrls.length > 1
      ? `同时参考 ${uploadedImageUrls.length} 张输入图，第一张为主图，其余为参考图。`
      : "",
    prompt,
    "保持参考图的空间结构、主体关系和视角逻辑；重点强化灯光层次、材质质感、夜景氛围和方案表达清晰度。",
  ]
    .filter(Boolean)
    .join("\n");
  const isEditEndpoint = /\/edit(?:\?|$)/i.test(endpoint);
  const normalizedAspectRatio = normalizeRunningHubImageAspectRatio(aspectRatio);
  const submitPayload = await postRunningHubJson(
    endpoint,
    apiKey,
    isEditEndpoint
      ? {
          imageUrl: uploadedImageUrl,
          ...(uploadedImageUrls.length > 1 ? { imageUrls: uploadedImageUrls } : {}),
          prompt: enrichedPrompt,
          aspectRatio: normalizedAspectRatio || "auto",
          resolution: runningHubDefaultResolution,
          numImages: "1",
          outputFormat: "jpeg",
        }
      : {
          imageUrls: uploadedImageUrls,
          prompt: enrichedPrompt,
          aspectRatio: normalizedAspectRatio || runningHubDefaultAspectRatio,
          resolution: runningHubDefaultResolution,
        },
  );
  assertRunningHubAccepted(submitPayload, "RunningHub 图生图任务提交失败。");

  const taskId = extractTaskId(submitPayload);

  if (!taskId) {
    throw new Error(
      `RunningHub 图生图任务提交成功但没有返回 taskId。返回结构：${describePayloadShape(submitPayload)}`,
    );
  }

  const result = await pollRunningHubModelResult(
    apiKey,
    queryEndpoint,
    taskId,
    uploadedImageUrls,
  );

  return {
    taskId,
    imageUrl: result.imageUrl,
    payload: result.payload,
  };
}

function extractNodeInfoList(value: unknown): RunningHubNodeInfo[] {
  if (Array.isArray(value)) {
    const looksLikeNodeInfo = value.some(
      (item) =>
        item &&
        typeof item === "object" &&
        ("nodeId" in item || "fieldName" in item),
    );

    if (looksLikeNodeInfo) {
      return value as RunningHubNodeInfo[];
    }

    for (const item of value) {
      const nested = extractNodeInfoList(item);

      if (nested.length) {
        return nested;
      }
    }

    return [];
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;

  if (Array.isArray(record.nodeInfoList)) {
    return record.nodeInfoList as RunningHubNodeInfo[];
  }

  for (const item of Object.values(record)) {
    const nested = extractNodeInfoList(item);

    if (nested.length) {
      return nested;
    }
  }

  return [];
}

function parseConfiguredNodeInfoList(configuredNodeInfo: string) {
  if (!configuredNodeInfo.trim()) {
    return [];
  }

  try {
    return extractNodeInfoList(JSON.parse(configuredNodeInfo));
  } catch {
    throw new Error("RUNNINGHUB_UPSCALE_NODE_INFO 不是合法 JSON。");
  }
}

function looksLikeImageInputNode(node: RunningHubNodeInfo) {
  const joined = JSON.stringify({
    fieldData: node.fieldData,
    fieldName: node.fieldName,
    fieldType: node.fieldType,
    nodeName: node.nodeName,
    description: node.description,
    descriptionEn: node.descriptionEn,
  }).toLowerCase();

  return /image|img|picture|photo|upload|loadimage|图像|图片|素材|参考图/.test(
    joined,
  );
}

function looksLikeUpscaleResolutionNode(node: RunningHubNodeInfo) {
  const joined = JSON.stringify({
    fieldData: node.fieldData,
    fieldName: node.fieldName,
    fieldType: node.fieldType,
    nodeName: node.nodeName,
    description: node.description,
    descriptionEn: node.descriptionEn,
  }).toLowerCase();

  return /resolution|upscale|scale|size|target|分辨率|放大|尺寸|清晰度|目标/.test(
    joined,
  );
}

function buildNodePatch(node: RunningHubNodeInfo, fieldValue: string) {
  if (node.nodeId === undefined || !node.fieldName) {
    throw new Error("RunningHub AI App 节点缺少 nodeId 或 fieldName。");
  }

  return {
    nodeId: String(node.nodeId),
    fieldName: node.fieldName,
    fieldValue,
  };
}

function applyNodeInfoPlaceholders(
  nodeInfoList: RunningHubNodeInfo[],
  replacements: Record<string, string>,
) {
  let serialized = JSON.stringify(nodeInfoList);

  Object.entries(replacements).forEach(([key, value]) => {
    serialized = serialized.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  });

  return JSON.parse(serialized) as RunningHubNodeInfo[];
}

async function fetchRunningHubAppDemoNodeInfo(apiKey: string, webappId: string) {
  const url = new URL(runningHubAppDemoEndpoint);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("webappId", webappId);

  const upstream = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const payload = await parseRunningHubResponse(
    upstream,
    "RunningHub AI App demo query failed",
  );
  assertRunningHubAccepted(payload, "RunningHub AI App demo query failed");

  const nodeInfoList = extractNodeInfoList(payload);

  if (!nodeInfoList.length) {
    throw new Error("RunningHub AI App 未返回可调用的 nodeInfoList。");
  }

  return nodeInfoList;
}

async function buildRunningHubUpscaleNodeInfo({
  apiKey,
  webappId,
  imageFileName,
  imageUrl,
  targetResolution,
  configuredNodeInfo,
}: {
  apiKey: string;
  webappId: string;
  imageFileName: string;
  imageUrl: string;
  targetResolution: string;
  configuredNodeInfo: string;
}) {
  const normalizedResolution = normalizeUpscaleResolution(targetResolution);
  const resolutionValue = normalizeUpscaleResolutionValue(targetResolution);
  const resolutionLabel = formatResolutionLabel(targetResolution);
  const configuredNodes = parseConfiguredNodeInfoList(configuredNodeInfo);

  if (configuredNodes.length) {
    const withPlaceholders = applyNodeInfoPlaceholders(configuredNodes, {
      imageFileName,
      imageUrl,
      resolution: resolutionValue,
      resolutionValue,
      resolutionKey: normalizedResolution,
      resolutionLabel,
      resolutionLower: normalizedResolution,
      resolutionUpper: resolutionLabel,
      targetResolution: resolutionValue,
      targetResolutionValue: resolutionValue,
      targetResolutionKey: normalizedResolution,
      targetResolutionLabel: resolutionLabel,
    });
    const imageNodeIndex = withPlaceholders.findIndex(looksLikeImageInputNode);
    const resolutionNodeIndex = withPlaceholders.findIndex(
      (node, index) =>
        index !== imageNodeIndex && looksLikeUpscaleResolutionNode(node),
    );

    return withPlaceholders.map((node, index) => {
      if (index === imageNodeIndex) {
        return { ...node, fieldValue: node.fieldValue || imageFileName };
      }

      if (index === resolutionNodeIndex) {
        return { ...node, fieldValue: resolutionValue };
      }

      return node;
    });
  }

  const demoNodeInfoList = await fetchRunningHubAppDemoNodeInfo(apiKey, webappId);
  const imageNode = demoNodeInfoList.find(looksLikeImageInputNode);

  if (!imageNode) {
    throw new Error("RunningHub AI App 调用示例中没有识别到图片输入节点。");
  }

  const nodePatches = [buildNodePatch(imageNode, imageFileName)];
  const resolutionNode = demoNodeInfoList.find(
    (node) => node !== imageNode && looksLikeUpscaleResolutionNode(node),
  );

  if (resolutionNode) {
    nodePatches.push(buildNodePatch(resolutionNode, resolutionValue));
  }

  return nodePatches;
}

async function pollRunningHubAppOutput(
  apiKey: string,
  taskId: string,
  excludedUrls: string[] = [],
) {
  for (let index = 0; index < 120; index += 1) {
    await sleep(index === 0 ? 1800 : 3000);

    const outputPayload = await postRunningHubJson(
      runningHubAppOutputsEndpoint,
      apiKey,
      {
        apiKey,
        taskId,
      },
    );
    const imageUrl = firstOutputImageUrl(outputPayload, excludedUrls);

    if (imageUrl) {
      return {
        imageUrl,
        payload: outputPayload,
      };
    }

    const outputCode = extractTopLevelCode(outputPayload);
    const outputMessage = extractRunningHubMessage(outputPayload);
    const outputStatus = extractRunningStatus(outputPayload);

    if (
      outputCode &&
      outputCode !== "0" &&
      outputCode !== "200" &&
      !isRunningMessage(outputMessage)
    ) {
      throw new Error(outputMessage || "RunningHub 放大任务结果查询失败。");
    }

    if (isFailedRunningStatus(outputStatus)) {
      throw new Error(outputMessage || `RunningHub 放大任务失败：${outputStatus}`);
    }

    try {
      const statusPayload = await postRunningHubJson(
        runningHubAppStatusEndpoint,
        apiKey,
        {
          apiKey,
          taskId,
        },
      );
      const status = extractRunningStatus(statusPayload);
      const statusMessage = extractRunningHubMessage(statusPayload);

      if (isFailedRunningStatus(status)) {
        throw new Error(statusMessage || `RunningHub 放大任务失败：${status}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";

      if (message && !isRunningMessage(message)) {
        throw error;
      }
    }
  }

  throw new Error("RunningHub 放大任务等待超时。");
}

async function runRunningHubUpscale({
  apiKey,
  webappId,
  imageUrl,
  targetResolution,
  configuredNodeInfo,
}: {
  apiKey: string;
  webappId: string;
  imageUrl: string;
  targetResolution: string;
  configuredNodeInfo: string;
}) {
  const imageFileName = await uploadRunningHubAppImage(apiKey, imageUrl);
  const nodeInfoList = await buildRunningHubUpscaleNodeInfo({
    apiKey,
    webappId,
    imageFileName,
    imageUrl,
    targetResolution,
    configuredNodeInfo,
  });
  const submitPayload = await postRunningHubJson(
    runningHubAppRunEndpoint,
    apiKey,
    {
      webappId,
      apiKey,
      nodeInfoList,
    },
  );
  assertRunningHubAccepted(submitPayload, "RunningHub 放大任务提交失败。");

  const taskId = extractTaskId(submitPayload);

  if (!taskId) {
    throw new Error("RunningHub 放大任务提交成功但没有返回 taskId。");
  }

  const result = await pollRunningHubAppOutput(apiKey, taskId, [imageUrl]);

  return {
    taskId,
    imageUrl: result.imageUrl,
    payload: result.payload,
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      {
        name: "zerlum-agent-proxy",
        configureServer(server) {
          server.middlewares.use("/api/zerlum-agent", async (request, response) => {
            if (request.method !== "POST") {
              response.statusCode = 405;
              response.setHeader("Content-Type", "application/json");
              response.end(JSON.stringify({ error: "Method not allowed" }));
              return;
            }

            try {
              const body = JSON.parse(await readBody(request));
              const message = String(body.message ?? "").trim();
              const view = String(body.view ?? "agent").trim() || "agent";
              const agentTask = String(body.agentTask ?? body.task ?? "").trim();
              const isOutlineTask = view === "text" && agentTask === "outline";
              const isDocumentOutputTask = view === "text" && agentTask === "document-output";
              const useOpenAiChat = (view === "agent" && !isOutlineTask) || isOutlineTask;
              const agentImages = normalizeAgentImages(body.images);
              const agentAudio = normalizeAgentAudio(body.audio ?? body.audios);
              const projectMaterials = normalizeProjectMaterialInputs(body.materials);
              const hasAgentImages = agentImages.length > 0;
              const hasAgentAudio = agentAudio.length > 0;
              const apiKey = isDocumentOutputTask
                ? env.OPENAI_DOCUMENT_OUTPUT_API_KEY ||
                  process.env.OPENAI_DOCUMENT_OUTPUT_API_KEY ||
                  env.OPENAI_API_KEY ||
                  process.env.OPENAI_API_KEY
                : useOpenAiChat
                  ? env.OPENAI_API_KEY || process.env.OPENAI_API_KEY
                  : env.ARK_API_KEY || process.env.ARK_API_KEY;
              const missingKeyName = isDocumentOutputTask
                ? "OPENAI_DOCUMENT_OUTPUT_API_KEY"
                : useOpenAiChat
                  ? "OPENAI_API_KEY"
                  : "ARK_API_KEY";

              if (!apiKey) {
                response.statusCode = 500;
                response.setHeader("Content-Type", "application/json");
                response.end(
                  JSON.stringify({
                    error: `Missing ${missingKeyName}`,
                  }),
                );
                return;
              }

              if (!message && !hasAgentAudio) {
                response.statusCode = 400;
                response.setHeader("Content-Type", "application/json");
                response.end(JSON.stringify({ error: "Message is required" }));
                return;
              }

              const project = body.project
                ? isDocumentOutputTask
                  ? `\n\n当前项目：${body.project.name || "未命名项目"}。`
                  : `\n\n当前项目：${body.project.name || "未命名项目"}；类型：${
                      body.project.type || "未填写"
                    }；客户：${body.project.client || "未填写"}。`
                : "";
              const materials = projectMaterials.length > 0
                ? isDocumentOutputTask
                  ? `\n已附带项目资料源文件：${projectMaterials
                      .filter((item) => item.sourceDataUrl || item.sourceText)
                      .map((item) => item.name)
                      .join("、") || "暂无可直接读取的源文件"}。${
                      projectMaterials.some((item) => !item.sourceDataUrl && !item.sourceText)
                        ? `仍只有元信息的资料：${projectMaterials
                            .filter((item) => !item.sourceDataUrl && !item.sourceText)
                            .map((item) => item.name)
                            .join("、")}。`
                        : ""
                    }`
                  : `\n已上传资料：${projectMaterials
                      .map((item) => item.name)
                      .filter(Boolean)
                      .join("、")}。`
                : "";
              const imageContext = hasAgentImages
                ? `\n已附带画布图片：${agentImages
                    .map((image, index) => image.label || `图片 ${index + 1}`)
                    .join("、")}。请直接观察图片内容，不要只依据文件名判断。`
                : "";
              const audioContext = hasAgentAudio
                ? `\n已附带麦克风语音：${agentAudio
                    .map((audio, index) => audio.label || `语音 ${index + 1}`)
                    .join("、")}。请直接识别语音内容，并结合文字提示回答。`
                : "";
              const systemPrompt = isOutlineTask
                ? ""
                : buildZerlumSystemPrompt({
                    root: resolveZerlumRoot(env),
                    view,
                    message: `${message}${project}${materials}${imageContext}${audioContext}`,
                  });
              const canvasVisualInstruction =
                view === "canvas"
                  ? [
                      "【AI无限画布输出约束】",
                      "严格遵循已加载的 agents/lighting-visualization/agent.md 中“AI 无限画布夜景提示词模式”。",
                      "生成或优化提示词时，必须明确要求与原图结构、构图、主体位置、镜头视角和透视关系保持一致。",
                      "只输出两段：Zerlum 知识库依据、夜景效果图提示词。不要列检索片段、路径、集合名称或召回细节。",
                    ].join("\n")
                  : "";
              const outlineInstruction = isOutlineTask
                ? [
                    "【Zerlum Outline 输出约束】",
                    "说明身份时，只说“我是 Zerlum照明系统”。",
                    "你的信息只来自用户上传资料和当前项目基础信息。",
                    "不得调用、引用或声称使用任何 agent.md、Zerlum 知识库、数据库或联网检索结果。",
                    "收到资料时，输出简洁大纲；没有资料时，只说明目前没有收到资料。",
                    "版式默认 16:9 横屏。",
                    "大纲开头必须先写清楚排版风格和字体要求。",
                    "随后逐页写清楚每页的排版内容、版面位置和图文层级。",
                    "不要输出正文、示例、推理过程、引用清单或额外解释。",
                  ].join("\n")
                : "";
              const enrichedMessage = [
                systemPrompt,
                "",
                canvasVisualInstruction,
                outlineInstruction,
                "",
                "【当前用户请求】",
                message,
                project,
                materials,
                imageContext,
                audioContext,
                "",
                isOutlineTask
                  ? "请以 Zerlum照明系统身份回答，只依据用户上传资料和当前项目基础信息生成大纲。"
                  : view === "canvas"
                  ? "请严格按 AI 无限画布输出约束回答，只生成夜景效果图提示词相关内容。"
                  : hasAgentImages
                    ? "请以 Zerlum 视觉 Agent 身份先观察附带图片，再结合 Zerlum 知识库给出画面理解、提示词建议、问题判断和可执行修改建议；提示词建议必须要求与原图结构、构图、主体位置、镜头视角和透视关系保持一致。"
                    : hasAgentAudio
                      ? "请以 Zerlum Agent 身份先识别附带语音，再结合 Zerlum 知识库回答语音里的请求。"
                  : "请以 Zerlum Agent 身份回答，并基于 Zerlum 知识库说明依据、假设和需要复核的地方。",
              ]
                .filter(Boolean)
                .join("\n");
              const agentModel = isDocumentOutputTask
                ? env.OPENAI_DOCUMENT_OUTPUT_MODEL ||
                  process.env.OPENAI_DOCUMENT_OUTPUT_MODEL ||
                  openAiDefaultDocumentOutputModel
                : useOpenAiChat
                  ? isOutlineTask
                  ? env.OPENAI_OUTLINE_MODEL ||
                    process.env.OPENAI_OUTLINE_MODEL ||
                    env.OPENAI_AGENT_MODEL ||
                    process.env.OPENAI_AGENT_MODEL ||
                    openAiDefaultAgentModel
                  : env.OPENAI_AGENT_MODEL ||
                    process.env.OPENAI_AGENT_MODEL ||
                    openAiDefaultAgentModel
                : env.ARK_AGENT_MODEL ||
                  process.env.ARK_AGENT_MODEL ||
                  arkDefaultAgentModel;
              const content = [
                ...agentImages.map((image) => ({
                  type: "input_image",
                  image_url: image.imageUrl,
                })),
                ...agentAudio.map((audio) => ({
                  type: "input_audio",
                  audio_url: audio.audioUrl,
                })),
                {
                  type: "input_text",
                  text: enrichedMessage,
                },
              ];
              const openAiChatContent = [
                ...agentImages.map((image) => ({
                  type: "image_url",
                  image_url: {
                    url: image.imageUrl,
                  },
                })),
                ...agentAudio
                  .filter((audio) => audio.audioBase64)
                  .map((audio) => ({
                    type: "input_audio",
                    input_audio: {
                      data: audio.audioBase64,
                      format: "wav",
                    },
                  })),
                {
                  type: "text",
                  text: enrichedMessage,
                },
              ];
              const openAiChatEndpoint = resolveOpenAiChatEndpoint(env);
              const documentOutputEndpoint = resolveOpenAiResponsesEndpoint(env);
              const documentOutputTimeoutMs = resolveDocumentOutputTimeoutMs(env);
              const documentOutputContent = [
                ...buildDocumentMaterialContent(projectMaterials),
                ...agentImages.map((image) => ({
                  type: "input_image",
                  image_url: image.imageUrl,
                })),
                {
                  type: "input_text",
                  text: enrichedMessage,
                },
              ];
              const upstreamEndpoint = isDocumentOutputTask
                ? documentOutputEndpoint
                : useOpenAiChat
                  ? openAiChatEndpoint
                  : arkEndpoint;
              const requestPayload = isDocumentOutputTask
                ? {
                    model: agentModel,
                    stream: false,
                    input: [
                      {
                        role: "user",
                        content: documentOutputContent,
                      },
                    ],
                  }
                : useOpenAiChat
                ? {
                    model: agentModel,
                    stream: true,
                    messages: [
                      {
                        role: "user",
                        content: openAiChatContent,
                      },
                    ],
                  }
                : {
                    model: agentModel,
                    stream: true,
                    input: [
                      {
                        role: "user",
                        content,
                      },
                    ],
                  };

              const upstreamController = isDocumentOutputTask
                ? new AbortController()
                : null;
              const upstreamTimeout = isDocumentOutputTask
                ? setTimeout(() => upstreamController?.abort(), documentOutputTimeoutMs)
                : null;
              let upstream: Awaited<ReturnType<typeof fetch>>;

              try {
                upstream = await fetch(upstreamEndpoint, {
                  method: "POST",
                  signal: upstreamController?.signal,
                  headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(requestPayload),
                });
              } catch (error) {
                if (isDocumentOutputTask && upstreamController?.signal.aborted) {
                  response.statusCode = 504;
                  response.setHeader("Content-Type", "application/json");
                  response.end(
                    JSON.stringify({
                      error: `image2 请求超时：超过 ${Math.round(
                        documentOutputTimeoutMs / 1000,
                      )} 秒没有返回。`,
                    }),
                  );
                  return;
                }

                throw error;
              } finally {
                if (upstreamTimeout) {
                  clearTimeout(upstreamTimeout);
                }
              }

              if (isDocumentOutputTask) {
                const upstreamText = await upstream.text();

                response.statusCode = upstream.status;
                response.setHeader("Cache-Control", "no-cache");
                response.setHeader("Connection", "keep-alive");

                if (!upstream.ok) {
                  response.setHeader(
                    "Content-Type",
                    upstream.headers.get("content-type") || "application/json",
                  );
                  response.end(upstreamText);
                  return;
                }

                const documentText = (() => {
                  try {
                    return JSON.stringify(extractDocumentOutputResult(JSON.parse(upstreamText)));
                  } catch {
                    return upstreamText;
                  }
                })();

                response.setHeader("Content-Type", "text/event-stream");
                writeAgentTextEvent(response, documentText);
                response.end();
                return;
              }

              response.statusCode = upstream.status;
              response.setHeader(
                "Content-Type",
                upstream.headers.get("content-type") || "text/event-stream",
              );
              response.setHeader("Cache-Control", "no-cache");
              response.setHeader("Connection", "keep-alive");

              if (!upstream.body) {
                response.end();
                return;
              }

              for await (const chunk of upstream.body) {
                response.write(chunk);
              }

              response.end();
            } catch (error) {
              response.statusCode = 500;
              response.setHeader("Content-Type", "application/json");
              response.end(
                JSON.stringify({
                  error:
                    error instanceof Error
                      ? error.message
                      : "Agent proxy request failed",
                }),
              );
            }
          });

          server.middlewares.use("/api/zerlum-prompt", async (request, response) => {
            if (request.method !== "POST") {
              sendJson(response, 405, { error: "Method not allowed" });
              return;
            }

            try {
              const body = JSON.parse(await readBody(request));
              const images = normalizeAgentImages(body.images);
              const nodeTitle = String(body.nodeTitle ?? "图像节点").trim();
              const currentPrompt = String(body.currentPrompt ?? "").trim();
              const apiKey =
                env.OPENAI_PROMPT_API_KEY ||
                process.env.OPENAI_PROMPT_API_KEY ||
                env.OPENAI_API_KEY ||
                process.env.OPENAI_API_KEY;

              if (!apiKey) {
                sendJson(response, 500, { error: "Missing OPENAI_PROMPT_API_KEY" });
                return;
              }

              if (!images.length) {
                sendJson(response, 400, {
                  error: "请先上传主图或连接参考图，再生成提示词。",
                });
                return;
              }

              const promptModel =
                env.OPENAI_PROMPT_MODEL ||
                process.env.OPENAI_PROMPT_MODEL ||
                env.OPENAI_AGENT_MODEL ||
                process.env.OPENAI_AGENT_MODEL ||
                openAiDefaultAgentModel;
              const promptEndpoint = resolveOpenAiResponsesEndpoint(env, "OPENAI_PROMPT_BASE_URL");
              const imageList = images
                .map((image, index) => `${index + 1}. ${image.label || `参考图 ${index + 1}`}`)
                .join("\n");
              const promptInstruction = [
                `当前节点：${nodeTitle || "图像节点"}。`,
                currentPrompt ? `用户已有提示词：${currentPrompt}` : "",
                imageList ? `已附带图片：\n${imageList}` : "",
                "请观察所有图片和参考图，为该节点生成一段可直接用于夜景效果图生成的中文提示词。",
                "先判断图片场景属于室内、室外还是不确定，再决定提示词重点；不要在输出中写出判断标签。",
                "用户已有提示词和参考图的明确要求优先；如果用户要求与场景判断不同，以用户想法为主，不要机械套模板。",
                "必须保持原图结构、构图、主体位置、镜头视角、透视关系、建筑比例和主要材质不变。",
                "重点描述照明设计、灯光层次、色温、亮度关系、材质质感和空间氛围等可执行效果。",
                "如果判断为室内：不要默认套用蓝调时刻、深蓝天空、暮色余光、建筑外立面、室外景观夜景等室外措辞；重点描述室内灯光场景、吊灯、筒灯、灯带、洗墙、展示照明、材质反光、空间层次、色温和氛围。",
                "如果判断为室外建筑或用户明确要求室外夜景：可以描述蓝调时刻、天空余光、建筑立面、景观灯、线性灯和商业夜景质感，但仍需贴合原图和用户要求。",
                "如果不确定：根据图像里最明显的空间线索和用户提示词生成，不要默认当作室外蓝调夜景。",
                "直接输出可用于生图的提示词正文，不要输出任何前缀、说明、标题、编号、Markdown、来源依据或规则名称。",
                "输出开头不要使用“根据”“以下是”“下面是”“提示词：”“我将”等说明性话术。",
              ]
                .filter(Boolean)
                .join("\n");
              const requestPayload = {
                model: promptModel,
                stream: false,
                input: [
                  {
                    role: "user",
                    content: [
                      ...images.map((image) => ({
                        type: "input_image",
                        image_url: image.imageUrl,
                      })),
                      {
                        type: "input_text",
                        text: promptInstruction,
                      },
                    ],
                  },
                ],
              };
              const upstream = await fetch(promptEndpoint, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(requestPayload),
              });
              const upstreamText = await upstream.text();

              if (!upstream.ok) {
                response.statusCode = upstream.status;
                response.setHeader(
                  "Content-Type",
                  upstream.headers.get("content-type") || "application/json",
                );
                response.end(upstreamText);
                return;
              }

              const prompt = extractDocumentOutputText(JSON.parse(upstreamText));

              sendJson(response, 200, { prompt: cleanCanvasPromptOutput(prompt) });
            } catch (error) {
              sendJson(response, 500, {
                error:
                  error instanceof Error
                    ? error.message
                    : "Prompt generation failed",
              });
            }
          });

          server.middlewares.use("/api/zerlum-image", async (request, response) => {
            if (request.method !== "POST") {
              sendJson(response, 405, { error: "Method not allowed" });
              return;
            }

            const imageApiKey =
              env.RUNNINGHUB_IMAGE_API_KEY ||
              process.env.RUNNINGHUB_IMAGE_API_KEY;
            const upscaleApiKey =
              env.RUNNINGHUB_UPSCALE_API_KEY ||
              process.env.RUNNINGHUB_UPSCALE_API_KEY;

            if (!imageApiKey) {
              sendJson(response, 500, {
                error: "Missing RUNNINGHUB_IMAGE_API_KEY",
              });
              return;
            }

            if (!upscaleApiKey) {
              sendJson(response, 500, {
                error: "Missing RUNNINGHUB_UPSCALE_API_KEY",
              });
              return;
            }

            try {
              const body = JSON.parse(await readBody(request));
              const prompt = String(body.prompt ?? "").trim();
              const imageUrl = String(body.imageUrl ?? "").trim();
              const referenceImages = normalizeAgentImages(body.referenceImages);
              const referenceImageUrls = referenceImages
                .map((image) => image.imageUrl)
                .filter(Boolean);
              const primaryImageUrl = imageUrl || referenceImageUrls[0] || "";
              const targetResolution = normalizeUpscaleResolution(
                String(body.resolution ?? ""),
              );
              const targetResolutionLabel = formatResolutionLabel(targetResolution);
              const aspectRatio = String(body.aspectRatio ?? "").trim();
              const imageEndpoint =
                env.RUNNINGHUB_IMAGE_ENDPOINT ||
                process.env.RUNNINGHUB_IMAGE_ENDPOINT ||
                runningHubDefaultImageEndpoint;
              const imageQueryEndpoint =
                env.RUNNINGHUB_IMAGE_QUERY_ENDPOINT ||
                process.env.RUNNINGHUB_IMAGE_QUERY_ENDPOINT ||
                runningHubImageQueryEndpoint;
              const upscaleWebappId = resolveRunningHubUpscaleWebappId(env);
              const configuredNodeInfo =
                env.RUNNINGHUB_UPSCALE_NODE_INFO ||
                process.env.RUNNINGHUB_UPSCALE_NODE_INFO ||
                "";

              if (!prompt) {
                sendJson(response, 400, { error: "Prompt is required" });
                return;
              }

              if (!primaryImageUrl) {
                sendJson(response, 400, {
                  error: "请先上传参考图片，再使用图生图生成。",
                });
                return;
              }

              const generated = await runRunningHubImageToImage({
                apiKey: imageApiKey,
                endpoint: imageEndpoint,
                queryEndpoint: imageQueryEndpoint,
                imageUrl: primaryImageUrl,
                referenceImageUrls,
                prompt,
                aspectRatio,
              });

              try {
                const upscaled = await runRunningHubUpscale({
                  apiKey: upscaleApiKey,
                  webappId: upscaleWebappId,
                  imageUrl: generated.imageUrl,
                  targetResolution,
                  configuredNodeInfo,
                });

                sendJson(response, 200, {
                  imageUrl: upscaled.imageUrl,
                  baseImageUrl: generated.imageUrl,
                  outputText: `已按 1K 底图生成，并通过放大接口处理到 ${targetResolutionLabel}。`,
                  model: runningHubDefaultImageModel,
                  resolution: targetResolution,
                  upscaled: true,
                  taskIds: {
                    image: generated.taskId,
                    upscale: upscaled.taskId,
                  },
                });
                return;
              } catch (upscaleError) {
                sendJson(response, 200, {
                  imageUrl: generated.imageUrl,
                  outputText: `已完成 1K 底图生成，但 ${targetResolutionLabel} 放大接口未返回可用结果：${
                    upscaleError instanceof Error
                      ? upscaleError.message
                      : "未知错误"
                  }`,
                  model: runningHubDefaultImageModel,
                  resolution: targetResolution,
                  upscaled: false,
                  taskIds: {
                    image: generated.taskId,
                  },
                });
                return;
              }
            } catch (error) {
              sendJson(response, 500, {
                error:
                  error instanceof Error
                    ? error.message
                    : "Image generation request failed",
              });
            }
          });

          server.middlewares.use("/api/zerlum-video", async (request, response) => {
            if (request.method !== "POST") {
              sendJson(response, 405, { error: "Method not allowed" });
              return;
            }

            const videoApiKey =
              env.ARK_VIDEO_API_KEY ||
              process.env.ARK_VIDEO_API_KEY ||
              env.ARK_API_KEY ||
              process.env.ARK_API_KEY;

            if (!videoApiKey) {
              sendJson(response, 500, {
                error: "Missing ARK_VIDEO_API_KEY",
              });
              return;
            }

            try {
              const body = JSON.parse(await readBody(request));
              const prompt = String(body.prompt ?? "").trim();
              const ratio = normalizeVideoRatio(body.aspectRatio);
              const resolution = normalizeVideoResolution(body.resolution);
              const duration = normalizeVideoDuration(body.duration);
              const videoModel =
                env.ARK_VIDEO_MODEL ||
                process.env.ARK_VIDEO_MODEL ||
                arkDefaultVideoModel;
              const endpoint = (
                env.ARK_VIDEO_TASKS_ENDPOINT ||
                process.env.ARK_VIDEO_TASKS_ENDPOINT ||
                arkVideoTasksEndpoint
              ).replace(/\/+$/, "");
              const referenceImages = normalizeArkVideoReferences(
                body.referenceImages,
                "image_url",
                "reference_image",
              );
              const referenceVideos = normalizeArkVideoReferences(
                body.referenceVideos,
                "video_url",
                "reference_video",
              );
              const referenceAudio = normalizeArkVideoReferences(
                body.referenceAudio,
                "audio_url",
                "reference_audio",
              );

              if (!prompt) {
                sendJson(response, 400, { error: "Prompt is required" });
                return;
              }

              const requestPayload = {
                model: videoModel,
                content: buildArkVideoContent({
                  prompt,
                  referenceImages,
                  referenceVideos,
                  referenceAudio,
                  imagePaths: body.imagePaths,
                }),
                generate_audio: true,
                ratio,
                resolution,
                duration,
                watermark: false,
              };
              const upstream = await fetch(endpoint, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${videoApiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(requestPayload),
              });
              const creationPayload = await parseArkJsonResponse(
                upstream,
                "视频生成任务创建失败",
              );
              const creationResult = extractArkVideoResult(creationPayload);
              const taskId = creationResult.taskId;

              sendJson(response, 200, {
                taskId,
                status: creationResult.videoUrl ? "done" : "submitted",
                videoUrl: creationResult.videoUrl,
                outputText:
                  creationResult.outputText ||
                  (creationResult.videoUrl
                    ? "视频已生成。"
                    : "视频任务已提交，正在生成中。"),
                model: videoModel,
                ratio,
                resolution,
                duration,
              });
            } catch (error) {
              sendJson(response, 500, {
                error:
                  error instanceof Error
                    ? error.message
                    : "Video generation request failed",
              });
            }
          });

          server.middlewares.use("/api/zerlum-video-status", async (request, response) => {
            if (request.method !== "GET" && request.method !== "POST") {
              sendJson(response, 405, { error: "Method not allowed" });
              return;
            }

            const videoApiKey =
              env.ARK_VIDEO_API_KEY ||
              process.env.ARK_VIDEO_API_KEY ||
              env.ARK_API_KEY ||
              process.env.ARK_API_KEY;

            if (!videoApiKey) {
              sendJson(response, 500, {
                error: "Missing ARK_VIDEO_API_KEY",
              });
              return;
            }

            try {
              const body =
                request.method === "POST"
                  ? JSON.parse(await readBody(request))
                  : {};
              const requestUrl = new URL(
                request.url ?? "",
                "http://localhost",
              );
              const taskId = String(
                body.taskId ?? requestUrl.searchParams.get("taskId") ?? "",
              ).trim();

              if (!taskId) {
                sendJson(response, 400, { error: "Task id is required" });
                return;
              }

              const endpoint = (
                env.ARK_VIDEO_TASKS_ENDPOINT ||
                process.env.ARK_VIDEO_TASKS_ENDPOINT ||
                arkVideoTasksEndpoint
              ).replace(/\/+$/, "");
              const payload = await queryArkVideoTask({
                endpoint,
                apiKey: videoApiKey,
                taskId,
              });
              const result = extractArkVideoResult(payload);
              const normalizedTaskId = result.taskId || taskId;
              const status =
                result.videoUrl || isSuccessfulRunningStatus(result.status)
                  ? "done"
                  : isFailedRunningStatus(result.status)
                    ? "error"
                    : "running";

              sendJson(response, 200, {
                taskId: normalizedTaskId,
                status,
                videoUrl: result.videoUrl,
                outputText:
                  result.outputText ||
                  (status === "done"
                    ? "视频已生成。"
                    : status === "error"
                      ? "视频任务生成失败。"
                      : "视频仍在生成中。"),
              });
            } catch (error) {
              sendJson(response, 500, {
                error:
                  error instanceof Error
                    ? error.message
                    : "Video task status request failed",
              });
            }
          });

          server.middlewares.use("/api/open-local-folder", async (request, response) => {
            if (request.method !== "POST") {
              sendJson(response, 405, { error: "Method not allowed" });
              return;
            }

            try {
              const body = JSON.parse(await readBody(request)) as {
                path?: string;
              };
              const requestedPath = String(body.path ?? "").trim();
              const desktopSourceRoot = readDesktopKnowledgeSourceRoot();
              const allowedRoots = [
                desktopSourceRoot,
                localDesktopKnowledgeIndexRoot,
              ].filter(Boolean);

              if (
                !allowedRoots.some((root) => isPathInside(requestedPath, root))
              ) {
                sendJson(response, 403, {
                  error: "This folder is outside the allowed knowledge roots",
                });
                return;
              }

              const folderPath = resolveOpenableFolder(requestedPath);

              if (!folderPath) {
                sendJson(response, 404, {
                  error: "Folder does not exist",
                });
                return;
              }

              openFolderInExplorer(folderPath);
              sendJson(response, 200, {
                ok: true,
                folderPath,
              });
            } catch (error) {
              sendJson(response, 500, {
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to open local folder",
              });
            }
          });
        },
      },
    ],
  };
});
