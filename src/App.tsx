import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type CSSProperties,
  type Dispatch,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type SetStateAction,
  type SyntheticEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import {
  Archive,
  ArrowClockwise,
  ArrowUp,
  ChatCircleText,
  CheckCircle,
  ClipboardText,
  CopySimple,
  DownloadSimple,
  FilePdf,
  FileText,
  Image as ImageIcon,
  MagnifyingGlassPlus,
  Microphone,
  PaperPlaneTilt,
  PlusCircle,
  Scissors,
  SealCheck,
  ShareNetwork,
  Sparkle,
  SpinnerGap,
  ThumbsDown,
  ThumbsUp,
  UploadSimple,
  UserCircle,
  VideoCamera,
  X,
} from "@phosphor-icons/react";
import DropdownSelect from "./components/DropdownSelect";
import AuthDialog, { type AuthMode } from "./shell/AuthDialog";
import WelcomeScreen from "./shell/WelcomeScreen";
import WorkspaceHeader from "./shell/WorkspaceHeader";
import AgentViewLayout from "./views/agent/AgentView";
import {
  createLandscapeProject,
  designStages,
  landscapeProjectTypes,
  type DesignStage,
  type LandscapeProject,
} from "./domain/landscape";
import {
  readWorkspaceState,
  writeWorkspaceState,
  type WorkspaceSession,
  type WorkspaceTheme,
  type WorkspaceView,
} from "./state/workspace";

type ThemeMode = WorkspaceTheme;
type Project = LandscapeProject;

type ProjectMaterial = {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  collection?: string;
  agentUse?: string;
  sourceDataUrl?: string;
  sourceText?: string;
  sourceMimeType?: string;
};

type ProjectDraft = {
  name: string;
  type: string;
  location?: string;
  designStage?: DesignStage;
  client: string;
};
type Session = WorkspaceSession;

type AgentAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  preview: string | null;
  uploadStatus: "uploading" | "complete";
};

type PastedSnippet = {
  id: string;
  content: string;
};

type AgentChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  status?: "streaming" | "done" | "error";
};

type AgentStreamStatus = "idle" | "streaming";

type DocumentStage = "sources" | "outline" | "pages" | "review";

type DocumentOutlinePage = {
  id: string;
  pageNumber: number;
  title: string;
  outline: string;
};

type DocumentOutputPage = DocumentOutlinePage & {
  status: "idle" | "streaming" | "done" | "error";
  imageUrl: string;
  resultText: string;
  promptText: string;
  errorText?: string;
};

type DocumentOutputAgentResult = {
  kind?: string;
  text?: string;
  images?: string[];
};

type CanvasGeneratedImage = {
  imageUrl: string;
  label: string;
};

type AgentVoiceInput = {
  dataUrl: string;
  mimeType: "audio/wav";
  durationMs: number;
  label: string;
};

type CanvasNodeKind = "image" | "video";

type CanvasPromptSource = "manual" | "generated";

type LandscapeGenerationMode =
  | "preserve"
  | "concept"
  | "local-edit"
  | "variation"
  | "season-time"
  | "free";

type CanvasEdgeRole =
  | "site-base"
  | "main-scene"
  | "style-reference"
  | "material-reference"
  | "planting-reference"
  | "first-frame"
  | "last-frame"
  | "reference-video";

type CanvasBranchAction =
  | "scheme-image"
  | "reference"
  | "variation"
  | "detail"
  | "walkthrough";

type CanvasGenerationVersion = {
  id: string;
  kind: CanvasNodeKind;
  url: string;
  prompt: string;
  params: CanvasNodeParams;
  status: "idle" | "loading" | "submitted" | "done" | "error";
  progress: number;
  createdAt: string;
  outputText?: string;
  taskId?: string;
  label?: string;
  width?: number;
  height?: number;
  sourceImageUrl?: string;
  sourceTitle?: string;
};

type CanvasNodeParams = {
  generationMode: LandscapeGenerationMode;
  imageResolution?: string;
  imageAspectRatio?: string;
  imageCount?: string;
  aspectRatio?: string;
  videoResolution?: string;
  duration?: string;
  cameraPresetId?: string;
};

type CanvasNode = {
  id: string;
  kind: CanvasNodeKind;
  title: string;
  prompt: string;
  promptSource?: CanvasPromptSource;
  x: number;
  y: number;
  width?: number;
  height?: number;
  uploadUrl?: string;
  uploadName?: string;
  versions: CanvasGenerationVersion[];
  selectedVersionId?: string;
  params: CanvasNodeParams;
  videoPaths?: VideoPathPoint[][];
};

type CanvasConnectionDraft = {
  sourceNodeId: string;
  pointerId: number;
  startX: number;
  startY: number;
  worldX: number;
  worldY: number;
  menuX: number;
  menuY: number;
  isChoosing: boolean;
};

type CanvasUploadContextMenu = {
  x: number;
  y: number;
  worldX: number;
  worldY: number;
};

type VisualNodeKind = "image" | "prompt" | "resolution" | "generated";

type VisualCanvasNode = {
  id: string;
  kind: VisualNodeKind;
  title: string;
  subtitle?: string;
  body?: string;
  imageUrl?: string;
  sourceImageUrl?: string;
  sourceTitle?: string;
  generationStatus?: "idle" | "loading" | "done" | "error";
  x: number;
  y: number;
  width?: number;
  height?: number;
};

type CanvasEdge = {
  id: string;
  from: string;
  to: string;
  role: CanvasEdgeRole;
};

type CanvasImageReference = {
  edgeId: string;
  nodeId: string;
  targetNodeId: string;
  title: string;
  url: string;
  role: CanvasEdgeRole;
  mentionToken: string;
  mentioned: boolean;
};

type VisualCanvasEdge = {
  id: string;
  from: string;
  to: string;
};

type VisualMessage = {
  id: string;
  author: "visual" | "user";
  text: string;
};

type VisualPreviewImage = {
  imageUrl: string;
  title: string;
  subtitle?: string;
  compareImageUrl?: string;
  compareTitle?: string;
};

const AGENT_MATERIAL_TEXT_LIMIT = 40_000;
const AGENT_IMAGE_MAX_BYTES = 900_000;
const AGENT_IMAGE_MAX_SIDE = 1280;
const AGENT_IMAGE_START_QUALITY = 0.82;
const AGENT_IMAGE_MIN_QUALITY = 0.5;
const AGENT_MESSAGE_COLLAPSE_LENGTH = 1200;
const CANVAS_VIDEO_UPLOAD_MAX_MB = 20;
const CANVAS_VIDEO_UPLOAD_MAX_BYTES = CANVAS_VIDEO_UPLOAD_MAX_MB * 1024 * 1024;
const canvasZoomMin = 0.35;
const canvasZoomMax = 2.6;

function collectTextFragments(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectTextFragments(item));
  }

  const record = value as Record<string, unknown>;
  const fragments: string[] = [];

  ["delta", "text", "content", "output_text"].forEach((key) => {
    if (key in record) {
      fragments.push(...collectTextFragments(record[key]));
    }
  });

  if (Array.isArray(record.choices)) {
    record.choices.forEach((choice) => {
      if (choice && typeof choice === "object") {
        const choiceRecord = choice as Record<string, unknown>;
        fragments.push(...collectTextFragments(choiceRecord.delta));
        fragments.push(...collectTextFragments(choiceRecord.message));
      }
    });
  }

  if (record.response && typeof record.response === "object") {
    const response = record.response as Record<string, unknown>;
    fragments.push(...collectTextFragments(response.output_text));
  }

  return fragments;
}

function extractAgentStreamText(data: string) {
  if (!data || data === "[DONE]") {
    return "";
  }

  try {
    const payload = JSON.parse(data) as Record<string, unknown>;
    const eventType = typeof payload.type === "string" ? payload.type : "";

    if (eventType.includes("reasoning")) {
      return "";
    }

    if (
      eventType &&
      !eventType.includes("delta") &&
      (eventType.includes("completed") || eventType.includes("done"))
    ) {
      return "";
    }

    return collectTextFragments(payload).join("");
  } catch {
    return "";
  }
}

function getAgentStreamErrorMessage(error: unknown) {
  if (typeof error === "string") {
    return error;
  }

  if (!error || typeof error !== "object") {
    return "";
  }

  const record = error as Record<string, unknown>;
  const code = typeof record.code === "string" ? record.code : "";
  const message = typeof record.message === "string" ? record.message : "";

  if (code === "insufficient_quota") {
    return "OpenAI 项目额度不足或账单不可用，请检查当前项目的额度和 Billing 设置。";
  }

  return message || code;
}

function normalizeAgentErrorMessage(message: string, fallback: string) {
  const text = message.trim();

  if (!text) {
    return fallback;
  }

  if (/terminated|aborted|AbortError|network|fetch failed/i.test(text)) {
    return "请求连接已中断，请重新发送。";
  }

  return text;
}

function parseApiErrorText(rawText: string, fallback: string) {
  const text = rawText.trim();

  if (!text) {
    return fallback;
  }

  try {
    const payload = JSON.parse(rawText) as Record<string, unknown>;
    const payloadError = getAgentStreamErrorMessage(payload.error);

    if (payloadError) {
      return normalizeAgentErrorMessage(payloadError, fallback);
    }

    if (typeof payload.message === "string") {
      return normalizeAgentErrorMessage(payload.message, fallback);
    }

    if (typeof payload.msg === "string") {
      return normalizeAgentErrorMessage(payload.msg, fallback);
    }
  } catch {
    return normalizeAgentErrorMessage(text, fallback);
  }

  return fallback;
}

function extractAgentStreamError(data: string) {
  if (!data || data === "[DONE]") {
    return "";
  }

  try {
    const payload = JSON.parse(data) as Record<string, unknown>;
    const payloadError = getAgentStreamErrorMessage(payload.error);

    if (payloadError) {
      return payloadError;
    }

    if (payload.response && typeof payload.response === "object") {
      const response = payload.response as Record<string, unknown>;

      return getAgentStreamErrorMessage(response.error);
    }
  } catch {
    return "";
  }

  return "";
}

function shouldLetEmbeddedInputHandleWheel(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest("textarea, input, select, [contenteditable='true']"))
  );
}

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(String(reader.result ?? ""));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("语音读取失败。"));
    };
    reader.readAsDataURL(blob);
  });
}

function encodeAudioBufferAsWav(audioBuffer: AudioBuffer) {
  const frameCount = audioBuffer.length;
  const channelCount = Math.max(audioBuffer.numberOfChannels, 1);
  const sampleRate = audioBuffer.sampleRate;
  const bytesPerSample = 2;
  const wavHeaderBytes = 44;
  const dataBytes = frameCount * bytesPerSample;
  const buffer = new ArrayBuffer(wavHeaderBytes + dataBytes);
  const view = new DataView(buffer);
  const mixedSamples = new Float32Array(frameCount);

  for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
    const channelData = audioBuffer.getChannelData(channelIndex);

    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      mixedSamples[frameIndex] += channelData[frameIndex] / channelCount;
    }
  }

  function writeString(offset: number, value: string) {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 8 * bytesPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataBytes, true);

  let offset = wavHeaderBytes;

  for (let index = 0; index < mixedSamples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, mixedSamples[index]));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(offset, intSample, true);
    offset += bytesPerSample;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

async function decodeRecordingToWav(recordingBlob: Blob) {
  if (recordingBlob.type === "audio/wav") {
    return recordingBlob;
  }

  const audioContext = new AudioContext();

  try {
    const audioBuffer = await audioContext.decodeAudioData(
      await recordingBlob.arrayBuffer(),
    );

    return encodeAudioBufferAsWav(audioBuffer);
  } finally {
    void audioContext.close();
  }
}

function getVoiceRecordingErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  if (
    error.name === "NotAllowedError" ||
    /Permission denied/i.test(error.message)
  ) {
    return "浏览器没有麦克风权限，请在地址栏允许麦克风后重试。";
  }

  if (error.name === "NotFoundError") {
    return "没有检测到可用麦克风，请检查系统输入设备。";
  }

  return error.message || fallback;
}

const canvasNodeSizes: Record<CanvasNodeKind, { width: number; height: number }> =
  {
    image: { width: 292, height: 286 },
    video: { width: 316, height: 306 },
  };
const canvasConnectionTargetMargin = 28;
const canvasConnectionTargetWidth = 82;

const canvasEdgeRoleLabels: Record<CanvasEdgeRole, string> = {
  "site-base": "场地底图",
  "main-scene": "主场景",
  "style-reference": "风格参考",
  "material-reference": "材料参考",
  "planting-reference": "植物参考",
  "first-frame": "视频首帧",
  "last-frame": "视频尾帧",
  "reference-video": "视频参考",
};

const documentStages: Array<{
  id: DocumentStage;
  label: string;
  description: string;
}> = [
  { id: "sources", label: "资料确认", description: "核对项目依据" },
  { id: "outline", label: "大纲生成", description: "组织页面结构" },
  { id: "pages", label: "页面生成", description: "逐页形成图文" },
  { id: "review", label: "校对与导出", description: "复核事实边界" },
];

function getDocumentStage(
  outline: string,
  outputPages: DocumentOutputPage[],
): DocumentStage {
  if (!outline.trim()) {
    return "sources";
  }

  if (!outputPages.length) {
    return "outline";
  }

  if (
    outputPages.some(
      (page) => page.status === "idle" || page.status === "streaming",
    )
  ) {
    return "pages";
  }

  return "review";
}

function isCanvasPrimaryImageRole(role: CanvasEdgeRole) {
  return role === "site-base" || role === "main-scene";
}

function isCanvasReferenceImageRole(role: CanvasEdgeRole) {
  return (
    role === "style-reference" ||
    role === "material-reference" ||
    role === "planting-reference"
  );
}

const canvasImageResolutionOptions = ["2K", "4K", "6K", "8K"];
const landscapeGenerationModeOptions: Array<{
  value: LandscapeGenerationMode;
  label: string;
}> = [
  { value: "preserve", label: "保留结构" },
  { value: "concept", label: "概念改造" },
  { value: "local-edit", label: "局部深化" },
  { value: "variation", label: "方向变体" },
  { value: "season-time", label: "季节时间" },
  { value: "free", label: "自由生成" },
];
const canvasImageAspectOptions = [
  { value: "adaptive", label: "自适应" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "1:1", label: "1:1" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
  { value: "3:2", label: "3:2" },
  { value: "2:3", label: "2:3" },
  { value: "21:9", label: "21:9" },
];
const canvasImageCountOptions = [
  { value: "1", label: "1张" },
  { value: "2", label: "2张" },
  { value: "3", label: "3张" },
];
const canvasVideoAspectOptions = [
  { value: "adaptive", label: "自适应" },
  { value: "16:9", label: "16:9 横屏" },
  { value: "9:16", label: "9:16 竖屏" },
  { value: "1:1", label: "1:1 方形" },
  { value: "21:9", label: "21:9 超宽屏" },
  { value: "4:3", label: "4:3 标准" },
  { value: "3:4", label: "3:4 竖构图" },
];
const canvasVideoResolutionOptions = [
  { value: "480p", label: "480p" },
  { value: "720p", label: "720p" },
  { value: "1080p", label: "1080p" },
];
const canvasVideoDurationMin = 1;
const canvasVideoDurationMax = 15;

function getCanvasNodeSize(node: CanvasNode) {
  const fallback = canvasNodeSizes[node.kind];

  return {
    width: node.width ?? fallback.width,
    height: node.height ?? fallback.height,
  };
}

function getSelectedCanvasVersion(node: CanvasNode) {
  return (
    node.versions.find((version) => version.id === node.selectedVersionId) ??
    node.versions[0] ??
    null
  );
}

function getCanvasNodeMediaUrl(node: CanvasNode) {
  return getSelectedCanvasVersion(node)?.url || node.uploadUrl || "";
}

function hasCanvasImageOutput(node: CanvasNode) {
  return node.kind === "image" && Boolean(getCanvasNodeMediaUrl(node));
}

function isUploadedCanvasImageNode(node: CanvasNode) {
  const version = getSelectedCanvasVersion(node);

  return (
    node.kind === "image" &&
    version?.kind === "image" &&
    version?.prompt === "本地上传" &&
    Boolean(version.url)
  );
}

function isReferenceCanvasImageNode(node: CanvasNode, edges: CanvasEdge[]) {
  return (
    node.kind === "image" &&
    edges.some(
      (edge) => edge.from === node.id && isCanvasReferenceImageRole(edge.role),
    )
  );
}

function isMainCanvasReferenceImageNode(node: CanvasNode, edges: CanvasEdge[]) {
  return (
    node.kind === "image" &&
    edges.some(
      (edge) => edge.from === node.id && isCanvasPrimaryImageRole(edge.role),
    )
  );
}

function isReplaceableCanvasImageNode(node: CanvasNode, edges: CanvasEdge[]) {
  return (
    isReferenceCanvasImageNode(node, edges) ||
    isMainCanvasReferenceImageNode(node, edges)
  );
}

function getCanvasNodeMeasure(
  node: CanvasNode,
  version: CanvasGenerationVersion | null,
) {
  if (node.kind === "image") {
    return version?.width && version?.height
      ? `${version.width} × ${version.height}`
      : "";
  }

  const aspectRatio = node.params.aspectRatio ?? "adaptive";

  return `${aspectRatio === "adaptive" ? "自适应" : aspectRatio} · ${
    node.params.duration ?? "8s"
  }`;
}

function getCanvasNodeImageTitle(
  node: CanvasNode,
  version: CanvasGenerationVersion | null,
) {
  return version?.label || node.uploadName || node.title;
}

function isMainCanvasImageNode(node: CanvasNode) {
  return node.kind === "image" && node.id === "canvas-image-main";
}

function shouldShowCanvasNodeControlPanel(
  node: CanvasNode,
  active: boolean,
) {
  if (!active || isMainCanvasImageNode(node) || isUploadedCanvasImageNode(node)) {
    return false;
  }

  return true;
}

function getCanvasImageMentionToken(reference: Pick<CanvasImageReference, "title">) {
  return `@${reference.title}`;
}

function markCanvasImageReferencesMentioned(
  prompt: string,
  references: CanvasImageReference[],
) {
  return references.map((reference) => ({
    ...reference,
    mentionToken: getCanvasImageMentionToken(reference),
    mentioned: prompt.includes(getCanvasImageMentionToken(reference)),
  }));
}

function shouldShowCanvasMentionMenu(prompt: string) {
  if (!prompt.includes("@")) {
    return false;
  }

  const atIndex = prompt.lastIndexOf("@");
  const query = prompt.slice(atIndex + 1);

  return !/[\s，。,.!?！？]/.test(query);
}

function escapeCanvasPromptToken(token: string) {
  return token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderCanvasPromptHighlights(prompt: string, mentionOptions: CanvasImageReference[]) {
  const mentionTokens = [...new Set(
    mentionOptions
      .map((option) => getCanvasImageMentionToken(option))
      .filter(Boolean),
  )].sort((left, right) => right.length - left.length);

  if (!prompt || !mentionTokens.length) {
    return prompt;
  }

  const mentionPattern = new RegExp(
    mentionTokens.map(escapeCanvasPromptToken).join("|"),
    "g",
  );
  const highlighted: ReactNode[] = [];
  let cursor = 0;

  for (const match of prompt.matchAll(mentionPattern)) {
    const index = match.index ?? 0;
    const token = match[0];

    if (index > cursor) {
      highlighted.push(prompt.slice(cursor, index));
    }

    highlighted.push(
      <span className="canvas-node-prompt-mention-token" key={`${token}-${index}`}>
        {token}
      </span>,
    );
    cursor = index + token.length;
  }

  if (cursor < prompt.length) {
    highlighted.push(prompt.slice(cursor));
  }

  return highlighted.length ? highlighted : prompt;
}

function canConnectCanvasNodes(source: CanvasNode, target: CanvasNode) {
  if (source.id === target.id) {
    return false;
  }

  if (source.kind === "image" && target.kind === "image") {
    return hasCanvasImageOutput(source) && !isUploadedCanvasImageNode(target);
  }

  if (source.kind === "video" && target.kind === "image") {
    return false;
  }

  return true;
}

function getCanvasImageEdgeRole(
  source: CanvasNode,
  target: CanvasNode,
  existingEdges: CanvasEdge[],
) {
  if (isReferenceCanvasImageNode(source, existingEdges)) {
    return "style-reference";
  }

  const hasMainImage = existingEdges.some(
    (edge) => edge.to === target.id && isCanvasPrimaryImageRole(edge.role),
  );

  if (hasMainImage) {
    return "style-reference";
  }

  return isUploadedCanvasImageNode(source) ? "site-base" : "main-scene";
}

function createCanvasConnectionPreviewNode(kind: CanvasNodeKind): CanvasNode {
  return {
    id: `__draft-${kind}`,
    kind,
    title: "",
    prompt: "",
    x: 0,
    y: 0,
    versions: [],
    params:
      kind === "image"
        ? {
            generationMode: "free",
            imageResolution: "4K",
            imageAspectRatio: "adaptive",
            imageCount: "1",
          }
        : {
            generationMode: "preserve",
            aspectRatio: "adaptive",
            videoResolution: "1080p",
            duration: "8s",
          },
  };
}

function getDefaultCanvasEdgeRole(
  source: CanvasNode,
  target: CanvasNode,
  existingEdges: CanvasEdge[],
) {
  if (source.kind === "image" && target.kind === "image") {
    return getCanvasImageEdgeRole(source, target, existingEdges);
  }

  if (source.kind === "image" && target.kind === "video") {
    const hasFirstFrame = existingEdges.some(
      (edge) => edge.to === target.id && edge.role === "first-frame",
    );

    if (hasFirstFrame) {
      return "style-reference";
    }

    return "first-frame";
  }

  if (source.kind === "video" && target.kind === "video") {
    return "reference-video";
  }

  return "style-reference";
}

const initialCanvasNodes: CanvasNode[] = [];

const initialCanvasEdges: CanvasEdge[] = [];

const visualNodeSizes: Record<VisualNodeKind, { width: number; height: number }> =
  {
    image: { width: 240, height: 212 },
    prompt: { width: 290, height: 180 },
    resolution: { width: 190, height: 128 },
    generated: { width: 260, height: 218 },
  };

function getVisualNodeSize(node: VisualCanvasNode) {
  const fallback = visualNodeSizes[node.kind];

  return {
    width: node.width ?? fallback.width,
    height: node.height ?? fallback.height,
  };
}

const initialVisualNodes: VisualCanvasNode[] = [
  {
    id: "visual-image-main",
    kind: "image",
    title: "图片",
    subtitle: "未上传",
    x: 0,
    y: 0,
  },
  {
    id: "visual-prompt-main",
    kind: "prompt",
    title: "提示词",
    body: "",
    x: 330,
    y: 0,
  },
  {
    id: "visual-resolution-main",
    kind: "resolution",
    title: "分辨率",
    body: "4K",
    x: 680,
    y: 26,
  },
  {
    id: "visual-generated-main",
    kind: "generated",
    title: "图片生成",
    x: 930,
    y: 0,
  },
];

const initialVisualEdges: VisualCanvasEdge[] = [
  { id: "edge-main-1", from: "visual-image-main", to: "visual-prompt-main" },
  {
    id: "edge-main-2",
    from: "visual-prompt-main",
    to: "visual-resolution-main",
  },
  {
    id: "edge-main-3",
    from: "visual-resolution-main",
    to: "visual-generated-main",
  },
];

const MAX_AVATAR_IMAGE_SIZE = 256;

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getCanvasDotOpacity(zoom: number) {
  return clamp((zoom - canvasZoomMin) / (1 - canvasZoomMin), 0, 1);
}

function parseCanvasDurationSeconds(duration?: string) {
  const parsed = Number.parseInt(duration?.replace(/[^\d]/g, "") ?? "", 10);

  return Number.isFinite(parsed)
    ? clamp(parsed, canvasVideoDurationMin, canvasVideoDurationMax)
    : 8;
}

function getCanvasDurationSecondsFromPointer(
  input: HTMLInputElement,
  clientX: number,
) {
  const rect = input.getBoundingClientRect();

  if (!rect.width) {
    return parseCanvasDurationSeconds(input.value);
  }

  const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);

  return Math.round(
    canvasVideoDurationMin +
      ratio * (canvasVideoDurationMax - canvasVideoDurationMin),
  );
}

function formatFileSize(bytes: number) {
  if (bytes === 0) {
    return "0 Bytes";
  }

  const unit = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(unit)),
    sizes.length - 1,
  );

  return `${Number((bytes / unit ** index).toFixed(2))} ${sizes[index]}`;
}

function isDocumentPageHeading(line: string) {
  return /^(?:#{1,6}\s*)?(?:[-*]\s*)?(?:第\s*[0-9一二三四五六七八九十百]+\s*页|P\s*\d+|Page\s*\d+|页面\s*\d+)/i.test(
    line.trim(),
  );
}

function getDocumentPageTitle(line: string, fallback: string) {
  const cleaned = line
    .replace(/^(?:#{1,6}\s*)?(?:[-*]\s*)?/, "")
    .replace(/^(?:第\s*[0-9一二三四五六七八九十百]+\s*页|P\s*\d+|Page\s*\d+|页面\s*\d+)\s*[：:.\-、]?\s*/i, "")
    .trim();

  return cleaned || fallback;
}

function splitDocumentOutlinePages(outline: string) {
  const normalized = outline.trim();

  if (!normalized) {
    return [];
  }

  const introLines: string[] = [];
  const rawPages: Array<{ title: string; lines: string[] }> = [];
  let currentPage: { title: string; lines: string[] } | null = null;

  const pushCurrentPage = () => {
    if (currentPage && currentPage.lines.join("\n").trim()) {
      rawPages.push(currentPage);
    }
  };

  normalized.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();

    if (trimmed && isDocumentPageHeading(trimmed)) {
      pushCurrentPage();
      currentPage = {
        title: getDocumentPageTitle(trimmed, `第 ${rawPages.length + 1} 页`),
        lines: [line],
      };
      return;
    }

    if (currentPage) {
      currentPage.lines.push(line);
      return;
    }

    introLines.push(line);
  });

  pushCurrentPage();

  if (!rawPages.length) {
    return [
      {
        id: "outline-page-1",
        pageNumber: 1,
        title: "第 1 页",
        outline: normalized,
      },
    ];
  }

  const introText = introLines.join("\n").trim();

  return rawPages.map((page, index) => ({
    id: `outline-page-${index + 1}`,
    pageNumber: index + 1,
    title: page.title,
    outline: [introText, page.lines.join("\n").trim()]
      .filter(Boolean)
      .join("\n\n"),
  }));
}

function buildDocumentPageImagePrompt(
  page: DocumentOutlinePage,
  totalPages: number,
  project: Project,
) {
  return [
    "你是 Zerlum image2 方案图片生成 Agent。",
    `当前项目：${project.name}。项目类型：${project.type}。设计阶段：${project.designStage}。`,
    `只生成第 ${page.pageNumber}/${totalPages} 页图片方案。`,
    "当前任务是分批单页生成，不要把其他页合并到这一张图里。",
    "输出一张完整单页方案版式图片，画面中要包含本页标题、关键内容、主要视觉元素、文字层级和留白关系。",
    "严格按大纲中的“页面类型”设计本页。",
    "如果本页不是效果图页，不要把画布生成图铺满当作主视觉。",
    "只有大纲明确写成效果图页、重点空间渲染页或前后对比页时，才把效果图作为主视觉。",
    "非效果图页优先使用场地分析、空间结构图、游线图、植物板、材料板、节点分析或运营时间线等专业景观表达。",
    "可以少量引用画布生成图作为局部裁切、氛围证据或辅助图，不要机械铺满整页。",
    "严格遵循本页大纲里的排版风格、字体要求、内容位置和图文层级。",
    "明确区分项目事实、设计判断与待复核项；无法由资料确认的内容必须标注待复核。",
    "不要输出多页拼图，不要生成无关页面，不要添加虚构项目事实。",
    "",
    "【本页大纲】",
    page.outline,
  ].join("\n");
}

function parseDocumentOutputPageResult(rawText: string) {
  try {
    const payload = JSON.parse(rawText) as DocumentOutputAgentResult;

    if (payload.kind === "document-output-page" || payload.images || payload.text) {
      return {
        imageUrl: payload.images?.[0] ?? "",
        resultText: payload.text ?? "",
        promptText: "",
      };
    }
  } catch {
    // The proxy normally returns JSON for image2, but keep plain text as a fallback.
  }

  return {
    imageUrl: "",
    resultText: rawText,
    promptText: "",
  };
}

function formatDocumentPageError(pageError: unknown) {
  const rawMessage =
    pageError instanceof Error ? pageError.message : String(pageError || "");

  try {
    const payload = JSON.parse(rawMessage) as { error?: string };

    if (payload.error) {
      return payload.error;
    }
  } catch {
    // Keep the original message when the upstream did not return JSON.
  }

  return rawMessage || "本页生成失败，已跳过并继续后续页面。";
}

function formatChineseFileSize(bytes: number) {
  if (bytes === 0) {
    return "0 字节";
  }

  const unit = 1024;
  const sizes = ["字节", "千字节", "兆字节", "吉字节"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(unit)),
    sizes.length - 1,
  );

  return `${Number((bytes / unit ** index).toFixed(2))} ${sizes[index]}`;
}

function formatChineseDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const pad = (part: number) => String(part).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

function getMaterialExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function formatUploadTime(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getTimeOfDayGreeting(date = new Date()) {
  const hour = date.getHours();

  if (hour >= 5 && hour < 11) {
    return "早上好";
  }

  if (hour >= 11 && hour < 13) {
    return "中午好";
  }

  if (hour >= 13 && hour < 18) {
    return "下午好";
  }

  return "晚上好";
}

function createProject(draft: ProjectDraft): Project {
  const project = createLandscapeProject();

  return {
    ...project,
    name: draft.name.trim() || project.name,
    type: draft.type.trim() || project.type,
    location: draft.location?.trim() || project.location,
    designStage: draft.designStage || project.designStage,
    client: draft.client.trim(),
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("无法读取头像文件。"));
      }
    });
    reader.addEventListener("error", () => {
      reject(reader.error ?? new Error("头像文件读取失败。"));
    });
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    });
    reader.addEventListener("error", () => {
      reject(reader.error ?? new Error("文件文本读取失败。"));
    });
    reader.readAsText(file);
  });
}

function isTextLikeProjectMaterial(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  return (
    /^text\//i.test(file.type) ||
    [
      "csv",
      "json",
      "md",
      "markdown",
      "txt",
      "xml",
      "html",
      "htm",
      "yaml",
      "yml",
    ].includes(extension)
  );
}

async function readProjectMaterialSource(file: File) {
  const sourceDataUrl = await readFileAsDataUrl(file);
  const sourceMimeType = file.type || "application/octet-stream";
  let sourceText = "";

  if (isTextLikeProjectMaterial(file)) {
    try {
      sourceText = (await readFileAsText(file)).slice(0, 120_000);
    } catch {
      sourceText = "";
    }
  }

  return {
    sourceDataUrl,
    sourceText,
    sourceMimeType,
  };
}

function stripProjectMaterialSourcesForPersistence(
  projectMaterials: Record<string, ProjectMaterial[]>,
) {
  return Object.fromEntries(
    Object.entries(projectMaterials).map(([projectId, materials]) => [
      projectId,
      materials.map(
        ({
          sourceDataUrl,
          sourceText,
          sourceMimeType,
          ...material
        }) => material,
      ),
    ]),
  );
}

function prepareAgentMaterialsForChat(materials: ProjectMaterial[]) {
  return materials.map(
    ({
      sourceDataUrl,
      sourceText,
      sourceMimeType,
      ...material
    }) => ({
      ...material,
      sourceMimeType,
      sourceText: sourceText?.slice(0, AGENT_MATERIAL_TEXT_LIMIT),
    }),
  );
}

function loadImageSource(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("头像图片加载失败。")));
    image.src = src;
  });
}

function estimateDataUrlBytes(value: string) {
  return new TextEncoder().encode(value).length;
}

function shouldInlineImageUrlForAgentApi(imageUrl: string) {
  if (!/^https?:\/\//i.test(imageUrl) || typeof window === "undefined") {
    return false;
  }

  try {
    const url = new URL(imageUrl, window.location.href);

    return url.origin === window.location.origin;
  } catch {
    return false;
  }
}

async function imageUrlToDataUrl(imageUrl: string) {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error("图片读取失败。");
  }

  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function compressImageForAgentApi(imageUrl: string) {
  if (!imageUrl.startsWith("data:image/")) {
    return imageUrl;
  }

  if (estimateDataUrlBytes(imageUrl) <= AGENT_IMAGE_MAX_BYTES) {
    return imageUrl;
  }

  const image = await loadImageSource(imageUrl);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const maxSide = Math.max(sourceWidth, sourceHeight);
  const scale =
    maxSide > AGENT_IMAGE_MAX_SIDE ? AGENT_IMAGE_MAX_SIDE / maxSide : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));

  const context = canvas.getContext("2d");

  if (!context) {
    return imageUrl;
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let quality = AGENT_IMAGE_START_QUALITY;
  let output = canvas.toDataURL("image/jpeg", quality);

  while (
    estimateDataUrlBytes(output) > AGENT_IMAGE_MAX_BYTES &&
    quality > AGENT_IMAGE_MIN_QUALITY
  ) {
    quality = Math.max(AGENT_IMAGE_MIN_QUALITY, quality - 0.1);
    output = canvas.toDataURL("image/jpeg", quality);
  }

  return output;
}

async function resolveImageUrlForAgentApi(imageUrl?: string) {
  if (!imageUrl) {
    return "";
  }

  if (
    /^https?:\/\//i.test(imageUrl) &&
    !shouldInlineImageUrlForAgentApi(imageUrl)
  ) {
    return imageUrl;
  }

  const dataUrl = imageUrl.startsWith("blob:") || shouldInlineImageUrlForAgentApi(imageUrl)
    ? await imageUrlToDataUrl(imageUrl)
    : imageUrl;

  return compressImageForAgentApi(dataUrl);
}

async function resolveMediaUrlForAgentApi(mediaUrl?: string) {
  if (!mediaUrl) {
    return "";
  }

  if (/^https?:\/\//i.test(mediaUrl)) {
    return mediaUrl;
  }

  return mediaUrl.startsWith("blob:") ? imageUrlToDataUrl(mediaUrl) : mediaUrl;
}

async function readAvatarFileAsDataUrl(file: File) {
  const originalDataUrl = await readFileAsDataUrl(file);

  try {
    const image = await loadImageSource(originalDataUrl);
    const longestSide = Math.max(image.naturalWidth, image.naturalHeight);

    if (!longestSide) {
      return originalDataUrl;
    }

    const scale = Math.min(1, MAX_AVATAR_IMAGE_SIZE / longestSide);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      return originalDataUrl;
    }

    context.drawImage(image, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return originalDataUrl;
  }
}

function App() {
  const [persisted] = useState(readWorkspaceState);
  const [theme, setTheme] = useState<ThemeMode>(persisted.theme);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [activeView, setActiveView] = useState<WorkspaceView>(
    persisted.activeView,
  );
  const [session, setSession] = useState<Session | null>(
    persisted.session,
  );
  const [projects, setProjects] = useState<Project[]>(persisted.projects);
  const [projectMaterials, setProjectMaterials] = useState<
    Record<string, ProjectMaterial[]>
  >({});
  const [activeProjectId, setActiveProjectId] = useState(persisted.activeProjectId);
  const [persistenceMessage, setPersistenceMessage] = useState("");
  const [authForm, setAuthForm] = useState({
    username: "",
    phone: "",
    email: "",
    password: "",
  });
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectDraft, setNewProjectDraft] = useState<ProjectDraft>({
    name: "",
    type: "",
    client: "",
  });
  const [projectEditOpen, setProjectEditOpen] = useState(false);
  const [projectEditDraft, setProjectEditDraft] = useState<ProjectDraft>({
    name: "",
    type: "",
    client: "",
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [agentMessages, setAgentMessages] = useState<AgentChatMessage[]>([]);
  const [agentStatus, setAgentStatus] = useState<AgentStreamStatus>("idle");

  const activeProject =
    projects.find((project) => project.id === activeProjectId) ?? projects[0];

  useEffect(() => {
    if (!activeProject) {
      return;
    }

    const result = writeWorkspaceState({
      theme,
      activeView,
      session,
      projects,
      activeProjectId: activeProject.id,
    });
    setPersistenceMessage(result.ok ? "" : result.message);
  }, [
    activeProject,
    activeProjectId,
    activeView,
    projects,
    session,
    theme,
  ]);

  function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = authForm.email.trim();
    const displayName =
      authForm.username.trim() || email.split("@")[0] || "Zerlum 用户";
    setSession({
      displayName,
      email,
    });
    if (projects.length === 0) {
      const project = createLandscapeProject();
      setProjects([project]);
      setActiveProjectId(project.id);
    }
    setActiveView("agent");
    setAuthOpen(false);
  }

  function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextProject = createProject(newProjectDraft);
    setProjects((current) => [nextProject, ...current]);
    setProjectMaterials((current) => ({
      ...current,
      [nextProject.id]: [],
    }));
    setActiveProjectId(nextProject.id);
    setNewProjectOpen(false);
    setNewProjectDraft({
      name: "",
      type: "",
      client: "",
    });
  }

  function openProjectEdit() {
    if (!activeProject) {
      return;
    }

    setProjectEditDraft({
      name: activeProject.name,
      type: activeProject.type,
      location: activeProject.location,
      designStage: activeProject.designStage,
      client: activeProject.client,
    });
    setProjectEditOpen(true);
  }

  function handleUpdateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeProject) {
      return;
    }

    const updatedProject = {
      name: projectEditDraft.name.trim() || "未命名景观项目",
      type: projectEditDraft.type.trim() || "其他",
      location: projectEditDraft.location?.trim() || "",
      designStage: projectEditDraft.designStage || "概念方案",
      client: projectEditDraft.client.trim(),
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    setProjects((current) =>
      current.map((project) =>
        project.id === activeProject.id
          ? { ...project, ...updatedProject }
          : project,
      ),
    );
    setProjectEditOpen(false);
  }

  function handleProjectContextUpdate(update: Partial<Project>) {
    if (!activeProject) {
      return;
    }

    setProjects((current) =>
      current.map((project) =>
        project.id === activeProject.id
          ? {
              ...project,
              ...update,
              brief: update.brief
                ? { ...project.brief, ...update.brief }
                : project.brief,
              updatedAt: new Date().toISOString().slice(0, 10),
            }
          : project,
      ),
    );
  }

  function handleCurrentProfileUpdate(profile: {
    name: string;
    avatarLabel: string;
    avatarUrl?: string;
  }) {
    const nextName = profile.name.trim() || "Zerlum 用户";
    setSession((current) =>
      current
        ? {
            ...current,
            displayName: nextName,
            avatarUrl: profile.avatarUrl,
          }
        : current,
    );
  }

  async function handleProjectMaterialsUpload(
    projectId: string,
    fileList: FileList | File[],
  ) {
    const files = Array.from(fileList);

    if (files.length === 0) {
      return;
    }

    const uploadedAt = formatUploadTime();
    const nextMaterials = await Promise.all(
      files.map(async (file) => {
        const source = await readProjectMaterialSource(file);

        return {
          id: createId("material"),
          name: file.name,
          size: file.size,
          type:
            file.type ||
            file.name.split(".").pop()?.toUpperCase() ||
            "application/octet-stream",
          uploadedAt,
          ...source,
        };
      }),
    );

    setProjectMaterials((current) => ({
      ...current,
      [projectId]: [...(current[projectId] ?? []), ...nextMaterials],
    }));
    setProjects((current) =>
      current.map((project) =>
        project.id === projectId
          ? { ...project, updatedAt: uploadedAt }
          : project,
      ),
    );
  }

  function handleProjectMaterialDelete(materialId: string) {
    if (!activeProject) {
      return;
    }

    const updatedAt = formatUploadTime();

    setProjectMaterials((current) => ({
      ...current,
      [activeProject.id]: (current[activeProject.id] ?? []).filter(
        (material) => material.id !== materialId,
      ),
    }));
    setProjects((current) =>
      current.map((project) =>
        project.id === activeProject.id
          ? { ...project, updatedAt }
          : project,
      ),
    );
  }

  async function handleAgentSubmit(
    voiceInput?: AgentVoiceInput,
    voiceInstruction = "",
  ) {
    const typedMessage = chatInput.trim();
    const instruction = voiceInstruction.trim();
    const message = voiceInput ? instruction || "语音输入" : typedMessage;

    if (
      (!message && !voiceInput) ||
      agentStatus === "streaming" ||
      !activeProject
    ) {
      return;
    }

    const requestMessage = voiceInput
      ? [
          "请识别这段麦克风语音，并以 Zerlum Agent 身份回答语音里的请求。",
          instruction ? `用户补充文字：${instruction}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      : message;
    const displayMessage = voiceInput
      ? instruction
        ? `语音输入：${instruction}`
        : "语音输入"
      : message;
    const userMessage: AgentChatMessage = {
      id: createId("agent-user"),
      role: "user",
      text: displayMessage,
      status: "done",
    };
    const assistantId = createId("agent-assistant");
    const assistantMessage: AgentChatMessage = {
      id: assistantId,
      role: "assistant",
      text: "",
      status: "streaming",
    };

    setAgentMessages((current) => [...current, userMessage, assistantMessage]);
    setChatInput("");
    setAgentStatus("streaming");

    try {
      const response = await fetch("/api/zerlum-agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          view: "agent",
          message: requestMessage,
          audio: voiceInput,
          project: {
            name: activeProject.name,
            type: activeProject.type,
            client: activeProject.client,
          },
          materials: prepareAgentMaterialsForChat(
            projectMaterials[activeProject.id] ?? [],
          ),
        }),
      });

      if (!response.ok || !response.body) {
        const fallback = await response.text();
        throw new Error(parseApiErrorText(fallback, "Zerlum Agent 暂时无法响应。"));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";
      let streamError = "";

      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split(/\n\n|\r\n\r\n/);
        buffer = events.pop() ?? "";

        events.forEach((event) => {
          event
            .split(/\r?\n/)
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.replace(/^data:\s?/, "").trim())
            .forEach((data) => {
              const errorText = extractAgentStreamError(data);

              if (errorText) {
                streamError = errorText;
                return;
              }

              const delta = extractAgentStreamText(data);

              if (!delta) {
                return;
              }

              assistantText += delta;
              setAgentMessages((current) =>
                current.map((item) =>
                  item.id === assistantId
                    ? { ...item, text: assistantText, status: "streaming" }
                    : item,
                ),
              );
            });
        });
      }

      if (buffer.trim()) {
        buffer
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.replace(/^data:\s?/, "").trim())
          .forEach((data) => {
            const errorText = extractAgentStreamError(data);

            if (errorText) {
              streamError = errorText;
              return;
            }

            const delta = extractAgentStreamText(data);

            if (delta) {
              assistantText += delta;
            }
          });
      }

      if (streamError) {
        throw new Error(
          normalizeAgentErrorMessage(streamError, "Zerlum Agent 暂时无法响应。"),
        );
      }

      setAgentMessages((current) =>
        current.map((item) =>
          item.id === assistantId
            ? {
                ...item,
                text: assistantText || "Zerlum Agent 没有返回有效内容。",
                status: assistantText ? "done" : "error",
              }
            : item,
        ),
      );
    } catch (error) {
      const message = normalizeAgentErrorMessage(
        error instanceof Error ? error.message : "",
        "Zerlum Agent 连接失败，请稍后再试。",
      );

      setAgentMessages((current) =>
        current.map((item) =>
          item.id === assistantId
            ? {
                ...item,
                text: message,
                status: "error",
              }
            : item,
        ),
      );
    } finally {
      setAgentStatus("idle");
    }
  }

  function handleAgentVoiceSubmit(
    voiceInput: AgentVoiceInput,
    textInstruction: string,
  ) {
    void handleAgentSubmit(voiceInput, textInstruction);
  }

  const appClass = `app-shell ${theme === "dark" ? "theme-dark" : "theme-light"}`;
  const shouldShowWelcome = !session || !activeProject;

  return (
    <main className={appClass}>
      {shouldShowWelcome ? (
        <WelcomeScreen
          actionLabel="进入 Zerlum"
          onOpenLogin={() => {
            if (session && activeProject) {
              return;
            }

            setAuthMode("login");
            setAuthOpen(true);
          }}
        />
      ) : (
        <Workspace
          activeView={activeView}
          session={session}
          project={activeProject}
          projects={projects}
          projectMaterials={projectMaterials[activeProject.id] ?? []}
          theme={theme}
          persistenceMessage={persistenceMessage}
          chatInput={chatInput}
          agentMessages={agentMessages}
          agentStatus={agentStatus}
          onViewChange={setActiveView}
          onProjectChange={setActiveProjectId}
          onProjectMaterialsUpload={(files) =>
            handleProjectMaterialsUpload(activeProject.id, files)
          }
          onProjectMaterialDelete={handleProjectMaterialDelete}
          onProjectUpdate={handleProjectContextUpdate}
          onOpenProjectEdit={openProjectEdit}
          onOpenNewProject={() => setNewProjectOpen(true)}
          onThemeToggle={() =>
            setTheme((current) => (current === "dark" ? "light" : "dark"))
          }
          onOpenProfile={() => setProfileOpen(true)}
          onChatInput={setChatInput}
          onAgentSubmit={handleAgentSubmit}
          handleAgentVoiceSubmit={handleAgentVoiceSubmit}
        />
      )}

      {authOpen && (
        <AuthDialog
          authMode={authMode}
          authForm={authForm}
          onModeChange={setAuthMode}
          onFormChange={setAuthForm}
          onClose={() => setAuthOpen(false)}
          onSubmit={handleAuthSubmit}
        />
      )}

      {newProjectOpen && (
        <ModalFrame title="新建项目" onClose={() => setNewProjectOpen(false)}>
          <form className="form-stack" onSubmit={handleCreateProject}>
            <LabelledInput
              label="项目名称"
              value={newProjectDraft.name}
              onChange={(name) =>
                setNewProjectDraft({ ...newProjectDraft, name })
              }
            />
            <LabelledInput
              label="项目类型"
              value={newProjectDraft.type}
              onChange={(type) =>
                setNewProjectDraft({ ...newProjectDraft, type })
              }
            />
            <LabelledInput
              label="项目地点"
              value={newProjectDraft.location ?? ""}
              onChange={(location) =>
                setNewProjectDraft({ ...newProjectDraft, location })
              }
            />
            <label className="labelled-input">
              <span>设计阶段</span>
              <DropdownSelect
                value={newProjectDraft.designStage ?? "概念方案"}
                onValueChange={(designStage) =>
                  setNewProjectDraft({
                    ...newProjectDraft,
                    designStage: designStage as DesignStage,
                  })
                }
                ariaLabel="选择新项目设计阶段"
                options={designStages.map((stage) => ({ value: stage, label: stage }))}
              />
            </label>
            <LabelledInput
              label="客户或备注"
              value={newProjectDraft.client}
              onChange={(client) =>
                setNewProjectDraft({ ...newProjectDraft, client })
              }
            />
            <button className="primary-button full" type="submit">
              <PlusCircle size={18} weight="bold" />
              创建项目
            </button>
          </form>
        </ModalFrame>
      )}

      {projectEditOpen && activeProject && (
        <ModalFrame title="编辑项目" onClose={() => setProjectEditOpen(false)}>
          <form className="form-stack" onSubmit={handleUpdateProject}>
            <LabelledInput
              label="项目名称"
              value={projectEditDraft.name}
              onChange={(name) =>
                setProjectEditDraft({ ...projectEditDraft, name })
              }
            />
            <LabelledInput
              label="项目类型"
              value={projectEditDraft.type}
              onChange={(type) =>
                setProjectEditDraft({ ...projectEditDraft, type })
              }
            />
            <LabelledInput
              label="项目地点"
              value={projectEditDraft.location ?? ""}
              onChange={(location) =>
                setProjectEditDraft({ ...projectEditDraft, location })
              }
            />
            <label className="labelled-input">
              <span>设计阶段</span>
              <DropdownSelect
                value={projectEditDraft.designStage ?? "概念方案"}
                onValueChange={(designStage) =>
                  setProjectEditDraft({
                    ...projectEditDraft,
                    designStage: designStage as DesignStage,
                  })
                }
                ariaLabel="选择项目设计阶段"
                options={designStages.map((stage) => ({ value: stage, label: stage }))}
              />
            </label>
            <LabelledInput
              label="客户或备注"
              value={projectEditDraft.client}
              onChange={(client) =>
                setProjectEditDraft({ ...projectEditDraft, client })
              }
            />
            <button className="primary-button full" type="submit">
              <ClipboardText size={18} weight="bold" />
              保存项目信息
            </button>
          </form>
        </ModalFrame>
      )}

      {profileOpen && session && (
        <UserProfileDialog
          session={session}
          onProfileUpdate={handleCurrentProfileUpdate}
          onClose={() => setProfileOpen(false)}
        />
      )}
    </main>
  );
}

function UserProfileDialog({
  session,
  onProfileUpdate,
  onClose,
}: {
  session: Session;
  onProfileUpdate: (profile: {
    name: string;
    avatarLabel: string;
    avatarUrl?: string;
  }) => void;
  onClose: () => void;
}) {
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [profileDetailDraft, setProfileDetailDraft] = useState({
    name: session.displayName,
    avatarLabel: "账户头像",
    avatarUrl: session.avatarUrl,
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onProfileUpdate(profileDetailDraft);
    onClose();
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const avatarUrl = await readAvatarFileAsDataUrl(file);
      setProfileDetailDraft((current) => ({
        ...current,
        avatarLabel: file.name,
        avatarUrl,
      }));
    } catch (error) {
      console.warn("头像读取失败。", error);
    }
    event.target.value = "";
  }

  return (
    <ModalFrame title="用户详细信息" onClose={onClose}>
      <form className="profile-detail" onSubmit={handleSubmit}>
        <div className="profile-detail-hero">
          <button
            className="profile-avatar-edit"
            type="button"
            aria-label="更换头像"
            title="更换头像"
            onClick={() => avatarInputRef.current?.click()}
          >
            {profileDetailDraft.avatarUrl ? (
              <img src={profileDetailDraft.avatarUrl} alt="" />
            ) : (
              <UserCircle size={50} weight="bold" />
            )}
            <span className="profile-avatar-edit-badge" aria-hidden="true">
              <UploadSimple size={13} weight="bold" />
            </span>
          </button>
          <input
            ref={avatarInputRef}
            className="profile-avatar-input"
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
          />
          <div>
            <div className="profile-name-row">
              {isEditingName ? (
                <input
                  className="profile-name-input"
                  value={profileDetailDraft.name}
                  autoFocus
                  aria-label="编辑姓名"
                  onChange={(event) =>
                    setProfileDetailDraft({
                      ...profileDetailDraft,
                      name: event.target.value,
                    })
                  }
                />
              ) : (
                <h3>{profileDetailDraft.name.trim() || "Zerlum 用户"}</h3>
              )}
              <button
                className="profile-name-edit"
                type="button"
                onClick={() => setIsEditingName((current) => !current)}
              >
                {isEditingName ? "完成" : "编辑名称"}
              </button>
            </div>
            <p>个人景观设计工作台</p>
          </div>
        </div>

        <div className="profile-detail-grid">
          <div>
            <span>邮箱</span>
            <strong>{session.email || "未填写"}</strong>
          </div>
          <div>
            <span>会话方式</span>
            <strong>本地单人会话</strong>
          </div>
        </div>

        <button className="primary-button full" type="submit">
          <UserCircle size={18} weight="bold" />
          保存用户信息
        </button>
      </form>
    </ModalFrame>
  );
}

function Workspace({
  activeView,
  session,
  project,
  projects,
  projectMaterials,
  theme,
  persistenceMessage,
  chatInput,
  agentMessages,
  agentStatus,
  onViewChange,
  onProjectChange,
  onProjectMaterialsUpload,
  onProjectMaterialDelete,
  onProjectUpdate,
  onOpenProjectEdit,
  onOpenNewProject,
  onThemeToggle,
  onOpenProfile,
  onChatInput,
  onAgentSubmit,
  handleAgentVoiceSubmit,
}: {
  activeView: WorkspaceView;
  session: Session;
  project: Project;
  projects: Project[];
  projectMaterials: ProjectMaterial[];
  theme: ThemeMode;
  persistenceMessage: string;
  chatInput: string;
  agentMessages: AgentChatMessage[];
  agentStatus: AgentStreamStatus;
  onViewChange: (view: WorkspaceView) => void;
  onProjectChange: (projectId: string) => void;
  onProjectMaterialsUpload: (files: FileList | File[]) => void;
  onProjectMaterialDelete: (materialId: string) => void;
  onProjectUpdate: (update: Partial<Project>) => void;
  onOpenProjectEdit: () => void;
  onOpenNewProject: () => void;
  onThemeToggle: () => void;
  onOpenProfile: () => void;
  onChatInput: (value: string) => void;
  onAgentSubmit: () => void;
  handleAgentVoiceSubmit: (
    voiceInput: AgentVoiceInput,
    textInstruction: string,
  ) => void;
}) {
  const showViewHeading = false;
  const showProjectActions = showViewHeading;
  const [visualInput, setVisualInput] = useState("");
  const [visualMessages, setVisualMessages] = useState<VisualMessage[]>([]);
  const [canvasGeneratedImages, setCanvasGeneratedImages] = useState<
    CanvasGeneratedImage[]
  >([]);
  const [documentInput, setDocumentInput] = useState("");
  const [documentMessages, setDocumentMessages] = useState<AgentChatMessage[]>([]);
  const [documentOutline, setDocumentOutline] = useState("");
  const [documentOutput, setDocumentOutput] = useState("");
  const [documentOutputPages, setDocumentOutputPages] = useState<DocumentOutputPage[]>([]);
  const [documentStatus, setDocumentStatus] =
    useState<AgentStreamStatus>("idle");
  const [documentOutputStatus, setDocumentOutputStatus] =
    useState<AgentStreamStatus>("idle");

  return (
    <section className="workspace">
      <WorkspaceHeader
        activeView={activeView}
        session={session}
        project={project}
        projects={projects}
        theme={theme}
        onViewChange={onViewChange}
        onProjectChange={onProjectChange}
        onOpenProjectEdit={onOpenProjectEdit}
        onOpenNewProject={onOpenNewProject}
        onThemeToggle={onThemeToggle}
        onOpenProfile={onOpenProfile}
      />
      {persistenceMessage && (
        <div className="workspace-persistence-status" role="status">
          {persistenceMessage}
        </div>
      )}

      <section
        className={`workspace-body ${
          showViewHeading ? "with-view-heading" : "without-view-heading"
        } ${activeView === "canvas" ? "is-canvas-view" : ""
        }`}
      >
        {showViewHeading && (
          <div className="view-heading">
            <div>
              <h1>{project.name}</h1>
            </div>
            {showProjectActions && (
              <div className="project-actions">
                <div className="project-switcher">
                  <span>当前项目</span>
                  <DropdownSelect
                    className="project-dropdown"
                    value={project.id}
                    onValueChange={onProjectChange}
                    ariaLabel="切换项目"
                    options={projects.map((item) => ({
                      value: item.id,
                      label: item.name,
                    }))}
                  />
                </div>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={onOpenProjectEdit}
                >
                  <ClipboardText size={17} weight="bold" />
                  编辑项目
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={onOpenNewProject}
                >
                  <PlusCircle size={17} weight="bold" />
                  新项目
                </button>
                <div className="project-chip">
                  <SealCheck size={17} weight="bold" />
                  {project.designStage}
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === "agent" && (
          <AgentWorkspaceContent
            project={project}
            materials={projectMaterials}
            userName={session.displayName}
            userAvatarUrl={session.avatarUrl}
            chatInput={chatInput}
            agentMessages={agentMessages}
            agentStatus={agentStatus}
            onChatInput={onChatInput}
            onAgentSubmit={onAgentSubmit}
            onVoiceSubmit={handleAgentVoiceSubmit}
            onUploadMaterials={onProjectMaterialsUpload}
            onDeleteMaterial={onProjectMaterialDelete}
            onProjectUpdate={onProjectUpdate}
          />
        )}
        <div
          aria-hidden={activeView !== "canvas"}
          className={`workspace-preserved-view ${
            activeView === "canvas" ? "active" : "is-hidden"
          }`}
        >
          <UnifiedCanvasView
            onGeneratedImagesChange={setCanvasGeneratedImages}
          />
        </div>
        {activeView === "text" && (
          <TextView
            project={project}
            materials={projectMaterials}
            agentMessages={agentMessages}
            onUploadMaterials={onProjectMaterialsUpload}
            userName={session.displayName}
            userAvatarUrl={session.avatarUrl}
            documentInput={documentInput}
            documentMessages={documentMessages}
            outline={documentOutline}
            documentOutput={documentOutput}
            documentOutputPages={documentOutputPages}
            canvasGeneratedImages={canvasGeneratedImages}
            documentStatus={documentStatus}
            outputStatus={documentOutputStatus}
            setDocumentInput={setDocumentInput}
            setDocumentMessages={setDocumentMessages}
            setOutline={setDocumentOutline}
            setDocumentOutput={setDocumentOutput}
            setDocumentOutputPages={setDocumentOutputPages}
            setDocumentStatus={setDocumentStatus}
            setOutputStatus={setDocumentOutputStatus}
          />
        )}
      </section>
    </section>
  );
}

function UserMessageAvatar({
  avatarUrl,
  size = 30,
}: {
  avatarUrl: string | undefined;
  size?: number;
}) {
  return avatarUrl ? (
    <img className="user-message-avatar-image" src={avatarUrl} alt="" />
  ) : (
    <UserCircle size={size} weight="light" />
  );
}

function AgentWorkspaceContent({
  project,
  materials,
  userName,
  userAvatarUrl,
  chatInput,
  agentMessages,
  agentStatus,
  onChatInput,
  onAgentSubmit,
  onVoiceSubmit,
  onUploadMaterials,
  onDeleteMaterial,
  onProjectUpdate,
}: {
  project: Project;
  materials: ProjectMaterial[];
  userName: string;
  userAvatarUrl: string | undefined;
  chatInput: string;
  agentMessages: AgentChatMessage[];
  agentStatus: AgentStreamStatus;
  onChatInput: (value: string) => void;
  onAgentSubmit: () => void;
  onVoiceSubmit: (
    voiceInput: AgentVoiceInput,
    textInstruction: string,
  ) => void;
  onUploadMaterials: (files: FileList | File[]) => void;
  onDeleteMaterial: (materialId: string) => void;
  onProjectUpdate: (update: Partial<Project>) => void;
}) {
  const greeting = getTimeOfDayGreeting();
  const hasConversation = agentMessages.length > 0;
  const latestAssistantMessage = [...agentMessages]
    .reverse()
    .find((message) => message.role === "assistant" && message.text.trim());
  const displayUserName = userName.trim() || "用户";
  const agentConversationEndRef = useRef<HTMLDivElement | null>(null);
  const [expandedAgentMessageIds, setExpandedAgentMessageIds] = useState<Set<string>>(
    () => new Set(),
  );
  const assistantActions = [
    { icon: ArrowClockwise, label: "重新生成" },
    { icon: ThumbsUp, label: "有帮助" },
    { icon: ThumbsDown, label: "没有帮助" },
    { icon: CopySimple, label: "复制" },
    { icon: ShareNetwork, label: "分享" },
  ];
  const quickTasks = [
    "分析场地问题与机会",
    "提出概念方向",
    "梳理功能与游线",
    "深化关键设计节点",
    "建立植物与季相策略",
    "检查方案完整性",
  ];

  function handleQuickTask(task: string) {
    onChatInput(task);
    window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLTextAreaElement>(
          ".agent-stage .agent-input-area textarea",
        )
        ?.focus();
    });
  }

  function updateBrief(
    field: keyof Project["brief"],
    value: string,
  ) {
    onProjectUpdate({
      brief: {
        ...project.brief,
        [field]: value,
      },
    });
  }

  function handleAgentAction(label: string, text: string) {
    if (label === "复制" && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => undefined);
    }
  }

  function stopAgentMessageTextPointerDown(event: ReactMouseEvent<HTMLElement>) {
    event.stopPropagation();
  }

  function toggleAgentMessageExpanded(messageId: string) {
    setExpandedAgentMessageIds((current) => {
      const next = new Set(current);

      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }

      return next;
    });
  }

  useEffect(() => {
    agentConversationEndRef.current?.scrollIntoView({ block: "end" });
  }, [agentMessages, agentStatus]);

  return (
    <AgentViewLayout>
      <aside className="context-rail">
        <div className="rail-heading">
          <div>
            <span>当前项目</span>
            <h2>项目简报</h2>
          </div>
          <small>{project.updatedAt}</small>
        </div>
        <div className="brief-form">
          <label className="brief-field">
            <span>项目类型</span>
            <DropdownSelect
              value={project.type}
              onValueChange={(type) => onProjectUpdate({ type })}
              ariaLabel="选择项目类型"
              options={landscapeProjectTypes.map((type) => ({
                value: type,
                label: type,
              }))}
            />
          </label>
          <label className="brief-field">
            <span>项目地点</span>
            <input
              value={project.location}
              placeholder="城市、区域或场地名称"
              onChange={(event) =>
                onProjectUpdate({ location: event.target.value })
              }
            />
          </label>
          <label className="brief-field">
            <span>设计阶段</span>
            <DropdownSelect
              value={project.designStage}
              onValueChange={(designStage) =>
                onProjectUpdate({ designStage: designStage as DesignStage })
              }
              ariaLabel="选择设计阶段"
              options={designStages.map((stage) => ({
                value: stage,
                label: stage,
              }))}
            />
          </label>
          <label className="brief-field">
            <span>客户或委托方</span>
            <input
              value={project.client}
              placeholder="可稍后补充"
              onChange={(event) =>
                onProjectUpdate({ client: event.target.value })
              }
            />
          </label>
          <label className="brief-field wide">
            <span>项目目标</span>
            <textarea
              value={project.brief.goals}
              placeholder="希望解决什么问题"
              onChange={(event) => updateBrief("goals", event.target.value)}
              rows={2}
            />
          </label>
          <label className="brief-field wide">
            <span>使用人群</span>
            <textarea
              value={project.brief.users}
              placeholder="主要使用者和典型场景"
              onChange={(event) => updateBrief("users", event.target.value)}
              rows={2}
            />
          </label>
          <label className="brief-field wide">
            <span>场地范围</span>
            <textarea
              value={project.brief.siteScope}
              placeholder="红线、边界或已知场地条件"
              onChange={(event) => updateBrief("siteScope", event.target.value)}
              rows={2}
            />
          </label>
          <label className="brief-field wide">
            <span>已知限制</span>
            <textarea
              value={project.brief.constraints}
              placeholder="工期、预算、规范或待复核条件"
              onChange={(event) =>
                updateBrief("constraints", event.target.value)
              }
              rows={2}
            />
          </label>
        </div>
        <ProjectMaterialsPanel
          materials={materials}
          onUpload={onUploadMaterials}
          onDelete={onDeleteMaterial}
        />
      </aside>
      <section className="agent-stage" aria-label="Zerlum Agent">
        <div className={`agent-home ${hasConversation ? "chatting" : ""}`}>
          {hasConversation ? (
            <div className="agent-conversation" aria-live="polite">
              {agentMessages.map((message) => {
                const messageText =
                  message.text ||
                  (message.status === "streaming" ? "正在思考..." : "");
                const isLongAssistantMessage = message.role === "assistant" && message.text.length > AGENT_MESSAGE_COLLAPSE_LENGTH;
                const shouldCollapseMessage = isLongAssistantMessage && !expandedAgentMessageIds.has(message.id);

                return (
                  <article
                    className={`agent-message ${message.role} ${
                      message.status ?? "done"
                    }`}
                    key={message.id}
                  >
                    <div className="agent-message-meta">
                      <div className="agent-message-avatar" aria-hidden="true">
                        {message.role === "assistant" ? (
                          <img src="/brand/zerlum-logo-mark.png" alt="" />
                        ) : (
                          <UserMessageAvatar avatarUrl={userAvatarUrl} />
                        )}
                      </div>
                      <span>
                        {message.role === "assistant"
                          ? "Zerlum Agent"
                          : displayUserName}
                      </span>
                    </div>
                    <div
                      className={`agent-message-content ${
                        shouldCollapseMessage ? "is-collapsed" : ""
                      }`}
                    >
                      <p
                        className="agent-message-text"
                        onMouseDown={stopAgentMessageTextPointerDown}
                      >
                        {messageText}
                      </p>
                    </div>
                    {isLongAssistantMessage && (
                      <button
                        className="agent-message-collapse-button"
                        type="button"
                        aria-expanded={!shouldCollapseMessage}
                        onClick={() => toggleAgentMessageExpanded(message.id)}
                      >
                        {shouldCollapseMessage ? "展开全文" : "收起"}
                      </button>
                    )}
                    {message.role === "assistant" &&
                      message.status !== "streaming" && (
                        <div className="agent-message-actions">
                          {assistantActions.map((action) => (
                            <button
                              key={action.label}
                              type="button"
                              title={action.label}
                              aria-label={action.label}
                              onClick={() =>
                                handleAgentAction(action.label, message.text)
                              }
                            >
                              <action.icon size={15} weight="regular" />
                            </button>
                          ))}
                        </div>
                      )}
                  </article>
                );
              })}
              <div className="agent-conversation-end" ref={agentConversationEndRef} aria-hidden="true" />
            </div>
          ) : (
            <div className="agent-identity">
              <img
                className="agent-home-logo"
                src="/brand/zerlum-logo-mark.png"
                alt="Zerlum"
              />
              <p className="agent-greeting">
                {greeting}，<strong>{displayUserName}</strong>
              </p>
              <div className="agent-empty-copy">
                <h1>从场地理解开始</h1>
                <p>补充项目资料，或选择一个景观设计任务。</p>
              </div>
              <div className="agent-quick-tasks" aria-label="景观设计快捷任务">
                {quickTasks.map((task) => (
                  <button key={task} type="button" onClick={() => handleQuickTask(task)}>
                    <span>{task}</span>
                    <ArrowUp size={15} weight="bold" />
                  </button>
                ))}
              </div>
            </div>
          )}
          <AgentComposer
            value={chatInput}
            onValueChange={onChatInput}
            onSubmit={onAgentSubmit}
            onVoiceSubmit={onVoiceSubmit}
            disabled={agentStatus === "streaming"}
          />
        </div>
      </section>
      <aside className="history-rail">
        <div className="rail-heading">
          <div>
            <span>项目结论</span>
            <h2>最近成果</h2>
          </div>
        </div>
        <div className="outcome-list">
          <section>
            <h3>设计方向</h3>
            <p>
              {latestAssistantMessage
                ? latestAssistantMessage.text
                : "通过“提出概念方向”形成首轮空间命题和方向比较。"}
            </p>
          </section>
          <section>
            <h3>设计节点</h3>
            <p>
              {latestAssistantMessage
                ? "继续选择关键空间，可在方案画布中建立节点并深化。"
                : "通过“深化关键设计节点”明确入口、核心场景或边界空间。"}
            </p>
          </section>
          <section>
            <h3>待确认项</h3>
            <p>
              {latestAssistantMessage
                ? "复核场地边界、高程、规范和植物适生性等项目依据。"
                : "Agent 会把资料不足、专业复核和项目假设整理在这里。"}
            </p>
          </section>
        </div>
      </aside>
    </AgentViewLayout>
  );
}

function ProjectMaterialsPanel({
  materials,
  onUpload,
  onDelete,
}: {
  materials: ProjectMaterial[];
  onUpload: (files: FileList | File[]) => void;
  onDelete: (materialId: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      onUpload(event.target.files);
    }

    event.target.value = "";
  }

  return (
    <section className="project-materials-panel">
      <div className="materials-box">
        <header>
          <strong>资料框</strong>
          <span>{materials.length} 个文件</span>
        </header>
        <div className="materials-list">
          {materials.length > 0 ? (
            materials.map((material) => (
              <article key={material.id}>
                <FileText size={14} weight="bold" />
                <div>
                  <strong>{material.name}</strong>
                  <span>
                    {formatFileSize(material.size)} · {material.uploadedAt}
                  </span>
                </div>
                <button
                  className="material-delete-button"
                  type="button"
                  aria-label={`删除 ${material.name}`}
                  title="删除资料"
                  onClick={() => onDelete(material.id)}
                >
                  <X size={12} weight="bold" />
                </button>
              </article>
            ))
          ) : (
            <div className="materials-empty">暂无上传资料</div>
          )}
        </div>
      </div>
      <button
        className="material-upload-button"
        type="button"
        onClick={() => inputRef.current?.click()}
      >
        <UploadSimple size={15} weight="bold" />
        上传资料
      </button>
      <input
        ref={inputRef}
        className="agent-hidden-file"
        type="file"
        multiple
        onChange={handleInputChange}
      />
    </section>
  );
}

function AgentComposer({
  value,
  onValueChange,
  onSubmit,
  onVoiceSubmit,
  placeholder = "描述场地或设计任务",
  ariaLabel = "向景观 Agent 提问",
  disabled = false,
}: {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  onVoiceSubmit?: (voiceInput: AgentVoiceInput, textInstruction: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  const [attachments, setAttachments] = useState<AgentAttachment[]>([]);
  const [pastedSnippets, setPastedSnippets] = useState<PastedSnippet[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<
    "idle" | "recording" | "processing" | "error"
  >("idle");
  const [voiceError, setVoiceError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachmentsRef = useRef<AgentAttachment[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceStartedAtRef = useRef(0);
  const voiceShouldSubmitRef = useRef(false);
  const voiceStopTimerRef = useRef<number | null>(null);

  const hasContent =
    value.trim().length > 0 ||
    attachments.length > 0 ||
    pastedSnippets.length > 0;

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 96)}px`;
  }, [value]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(
    () => () => {
      attachmentsRef.current.forEach((file) => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    },
    [],
  );

  function stopVoiceTracks() {
    if (voiceStopTimerRef.current !== null) {
      window.clearTimeout(voiceStopTimerRef.current);
      voiceStopTimerRef.current = null;
    }

    mediaStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
  }

  useEffect(
    () => () => {
      voiceShouldSubmitRef.current = false;

      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      } else {
        stopVoiceTracks();
      }
    },
    [],
  );

  function handleFiles(fileList: FileList | File[]) {
    const nextFiles = Array.from(fileList).map((file) => {
      const isImage =
        file.type.startsWith("image/") ||
        /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);

      return {
        id: createId("agent-file"),
        name: file.name,
        size: file.size,
        type: isImage ? "image" : file.type || "file",
        preview: isImage ? URL.createObjectURL(file) : null,
        uploadStatus: "uploading" as const,
      };
    });

    setAttachments((current) => [...current, ...nextFiles]);
    window.setTimeout(() => {
      setAttachments((current) =>
        current.map((file) =>
          nextFiles.some((nextFile) => nextFile.id === file.id)
            ? { ...file, uploadStatus: "complete" }
            : file,
        ),
      );
    }, 700);
  }

  function removeAttachment(id: string) {
    setAttachments((current) => {
      const removed = current.find((file) => file.id === id);

      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
      }

      return current.filter((file) => file.id !== id);
    });
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const files: File[] = [];

    Array.from(event.clipboardData.items).forEach((item) => {
      if (item.kind === "file") {
        const file = item.getAsFile();

        if (file) {
          files.push(file);
        }
      }
    });

    if (files.length > 0) {
      event.preventDefault();
      handleFiles(files);
      return;
    }

    const text = event.clipboardData.getData("text");

    if (text.length > 300) {
      event.preventDefault();
      setPastedSnippets((current) => [
        ...current,
        { id: createId("paste"), content: text },
      ]);
    }
  }

  function handleDragOver(event: DragEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsDragging(false);

    if (event.dataTransfer.files.length > 0) {
      handleFiles(event.dataTransfer.files);
    }
  }

  function clearAttachments() {
    attachments.forEach((file) => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setAttachments([]);
    setPastedSnippets([]);
  }

  async function startVoiceRecording() {
    if (!onVoiceSubmit || disabled) {
      return;
    }

    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setVoiceStatus("error");
      setVoiceError("当前浏览器不支持麦克风录音。");
      return;
    }

    setVoiceStatus("processing");
    setVoiceError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMimeType = MediaRecorder.isTypeSupported(
        "audio/webm;codecs=opus",
      )
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);

      voiceChunksRef.current = [];
      voiceStartedAtRef.current = Date.now();
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          voiceChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        void (async () => {
          const shouldSubmit = voiceShouldSubmitRef.current;
          const durationMs = Date.now() - voiceStartedAtRef.current;
          const recordingBlob = new Blob(voiceChunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });

          voiceShouldSubmitRef.current = false;
          voiceChunksRef.current = [];
          stopVoiceTracks();

          if (!shouldSubmit) {
            setVoiceStatus("idle");
            return;
          }

          if (recordingBlob.size === 0) {
            setVoiceStatus("error");
            setVoiceError("没有录到声音。");
            return;
          }

          setVoiceStatus("processing");

          const wavBlob = await decodeRecordingToWav(recordingBlob);
          const dataUrl = await readBlobAsDataUrl(wavBlob);

          onVoiceSubmit(
            {
              dataUrl,
              mimeType: "audio/wav",
              durationMs,
              label: "麦克风录音",
            },
            value.trim(),
          );
          clearAttachments();
          setVoiceStatus("idle");
          setVoiceError("");
        })().catch((error: unknown) => {
          stopVoiceTracks();
          setVoiceStatus("error");
          setVoiceError(
            getVoiceRecordingErrorMessage(error, "语音处理失败。"),
          );
        });
      };

      recorder.start();
      setVoiceStatus("recording");
      voiceStopTimerRef.current = window.setTimeout(() => {
        stopVoiceRecording();
      }, 60_000);
    } catch (error) {
      stopVoiceTracks();
      setVoiceStatus("error");
      setVoiceError(
        getVoiceRecordingErrorMessage(error, "无法打开麦克风。"),
      );
    }
  }

  function stopVoiceRecording() {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state !== "recording") {
      return;
    }

    voiceShouldSubmitRef.current = true;
    recorder.stop();
  }

  function toggleVoiceRecording() {
    if (voiceStatus === "recording") {
      stopVoiceRecording();
      return;
    }

    void startVoiceRecording();
  }

  function sendMessage() {
    if (!hasContent || disabled) {
      return;
    }

    onSubmit();
    clearAttachments();

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage();
  }

  function handleComposerMouseMove(event: ReactMouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    event.currentTarget.style.setProperty("--composer-x", `${x}%`);
    event.currentTarget.style.setProperty("--composer-y", `${y}%`);
  }

  function handleComposerMouseLeave(event: ReactMouseEvent<HTMLDivElement>) {
    event.currentTarget.style.setProperty("--composer-x", "50%");
    event.currentTarget.style.setProperty("--composer-y", "50%");
  }

  const voiceButtonDisabled =
    !onVoiceSubmit ||
    voiceStatus === "processing" ||
    (disabled && voiceStatus !== "recording");
  const voiceStatusText =
    voiceError ||
    (voiceStatus === "recording"
      ? "正在录音，再点一次发送"
      : voiceStatus === "processing"
        ? "正在处理语音"
        : "");

  return (
    <form
      className={`agent-composer-shell ${hasContent ? "has-content" : ""}`}
      onSubmit={handleSubmit}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className="agent-composer"
        onMouseMove={handleComposerMouseMove}
        onMouseLeave={handleComposerMouseLeave}
      >
        {(attachments.length > 0 || pastedSnippets.length > 0) && (
          <div className="agent-attachment-strip">
            {pastedSnippets.map((snippet) => (
              <article className="agent-paste-card" key={snippet.id}>
                <p>{snippet.content}</p>
                <span>PASTED</span>
                <button
                  type="button"
                  onClick={() =>
                    setPastedSnippets((current) =>
                      current.filter((item) => item.id !== snippet.id),
                    )
                  }
                  aria-label="移除粘贴内容"
                >
                  <X size={11} weight="bold" />
                </button>
              </article>
            ))}
            {attachments.map((file) => (
              <article className="agent-file-card" key={file.id}>
                {file.preview ? (
                  <img src={file.preview} alt={file.name} />
                ) : (
                  <div className="agent-file-icon">
                    <FileText size={18} weight="bold" />
                  </div>
                )}
                <div>
                  <strong>{file.name}</strong>
                  <span>{formatFileSize(file.size)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(file.id)}
                  aria-label={`移除 ${file.name}`}
                >
                  <X size={11} weight="bold" />
                </button>
                {file.uploadStatus === "uploading" && (
                  <div className="agent-uploading">
                    <SpinnerGap size={18} weight="bold" />
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        <div className="agent-composer-row">
          <button
            className={`agent-icon-action ${
              voiceStatus === "recording" ? "recording" : ""
            }`}
            type="button"
            disabled={voiceButtonDisabled}
            aria-label={voiceStatus === "recording" ? "停止语音输入" : "语音输入"}
            title={voiceStatus === "recording" ? "停止语音输入" : "语音输入"}
            onClick={toggleVoiceRecording}
          >
            {voiceStatus === "processing" ? (
              <SpinnerGap size={16} weight="bold" />
            ) : (
              <Microphone size={16} weight="bold" />
            )}
          </button>
          <label className="agent-input-area">
            <span className="sr-only">{ariaLabel}</span>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
            />
          </label>
          <button
            className="agent-send-button"
            type="submit"
            disabled={!hasContent || disabled}
            aria-label="发送消息"
          >
            <ArrowUp size={17} weight="bold" />
          </button>
        </div>
        {voiceStatusText && (
          <div className={`agent-voice-status ${voiceError ? "error" : ""}`}>
            {voiceStatusText}
          </div>
        )}
      </div>

      {isDragging && (
        <div className="agent-drag-overlay">
          <Archive size={34} weight="bold" />
          <strong>拖放资料到这里</strong>
        </div>
      )}
    </form>
  );
}

function CanvasView({
  userName,
  userAvatarUrl,
  visualInput,
  visualMessages,
  onVisualInputChange,
  onVisualMessagesChange,
  onGeneratedImagesChange,
}: {
  userName: string;
  userAvatarUrl: string | undefined;
  visualInput: string;
  visualMessages: VisualMessage[];
  onVisualInputChange: (value: string) => void;
  onVisualMessagesChange: Dispatch<SetStateAction<VisualMessage[]>>;
  onGeneratedImagesChange: (images: CanvasGeneratedImage[]) => void;
}) {
  const displayUserName = userName.trim() || "用户";
  const canvasRef = useRef<HTMLElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const pendingUploadPoint = useRef({ x: 40, y: 560 });
  const pendingUploadNodeId = useRef<string | null>(null);
  const objectUrls = useRef<string[]>([]);
  const panSession = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const nodeSession = useRef<{
    pointerId: number;
    nodeId: string;
    mode: "move" | "resize";
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    originWidth: number;
    originHeight: number;
    startedOnImageMedia?: boolean;
  } | null>(null);

  const setVisualInput = onVisualInputChange;
  const setVisualMessages = onVisualMessagesChange;
  const [visualNodes, setVisualNodes] =
    useState<VisualCanvasNode[]>(initialVisualNodes);
  const [visualEdges, setVisualEdges] =
    useState<VisualCanvasEdge[]>(initialVisualEdges);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 110, y: 150 });
  const [isPanning, setIsPanning] = useState(false);
  const [activeVisualNodeId, setActiveVisualNodeId] = useState(
    initialVisualNodes[0]?.id ?? "",
  );
  const [previewImage, setPreviewImage] = useState<VisualPreviewImage | null>(
    null,
  );
  const [comparisonSlider, setComparisonSlider] = useState(50);

  useEffect(() => {
    return () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const handleNativeWheel = (event: WheelEvent) => {
      if (shouldLetEmbeddedInputHandleWheel(event.target)) {
        return;
      }

      event.preventDefault();
      zoomCanvas(event.deltaY, event.clientX, event.clientY);
    };

    canvas.addEventListener("wheel", handleNativeWheel, { passive: false });

    return () => {
      canvas.removeEventListener("wheel", handleNativeWheel);
    };
  }, [pan.x, pan.y, zoom]);

  useEffect(() => {
    onGeneratedImagesChange(
      visualNodes
        .filter((node) => node.kind === "generated" && Boolean(node.imageUrl))
        .map((node, index) => ({
          imageUrl: node.imageUrl ?? "",
          label:
            node.subtitle || node.title
              ? `${node.title || `画布生成图 ${index + 1}`}${node.subtitle ? `：${node.subtitle}` : ""}`
              : `画布生成图 ${index + 1}`,
        }))
        .filter((image) => image.imageUrl.trim()),
    );
  }, [onGeneratedImagesChange, visualNodes]);

  const canvasStyle = {
    "--canvas-dot-size": `${40 * zoom}px`,
    "--canvas-dot-opacity": getCanvasDotOpacity(zoom),
    "--canvas-grid-x": `${pan.x}px`,
    "--canvas-grid-y": `${pan.y}px`,
  } as CSSProperties;
  const worldStyle = {
    transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
  };

  function getCanvasPoint(clientX: number, clientY: number) {
    const rectElement = canvasRef.current;
    const rect = rectElement?.getBoundingClientRect();

    if (!rect || !rectElement) {
      return { x: 0, y: 0 };
    }

    const scrollLeft = rectElement.scrollLeft;
    const scrollTop = rectElement.scrollTop;

    return {
      x: (clientX - rect.left + scrollLeft - pan.x) / zoom,
      y: (clientY - rect.top + scrollTop - pan.y) / zoom,
    };
  }

  function requestImageNode(point = pendingUploadPoint.current) {
    pendingUploadNodeId.current = null;
    pendingUploadPoint.current = point;
    uploadInputRef.current?.click();
  }

  function requestImageForNode(nodeId: string) {
    pendingUploadNodeId.current = nodeId;
    uploadInputRef.current?.click();
  }

  function getVisualImageTitle(node: VisualCanvasNode) {
    return node.subtitle || node.title || "Zerlum 图片";
  }

  function getVisualDownloadName(title: string) {
    const cleanName = title
      .replace(/\.(png|jpe?g|webp|gif)$/i, "")
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-")
      .slice(0, 80)
      .trim();

    return cleanName || `zerlum-image-${Date.now()}`;
  }

  function inferDownloadExtension(mimeType: string) {
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

  async function saveVisualImage(imageUrl: string, title: string) {
    const baseName = getVisualDownloadName(title);

    try {
      const response = await fetch(imageUrl);

      if (!response.ok) {
        throw new Error("图片下载失败");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = `${baseName}.${inferDownloadExtension(blob.type)}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1200);
    } catch {
      const link = document.createElement("a");

      link.href = imageUrl;
      link.download = `${baseName}.png`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  }

  function previewVisualNodeImage(node: VisualCanvasNode) {
    if (!node.imageUrl) {
      return;
    }

    setComparisonSlider(50);
    setPreviewImage({
      imageUrl: node.imageUrl,
      title: getVisualImageTitle(node),
      subtitle: node.body,
      compareImageUrl: node.sourceImageUrl,
      compareTitle: node.sourceTitle,
    });
  }

  function requestImageNodeFromToolbar() {
    const rect = canvasRef.current?.getBoundingClientRect();

    if (!rect) {
      requestImageNode();
      return;
    }

    requestImageNode(
      getCanvasPoint(
        rect.left + Math.min(120, rect.width * 0.18),
        rect.top + Math.min(130, rect.height * 0.22),
      ),
    );
  }

  function handleCanvasDoubleClick(event: ReactMouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;

    if (target.closest(".visual-node, .canvas-add-node-button")) {
      return;
    }

    event.preventDefault();
    const point = getCanvasPoint(event.clientX, event.clientY);

    requestImageNode({ x: point.x - 120, y: point.y - 90 });
  }

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const [file] = Array.from(event.target.files ?? []);

    if (!file) {
      return;
    }

    const url = URL.createObjectURL(file);
    objectUrls.current.push(url);

    const targetNodeId = pendingUploadNodeId.current;
    pendingUploadNodeId.current = null;

    if (targetNodeId) {
      setVisualNodes((current) =>
        current.map((node) => {
          if (node.id !== targetNodeId) {
            return node;
          }

          const oldImageUrl = node.imageUrl;
          const oldImageStillReferenced =
            oldImageUrl &&
            current.some(
              (item) =>
                item.id !== targetNodeId && item.sourceImageUrl === oldImageUrl,
            );

          if (
            oldImageUrl &&
            objectUrls.current.includes(oldImageUrl) &&
            !oldImageStillReferenced
          ) {
            URL.revokeObjectURL(oldImageUrl);
            objectUrls.current = objectUrls.current.filter(
              (storedUrl) => storedUrl !== oldImageUrl,
            );
          }

          return {
            ...node,
            subtitle: file.name,
            body: `${formatFileSize(file.size)} · 已更新`,
            imageUrl: url,
          };
        }),
      );
      setActiveVisualNodeId(targetNodeId);
      setVisualMessages((current) => [
        ...current,
        {
          id: createId("visual-message"),
          author: "visual",
          text: `已更新图片节点为 ${file.name}。`,
        },
      ]);

      event.target.value = "";
      return;
    }

    const id = createId("visual-flow");
    const origin = pendingUploadPoint.current;
    const imageId = `${id}-image`;
    const promptId = `${id}-prompt`;
    const resolutionId = `${id}-resolution`;
    const generatedId = `${id}-generated`;

    setVisualNodes((current) => [
      ...current,
      {
        id: imageId,
        kind: "image",
        title: "图片",
        subtitle: file.name,
        body: `${formatFileSize(file.size)} · 已加入画布`,
        imageUrl: url,
        x: origin.x,
        y: origin.y,
      },
      {
        id: promptId,
        kind: "prompt",
        title: "提示词",
        body: "",
        x: origin.x + 330,
        y: origin.y,
      },
      {
        id: resolutionId,
        kind: "resolution",
        title: "分辨率",
        body: "4K",
        x: origin.x + 680,
        y: origin.y + 26,
      },
      {
        id: generatedId,
        kind: "generated",
        title: "图片生成",
        x: origin.x + 930,
        y: origin.y,
      },
    ]);

    setVisualEdges((current) => [
      ...current,
      { id: `${id}-edge-1`, from: imageId, to: promptId },
      { id: `${id}-edge-2`, from: promptId, to: resolutionId },
      { id: `${id}-edge-3`, from: resolutionId, to: generatedId },
    ]);
    setActiveVisualNodeId(imageId);

    setVisualMessages((current) => [
      ...current,
      {
        id: createId("visual-message"),
        author: "visual",
        text: `已添加 ${file.name}，并连接到提示词、分辨率和图片生成。`,
      },
    ]);

    event.target.value = "";
  }

  function zoomCanvas(deltaY: number, clientX: number, clientY: number) {
    const nextZoom = clamp(zoom * (deltaY > 0 ? 0.9 : 1.1), canvasZoomMin, canvasZoomMax);
    const rectElement = canvasRef.current;
    const rect = rectElement?.getBoundingClientRect();

    if (!rect || !rectElement || nextZoom === zoom) {
      return;
    }

    const scrollLeft = rectElement.scrollLeft;
    const scrollTop = rectElement.scrollTop;
    const worldX = (clientX - rect.left + scrollLeft - pan.x) / zoom;
    const worldY = (clientY - rect.top + scrollTop - pan.y) / zoom;

    setZoom(nextZoom);
    setPan({
      x: clientX - rect.left + scrollLeft - worldX * nextZoom,
      y: clientY - rect.top + scrollTop - worldY * nextZoom,
    });
  }

  function handleCanvasPointerDown(event: ReactPointerEvent<HTMLElement>) {
    const target = event.target as HTMLElement;

    if (
      event.button !== 0 ||
      target.closest(".visual-node, .canvas-add-node-button")
    ) {
      return;
    }

    panSession.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsPanning(true);
  }

  function handleCanvasPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const session = panSession.current;

    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    setPan({
      x: session.originX + event.clientX - session.startX,
      y: session.originY + event.clientY - session.startY,
    });
  }

  function finishCanvasPan(event: ReactPointerEvent<HTMLElement>) {
    if (panSession.current?.pointerId === event.pointerId) {
      panSession.current = null;
      setIsPanning(false);
    }
  }

  function deleteVisualNode(nodeId: string) {
    const idsToDelete = new Set([nodeId]);
    const queue = [nodeId];

    while (queue.length > 0) {
      const currentId = queue.shift();

      visualEdges.forEach((edge) => {
        if (edge.from === currentId && !idsToDelete.has(edge.to)) {
          idsToDelete.add(edge.to);
          queue.push(edge.to);
        }
      });
    }

    setVisualNodes((current) => {
      const retainedNodes = current.filter((node) => !idsToDelete.has(node.id));
      const retainedUrls = new Set(
        retainedNodes.flatMap((node) =>
          [node.imageUrl, node.sourceImageUrl].filter(Boolean) as string[],
        ),
      );
      const urlsToRevoke = [
        ...new Set(
          current
            .filter((node) => idsToDelete.has(node.id))
            .flatMap((node) =>
              [node.imageUrl, node.sourceImageUrl].filter(Boolean) as string[],
            )
            .filter(
              (url) =>
                objectUrls.current.includes(url) && !retainedUrls.has(url),
            ),
        ),
      ];

      urlsToRevoke.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.current = objectUrls.current.filter(
        (url) => !urlsToRevoke.includes(url),
      );

      return retainedNodes;
    });
    setVisualEdges((current) =>
      current.filter(
        (edge) => !idsToDelete.has(edge.from) && !idsToDelete.has(edge.to),
      ),
    );
    setActiveVisualNodeId((current) =>
      idsToDelete.has(current) ? "" : current,
    );
  }

  function updateVisualNodeBody(nodeId: string, body: string) {
    setVisualNodes((current) =>
      current.map((node) => (node.id === nodeId ? { ...node, body } : node)),
    );
  }

  function findUpstreamVisualNode(
    startNodeId: string,
    kind: VisualNodeKind,
  ) {
    const visited = new Set<string>();
    const queue = [startNodeId];

    while (queue.length > 0) {
      const currentId = queue.shift();

      if (!currentId || visited.has(currentId)) {
        continue;
      }

      visited.add(currentId);

      const incomingEdges = visualEdges.filter((edge) => edge.to === currentId);

      for (const edge of incomingEdges) {
        const sourceNode = visualNodes.find((node) => node.id === edge.from);

        if (sourceNode?.kind === kind) {
          return sourceNode;
        }

        queue.push(edge.from);
      }
    }

    return null;
  }

  async function resolveImageUrlForApi(imageUrl?: string) {
    if (!imageUrl) {
      return imageUrl;
    }

    if (
      !imageUrl.startsWith("blob:") &&
      !shouldInlineImageUrlForAgentApi(imageUrl)
    ) {
      return imageUrl;
    }

    return compressImageForAgentApi(await imageUrlToDataUrl(imageUrl));
  }

  async function collectVisualAgentImages() {
    const candidates = visualNodes
      .filter(
        (node) =>
          (node.kind === "image" || node.kind === "generated") &&
          Boolean(node.imageUrl),
      )
      .sort((first, second) => {
        if (first.id === activeVisualNodeId) {
          return -1;
        }

        if (second.id === activeVisualNodeId) {
          return 1;
        }

        return 0;
      })
      .slice(0, 4);
    const images: Array<{ imageUrl: string; label: string }> = [];

    for (const node of candidates) {
      try {
        const imageUrl = await resolveImageUrlForAgentApi(node.imageUrl);

        if (imageUrl) {
          images.push({
            imageUrl,
            label: `${node.title}${node.subtitle ? `：${node.subtitle}` : ""}`,
          });
        }
      } catch {
        // Ignore images that the browser can no longer read, such as revoked blob URLs.
      }
    }

    return images;
  }

  async function generateVisualImage(generatedNodeId: string) {
    const promptNode = findUpstreamVisualNode(generatedNodeId, "prompt");
    const imageNode = findUpstreamVisualNode(generatedNodeId, "image");
    const resolutionNode = findUpstreamVisualNode(generatedNodeId, "resolution");
    const prompt = promptNode?.body?.trim() ?? "";
    const targetResolution = resolutionNode?.body ?? "4K";

    if (!prompt) {
      setVisualMessages((current) => [
        ...current,
        {
          id: createId("visual-message"),
          author: "visual",
          text: "请先在提示词节点输入效果图描述，再生成图片。",
        },
      ]);
      return;
    }

    setVisualNodes((current) =>
      current.map((node) =>
        node.id === generatedNodeId
          ? {
              ...node,
              body: "正在生成图片...",
              generationStatus: "loading",
            }
          : node,
      ),
    );

    try {
      const response = await fetch("/api/zerlum-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          imageUrl: await resolveImageUrlForApi(imageNode?.imageUrl),
          resolution: targetResolution,
        }),
      });
      const payload = (await response.json()) as {
        imageUrl?: string;
        outputText?: string;
        error?: string;
      };

      if (!response.ok || !payload.imageUrl) {
        throw new Error(payload.error || "图片生成失败");
      }

      setVisualNodes((current) =>
        current.map((node) =>
          node.id === generatedNodeId
            ? {
                ...node,
                imageUrl: payload.imageUrl,
                sourceImageUrl: imageNode?.imageUrl,
                sourceTitle: imageNode ? getVisualImageTitle(imageNode) : undefined,
                subtitle: `${targetResolution} · ${formatUploadTime()}`,
                body: payload.outputText || "生成完成",
                generationStatus: "done",
              }
            : node,
        ),
      );
      setVisualMessages((current) => [
        ...current,
        {
          id: createId("visual-message"),
          author: "visual",
          text: "图片生成完成，结果已回填到图片生成节点。",
        },
      ]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "图片生成失败，请稍后再试。";

      setVisualNodes((current) =>
        current.map((node) =>
          node.id === generatedNodeId
            ? {
                ...node,
                body: message,
                generationStatus: "error",
              }
            : node,
        ),
      );
      setVisualMessages((current) => [
        ...current,
        {
          id: createId("visual-message"),
          author: "visual",
          text: message,
        },
      ]);
    }
  }

  function beginVisualNodeMove(
    event: ReactPointerEvent<HTMLElement>,
    node: VisualCanvasNode,
  ) {
    const target = event.target as HTMLElement;

    if (target.closest("button, textarea, .visual-resize-handle")) {
      return;
    }

    const size = getVisualNodeSize(node);

    setActiveVisualNodeId(node.id);
    nodeSession.current = {
      pointerId: event.pointerId,
      nodeId: node.id,
      mode: "move",
      startX: event.clientX,
      startY: event.clientY,
      originX: node.x,
      originY: node.y,
      originWidth: size.width,
      originHeight: size.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.stopPropagation();
  }

  function beginVisualNodeResize(
    event: ReactPointerEvent<HTMLElement>,
    node: VisualCanvasNode,
  ) {
    const size = getVisualNodeSize(node);

    setActiveVisualNodeId(node.id);
    nodeSession.current = {
      pointerId: event.pointerId,
      nodeId: node.id,
      mode: "resize",
      startX: event.clientX,
      startY: event.clientY,
      originX: node.x,
      originY: node.y,
      originWidth: size.width,
      originHeight: size.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  }

  function updateVisualNodePointer(event: ReactPointerEvent<HTMLElement>) {
    const session = nodeSession.current;

    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = (event.clientX - session.startX) / zoom;
    const deltaY = (event.clientY - session.startY) / zoom;

    setVisualNodes((current) =>
      current.map((node) => {
        if (node.id !== session.nodeId) {
          return node;
        }

        if (session.mode === "move") {
          return {
            ...node,
            x: session.originX + deltaX,
            y: session.originY + deltaY,
          };
        }

        const minSize = visualNodeSizes[node.kind];

        return {
          ...node,
          width: clamp(session.originWidth + deltaX, minSize.width * 0.72, 560),
          height: clamp(
            session.originHeight + deltaY,
            minSize.height * 0.7,
            420,
          ),
        };
      }),
    );
  }

  function finishVisualNodePointer(event: ReactPointerEvent<HTMLElement>) {
    if (nodeSession.current?.pointerId === event.pointerId) {
      nodeSession.current = null;
    }
  }

  async function submitVisualMessage(
    voiceInput?: AgentVoiceInput,
    voiceInstruction = "",
  ) {
    const typedMessage = visualInput.trim();
    const instruction = voiceInstruction.trim();
    const message = voiceInput ? instruction || "语音输入" : typedMessage;

    if (!message && !voiceInput) {
      return;
    }

    const requestMessage = voiceInput
      ? [
          "请识别这段麦克风语音，并按语音内容生成或调整景观设计视觉提示词、场地与画面分析或修改建议。",
          instruction ? `用户补充文字：${instruction}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      : `用户请求：${message}`;
    const displayMessage = voiceInput
      ? instruction
        ? `语音输入：${instruction}`
        : "语音输入"
      : message;
    const assistantId = createId("visual-assistant-message");
    const nodeSummary = visualNodes
      .map((node) => `${node.kind}:${node.title}${node.body ? `=${node.body}` : ""}`)
      .join(" | ");
    const agentImages = await collectVisualAgentImages();
    const imageSummary = agentImages.length
      ? `已附带图片：${agentImages.map((image) => image.label).join("、")}。`
      : "当前画布没有可读取的图片节点。";

    setVisualMessages((current) => [
      ...current,
      {
        id: createId("visual-user-message"),
        author: "user",
        text: displayMessage,
      },
      {
        id: assistantId,
        author: "visual",
        text: "正在根据参考图和你的要求生成景观设计建议...",
      },
    ]);
    setVisualInput("");

    try {
      const response = await fetch("/api/zerlum-agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          view: "canvas",
          message: [
            "当前任务是基于画布图片、节点关系和用户要求，生成或优化景观设计视觉提示词。",
            "请先判断任务是保结构优化、概念改造、局部替换、方向变体、季节时间变化、自由生成或视频漫游，再选择对应的景观表达策略。",
            "用户明确要求、项目资料和画布显式关系优先；不要机械套用固定风格。",
            "如果用户要提示词，输出可直接用于生成的提示词；如果用户要分析或修改建议，输出对应的设计判断和修改建议。",
            "默认保持原图结构、构图、主体位置、镜头视角、透视关系、场地尺度和未要求改变的主体；概念改造或自由生成除外。",
            requestMessage,
            nodeSummary ? `当前画布节点：${nodeSummary}` : "",
            imageSummary,
          ]
            .filter(Boolean)
            .join("\n"),
          images: agentImages,
          audio: voiceInput,
        }),
      });

      if (!response.ok || !response.body) {
        const fallback = await response.text();
        throw new Error(parseApiErrorText(fallback, "Zerlum Visual 暂时无法响应。"));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";
      let streamError = "";

      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split(/\n\n|\r\n\r\n/);
        buffer = events.pop() ?? "";

        events.forEach((event) => {
          event
            .split(/\r?\n/)
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.replace(/^data:\s?/, "").trim())
            .forEach((data) => {
              const errorText = extractAgentStreamError(data);

              if (errorText) {
                streamError = errorText;
                return;
              }

              const delta = extractAgentStreamText(data);

              if (!delta) {
                return;
              }

              assistantText += delta;
              setVisualMessages((current) =>
                current.map((item) =>
                  item.id === assistantId
                    ? { ...item, text: assistantText }
                    : item,
                ),
              );
            });
        });
      }

      if (streamError) {
        throw new Error(streamError);
      }

      setVisualMessages((current) =>
        current.map((item) =>
          item.id === assistantId
            ? {
                ...item,
                text: assistantText || "Zerlum Visual 暂时没有返回可用建议。",
              }
            : item,
        ),
      );
    } catch (error) {
      const errorText =
        error instanceof Error
          ? error.message
          : "Zerlum Visual 连接失败，请稍后再试。";

      setVisualMessages((current) =>
        current.map((item) =>
          item.id === assistantId ? { ...item, text: errorText } : item,
        ),
      );
    }
  }

  function submitVisualVoiceMessage(
    voiceInput: AgentVoiceInput,
    textInstruction: string,
  ) {
    void submitVisualMessage(voiceInput, textInstruction);
  }

  const hasPreviewComparison = Boolean(previewImage?.compareImageUrl);
  const previewCompareStyle = {
    "--compare-position": `${comparisonSlider}%`,
  } as CSSProperties;

  return (
    <div className="canvas-layout">
      <aside className="visual-agent-panel">
        <header className="visual-agent-header">
          <img
            className="visual-agent-logo"
            src="/brand/zerlum-logo-mark.png"
            alt=""
          />
          <div>
            <strong>Zerlum Visual</strong>
            <small>效果图提示词和画布生成建议</small>
          </div>
        </header>
        <div className="visual-agent-stream">
          {visualMessages.map((message) => (
            <article
              className={`visual-agent-message ${message.author}`}
              key={message.id}
            >
              <div className="visual-agent-message-meta">
                <div className="agent-message-avatar" aria-hidden="true">
                  {message.author === "visual" ? (
                    <img src="/brand/zerlum-logo-mark.png" alt="" />
                  ) : (
                    <UserMessageAvatar avatarUrl={userAvatarUrl} size={24} />
                  )}
                </div>
                <span>
                  {message.author === "visual" ? "Visual" : displayUserName}
                </span>
              </div>
              <p>{message.text}</p>
            </article>
          ))}
        </div>
        <AgentComposer
          value={visualInput}
          onValueChange={setVisualInput}
          onSubmit={submitVisualMessage}
          onVoiceSubmit={submitVisualVoiceMessage}
          placeholder="Ask Zerlum Visual"
          ariaLabel="向 Zerlum Visual 提问"
        />
      </aside>
      <section
        ref={canvasRef}
        className={`infinite-canvas ${isPanning ? "is-panning" : ""}`}
        style={canvasStyle}
        onDoubleClick={handleCanvasDoubleClick}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={finishCanvasPan}
        onPointerCancel={finishCanvasPan}
      >
        <button
          className="secondary-button canvas-add-node-button"
          type="button"
          onClick={requestImageNodeFromToolbar}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <PlusCircle size={17} weight="bold" />
          添加节点
        </button>
        <div className="visual-canvas-world" style={worldStyle}>
          <svg
            className="visual-canvas-links"
            viewBox="-4000 -3000 8000 6000"
            aria-hidden="true"
          >
            {visualEdges.map((edge) => (
              <path
                d={getVisualEdgePath(edge, visualNodes)}
                key={edge.id}
              />
            ))}
          </svg>
          {visualNodes.map((node) => (
            <VisualCanvasNodeCard
              active={activeVisualNodeId === node.id}
              canGenerateImages
              key={node.id}
              node={node}
              onDelete={deleteVisualNode}
              onMovePointerDown={beginVisualNodeMove}
              onPointerEnd={finishVisualNodePointer}
              onPointerMove={updateVisualNodePointer}
              onResizePointerDown={beginVisualNodeResize}
              onBodyChange={updateVisualNodeBody}
              onGenerateImage={generateVisualImage}
              onUploadImage={requestImageForNode}
              onPreviewImage={previewVisualNodeImage}
              onSaveImage={(node) =>
                node.imageUrl
                  ? saveVisualImage(node.imageUrl, getVisualImageTitle(node))
                  : undefined
              }
            />
          ))}
        </div>
        <input
          ref={uploadInputRef}
          className="agent-hidden-file"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
        />
      </section>
      {previewImage && (
        <div
          className="visual-preview-layer"
          role="dialog"
          aria-modal="true"
          aria-label="大图预览"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="visual-preview-shell"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <strong>{previewImage.title}</strong>
                {previewImage.subtitle && <small>{previewImage.subtitle}</small>}
              </div>
              <div className="visual-preview-actions">
                <button
                  className="secondary-button compact"
                  type="button"
                  onClick={() =>
                    saveVisualImage(previewImage.imageUrl, previewImage.title)
                  }
                >
                  <DownloadSimple size={15} weight="bold" />
                  保存图片
                </button>
                <button
                  className="visual-node-control"
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  aria-label="关闭大图预览"
                >
                  <X size={13} weight="bold" />
                </button>
              </div>
            </header>
            <div className="visual-preview-frame">
              {hasPreviewComparison ? (
                <div
                  className="visual-preview-compare"
                  style={previewCompareStyle}
                >
                  <img
                    className="visual-preview-compare-base"
                    src={previewImage.compareImageUrl ?? ""}
                    alt=""
                  />
                  <div className="visual-preview-comparison-layer">
                    <img src={previewImage.imageUrl} alt="" />
                  </div>
                  <span className="visual-preview-compare-label before">
                    {previewImage.compareTitle ?? "原图"}
                  </span>
                  <span className="visual-preview-compare-label after">
                    生成图
                  </span>
                  <span className="visual-preview-divider" aria-hidden="true" />
                  <input
                    className="visual-preview-slider"
                    type="range"
                    min={0}
                    max={100}
                    value={comparisonSlider}
                    onChange={(event) =>
                      setComparisonSlider(Number(event.target.value))
                    }
                    aria-label="调整原图和生成图对比"
                  />
                </div>
              ) : (
                <img src={previewImage.imageUrl} alt="" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getVisualEdgePath(
  edge: VisualCanvasEdge,
  nodes: VisualCanvasNode[],
) {
  const from = nodes.find((node) => node.id === edge.from);
  const to = nodes.find((node) => node.id === edge.to);

  if (!from || !to) {
    return "";
  }

  const fromSize = getVisualNodeSize(from);
  const toSize = getVisualNodeSize(to);
  const startX = from.x + fromSize.width;
  const startY = from.y + fromSize.height / 2;
  const endX = to.x;
  const endY = to.y + toSize.height / 2;
  const handle = Math.max(76, Math.abs(endX - startX) * 0.5);

  return `M ${startX} ${startY} C ${startX + handle} ${startY}, ${
    endX - handle
  } ${endY}, ${endX} ${endY}`;
}

function VisualCanvasNodeCard({
  node,
  active,
  canGenerateImages,
  onDelete,
  onMovePointerDown,
  onPointerMove,
  onPointerEnd,
  onResizePointerDown,
  onBodyChange,
  onGenerateImage,
  onUploadImage,
  onPreviewImage,
  onSaveImage,
}: {
  node: VisualCanvasNode;
  active: boolean;
  canGenerateImages: boolean;
  onDelete: (nodeId: string) => void;
  onMovePointerDown: (
    event: ReactPointerEvent<HTMLElement>,
    node: VisualCanvasNode,
  ) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerEnd: (event: ReactPointerEvent<HTMLElement>) => void;
  onResizePointerDown: (
    event: ReactPointerEvent<HTMLElement>,
    node: VisualCanvasNode,
  ) => void;
  onBodyChange: (nodeId: string, body: string) => void;
  onGenerateImage: (nodeId: string) => void;
  onUploadImage: (nodeId: string) => void;
  onPreviewImage: (node: VisualCanvasNode) => void;
  onSaveImage: (node: VisualCanvasNode) => void;
}) {
  const size = getVisualNodeSize(node);
  const resolutionOptions = ["2K", "4K", "6K", "8K"];
  const isGenerating = node.generationStatus === "loading";

  return (
    <article
      className={`visual-node ${node.kind} ${active ? "active" : ""}`}
      onPointerDown={(event) => onMovePointerDown(event, node)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      style={{
        left: node.x,
        top: node.y,
        width: size.width,
        height: size.height,
      }}
    >
      <div className="visual-node-topline">
        <strong>{node.title}</strong>
        {node.kind === "image" && (
          <button
            className="visual-node-control"
            type="button"
            onClick={() => onDelete(node.id)}
            aria-label="删除图片节点及其后续节点"
          >
            <X size={12} weight="bold" />
          </button>
        )}
      </div>
      {node.kind === "image" && (
        <>
          <button
            className={`visual-node-image ${
              node.imageUrl ? "visual-node-image-button" : ""
            }`}
            type="button"
            disabled={!node.imageUrl}
            onClick={() => onPreviewImage(node)}
            aria-label="查看大图"
          >
            {node.imageUrl ? (
              <img src={node.imageUrl} alt="" />
            ) : (
              <ImageIcon size={30} weight="bold" />
            )}
          </button>
          {node.subtitle && <span className="visual-node-meta">{node.subtitle}</span>}
          <button
            className="secondary-button compact visual-upload-button"
            type="button"
            onClick={() => onUploadImage(node.id)}
          >
            <UploadSimple size={14} weight="bold" />
            {node.imageUrl ? "更换图片" : "上传图片"}
          </button>
        </>
      )}
      {node.kind === "prompt" && (
        <textarea
          value={node.body ?? ""}
          onChange={(event) => onBodyChange(node.id, event.target.value)}
          placeholder="输入效果图提示词"
          aria-label="效果图提示词"
        />
      )}
      {node.kind === "resolution" && (
        <div className="visual-resolution-badges">
          {resolutionOptions.map((option) => (
            <button
              className={node.body === option ? "active" : ""}
              key={option}
              type="button"
              onClick={() => onBodyChange(node.id, option)}
            >
              {option}
            </button>
          ))}
        </div>
      )}
      {node.kind === "generated" && (
        <>
          {(node.imageUrl || node.generationStatus) && (
            <button
              className={`visual-node-image generated-output ${
                node.imageUrl ? "visual-node-image-button" : ""
              }`}
              type="button"
              disabled={!node.imageUrl}
              onClick={() => onPreviewImage(node)}
              aria-label="查看生成大图"
            >
              {node.imageUrl ? (
                <img src={node.imageUrl} alt="" />
              ) : isGenerating ? (
                <SpinnerGap size={24} weight="bold" />
              ) : (
                <ImageIcon size={28} weight="bold" />
              )}
            </button>
          )}
          {(node.body || node.subtitle) && (
            <span
              className={`visual-node-meta ${
                node.generationStatus === "error" ? "error" : ""
              }`}
            >
              {node.generationStatus === "done"
                ? node.subtitle
                : node.body ?? node.subtitle}
            </span>
          )}
          <div className="visual-node-action-row">
            <button
              className="primary-button compact visual-node-action"
              type="button"
              disabled={!canGenerateImages || isGenerating}
              onClick={() => onGenerateImage(node.id)}
            >
              {isGenerating ? (
                <SpinnerGap size={15} weight="bold" />
              ) : (
                <Sparkle size={15} weight="bold" />
              )}
              {isGenerating ? "生成中" : node.imageUrl ? "重新生成" : "生成图片"}
            </button>
            {node.imageUrl && (
              <button
                className="secondary-button compact visual-node-action"
                type="button"
                onClick={() => onSaveImage(node)}
              >
                <DownloadSimple size={15} weight="bold" />
                保存
              </button>
            )}
            {node.imageUrl && node.sourceImageUrl && (
              <button
                className="secondary-button compact visual-node-action"
                type="button"
                onClick={() => onPreviewImage(node)}
              >
                <ImageIcon size={15} weight="bold" />
                对比原图
              </button>
            )}
          </div>
        </>
      )}
      <span
        className="visual-resize-handle"
        onPointerDown={(event) => onResizePointerDown(event, node)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        role="presentation"
      />
    </article>
  );
}

function UnifiedCanvasView({
  onGeneratedImagesChange,
}: {
  onGeneratedImagesChange: (images: CanvasGeneratedImage[]) => void;
}) {
  const canvasRef = useRef<HTMLElement | null>(null);
  const imageUploadInputRef = useRef<HTMLInputElement | null>(null);
  const videoUploadInputRef = useRef<HTMLInputElement | null>(null);
  const pendingUploadNodeId = useRef<string | null>(null);
  const pendingCreatedUploadNodeId = useRef<string | null>(null);
  const objectUrls = useRef<string[]>([]);
  const panSession = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const nodeSession = useRef<{
    pointerId: number;
    nodeId: string;
    mode: "move" | "resize";
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    originWidth: number;
    originHeight: number;
    startedOnImageMedia?: boolean;
  } | null>(null);
  const [canvasNodes, setCanvasNodes] =
    useState<CanvasNode[]>(initialCanvasNodes);
  const [canvasEdges, setCanvasEdges] =
    useState<CanvasEdge[]>(initialCanvasEdges);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 70, y: 90 });
  const [isPanning, setIsPanning] = useState(false);
  const [activeCanvasNodeId, setActiveCanvasNodeId] = useState("");
  const [connectionStartNodeId, setConnectionStartNodeId] = useState<
    string | null
  >(null);
  const [connectionDraft, setConnectionDraft] =
    useState<CanvasConnectionDraft | null>(null);
  const [connectionTargetNodeId, setConnectionTargetNodeId] = useState<
    string | null
  >(null);
  const [promptingCanvasNodeId, setPromptingCanvasNodeId] = useState<
    string | null
  >(null);
  const [canvasPromptErrors, setCanvasPromptErrors] = useState<
    Record<string, string>
  >({});
  const [canvasUploadMenu, setCanvasUploadMenu] =
    useState<CanvasUploadContextMenu | null>(null);
  const [hoveredCanvasEdgeId, setHoveredCanvasEdgeId] = useState<string | null>(
    null,
  );
  const [previewImage, setPreviewImage] = useState<VisualPreviewImage | null>(
    null,
  );
  const [comparisonSlider, setComparisonSlider] = useState(50);
  const [previewZoom, setPreviewZoom] = useState(1);

  const activeNode =
    canvasNodes.find((node) => node.id === activeCanvasNodeId) ??
    canvasNodes[0] ??
    null;
  const connectionStartNode = connectionStartNodeId
    ? canvasNodes.find((node) => node.id === connectionStartNodeId) ?? null
    : null;
  const draftSourceNode = connectionDraft
    ? canvasNodes.find((node) => node.id === connectionDraft.sourceNodeId) ?? null
    : null;
  const canvasStyle = {
    "--canvas-dot-size": `${40 * zoom}px`,
    "--canvas-dot-opacity": getCanvasDotOpacity(zoom),
    "--canvas-grid-x": `${pan.x}px`,
    "--canvas-grid-y": `${pan.y}px`,
  } as CSSProperties;
  const worldStyle = {
    transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
  };
  const previewCompareStyle = {
    "--compare-position": `${comparisonSlider}%`,
    "--preview-zoom": previewZoom,
  } as CSSProperties;

  useEffect(() => {
    return () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const handleNativeWheel = (event: WheelEvent) => {
      if (shouldLetEmbeddedInputHandleWheel(event.target)) {
        return;
      }

      event.preventDefault();
      zoomCanvas(event.deltaY, event.clientX, event.clientY);
    };

    canvas.addEventListener("wheel", handleNativeWheel, { passive: false });

    return () => {
      canvas.removeEventListener("wheel", handleNativeWheel);
    };
  }, [pan.x, pan.y, zoom]);

  useEffect(() => {
    if (!connectionDraft || connectionDraft.isChoosing) {
      return;
    }

    const handleWindowConnectionPointerMove = (event: PointerEvent) => {
      const point = getCanvasPoint(event.clientX, event.clientY);
      const menuPoint = getCanvasConnectionMenuPoint(
        event.clientX,
        event.clientY,
      );
      const targetNode = getCanvasConnectionTargetNode(
        event.clientX,
        event.clientY,
        connectionDraft.sourceNodeId,
      );

      setConnectionTargetNodeId(targetNode?.id ?? null);

      setConnectionDraft((current) => {
        if (
          !current ||
          current.pointerId !== event.pointerId ||
          current.isChoosing
        ) {
          return current;
        }

        return {
          ...current,
          worldX: point.x,
          worldY: point.y,
          menuX: menuPoint.menuX,
          menuY: menuPoint.menuY,
        };
      });
    };

    const handleWindowConnectionPointerEnd = (event: PointerEvent) => {
      const point = getCanvasPoint(event.clientX, event.clientY);
      const menuPoint = getCanvasConnectionMenuPoint(
        event.clientX,
        event.clientY,
      );
      const sourceNode = canvasNodes.find(
        (node) => node.id === connectionDraft.sourceNodeId,
      );
      const existingTargetNode = getCanvasConnectionTargetNode(
        event.clientX,
        event.clientY,
        connectionDraft.sourceNodeId,
      );

      if (sourceNode && existingTargetNode) {
        addCanvasEdgeBetweenNodes(sourceNode, existingTargetNode);
        setConnectionDraft(null);
        setConnectionTargetNodeId(null);
        return;
      }

      setConnectionDraft((current) => {
        if (!current || current.pointerId !== event.pointerId) {
          return current;
        }

        return {
          ...current,
          worldX: point.x,
          worldY: point.y,
          menuX: menuPoint.menuX,
          menuY: menuPoint.menuY,
          isChoosing: true,
        };
      });
      setConnectionTargetNodeId(null);
    };

    window.addEventListener("pointermove", handleWindowConnectionPointerMove);
    window.addEventListener("pointerup", handleWindowConnectionPointerEnd);
    window.addEventListener("pointercancel", handleWindowConnectionPointerEnd);

    return () => {
      window.removeEventListener(
        "pointermove",
        handleWindowConnectionPointerMove,
      );
      window.removeEventListener("pointerup", handleWindowConnectionPointerEnd);
      window.removeEventListener(
        "pointercancel",
        handleWindowConnectionPointerEnd,
      );
    };
  }, [connectionDraft?.pointerId, connectionDraft?.isChoosing, pan.x, pan.y, zoom]);

  useEffect(() => {
    if (!connectionDraft?.isChoosing) {
      return;
    }

    const sourceNodeId = connectionDraft.sourceNodeId;
    const handleConnectionMenuKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      setConnectionDraft(null);
      setConnectionTargetNodeId(null);
      window.setTimeout(() => {
        document
          .querySelector<HTMLButtonElement>(
            `[data-canvas-connector-node-id="${sourceNodeId}"]`,
          )
          ?.focus();
      }, 0);
    };

    window.addEventListener("keydown", handleConnectionMenuKeyDown);
    return () => window.removeEventListener("keydown", handleConnectionMenuKeyDown);
  }, [connectionDraft?.isChoosing, connectionDraft?.sourceNodeId]);

  useEffect(() => {
    onGeneratedImagesChange(
      canvasNodes
        .filter((node) => node.kind === "image")
        .map((node, index) => ({
          imageUrl: getCanvasNodeMediaUrl(node),
          label:
            getSelectedCanvasVersion(node)?.label ||
            node.uploadName ||
            node.title ||
            `画布图像 ${index + 1}`,
        }))
        .filter((image) => image.imageUrl.trim()),
    );
  }, [canvasNodes, onGeneratedImagesChange]);

  function getCanvasPoint(clientX: number, clientY: number) {
    const rectElement = canvasRef.current;
    const rect = rectElement?.getBoundingClientRect();

    if (!rect || !rectElement) {
      return { x: 0, y: 0 };
    }

    const scrollLeft = rectElement.scrollLeft;
    const scrollTop = rectElement.scrollTop;

    return {
      x: (clientX - rect.left + scrollLeft - pan.x) / zoom,
      y: (clientY - rect.top + scrollTop - pan.y) / zoom,
    };
  }

  function getCanvasConnectionMenuPoint(clientX: number, clientY: number) {
    const point = getCanvasPoint(clientX, clientY);
    const rectElement = canvasRef.current;
    const rect = rectElement?.getBoundingClientRect();
    const menuWidth = 214;
    const menuHeight = 150;
    const margin = 12;

    if (!rect || !rectElement) {
      return {
        menuX: point.x + 22,
        menuY: point.y - 12,
      };
    }

    const scrollLeft = rectElement.scrollLeft;
    const scrollTop = rectElement.scrollTop;
    const visibleLeft = (scrollLeft - pan.x) / zoom + margin;
    const visibleTop = (scrollTop - pan.y) / zoom + margin;
    const visibleRight = (scrollLeft + rect.width - pan.x) / zoom - margin;
    const visibleBottom = (scrollTop + rect.height - pan.y) / zoom - margin;

    return {
      menuX: clamp(
        point.x + 22,
        visibleLeft,
        Math.max(visibleLeft, visibleRight - menuWidth),
      ),
      menuY: clamp(
        point.y - 12,
        visibleTop,
        Math.max(visibleTop, visibleBottom - menuHeight),
      ),
    };
  }

  function getCanvasUploadMenuPoint(clientX: number, clientY: number) {
    const rectElement = canvasRef.current;
    const rect = rectElement?.getBoundingClientRect();
    const menuWidth = 184;
    const menuHeight = 112;
    const margin = 10;

    if (!rect || !rectElement) {
      return {
        x: clientX,
        y: clientY,
      };
    }

    const scrollLeft = rectElement.scrollLeft;
    const scrollTop = rectElement.scrollTop;

    return {
      x: clamp(
        clientX - rect.left + scrollLeft,
        scrollLeft + margin,
        Math.max(scrollLeft + margin, scrollLeft + rect.width - menuWidth - margin),
      ),
      y: clamp(
        clientY - rect.top + scrollTop,
        scrollTop + margin,
        Math.max(scrollTop + margin, scrollTop + rect.height - menuHeight - margin),
      ),
    };
  }

  function getCanvasConnectionTargetNode(
    clientX: number,
    clientY: number,
    sourceNodeId: string,
  ) {
    const point = getCanvasPoint(clientX, clientY);
    const sourceNode = canvasNodes.find((node) => node.id === sourceNodeId);

    if (!sourceNode) {
      return null;
    }

    return (
      [...canvasNodes].reverse().find((node) => {
        if (node.id === sourceNodeId || !canConnectCanvasNodes(sourceNode, node)) {
          return false;
        }

        const size = getCanvasNodeSize(node);
        const targetWidth = Math.min(canvasConnectionTargetWidth, size.width * 0.42);

        return (
          point.x >= node.x - canvasConnectionTargetMargin &&
          point.x <= node.x + targetWidth &&
          point.y >= node.y - canvasConnectionTargetMargin &&
          point.y <= node.y + size.height + canvasConnectionTargetMargin
        );
      }) ?? null
    );
  }

  function zoomCanvas(deltaY: number, clientX: number, clientY: number) {
    const nextZoom = clamp(zoom * (deltaY > 0 ? 0.9 : 1.1), canvasZoomMin, canvasZoomMax);
    const rectElement = canvasRef.current;
    const rect = rectElement?.getBoundingClientRect();

    if (!rect || !rectElement || nextZoom === zoom) {
      return;
    }

    const scrollLeft = rectElement.scrollLeft;
    const scrollTop = rectElement.scrollTop;
    const worldX = (clientX - rect.left + scrollLeft - pan.x) / zoom;
    const worldY = (clientY - rect.top + scrollTop - pan.y) / zoom;

    setZoom(nextZoom);
    setPan({
      x: clientX - rect.left + scrollLeft - worldX * nextZoom,
      y: clientY - rect.top + scrollTop - worldY * nextZoom,
    });
  }

  function openCanvasUploadContextMenu(event: ReactMouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;

    if (
      target.closest(
        ".canvas-node, .canvas-node-type-menu, .canvas-upload-context-menu",
      )
    ) {
      return;
    }

    event.preventDefault();
    const point = getCanvasPoint(event.clientX, event.clientY);
    const menuPoint = getCanvasUploadMenuPoint(event.clientX, event.clientY);

    setConnectionDraft(null);
    setConnectionTargetNodeId(null);
    setCanvasUploadMenu({
      ...menuPoint,
      worldX: point.x,
      worldY: point.y,
    });
  }

  function handleCanvasPointerDown(event: ReactPointerEvent<HTMLElement>) {
    const target = event.target as HTMLElement;

    if (
      event.button !== 0 ||
      target.closest(
        ".canvas-node, .canvas-node-type-menu, .canvas-upload-context-menu",
      )
    ) {
      return;
    }

    setCanvasUploadMenu(null);
    setConnectionDraft(null);
    setConnectionTargetNodeId(null);
    panSession.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsPanning(true);
  }

  function handleCanvasPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const session = panSession.current;

    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    setPan({
      x: session.originX + event.clientX - session.startX,
      y: session.originY + event.clientY - session.startY,
    });
  }

  function finishCanvasPan(event: ReactPointerEvent<HTMLElement>) {
    if (panSession.current?.pointerId === event.pointerId) {
      panSession.current = null;
      setIsPanning(false);
    }
  }

  function beginCanvasNodeMove(
    event: ReactPointerEvent<HTMLElement>,
    node: CanvasNode,
  ) {
    const target = event.target as HTMLElement;

    if (target.closest("button, textarea, input, select, .visual-resize-handle")) {
      return;
    }

    const size = getCanvasNodeSize(node);
    const startedOnImageMedia = Boolean(
      target.closest(".canvas-node-media.visual-node-image-button"),
    );

    setActiveCanvasNodeId(node.id);
    nodeSession.current = {
      pointerId: event.pointerId,
      nodeId: node.id,
      mode: "move",
      startX: event.clientX,
      startY: event.clientY,
      originX: node.x,
      originY: node.y,
      originWidth: size.width,
      originHeight: size.height,
      startedOnImageMedia,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.stopPropagation();
  }

  function beginCanvasNodeResize(
    event: ReactPointerEvent<HTMLElement>,
    node: CanvasNode,
  ) {
    const size = getCanvasNodeSize(node);

    setActiveCanvasNodeId(node.id);
    nodeSession.current = {
      pointerId: event.pointerId,
      nodeId: node.id,
      mode: "resize",
      startX: event.clientX,
      startY: event.clientY,
      originX: node.x,
      originY: node.y,
      originWidth: size.width,
      originHeight: size.height,
      startedOnImageMedia: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  }

  function updateCanvasNodePointer(event: ReactPointerEvent<HTMLElement>) {
    const session = nodeSession.current;

    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = (event.clientX - session.startX) / zoom;
    const deltaY = (event.clientY - session.startY) / zoom;

    setCanvasNodes((current) =>
      current.map((node) => {
        if (node.id !== session.nodeId) {
          return node;
        }

        if (session.mode === "move") {
          return {
            ...node,
            x: session.originX + deltaX,
            y: session.originY + deltaY,
          };
        }

        const minSize = canvasNodeSizes[node.kind];

        return {
          ...node,
          width: clamp(session.originWidth + deltaX, minSize.width * 0.78, 620),
          height: clamp(session.originHeight + deltaY, minSize.height * 0.76, 520),
        };
      }),
    );
  }

  function previewCanvasNodeFromPointerSession(
    event: ReactPointerEvent<HTMLElement>,
  ) {
    const session = nodeSession.current;

    if (
      !session ||
      session.pointerId !== event.pointerId ||
      session.mode !== "move" ||
      !session.startedOnImageMedia
    ) {
      return;
    }

    if (
      Math.hypot(
        event.clientX - session.startX,
        event.clientY - session.startY,
      ) <= 5
    ) {
      const node = canvasNodes.find((item) => item.id === session.nodeId);

      if (node) {
        previewCanvasNodeImage(node);
      }
    }
  }

  function finishCanvasNodePointer(event: ReactPointerEvent<HTMLElement>) {
    if (nodeSession.current?.pointerId === event.pointerId) {
      previewCanvasNodeFromPointerSession(event);
      nodeSession.current = null;
    }
  }

  function createCanvasNode(
    kind: CanvasNodeKind,
    point: { x: number; y: number },
    count: number,
  ): CanvasNode {
    const id = createId(`canvas-${kind}`);

    if (kind === "image") {
      return {
        id,
        kind,
        title: `图像 ${count}`,
        prompt: "",
        promptSource: "manual",
        x: point.x,
        y: point.y,
        versions: [],
        params: {
          generationMode: "free",
          imageResolution: "4K",
          imageAspectRatio: "adaptive",
          imageCount: "1",
        },
      };
    }

    return {
      id,
      kind,
      title: `视频 ${count}`,
      prompt: "",
      promptSource: "manual",
      x: point.x,
      y: point.y,
      versions: [],
      params: {
        generationMode: "preserve",
        aspectRatio: "adaptive",
        videoResolution: "1080p",
        duration: "8s",
        cameraPresetId: "zoom-push",
      },
      videoPaths: [],
    };
  }

  function createCanvasStarterUpload(title: string) {
    const count = canvasNodes.filter((node) => node.kind === "image").length + 1;
    const baseNode = createCanvasNode("image", { x: 190, y: 150 }, count);
    const node = {
      ...baseNode,
      title,
      params: {
        ...baseNode.params,
        generationMode: "preserve" as LandscapeGenerationMode,
      },
    };

    setCanvasNodes((current) => [...current, node]);
    setActiveCanvasNodeId(node.id);
    pendingUploadNodeId.current = node.id;
    pendingCreatedUploadNodeId.current = node.id;
    window.setTimeout(() => imageUploadInputRef.current?.click(), 0);
  }

  function createCanvasStarterSchemeNode() {
    const count = canvasNodes.filter((node) => node.kind === "image").length + 1;
    const node = createCanvasNode("image", { x: 190, y: 150 }, count);

    setCanvasNodes((current) => [
      ...current,
      {
        ...node,
        title: `方案图 ${count}`,
        prompt: "描述方案的空间结构、功能游线、植物层次、材料、季节与使用场景。",
        params: { ...node.params, generationMode: "concept" },
      },
    ]);
    setActiveCanvasNodeId(node.id);
  }

  function handleCanvasDoubleClick(event: ReactMouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;

    if (target.closest(".canvas-node, .canvas-node-type-menu, .canvas-upload-context-menu")) {
      return;
    }

    const point = getCanvasPoint(event.clientX, event.clientY);
    const node = createCanvasNode(
      "image",
      {
        x: point.x - 146,
        y: point.y - 140,
      },
      canvasNodes.filter((item) => item.kind === "image").length + 1,
    );

    setCanvasNodes((current) => [...current, node]);
    setActiveCanvasNodeId(node.id);
    setCanvasUploadMenu(null);
  }

  function createCanvasNodeForUpload(kind: CanvasNodeKind) {
    if (!canvasUploadMenu) {
      return;
    }

    const count = canvasNodes.filter((node) => node.kind === kind).length + 1;
    const size = canvasNodeSizes[kind];
    const node = createCanvasNode(
      kind,
      {
        x: canvasUploadMenu.worldX - size.width / 2,
        y: canvasUploadMenu.worldY - size.height / 2,
      },
      count,
    );

    setCanvasNodes((current) => [...current, node]);
    setActiveCanvasNodeId(node.id);
    pendingUploadNodeId.current = node.id;
    pendingCreatedUploadNodeId.current = node.id;
    setCanvasUploadMenu(null);

    window.setTimeout(() => {
      if (kind === "image") {
        imageUploadInputRef.current?.click();
        return;
      }

      videoUploadInputRef.current?.click();
    }, 0);
  }

  function createCanvasReferenceImageNode(targetNode: CanvasNode) {
    const count = canvasNodes.filter((node) => node.kind === "image").length + 1;
    const referenceCount = canvasEdges.filter(
      (edge) =>
        edge.to === targetNode.id && isCanvasReferenceImageRole(edge.role),
    ).length;
    const referenceSize = canvasNodeSizes.image;
    const targetSize = getCanvasNodeSize(targetNode);
    const node = createCanvasNode(
      "image",
      {
        x: targetNode.x - referenceSize.width - 92,
        y: targetNode.y + Math.min(referenceCount, 4) * 42 + targetSize.height * 0.18,
      },
      count,
    );

    setCanvasNodes((current) => [...current, node]);
    setCanvasEdges((current) => [
      ...current,
      {
        id: createId("canvas-edge"),
        from: node.id,
        to: targetNode.id,
        role: "style-reference",
      },
    ]);
    setActiveCanvasNodeId(node.id);
    pendingUploadNodeId.current = node.id;
    setCanvasUploadMenu(null);

    window.setTimeout(() => {
      imageUploadInputRef.current?.click();
    }, 0);
  }

  function replaceCanvasReferenceImageNode(nodeId: string) {
    const node = canvasNodes.find((item) => item.id === nodeId);

    if (!node || !isReplaceableCanvasImageNode(node, canvasEdges)) {
      return;
    }

    setActiveCanvasNodeId(nodeId);
    pendingUploadNodeId.current = nodeId;
    pendingCreatedUploadNodeId.current = null;
    setCanvasUploadMenu(null);

    window.setTimeout(() => {
      imageUploadInputRef.current?.click();
    }, 0);
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const [file] = Array.from(event.target.files ?? []);
    const targetNodeId = pendingUploadNodeId.current;

    pendingUploadNodeId.current = null;
    pendingCreatedUploadNodeId.current = null;
    event.target.value = "";

    if (!file || !targetNodeId || !file.type.startsWith("image/")) {
      return;
    }

    const url = URL.createObjectURL(file);
    objectUrls.current.push(url);
    let width = 16;
    let height = 9;

    try {
      const image = await loadImageSource(url);
      width = image.naturalWidth || width;
      height = image.naturalHeight || height;
    } catch {
      // Keep fallback dimensions for local files that cannot be inspected.
    }

    const version: CanvasGenerationVersion = {
      id: createId("canvas-image-version"),
      kind: "image",
      url,
      prompt: "本地上传",
      params: {
        generationMode: "preserve",
        imageResolution: "source",
      },
      status: "done",
      progress: 100,
      createdAt: formatUploadTime(),
      outputText: `${formatFileSize(file.size)} · 已上传`,
      label: file.name,
      width,
      height,
    };

    setCanvasNodes((current) =>
      current.map((node) =>
        node.id === targetNodeId && node.kind === "image"
          ? {
              ...node,
              uploadName: file.name,
              uploadUrl: url,
              params: {
                ...node.params,
                generationMode: "preserve",
              },
              selectedVersionId: version.id,
              versions: [version, ...node.versions],
            }
          : node,
      ),
    );
    setCanvasEdges((current) =>
      current.filter((edge) => edge.to !== targetNodeId),
    );
    setActiveCanvasNodeId(targetNodeId);
  }

  function handleVideoUpload(event: ChangeEvent<HTMLInputElement>) {
    const [file] = Array.from(event.target.files ?? []);
    const targetNodeId = pendingUploadNodeId.current;
    const createdNodeId = pendingCreatedUploadNodeId.current;

    pendingUploadNodeId.current = null;
    pendingCreatedUploadNodeId.current = null;
    event.target.value = "";

    if (!file || !targetNodeId || !file.type.startsWith("video/")) {
      return;
    }

    if (file.size > CANVAS_VIDEO_UPLOAD_MAX_BYTES) {
      window.alert(
        `视频文件不能超过 ${CANVAS_VIDEO_UPLOAD_MAX_MB}MB，请压缩后再上传。`,
      );

      if (createdNodeId === targetNodeId) {
        setCanvasNodes((current) =>
          current.filter((node) => node.id !== targetNodeId),
        );
        setActiveCanvasNodeId((current) =>
          current === targetNodeId
            ? canvasNodes.find((node) => node.id !== targetNodeId)?.id ?? ""
            : current,
        );
      }

      return;
    }

    const url = URL.createObjectURL(file);
    objectUrls.current.push(url);

    const version: CanvasGenerationVersion = {
      id: createId("canvas-video-version"),
      kind: "video",
      url,
      prompt: "本地上传",
      params: { generationMode: "preserve" },
      status: "done",
      progress: 100,
      createdAt: formatUploadTime(),
      outputText: `${formatFileSize(file.size)} · 已上传`,
      label: file.name,
    };

    setCanvasNodes((current) =>
      current.map((node) =>
        node.id === targetNodeId && node.kind === "video"
          ? {
              ...node,
              uploadName: file.name,
              uploadUrl: url,
              selectedVersionId: version.id,
              versions: [version, ...node.versions],
            }
          : node,
      ),
    );
    setActiveCanvasNodeId(targetNodeId);
  }

  function updateCanvasNodePrompt(
    nodeId: string,
    prompt: string,
    promptSource: CanvasPromptSource = "manual",
  ) {
    setCanvasNodes((current) =>
      current.map((node) =>
        node.id === nodeId ? { ...node, prompt, promptSource } : node,
      ),
    );
  }

  function updateCanvasNodeParam(
    nodeId: string,
    key: keyof CanvasNodeParams,
    value: string,
  ) {
    setCanvasNodes((current) =>
      current.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              params: {
                ...node.params,
                [key]: value,
              },
            }
          : node,
      ),
    );
  }

  function addCanvasVersion(nodeId: string, version: CanvasGenerationVersion) {
    setCanvasNodes((current) =>
      current.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              selectedVersionId: version.id,
              versions: [version, ...node.versions],
            }
          : node,
      ),
    );
  }

  function updateCanvasVersion(
    nodeId: string,
    versionId: string,
    updater: (version: CanvasGenerationVersion) => CanvasGenerationVersion,
  ) {
    setCanvasNodes((current) =>
      current.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              selectedVersionId: versionId,
              versions: node.versions.map((version) =>
                version.id === versionId ? updater(version) : version,
              ),
            }
          : node,
      ),
    );
  }

  function selectCanvasNodeVersion(nodeId: string, versionId: string) {
    setCanvasNodes((current) =>
      current.map((node) => {
        if (node.id !== nodeId) {
          return node;
        }

        const selectedVersion = node.versions.find(
          (version) => version.id === versionId,
        );

        return {
          ...node,
          selectedVersionId: versionId,
          prompt: selectedVersion?.prompt ?? node.prompt,
          promptSource: selectedVersion?.prompt ? "generated" : node.promptSource,
          params: selectedVersion?.params ?? node.params,
        };
      }),
    );
  }

  function deleteCanvasNode(nodeId: string) {
    setCanvasNodes((current) => current.filter((node) => node.id !== nodeId));
    setCanvasEdges((current) =>
      current.filter((edge) => edge.from !== nodeId && edge.to !== nodeId),
    );
    setConnectionStartNodeId((current) => (current === nodeId ? null : current));
    setConnectionTargetNodeId((current) => (current === nodeId ? null : current));
    setActiveCanvasNodeId((current) =>
      current === nodeId
        ? canvasNodes.find((node) => node.id !== nodeId)?.id ?? ""
        : current,
    );
  }

  function deleteCanvasEdge(edgeId: string) {
    setCanvasEdges((current) =>
      current.filter((edge) => edge.id !== edgeId),
    );
    setHoveredCanvasEdgeId((current) => (current === edgeId ? null : current));
  }

  function addCanvasEdgeBetweenNodes(sourceNode: CanvasNode, targetNode: CanvasNode) {
    if (!canConnectCanvasNodes(sourceNode, targetNode)) {
      return;
    }

    setCanvasEdges((current) => {
      const duplicate = current.some(
        (edge) => edge.from === sourceNode.id && edge.to === targetNode.id,
      );

      if (duplicate) {
        return current;
      }

      return [
        ...current,
        {
          id: createId("canvas-edge"),
          from: sourceNode.id,
          to: targetNode.id,
          role: getDefaultCanvasEdgeRole(sourceNode, targetNode, current),
        },
      ];
    });
  }

  function getIncomingCanvasReferences(targetNodeId: string) {
    return canvasEdges
      .filter((edge) => edge.to === targetNodeId)
      .map((edge) => ({
        edge,
        node: canvasNodes.find((item) => item.id === edge.from) ?? null,
      }))
      .filter(
        (item): item is { edge: CanvasEdge; node: CanvasNode } =>
          Boolean(item.node),
      );
  }

  function getCanvasImageGenerationReferences(nodeId: string) {
    const targetNode = canvasNodes.find((node) => node.id === nodeId);
    const references = getIncomingCanvasReferences(nodeId)
      .filter((reference) => reference.node.kind === "image")
      .map((reference) => ({
        edgeId: reference.edge.id,
        nodeId: reference.node.id,
        targetNodeId: reference.edge.to,
        url: getCanvasNodeMediaUrl(reference.node),
        title: reference.node.title,
        role: reference.edge.role,
        mentionToken: getCanvasImageMentionToken(reference.node),
        mentioned: false,
      }))
      .filter((reference) => reference.url.trim());

    return markCanvasImageReferencesMentioned(targetNode?.prompt ?? "", [
      ...references.filter((reference) => isCanvasPrimaryImageRole(reference.role)),
      ...references.filter((reference) => !isCanvasPrimaryImageRole(reference.role)),
    ]);
  }

  function getSelectedCanvasImageReferences(
    prompt: string,
    references: CanvasImageReference[],
  ) {
    const nextReferences = markCanvasImageReferencesMentioned(prompt, references);
    const referenceImages = nextReferences.filter(
      (reference) => !isCanvasPrimaryImageRole(reference.role),
    );

    if (!prompt.includes("@")) {
      return referenceImages;
    }

    const selectedReferences = referenceImages.filter(
      (reference) => reference.mentioned,
    );

    return selectedReferences.length > 0 ? selectedReferences : referenceImages;
  }

  function getCanvasPromptImageReferences(
    prompt: string,
    references: CanvasImageReference[],
  ) {
    const nextReferences = markCanvasImageReferencesMentioned(prompt, references);
    const mainImages = nextReferences.filter(
      (reference) => isCanvasPrimaryImageRole(reference.role),
    );
    const referenceImages = nextReferences.filter(
      (reference) => !isCanvasPrimaryImageRole(reference.role),
    );
    const selectedReferences = referenceImages.filter(
      (reference) => reference.mentioned,
    );

    if (!prompt.includes("@")) {
      return [...mainImages, ...referenceImages];
    }

    return [...mainImages, ...(selectedReferences.length > 0 ? selectedReferences : referenceImages)];
  }

  function getCanvasPromptMentionOptions(nodeId: string) {
    return getCanvasImageGenerationReferences(nodeId);
  }

  function insertCanvasPromptMention(nodeId: string, reference: CanvasImageReference) {
    setCanvasNodes((current) =>
      current.map((node) => {
        if (node.id !== nodeId) {
          return node;
        }

        const prompt = node.prompt;
        const atIndex = prompt.lastIndexOf("@");
        const mention = getCanvasImageMentionToken(reference);
        const nextPrompt =
          atIndex === -1
            ? `${prompt}${prompt.endsWith(" ") || !prompt ? "" : " "}${mention} `
            : `${prompt.slice(0, atIndex)}${mention} `;

        return {
          ...node,
          prompt: nextPrompt,
          promptSource: "manual",
        };
      }),
    );
  }

  async function collectCanvasPromptImages(
    node: CanvasNode,
    options: { includeCurrentImage?: boolean } = {},
  ) {
    const rawImages: Array<{
      imageUrl: string;
      label: string;
      role: string;
    }> = [];
    const includeCurrentImage = options.includeCurrentImage ?? true;

    const nodeImageUrl = getCanvasNodeMediaUrl(node);

    if (includeCurrentImage && node.kind === "image" && nodeImageUrl) {
      rawImages.push({
        imageUrl: nodeImageUrl,
        label: `${node.title} 当前图像`,
        role: "current-image",
      });
    }

    getCanvasPromptImageReferences(
      node.prompt,
      getCanvasImageGenerationReferences(node.id),
    ).forEach((reference) => {
      rawImages.push({
        imageUrl: reference.url,
        label: `${reference.title} ${canvasEdgeRoleLabels[reference.role]}`,
        role: reference.role,
      });
    });

    const seen = new Set<string>();
    const images: Array<{ imageUrl: string; label: string; role: string }> = [];

    for (const item of rawImages) {
      const { imageUrl } = item;
      const resolvedImageUrl = await resolveImageUrlForAgentApi(imageUrl);

      if (!resolvedImageUrl || seen.has(resolvedImageUrl)) {
        continue;
      }

      seen.add(resolvedImageUrl);
      images.push({
        ...item,
        imageUrl: resolvedImageUrl,
      });
    }

    return images;
  }

  async function requestCanvasGeneratedPrompt({
    node,
    images,
    fallbackPrompt,
  }: {
    node: CanvasNode;
    images: Array<{ imageUrl: string; label: string; role: string }>;
    fallbackPrompt: string;
  }) {
    if (!images.length) {
      throw new Error("请先上传主图或连接参考图，再生成提示词。");
    }

    const response = await fetch("/api/zerlum-prompt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nodeTitle: node.title,
        generationMode: node.params.generationMode,
        currentPrompt: fallbackPrompt,
        images,
        relationships: images.map(({ label, role }) => ({ label, role })),
      }),
    });
    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(parseApiErrorText(responseText, "提示词生成失败"));
    }

    const payload = JSON.parse(responseText) as {
      prompt?: string;
    };
    const finalPrompt = payload.prompt?.trim() ?? "";

    if (!finalPrompt) {
      throw new Error("提示词生成失败");
    }

    return finalPrompt;
  }

  function connectCanvasNodes(targetNodeId: string) {
    if (!connectionStartNode || connectionStartNode.id === targetNodeId) {
      return;
    }

    const targetNode = canvasNodes.find((node) => node.id === targetNodeId);

    if (!targetNode || !canConnectCanvasNodes(connectionStartNode, targetNode)) {
      return;
    }

    const duplicate = canvasEdges.some(
      (edge) => edge.from === connectionStartNode.id && edge.to === targetNode.id,
    );

    if (!duplicate) {
      setCanvasEdges((current) => [
        ...current,
        {
          id: createId("canvas-edge"),
          from: connectionStartNode.id,
          to: targetNode.id,
          role: getDefaultCanvasEdgeRole(connectionStartNode, targetNode, current),
        },
      ]);
    }

    setConnectionStartNodeId(null);
  }

  function beginCanvasConnectionDrag(
    event: ReactPointerEvent<HTMLElement>,
    node: CanvasNode,
  ) {
    const connectorRect = event.currentTarget.getBoundingClientRect();
    const connectorCenter = getCanvasPoint(
      connectorRect.left + connectorRect.width / 2,
      connectorRect.top + connectorRect.height / 2,
    );
    const pointerPoint = getCanvasPoint(event.clientX, event.clientY);
    const menuPoint = getCanvasConnectionMenuPoint(
      event.clientX,
      event.clientY,
    );

    setActiveCanvasNodeId(node.id);
    setConnectionStartNodeId(null);
    setConnectionTargetNodeId(null);
    setConnectionDraft({
      sourceNodeId: node.id,
      pointerId: event.pointerId,
      startX: connectorCenter.x,
      startY: connectorCenter.y,
      worldX: pointerPoint.x,
      worldY: pointerPoint.y,
      menuX: menuPoint.menuX,
      menuY: menuPoint.menuY,
      isChoosing: false,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  }

  function openCanvasConnectionMenuFromKeyboard(
    node: CanvasNode,
    connector: HTMLButtonElement,
  ) {
    const connectorRect = connector.getBoundingClientRect();
    const clientX = connectorRect.left + connectorRect.width / 2;
    const clientY = connectorRect.top + connectorRect.height / 2;
    const connectorCenter = getCanvasPoint(clientX, clientY);
    const menuClientX = connectorRect.right + 12;
    const menuPoint = getCanvasConnectionMenuPoint(menuClientX, clientY);
    const worldPoint = getCanvasPoint(menuClientX, clientY);

    setActiveCanvasNodeId(node.id);
    setConnectionStartNodeId(null);
    setConnectionTargetNodeId(null);
    setConnectionDraft({
      sourceNodeId: node.id,
      pointerId: -1,
      startX: connectorCenter.x,
      startY: connectorCenter.y,
      worldX: worldPoint.x,
      worldY: worldPoint.y,
      menuX: menuPoint.menuX,
      menuY: menuPoint.menuY,
      isChoosing: true,
    });
  }

  function updateCanvasConnectionDrag(event: ReactPointerEvent<HTMLElement>) {
    const point = getCanvasPoint(event.clientX, event.clientY);
    const menuPoint = getCanvasConnectionMenuPoint(
      event.clientX,
      event.clientY,
    );
    const targetNode = connectionDraft
      ? getCanvasConnectionTargetNode(
          event.clientX,
          event.clientY,
          connectionDraft.sourceNodeId,
        )
      : null;

    setConnectionTargetNodeId(targetNode?.id ?? null);

    setConnectionDraft((current) => {
      if (!current || current.pointerId !== event.pointerId || current.isChoosing) {
        return current;
      }

      return {
        ...current,
        worldX: point.x,
        worldY: point.y,
        menuX: menuPoint.menuX,
        menuY: menuPoint.menuY,
      };
    });
    event.stopPropagation();
  }

  function finishCanvasConnectionDrag(event: ReactPointerEvent<HTMLElement>) {
    const point = getCanvasPoint(event.clientX, event.clientY);
    const menuPoint = getCanvasConnectionMenuPoint(
      event.clientX,
      event.clientY,
    );
    const sourceNode = connectionDraft
      ? canvasNodes.find((node) => node.id === connectionDraft.sourceNodeId)
      : null;
    const existingTargetNode = connectionDraft
      ? getCanvasConnectionTargetNode(
          event.clientX,
          event.clientY,
          connectionDraft.sourceNodeId,
        )
      : null;

    if (sourceNode && existingTargetNode) {
      addCanvasEdgeBetweenNodes(sourceNode, existingTargetNode);
      setConnectionDraft(null);
      setConnectionTargetNodeId(null);
      event.stopPropagation();
      return;
    }

    setConnectionDraft((current) => {
      if (!current || current.pointerId !== event.pointerId) {
        return current;
      }

      return {
        ...current,
        worldX: point.x,
        worldY: point.y,
        menuX: menuPoint.menuX,
        menuY: menuPoint.menuY,
          isChoosing: true,
        };
      });
    setConnectionTargetNodeId(null);
    event.stopPropagation();
  }

  function createCanvasNodeFromDraft(action: CanvasBranchAction) {
    if (!connectionDraft) {
      return;
    }

    const kind: CanvasNodeKind = action === "walkthrough" ? "video" : "image";
    const sourceNode = canvasNodes.find(
      (node) => node.id === connectionDraft.sourceNodeId,
    );
    const nodeCount = canvasNodes.filter((node) => node.kind === kind).length + 1;
    const size = canvasNodeSizes[kind];
    const baseNode = createCanvasNode(
      kind,
      {
        x: connectionDraft.worldX + 42,
        y: connectionDraft.worldY - size.height / 2,
      },
      nodeCount,
    );
    const promptSeeds: Partial<Record<CanvasBranchAction, string>> = {
      "scheme-image": "基于上游场地资料生成完整景观方案图，明确空间结构、功能游线、植物层次与材料关系。",
      variation: "在保留场地尺度与关键约束的前提下，创建一个清晰可比较的景观方向变体。",
      detail: "聚焦当前方案的关键节点，深化植物、材料、构筑物和人尺度细节。",
      walkthrough: "生成连续的景观空间漫游，保持主体、尺度、植物与材料的前后连续性。",
    };
    const modeByAction: Record<CanvasBranchAction, LandscapeGenerationMode> = {
      "scheme-image": "preserve",
      reference: "free",
      variation: "variation",
      detail: "local-edit",
      walkthrough: "preserve",
    };
    const node = {
      ...baseNode,
      prompt: promptSeeds[action] ?? baseNode.prompt,
      params: {
        ...baseNode.params,
        generationMode: modeByAction[action],
      },
    };

    if (!sourceNode || !canConnectCanvasNodes(sourceNode, node)) {
      setConnectionDraft(null);
      setConnectionTargetNodeId(null);
      return;
    }

    setCanvasNodes((current) => [...current, node]);
    setCanvasEdges((current) => [
      ...current,
      {
        id: createId("canvas-edge"),
        from: sourceNode.id,
        to: node.id,
        role:
          action === "reference"
            ? "style-reference"
            : getDefaultCanvasEdgeRole(sourceNode, node, current),
      },
    ]);
    setActiveCanvasNodeId(node.id);
    setConnectionDraft(null);
    setConnectionTargetNodeId(null);

    if (action === "reference") {
      pendingUploadNodeId.current = node.id;
      pendingCreatedUploadNodeId.current = node.id;
      window.setTimeout(() => imageUploadInputRef.current?.click(), 0);
    }
  }

  async function generateCanvasNodePrompt(nodeId: string) {
    const node = canvasNodes.find((item) => item.id === nodeId);

    if (!node || node.kind !== "image") {
      return;
    }

    setActiveCanvasNodeId(node.id);
    setCanvasPromptErrors((current) => {
      const next = { ...current };
      delete next[node.id];

      return next;
    });
    setPromptingCanvasNodeId(node.id);

    try {
      const images = await collectCanvasPromptImages(node);

      if (!images.length) {
        throw new Error("请先上传主图或连接参考图，再一键生成提示词。");
      }

      const finalPrompt = await requestCanvasGeneratedPrompt({
        node,
        images,
        fallbackPrompt: node.prompt,
      });

      updateCanvasNodePrompt(node.id, finalPrompt, "generated");
    } catch (error) {
      setCanvasPromptErrors((current) => ({
        ...current,
        [node.id]:
          error instanceof Error
            ? error.message
            : "提示词生成失败，请稍后重试。",
      }));
    } finally {
      setPromptingCanvasNodeId((current) => (current === node.id ? null : current));
    }
  }

  async function generateCanvasImage(nodeId: string) {
    const node = canvasNodes.find((item) => item.id === nodeId);
    const userPrompt = node?.prompt.trim() ?? "";

    if (!node || node.kind !== "image" || !userPrompt) {
      return;
    }

    const targetResolution = node.params.imageResolution ?? "4K";
    const targetAspectRatio = node.params.imageAspectRatio ?? "adaptive";
    const targetImageCount = node.params.imageCount ?? "1";
    const canvasImageReferences = getCanvasImageGenerationReferences(node.id);
    const primaryImageUrl = canvasImageReferences[0]?.url ?? "";
    const mainImageReference =
      canvasImageReferences.find((reference) =>
        isCanvasPrimaryImageRole(reference.role),
      ) ?? null;
    const selectedCanvasImageReferences = getSelectedCanvasImageReferences(node.prompt, canvasImageReferences);
    const versionId = createId("canvas-image-version");

    addCanvasVersion(node.id, {
      id: versionId,
      kind: "image",
      url: "",
      prompt: userPrompt,
      params: {
        generationMode: node.params.generationMode,
        imageResolution: targetResolution,
        imageAspectRatio: targetAspectRatio,
        imageCount: targetImageCount,
      },
      status: "loading",
      progress: 16,
      createdAt: formatUploadTime(),
      outputText: "生成原图中",
      sourceImageUrl: primaryImageUrl,
      sourceTitle: canvasImageReferences[0]?.title,
    });

    try {
      const promptImages = await collectCanvasPromptImages(node, {
        includeCurrentImage: false,
      });

      if (!promptImages.length) {
        throw new Error("请先上传主图或连接参考图，再生成图片。");
      }

      const finalPrompt = userPrompt;

      updateCanvasVersion(node.id, versionId, (version) => ({
        ...version,
        prompt: finalPrompt,
        progress: Math.max(version.progress, 24),
        outputText: "生成原图中",
      }));

      const response = await fetch("/api/zerlum-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          imageUrl: await resolveImageUrlForAgentApi(mainImageReference?.url ?? primaryImageUrl),
          mainImage: mainImageReference
            ? {
                edgeId: mainImageReference.edgeId,
                nodeId: mainImageReference.nodeId,
                targetNodeId: mainImageReference.targetNodeId,
                title: mainImageReference.title,
                label: mainImageReference.title,
                role: mainImageReference.role,
                mentionToken: mainImageReference.mentionToken,
                mentioned: mainImageReference.mentioned,
                imageUrl: await resolveImageUrlForAgentApi(mainImageReference.url),
              }
            : null,
          referenceImages: await Promise.all(
            selectedCanvasImageReferences.map(async (reference) => ({
              imageUrl: await resolveImageUrlForAgentApi(reference.url),
              label: reference.title,
              nodeId: reference.nodeId,
              edgeId: reference.edgeId,
              targetNodeId: reference.targetNodeId,
              role: reference.role,
              mentionToken: reference.mentionToken,
              mentioned: reference.mentioned,
            })),
          ),
          connectedImages: await Promise.all(
            canvasImageReferences.map(async (reference) => ({
              imageUrl: await resolveImageUrlForAgentApi(reference.url),
              label: reference.title,
              nodeId: reference.nodeId,
              edgeId: reference.edgeId,
              targetNodeId: reference.targetNodeId,
              role: reference.role,
              mentionToken: reference.mentionToken,
              mentioned: reference.mentioned,
            })),
          ),
          resolution: targetResolution,
          aspectRatio: targetAspectRatio,
          imageCount: targetImageCount,
          count: Number.parseInt(targetImageCount, 10) || 1,
          waitForUpscale: false,
        }),
      });
      const payload = (await response.json()) as {
        imageUrl?: string;
        baseImageUrl?: string;
        upscalePending?: boolean;
        upscaleTaskId?: string;
        upscaleError?: string;
        outputText?: string;
        error?: string;
      };

      if (!response.ok || !payload.imageUrl) {
        throw new Error(payload.error || "图片生成失败");
      }

      let width = 16;
      let height = 9;

      try {
        const image = await loadImageSource(payload.imageUrl);
        width = image.naturalWidth || width;
        height = image.naturalHeight || height;
      } catch {
        // Remote generated images can still be previewed without dimensions.
      }

      updateCanvasVersion(node.id, versionId, (version) => ({
        ...version,
        url: payload.imageUrl ?? "",
        status: payload.upscaleTaskId ? "submitted" : "done",
        progress: payload.upscaleTaskId ? 72 : 100,
        taskId: payload.upscaleTaskId,
        outputText: payload.upscaleTaskId
          ? "高清放大中"
          : payload.upscaleError
            ? `原图可用，高清放大未完成：${payload.upscaleError}`
            : payload.outputText || "生成完成",
        label: `${targetResolution} · ${targetAspectRatio} · ${formatUploadTime()}`,
        width,
        height,
      }));

      if (payload.upscaleTaskId) {
        void pollCanvasImageUpscale({
          nodeId: node.id,
          versionId,
          taskId: payload.upscaleTaskId,
          baseImageUrl: payload.baseImageUrl || payload.imageUrl,
          targetResolution,
          targetAspectRatio,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "图片生成失败，请稍后再试。";

      updateCanvasVersion(node.id, versionId, (version) => ({
        ...version,
        status: "error",
        progress: 6,
        outputText: message,
      }));
    }
  }

  async function pollCanvasImageUpscale({
    nodeId,
    versionId,
    taskId,
    baseImageUrl,
    targetResolution,
    targetAspectRatio,
  }: {
    nodeId: string;
    versionId: string;
    taskId: string;
    baseImageUrl: string;
    targetResolution: string;
    targetAspectRatio: string;
  }) {
    const deadline = Date.now() + CANVAS_IMAGE_UPSCALE_POLL_TIMEOUT_MS;

    try {
      while (Date.now() < deadline) {
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, CANVAS_IMAGE_UPSCALE_POLL_INTERVAL_MS);
        });

        const response = await fetch(
          `/api/zerlum-image-upscale-status?taskId=${encodeURIComponent(taskId)}`,
        );
        const rawText = await response.text();
        let payload: {
          status?: string;
          imageUrl?: string;
          outputText?: string;
          error?: string;
        } = {};

        if (rawText) {
          try {
            payload = JSON.parse(rawText) as typeof payload;
          } catch {
            payload = { error: rawText };
          }
        }

        if (!response.ok || payload.status === "error") {
          throw new Error(
            payload.error || payload.outputText || "高清放大失败",
          );
        }

        if (payload.status !== "done" || !payload.imageUrl) {
          continue;
        }

        let width = 16;
        let height = 9;

        try {
          const image = await loadImageSource(payload.imageUrl);
          width = image.naturalWidth || width;
          height = image.naturalHeight || height;
        } catch {
          // The completed image remains usable even if its dimensions cannot be read.
        }

        updateCanvasVersion(nodeId, versionId, (version) => ({
          ...version,
          url: payload.imageUrl ?? baseImageUrl,
          status: "done",
          progress: 100,
          taskId: undefined,
          outputText: payload.outputText || "高清放大完成",
          label: `${targetResolution} · ${targetAspectRatio} · ${formatUploadTime()}`,
          width,
          height,
        }));
        return;
      }

      throw new Error("高清放大等待超时");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "高清放大未完成";

      updateCanvasVersion(nodeId, versionId, (version) => ({
        ...version,
        url: version.url || baseImageUrl,
        status: "done",
        progress: 100,
        taskId: undefined,
        outputText: `原图可用，高清放大未完成：${message}`,
      }));
    }
  }

  async function pollCanvasVideoTaskStatus({
    nodeId,
    versionId,
    taskId,
    startedAt,
    estimatedWaitMs,
  }: {
    nodeId: string;
    versionId: string;
    taskId: string;
    startedAt: number;
    estimatedWaitMs: number;
  }) {
    const deadline = Date.now() + VIDEO_STATUS_POLL_TIMEOUT_MS;

    while (Date.now() < deadline) {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, VIDEO_STATUS_POLL_INTERVAL_MS);
      });

      const response = await fetch(
        `/api/zerlum-video-status?taskId=${encodeURIComponent(taskId)}`,
      );
      const rawText = await response.text();
      let payload: Record<string, unknown> = {};

      try {
        payload = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
      } catch {
        payload = { outputText: rawText };
      }

      const outputText =
        typeof payload.outputText === "string" && payload.outputText.trim()
          ? payload.outputText
          : "";

      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : outputText || rawText || "视频任务状态查询失败。",
        );
      }

      const videoUrl =
        typeof payload.videoUrl === "string" ? payload.videoUrl : "";
      const status = typeof payload.status === "string" ? payload.status : "";

      if (videoUrl || isVideoDoneStatus(status)) {
        updateCanvasVersion(nodeId, versionId, (version) => ({
          ...version,
          status: "done",
          progress: 100,
          url: videoUrl,
          taskId,
          outputText: outputText || "视频已生成。",
        }));
        return;
      }

      if (isVideoFailedStatus(status)) {
        throw new Error(outputText || "视频任务生成失败。");
      }

      const elapsed = Date.now() - startedAt;
      const nextProgress = Math.min(
        96,
        Math.round(28 + (elapsed / estimatedWaitMs) * 68),
      );
      const progressStage = getVideoProgressStage(nextProgress);

      updateCanvasVersion(nodeId, versionId, (version) => ({
        ...version,
        status: "submitted",
        progress: Math.max(version.progress, nextProgress),
        taskId,
        outputText: outputText || progressStage.text,
      }));
    }

    updateCanvasVersion(nodeId, versionId, (version) => ({
      ...version,
      status: "submitted",
      progress: Math.max(version.progress, 96),
      taskId,
      outputText: "视频仍在生成，可保持页面打开继续等待或稍后重试查询。",
    }));
  }

  async function generateCanvasVideo(nodeId: string) {
    const node = canvasNodes.find((item) => item.id === nodeId);
    const cleanPrompt = node?.prompt.trim() ?? "";

    if (!node || node.kind !== "video" || !cleanPrompt) {
      return;
    }

    const selectedCameraPreset =
      videoCameraPresets.find(
        (preset) => preset.id === node.params.cameraPresetId,
      ) ?? videoCameraPresets[1];
    const promptWithCamera = selectedCameraPreset?.prompt
      ? `${cleanPrompt}\n镜头运动：${selectedCameraPreset.prompt}`
      : cleanPrompt;
    const aspectRatio = node.params.aspectRatio ?? "adaptive";
    const resolution = node.params.videoResolution ?? "1080p";
    const duration = node.params.duration ?? "8s";
    const versionId = createId("canvas-video-version");
    const startedAt = Date.now();
    const estimatedWaitMs = getVideoEstimatedWaitMs(duration);
    let progressTimer: number | null = null;

    addCanvasVersion(node.id, {
      id: versionId,
      kind: "video",
      url: "",
      prompt: promptWithCamera,
      params: {
        generationMode: node.params.generationMode,
        aspectRatio,
        videoResolution: resolution,
        duration,
        cameraPresetId: selectedCameraPreset?.id,
      },
      status: "loading",
      progress: 12,
      createdAt: formatUploadTime(),
      outputText: "正在提交 Ark Seedance 视频生成任务。",
    });

    try {
      progressTimer = window.setInterval(() => {
        const elapsed = Date.now() - startedAt;
        const nextProgress = Math.min(
          92,
          Math.round(12 + (elapsed / estimatedWaitMs) * 80),
        );
        const progressStage = getVideoProgressStage(nextProgress);

        updateCanvasVersion(node.id, versionId, (version) =>
          version.status === "loading" || version.status === "submitted"
            ? {
                ...version,
                progress: Math.max(version.progress, nextProgress),
                outputText: progressStage.text,
              }
            : version,
        );
      }, 1000);

      const canvasReferenceImages: Array<{ url: string; label: string }> = [];
      const canvasReferenceVideos: Array<{ url: string; label: string }> = [];

      for (const reference of getIncomingCanvasReferences(node.id)) {
        const sourceUrl = getCanvasNodeMediaUrl(reference.node);

        if (!sourceUrl) {
          continue;
        }

        if (reference.node.kind === "image") {
          canvasReferenceImages.push({
            url: await resolveImageUrlForAgentApi(sourceUrl),
            label:
              getSelectedCanvasVersion(reference.node)?.label ??
              reference.node.title,
          });
        }

        if (
          reference.node.kind === "video" &&
          reference.edge.role === "reference-video"
        ) {
          canvasReferenceVideos.push({
            url: await resolveMediaUrlForAgentApi(sourceUrl),
            label:
              getSelectedCanvasVersion(reference.node)?.label ??
              reference.node.title,
          });
        }
      }

      const response = await fetch("/api/zerlum-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: promptWithCamera,
          aspectRatio,
          resolution,
          duration,
          referenceImages: canvasReferenceImages,
          referenceVideos: canvasReferenceVideos,
          imagePaths: node.videoPaths ?? [],
        }),
      });
      const rawText = await response.text();
      let payload: Record<string, unknown> = {};

      try {
        payload = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
      } catch {
        payload = { outputText: rawText };
      }

      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : rawText || "视频生成请求失败。",
        );
      }

      const videoUrl =
        typeof payload.videoUrl === "string" ? payload.videoUrl : "";
      const taskId = typeof payload.taskId === "string" ? payload.taskId : "";
      const outputText =
        typeof payload.outputText === "string" && payload.outputText.trim()
          ? payload.outputText
          : videoUrl
            ? "视频已生成。"
            : "视频任务已提交，生成仍在进行。";

      updateCanvasVersion(node.id, versionId, (version) => ({
        ...version,
        status: videoUrl ? "done" : "submitted",
        progress: videoUrl ? 100 : Math.max(version.progress, 28),
        url: videoUrl,
        taskId,
        outputText,
      }));

      if (!videoUrl && taskId) {
        await pollCanvasVideoTaskStatus({
          nodeId: node.id,
          versionId,
          taskId,
          startedAt,
          estimatedWaitMs,
        });
      }
    } catch (error) {
      const errorText = getVideoGenerationErrorMessage(error);

      updateCanvasVersion(node.id, versionId, (version) => ({
        ...version,
        status: "error",
        progress: Math.max(version.progress, 6),
        outputText: errorText,
      }));
    } finally {
      if (progressTimer !== null) {
        window.clearInterval(progressTimer);
      }
    }
  }

  function previewCanvasNodeImage(node: CanvasNode) {
    const mediaUrl = getCanvasNodeMediaUrl(node);
    const version = getSelectedCanvasVersion(node);

    if (!mediaUrl || node.kind !== "image") {
      return;
    }

    setComparisonSlider(50);
    setPreviewZoom(1);
    setPreviewImage({
      imageUrl: mediaUrl,
      title: getCanvasNodeImageTitle(node, version),
      subtitle:
        version?.width && version?.height
          ? `${version.width} × ${version.height}${
              version.outputText ? ` · ${version.outputText}` : ""
            }`
          : version?.outputText,
      compareImageUrl: version?.sourceImageUrl,
      compareTitle: version?.sourceTitle,
    });
  }

  function handlePreviewWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    const delta = event.deltaY < 0 ? 0.18 : -0.18;

    setPreviewZoom((current) => clamp(current + delta, 0.5, 5));
  }

  function getCanvasDownloadName(title: string) {
    const cleanName = title
      .replace(/\.(png|jpe?g|webp|gif)$/i, "")
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-")
      .slice(0, 80)
      .trim();

    return cleanName || `zerlum-image-${Date.now()}`;
  }

  function inferCanvasDownloadExtension(mimeType: string) {
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

  function canFetchCanvasImageForDownload(imageUrl: string) {
    if (/^(blob:|data:)/i.test(imageUrl)) {
      return true;
    }

    try {
      const url = new URL(imageUrl, window.location.href);

      return url.origin === window.location.origin;
    } catch {
      return false;
    }
  }

  function triggerCanvasImageDownload(
    imageUrl: string,
    fileName: string,
    options: { openInNewTab?: boolean } = {},
  ) {
    const link = document.createElement("a");

    link.href = imageUrl;
    link.download = fileName;

    if (options.openInNewTab) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function saveCanvasImage(imageUrl: string, title: string) {
    const baseName = getCanvasDownloadName(title);

    if (!canFetchCanvasImageForDownload(imageUrl)) {
      triggerCanvasImageDownload(imageUrl, `${baseName}.png`, {
        openInNewTab: true,
      });
      return;
    }

    try {
      const response = await fetch(imageUrl);

      if (!response.ok) {
        throw new Error("图片下载失败");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      triggerCanvasImageDownload(
        objectUrl,
        `${baseName}.${inferCanvasDownloadExtension(blob.type)}`,
      );
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1200);
    } catch {
      triggerCanvasImageDownload(imageUrl, `${baseName}.png`, {
        openInNewTab: true,
      });
    }
  }

  return (
    <div className="canvas-layout">
      <section
        ref={canvasRef}
        className={`infinite-canvas ${isPanning ? "is-panning" : ""}`}
        style={canvasStyle}
        onDoubleClick={handleCanvasDoubleClick}
        onContextMenu={openCanvasUploadContextMenu}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={finishCanvasPan}
        onPointerCancel={finishCanvasPan}
      >
        {canvasNodes.length === 0 && (
          <div
            className="canvas-empty-state"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <span className="canvas-empty-kicker">方案画布</span>
            <h2>从场地证据开始</h2>
            <p>上传底图或现状资料，再用连接点推演方案方向、节点深化和漫游。</p>
            <div className="canvas-empty-actions">
              <button type="button" onClick={() => createCanvasStarterUpload("场地底图")}>
                <UploadSimple size={17} weight="bold" />
                上传场地底图
              </button>
              <button type="button" onClick={() => createCanvasStarterUpload("现状照片")}>
                <ImageIcon size={17} weight="bold" />
                上传现状照片
              </button>
              <button type="button" onClick={() => createCanvasStarterUpload("意向参考")}>
                <ShareNetwork size={17} weight="bold" />
                添加意向参考
              </button>
              <button type="button" onClick={createCanvasStarterSchemeNode}>
                <PlusCircle size={17} weight="bold" />
                创建方案图节点
              </button>
            </div>
          </div>
        )}
        <div className="visual-canvas-world" style={worldStyle}>
          <svg
            className="visual-canvas-links"
            viewBox="-4000 -3000 8000 6000"
            aria-label="画布连线"
          >
            {canvasEdges.map((edge) => {
              const path = getCanvasEdgePath(edge, canvasNodes);
              const midpoint = getCanvasEdgeMidpoint(edge, canvasNodes);
              const fromNode = canvasNodes.find((node) => node.id === edge.from);
              const toNode = canvasNodes.find((node) => node.id === edge.to);

              if (!path || !midpoint) {
                return null;
              }

              return (
                <g className="canvas-edge-group" key={edge.id}>
                  <path className={`canvas-edge-path ${edge.role}`} d={path} />
                  <path
                    className={`canvas-edge-interaction ${edge.role}`}
                    d={path}
                    onPointerEnter={() => setHoveredCanvasEdgeId(edge.id)}
                    onPointerMove={() => setHoveredCanvasEdgeId(edge.id)}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteCanvasEdge(edge.id);
                    }}
                  />
                  <foreignObject
                    className="canvas-edge-cut-object"
                    x={midpoint.x - 16}
                    y={midpoint.y - 16}
                    width={32}
                    height={32}
                  >
                    <button
                      className={`canvas-edge-cut-button ${
                        hoveredCanvasEdgeId === edge.id ? "active" : ""
                      }`}
                      type="button"
                      aria-label={`断开${
                        fromNode?.title ?? "源节点"
                      }到${toNode?.title ?? "目标节点"}的连线`}
                      onPointerEnter={() => setHoveredCanvasEdgeId(edge.id)}
                      onPointerLeave={() =>
                        setHoveredCanvasEdgeId((current) =>
                          current === edge.id ? null : current,
                        )
                      }
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteCanvasEdge(edge.id);
                      }}
                    >
                      <Scissors size={15} weight="bold" />
                    </button>
                  </foreignObject>
                </g>
              );
            })}
            {connectionDraft && (
              <path
                className="canvas-draft-edge"
                d={getCanvasDraftEdgePath(connectionDraft)}
              />
            )}
          </svg>
          {canvasNodes.map((node) => (
            <CanvasNodeCard
              active={activeCanvasNodeId === node.id}
              canGenerate={
                node.kind === "image"
                  ? true
                  : true
              }
              connectionTarget={connectionTargetNodeId === node.id}
              menuOpen={
                connectionDraft?.sourceNodeId === node.id &&
                connectionDraft.isChoosing
              }
              isReplaceableImage={isReplaceableCanvasImageNode(node, canvasEdges)}
              key={node.id}
              mentionOptions={getCanvasPromptMentionOptions(node.id)}
              node={node}
              promptError={canvasPromptErrors[node.id] ?? ""}
              promptGenerating={promptingCanvasNodeId === node.id}
              onConnectionPointerDown={beginCanvasConnectionDrag}
              onConnectionKeyboardOpen={openCanvasConnectionMenuFromKeyboard}
              onConnectionPointerEnd={finishCanvasConnectionDrag}
              onConnectionPointerMove={updateCanvasConnectionDrag}
              onDelete={deleteCanvasNode}
              onAddReferenceImage={createCanvasReferenceImageNode}
              onReplaceReferenceImage={replaceCanvasReferenceImageNode}
              onGenerate={
                node.kind === "image" ? generateCanvasImage : generateCanvasVideo
              }
              onGeneratePrompt={generateCanvasNodePrompt}
              onInsertMention={insertCanvasPromptMention}
              onMovePointerDown={beginCanvasNodeMove}
              onParamChange={updateCanvasNodeParam}
              onPointerEnd={finishCanvasNodePointer}
              onPointerMove={updateCanvasNodePointer}
              onPreviewImage={previewCanvasNodeImage}
              onPromptChange={updateCanvasNodePrompt}
              onResizePointerDown={beginCanvasNodeResize}
              onSaveImage={saveCanvasImage}
              onSelect={() => setActiveCanvasNodeId(node.id)}
              onSelectVersion={selectCanvasNodeVersion}
            />
          ))}
          {connectionDraft?.isChoosing && draftSourceNode && (
            <div
              className="canvas-node-type-menu"
              style={{
                left: connectionDraft.menuX,
                top: connectionDraft.menuY,
              }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <span>从该成果继续推演</span>
              <button
                type="button"
                disabled={!canConnectCanvasNodes(
                  draftSourceNode,
                  createCanvasConnectionPreviewNode("image"),
                )}
                onClick={() => createCanvasNodeFromDraft("scheme-image")}
              >
                <ImageIcon size={17} weight="bold" />
                生成方案图
              </button>
              <button
                type="button"
                onClick={() => createCanvasNodeFromDraft("reference")}
              >
                <UploadSimple size={17} weight="bold" />
                添加参考
              </button>
              <button
                type="button"
                onClick={() => createCanvasNodeFromDraft("variation")}
              >
                <ShareNetwork size={17} weight="bold" />
                创建方向变体
              </button>
              <button
                type="button"
                onClick={() => createCanvasNodeFromDraft("detail")}
              >
                <MagnifyingGlassPlus size={17} weight="bold" />
                局部深化
              </button>
              <button
                type="button"
                disabled={!canConnectCanvasNodes(
                  draftSourceNode,
                  createCanvasConnectionPreviewNode("video"),
                )}
                onClick={() => createCanvasNodeFromDraft("walkthrough")}
              >
                <VideoCamera size={17} weight="bold" />
                生成漫游
              </button>
            </div>
          )}
        </div>
        {canvasUploadMenu && (
          <div
            className="canvas-upload-context-menu"
            style={{
              left: canvasUploadMenu.x,
              top: canvasUploadMenu.y,
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => createCanvasNodeForUpload("image")}
            >
              <ImageIcon size={17} weight="bold" />
              上传图片
            </button>
            <button
              type="button"
              onClick={() => createCanvasNodeForUpload("video")}
            >
              <VideoCamera size={17} weight="bold" />
              上传视频
            </button>
          </div>
        )}
        <input
          ref={imageUploadInputRef}
          className="agent-hidden-file"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
        />
        <input
          ref={videoUploadInputRef}
          className="agent-hidden-file"
          type="file"
          accept="video/*"
          onChange={handleVideoUpload}
        />
      </section>
      {previewImage && (
        <div
          className="visual-preview-layer"
          role="dialog"
          aria-modal="true"
          aria-label="大图预览"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="visual-preview-shell"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <strong>{previewImage.title}</strong>
                {previewImage.subtitle && <small>{previewImage.subtitle}</small>}
              </div>
              <div className="visual-preview-actions">
                <button
                  className="secondary-button compact"
                  type="button"
                  onClick={() =>
                    saveCanvasImage(previewImage.imageUrl, previewImage.title)
                  }
                >
                  <DownloadSimple size={15} weight="bold" />
                  保存图片
                </button>
                <button
                  className="visual-node-control"
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  aria-label="关闭大图预览"
                >
                  <X size={13} weight="bold" />
                </button>
              </div>
            </header>
            <div
              className="visual-preview-frame zoomable"
              onWheel={handlePreviewWheel}
              style={
                {
                  "--preview-zoom": previewZoom,
                } as CSSProperties
              }
            >
              {previewImage.compareImageUrl ? (
                <div
                  className="visual-preview-compare"
                  style={previewCompareStyle}
                >
                  <img
                    className="visual-preview-compare-base"
                    src={previewImage.compareImageUrl}
                    alt=""
                  />
                  <div className="visual-preview-comparison-layer">
                    <img src={previewImage.imageUrl} alt="" />
                  </div>
                  <span className="visual-preview-compare-label before">
                    {previewImage.compareTitle ?? "原图"}
                  </span>
                  <span className="visual-preview-compare-label after">
                    生成图
                  </span>
                  <span className="visual-preview-divider" aria-hidden="true" />
                  <input
                    className="visual-preview-slider"
                    type="range"
                    min={0}
                    max={100}
                    value={comparisonSlider}
                    onChange={(event) =>
                      setComparisonSlider(Number(event.target.value))
                    }
                    aria-label="调整原图和生成图对比"
                  />
                </div>
              ) : (
                <img src={previewImage.imageUrl} alt="" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getCanvasEdgeGeometry(edge: CanvasEdge, nodes: CanvasNode[]) {
  const from = nodes.find((node) => node.id === edge.from);
  const to = nodes.find((node) => node.id === edge.to);

  if (!from || !to) {
    return null;
  }

  const fromSize = getCanvasNodeSize(from);
  const toSize = getCanvasNodeSize(to);
  const startX = from.x + fromSize.width;
  const startY = from.y + fromSize.height / 2;
  const endX = to.x;
  const endY = to.y + toSize.height / 2;
  const handle = Math.max(86, Math.abs(endX - startX) * 0.52);
  const controlStart = { x: startX + handle, y: startY };
  const controlEnd = { x: endX - handle, y: endY };
  const midpoint = getCubicBezierPoint(
    { x: startX, y: startY },
    controlStart,
    controlEnd,
    { x: endX, y: endY },
    0.5,
  );

  return {
    midpoint,
    path: `M ${startX} ${startY} C ${controlStart.x} ${controlStart.y}, ${controlEnd.x} ${controlEnd.y}, ${endX} ${endY}`,
  };
}

function getCubicBezierPoint(
  start: { x: number; y: number },
  controlStart: { x: number; y: number },
  controlEnd: { x: number; y: number },
  end: { x: number; y: number },
  progress: number,
) {
  const inverse = 1 - progress;
  const inverseSquared = inverse * inverse;
  const progressSquared = progress * progress;

  return {
    x:
      inverseSquared * inverse * start.x +
      3 * inverseSquared * progress * controlStart.x +
      3 * inverse * progressSquared * controlEnd.x +
      progressSquared * progress * end.x,
    y:
      inverseSquared * inverse * start.y +
      3 * inverseSquared * progress * controlStart.y +
      3 * inverse * progressSquared * controlEnd.y +
      progressSquared * progress * end.y,
  };
}

function getCanvasEdgePath(edge: CanvasEdge, nodes: CanvasNode[]) {
  return getCanvasEdgeGeometry(edge, nodes)?.path ?? "";
}

function getCanvasEdgeMidpoint(edge: CanvasEdge, nodes: CanvasNode[]) {
  return getCanvasEdgeGeometry(edge, nodes)?.midpoint ?? null;
}

function getCanvasDraftEdgePath(connectionDraft: CanvasConnectionDraft | null) {
  if (!connectionDraft) {
    return "";
  }

  const handle = Math.max(
    86,
    Math.abs(connectionDraft.worldX - connectionDraft.startX) * 0.52,
  );

  return `M ${connectionDraft.startX} ${connectionDraft.startY} C ${
    connectionDraft.startX + handle
  } ${connectionDraft.startY}, ${connectionDraft.worldX - handle} ${
    connectionDraft.worldY
  }, ${connectionDraft.worldX} ${connectionDraft.worldY}`;
}

function CanvasNodeCard({
  node,
  active,
  canGenerate,
  connectionTarget,
  menuOpen,
  isReplaceableImage,
  mentionOptions,
  promptError,
  promptGenerating,
  onConnectionPointerDown,
  onConnectionKeyboardOpen,
  onConnectionPointerMove,
  onConnectionPointerEnd,
  onDelete,
  onAddReferenceImage,
  onReplaceReferenceImage,
  onGenerate,
  onGeneratePrompt,
  onInsertMention,
  onMovePointerDown,
  onParamChange,
  onPointerMove,
  onPointerEnd,
  onResizePointerDown,
  onPreviewImage,
  onPromptChange,
  onSaveImage,
  onSelect,
  onSelectVersion,
}: {
  node: CanvasNode;
  active: boolean;
  canGenerate: boolean;
  connectionTarget: boolean;
  menuOpen: boolean;
  isReplaceableImage: boolean;
  mentionOptions: CanvasImageReference[];
  promptError: string;
  promptGenerating: boolean;
  onConnectionPointerDown: (
    event: ReactPointerEvent<HTMLElement>,
    node: CanvasNode,
  ) => void;
  onConnectionKeyboardOpen: (
    node: CanvasNode,
    connector: HTMLButtonElement,
  ) => void;
  onConnectionPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onConnectionPointerEnd: (event: ReactPointerEvent<HTMLElement>) => void;
  onDelete: (nodeId: string) => void;
  onAddReferenceImage: (node: CanvasNode) => void;
  onReplaceReferenceImage: (nodeId: string) => void;
  onGenerate: (nodeId: string) => void;
  onInsertMention: (nodeId: string, reference: CanvasImageReference) => void;
  onMovePointerDown: (
    event: ReactPointerEvent<HTMLElement>,
    node: CanvasNode,
  ) => void;
  onParamChange: (
    nodeId: string,
    key: keyof CanvasNodeParams,
    value: string,
  ) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerEnd: (event: ReactPointerEvent<HTMLElement>) => void;
  onResizePointerDown: (
    event: ReactPointerEvent<HTMLElement>,
    node: CanvasNode,
  ) => void;
  onGeneratePrompt: (nodeId: string) => void;
  onPreviewImage: (node: CanvasNode) => void;
  onPromptChange: (nodeId: string, prompt: string) => void;
  onSaveImage: (imageUrl: string, title: string) => void;
  onSelect: () => void;
  onSelectVersion: (nodeId: string, versionId: string) => void;
}) {
  const promptHighlightsRef = useRef<HTMLDivElement | null>(null);
  const size = getCanvasNodeSize(node);
  const version = getSelectedCanvasVersion(node);
  const mediaUrl = getCanvasNodeMediaUrl(node);
  const selectedCameraPreset =
    videoCameraPresets.find(
      (preset) => preset.id === node.params.cameraPresetId,
    ) ?? videoCameraPresets[1];
  const videoDurationSeconds = parseCanvasDurationSeconds(
    node.params.duration ?? "8s",
  );
  const updateVideoDurationFromPointer = (
    event: ReactPointerEvent<HTMLInputElement>,
  ) => {
    const seconds = getCanvasDurationSecondsFromPointer(
      event.currentTarget,
      event.clientX,
    );

    onParamChange(node.id, "duration", `${seconds}s`);
  };
  const isGenerating =
    version?.status === "loading" || version?.status === "submitted";
  const generationDisabled = !canGenerate || isGenerating || !node.prompt.trim();
  const nodeMeasure = getCanvasNodeMeasure(node, version);
  const statusLabel = isGenerating
    ? node.kind === "image"
      ? version?.url && version.taskId
        ? "高清放大中"
        : "生成原图中"
      : `${videoStatusLabels[(version?.status ?? "loading") as VideoGenerationStatus] ?? "生成中"} · ${
          version?.progress ?? 0
        }%`
    : version
      ? version.prompt === "本地上传"
        ? "本地素材"
        : "AI生成"
      : node.kind === "image"
        ? "上传或生成图片"
        : "上传或生成视频";
  const promptPlaceholder =
    node.kind === "image"
      ? "描述空间、植物、材料、季节与使用场景"
      : "描述视频画面、运动、节奏和镜头";
  const showControlPanel = shouldShowCanvasNodeControlPanel(
    node,
    active,
  );
  const showSaveAction =
    node.kind === "image" && Boolean(mediaUrl) && !isUploadedCanvasImageNode(node);
  const showPreviewAction = node.kind === "image" && Boolean(mediaUrl);
  const showReplaceAction = isReplaceableImage && node.kind === "image";
  const showMentionMenu =
    node.kind === "image" &&
    mentionOptions.length > 0 &&
    shouldShowCanvasMentionMenu(node.prompt);

  function syncPromptHighlightScroll(element: HTMLTextAreaElement) {
    if (!promptHighlightsRef.current) {
      return;
    }

    promptHighlightsRef.current.scrollTop = element.scrollTop;
    promptHighlightsRef.current.scrollLeft = element.scrollLeft;
  }

  return (
    <article
      className={`visual-node canvas-node ${node.kind} ${
        active ? "active" : ""
      } ${connectionTarget ? "connection-target" : ""} ${
        menuOpen ? "menu-open" : ""
      } ${
        showSaveAction ? "has-save-action" : ""
      } ${
        showControlPanel ? "" : "media-only"
      }`}
      onPointerDown={(event) => {
        onSelect();
        onMovePointerDown(event, node);
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      style={{
        left: node.x,
        top: node.y,
        width: size.width,
        "--canvas-node-media-height": `${size.height}px`,
      } as CSSProperties}
    >
      <div className="visual-node-topline">
        <span className="canvas-node-kind">
          {node.kind === "image" ? (
            <ImageIcon size={15} weight="bold" />
          ) : (
            <VideoCamera size={15} weight="bold" />
          )}
          {node.title}
        </span>
        {nodeMeasure && <small>{nodeMeasure}</small>}
      </div>
      <div className="canvas-node-media-frame">
        <div
          className={`visual-node-image canvas-node-media ${
            mediaUrl ? "visual-node-image-button" : ""
          }`}
          role={mediaUrl && node.kind === "image" ? "button" : undefined}
          tabIndex={mediaUrl && node.kind === "image" ? 0 : undefined}
          onClick={(event) => {
            event.stopPropagation();
            if (mediaUrl && node.kind === "image") {
              onPreviewImage(node);
            }
          }}
          onDoubleClick={(event) => {
            event.stopPropagation();
            if (mediaUrl && node.kind === "image") {
              onPreviewImage(node);
            }
          }}
        >
          {mediaUrl && node.kind === "image" ? (
            <img src={mediaUrl} alt="" draggable={false} />
          ) : mediaUrl && node.kind === "video" ? (
            <video
              src={mediaUrl}
              controls
              muted
              playsInline
              preload="metadata"
              draggable={false}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            />
          ) : isGenerating ? (
            <SpinnerGap size={26} weight="bold" className="spin" />
          ) : node.kind === "image" ? (
            <ImageIcon size={30} weight="bold" />
          ) : (
            <VideoCamera size={30} weight="bold" />
          )}
          <span
            className={`canvas-node-status-badge ${
              version?.status === "error" ? "error" : ""
            }`}
          >
            {statusLabel}
          </span>
        </div>
        {version && version.status !== "done" && node.kind === "video" && (
          <div
            className="video-generation-progress"
            role="progressbar"
            aria-label="节点生成进度"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={version.progress}
            style={
              {
                "--video-progress": `${version.progress}%`,
              } as CSSProperties
            }
          />
        )}
        {showSaveAction && (
          <button
            className="canvas-node-save-action"
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onSaveImage(mediaUrl, getCanvasNodeImageTitle(node, version));
            }}
            aria-label="保存生成图片"
          >
            <DownloadSimple size={13} weight="bold" />
          </button>
        )}
        {showPreviewAction && (
          <button
            className="canvas-node-preview-action"
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onPreviewImage(node);
            }}
            aria-label="放大查看原图"
          >
            <MagnifyingGlassPlus size={13} weight="bold" />
          </button>
        )}
        {showReplaceAction && (
          <button
            className="canvas-node-replace-action"
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onReplaceReferenceImage(node.id);
            }}
            aria-label="更换图片"
          >
            <UploadSimple size={13} weight="bold" />
          </button>
        )}
        <button
          className="canvas-node-delete-action"
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onDelete(node.id)}
          aria-label="删除节点"
        >
          <X size={12} weight="bold" />
        </button>
        <button
          className="canvas-node-connector"
          type="button"
          data-canvas-connector-node-id={node.id}
          onPointerDown={(event) => onConnectionPointerDown(event, node)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              onConnectionKeyboardOpen(node, event.currentTarget);
            }
          }}
          onPointerMove={onConnectionPointerMove}
          onPointerUp={onConnectionPointerEnd}
          onPointerCancel={onConnectionPointerEnd}
          aria-label={`从${node.title}创建方案分支`}
        >
          <span className="canvas-node-connector-icon" aria-hidden="true">
            <PlusCircle size={26} weight="bold" />
          </span>
        </button>
        <span
          className="visual-resize-handle"
          onPointerDown={(event) => onResizePointerDown(event, node)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          role="presentation"
        />
      </div>
      {showControlPanel && (
        <div
          className="canvas-node-control-panel"
          onPointerDown={(event) => {
            onSelect();
            event.stopPropagation();
          }}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <label className="canvas-node-prompt-field">
            <span className="canvas-node-prompt-head">
              <span>{node.kind === "image" ? "图像提示词" : "视频提示词"}</span>
              {node.kind === "image" && (
                <button
                  className="canvas-node-prompt-generate-button"
                  type="button"
                  disabled={promptGenerating}
                  onClick={() => onGeneratePrompt(node.id)}
                  aria-label="一键生成提示词"
                  title={promptGenerating ? "正在生成提示词" : "一键生成提示词"}
                >
                  {promptGenerating ? (
                    <SpinnerGap size={14} weight="bold" className="spin" />
                  ) : (
                    <Sparkle size={14} weight="bold" />
                  )}
                  <span>{promptGenerating ? "正在生成提示词" : "一键生成提示词"}</span>
                </button>
              )}
            </span>
            <div className="canvas-node-prompt-shell">
              <div
                ref={promptHighlightsRef}
                className="canvas-node-prompt-highlights"
                aria-hidden="true"
              >
                {renderCanvasPromptHighlights(node.prompt, mentionOptions)}
              </div>
              <textarea
                className="canvas-node-prompt"
                value={node.prompt}
                onChange={(event) =>
                  onPromptChange(node.id, event.currentTarget.value)
                }
                onScroll={(event) => syncPromptHighlightScroll(event.currentTarget)}
                onWheel={(event) => {
                  event.stopPropagation();
                  syncPromptHighlightScroll(event.currentTarget);
                }}
                placeholder={promptPlaceholder}
                rows={3}
              />
            </div>
            {showMentionMenu && (
              <div className="canvas-node-mention-menu" role="listbox">
                {mentionOptions.map((option) => (
                  <button
                    key={option.edgeId}
                    type="button"
                    onClick={() => onInsertMention(node.id, option)}
                  >
                    <span>{option.title}</span>
                    <small className="canvas-node-mention-role">
                      {canvasEdgeRoleLabels[option.role]}
                    </small>
                  </button>
                ))}
              </div>
            )}
            {promptError && (
              <small className="canvas-node-prompt-error">{promptError}</small>
            )}
          </label>
          {version?.status === "error" && (
            <div className="canvas-node-error" role="alert">
              <span>{version.outputText || "当前节点生成失败，请检查输入后重试。"}</span>
              <button type="button" onClick={() => onGenerate(node.id)}>
                <ArrowClockwise size={14} weight="bold" />
                重试当前节点
              </button>
            </div>
          )}
          {node.kind === "image" ? (
            <div className="canvas-node-image-toolbar">
              <button
                className="canvas-node-upload-chip"
                type="button"
                onClick={() => onAddReferenceImage(node)}
              >
                <UploadSimple size={15} weight="bold" />
                参考图
              </button>
              <label className="canvas-node-inline-field mode">
                <span>模式</span>
                <DropdownSelect
                  value={node.params.generationMode}
                  onValueChange={(value) =>
                    onParamChange(node.id, "generationMode", value)
                  }
                  ariaLabel="选择景观生成模式"
                  options={landscapeGenerationModeOptions}
                />
              </label>
              <label className="canvas-node-inline-field">
                <span>分辨率</span>
                <DropdownSelect
                  value={node.params.imageResolution ?? "4K"}
                  onValueChange={(value) =>
                    onParamChange(node.id, "imageResolution", value)
                  }
                  ariaLabel="选择图像分辨率"
                  options={canvasImageResolutionOptions.map((option) => ({
                    value: option,
                    label: option,
                  }))}
                />
              </label>
              <label className="canvas-node-inline-field">
                <span>比例</span>
                <DropdownSelect
                  value={node.params.imageAspectRatio ?? "adaptive"}
                  onValueChange={(value) =>
                    onParamChange(node.id, "imageAspectRatio", value)
                  }
                  ariaLabel="选择图像比例"
                  options={canvasImageAspectOptions}
                />
              </label>
              <label className="canvas-node-inline-field compact">
                <span>张数</span>
                <DropdownSelect
                  value={node.params.imageCount ?? "1"}
                  onValueChange={(value) =>
                    onParamChange(node.id, "imageCount", value)
                  }
                  ariaLabel="选择生成张数"
                  options={canvasImageCountOptions}
                />
              </label>
              <button
                className="canvas-node-send-button"
                type="button"
                disabled={generationDisabled}
                onClick={() => onGenerate(node.id)}
                aria-label="发送生成图像"
              >
                {isGenerating ? (
                  <SpinnerGap size={17} weight="bold" className="spin" />
                ) : (
                  <PaperPlaneTilt size={17} weight="bold" />
                )}
              </button>
            </div>
          ) : (
            <>
              <label className="canvas-node-control-section video-camera-preset">
                <span>镜头预设</span>
                <DropdownSelect
                  value={selectedCameraPreset.id}
                  onValueChange={(value) =>
                    onParamChange(node.id, "cameraPresetId", value)
                  }
                  ariaLabel="选择镜头预设"
                  options={videoCameraPresets.map((preset) => ({
                    value: preset.id,
                    label: preset.label,
                  }))}
                />
              </label>
              <div className="canvas-node-video-toolbar">
                <label className="canvas-node-inline-field">
                  <span>画幅</span>
                  <DropdownSelect
                    value={node.params.aspectRatio ?? "adaptive"}
                    onValueChange={(value) =>
                      onParamChange(node.id, "aspectRatio", value)
                    }
                    ariaLabel="选择视频画幅"
                    options={canvasVideoAspectOptions}
                  />
                </label>
                <label className="canvas-node-inline-field">
                  <span>分辨率</span>
                  <DropdownSelect
                    value={node.params.videoResolution ?? "1080p"}
                    onValueChange={(value) =>
                      onParamChange(node.id, "videoResolution", value)
                    }
                    ariaLabel="选择视频分辨率"
                    options={canvasVideoResolutionOptions}
                  />
                </label>
                <label className="canvas-node-duration-control">
                  <span>
                    时长
                    <strong className="canvas-node-duration-value">
                      {videoDurationSeconds}秒
                    </strong>
                  </span>
                  <input
                    className="canvas-node-duration-slider"
                    type="range"
                    min={canvasVideoDurationMin}
                    max={canvasVideoDurationMax}
                    step={1}
                    value={videoDurationSeconds}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      updateVideoDurationFromPointer(event);
                    }}
                    onPointerMove={(event) => {
                      event.stopPropagation();

                      if (event.buttons === 1) {
                        updateVideoDurationFromPointer(event);
                      }
                    }}
                    onChange={(event) =>
                      onParamChange(node.id, "duration", `${event.currentTarget.value}s`)
                    }
                    aria-label="选择视频时长"
                  />
                </label>
                <button
                  className="canvas-node-send-button"
                  type="button"
                  disabled={generationDisabled}
                  onClick={() => onGenerate(node.id)}
                  aria-label="发送生成视频"
                >
                  {isGenerating ? (
                    <SpinnerGap size={17} weight="bold" className="spin" />
                  ) : (
                    <PaperPlaneTilt size={17} weight="bold" />
                  )}
                </button>
              </div>
            </>
          )}
          {node.versions.length > 0 && (
            <div className="canvas-node-version-strip">
              <div className="canvas-node-section-title">
                <span>版本</span>
                <strong>{node.versions.length}</strong>
              </div>
              <div className="canvas-node-version-buttons">
                {node.versions.slice(0, 5).map((item, index) => (
                  <button
                    className={item.id === version?.id ? "active" : ""}
                    key={item.id}
                    type="button"
                    onClick={() => onSelectVersion(node.id, item.id)}
                  >
                    <span>
                      {item.label ||
                        `版本 ${String(node.versions.length - index).padStart(2, "0")}`}
                    </span>
                    <small>{item.progress}%</small>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

type VideoPathPoint = {
  x: number;
  y: number;
};

type VideoReferenceImage = {
  name: string;
  src: string;
  width: number;
  height: number;
};

type VideoGenerationStatus = "loading" | "submitted" | "done" | "error";

type VideoHistoryItem = {
  id: string;
  prompt: string;
  aspectRatio: string;
  resolution: string;
  duration: string;
  createdAt: string;
  status: VideoGenerationStatus;
  progress: number;
  videoUrl: string;
  taskId: string;
  outputText: string;
  errorText?: string;
};

const videoStatusLabels: Record<VideoGenerationStatus, string> = {
  loading: "生成中",
  submitted: "任务已提交",
  done: "已完成",
  error: "失败",
};

const videoProgressStages = [
  {
    progress: 0,
    label: "准备提交",
    text: "正在整理提示词、参考图片和视频参数。",
  },
  {
    progress: 12,
    label: "提交任务",
    text: "正在提交 Ark Seedance 视频生成任务。",
  },
  {
    progress: 28,
    label: "排队中",
    text: "任务已提交，正在等待生成队列处理。",
  },
  {
    progress: 52,
    label: "生成中",
    text: "正在生成视频画面、运动和声音。",
  },
  {
    progress: 78,
    label: "合成中",
    text: "正在合成视频结果并准备预览。",
  },
  {
    progress: 100,
    label: "已完成",
    text: "视频已生成。",
  },
];

function getVideoProgressStage(progress: number) {
  return (
    [...videoProgressStages]
      .reverse()
      .find((stage) => progress >= stage.progress) ?? videoProgressStages[0]
  );
}

function getVideoEstimatedWaitMs(duration: string) {
  const seconds = Number.parseFloat(duration);

  return Number.isFinite(seconds) && seconds > 0
    ? Math.max(45_000, seconds * 9_000)
    : 75_000;
}

const VIDEO_STATUS_POLL_INTERVAL_MS = 5_000;
const VIDEO_STATUS_POLL_TIMEOUT_MS = 20 * 60_000;
const CANVAS_IMAGE_UPSCALE_POLL_INTERVAL_MS = 3_000;
const CANVAS_IMAGE_UPSCALE_POLL_TIMEOUT_MS = 5 * 60_000;

function isVideoDoneStatus(status: string) {
  return /done|success|succeed|completed|finish|finished|已完成|成功/i.test(status);
}

function isVideoFailedStatus(status: string) {
  return /fail|failed|error|cancel|canceled|cancelled|失败|错误|取消/i.test(status);
}

type VideoCameraPreset = {
  id: string;
  label: string;
  prompt: string;
};

const videoCameraPresets: VideoCameraPreset[] = [
  {
    id: "steady-push",
    label: "平稳推进",
    prompt: "镜头平稳向前推进，保持主体稳定并逐步靠近核心画面。",
  },
  {
    id: "zoom-push",
    label: "放大推进",
    prompt: "镜头缓慢向前推进，保持建筑位于画面中央",
  },
  {
    id: "slow-pull",
    label: "慢速拉远",
    prompt: "镜头缓慢后退拉远，从主体过渡到完整环境。",
  },
  {
    id: "rise-pull",
    label: "升高拉远",
    prompt: "镜头边升高边拉远，逐渐展示建筑和周边空间关系。",
  },
  {
    id: "pan-left",
    label: "向左平移",
    prompt: "镜头保持高度稳定向左平移，横向扫过主体和场景。",
  },
  {
    id: "pan-right",
    label: "向右平移",
    prompt: "镜头保持高度稳定向右平移，横向扫过主体和场景。",
  },
  {
    id: "tilt-up",
    label: "向上平移",
    prompt: "镜头垂直向上移动，从低处视角过渡到高处视角。",
  },
  {
    id: "tilt-down",
    label: "向下平移",
    prompt: "镜头垂直向下移动，从高处视角过渡到主体细节。",
  },
  {
    id: "horizontal-orbit",
    label: "水平环绕",
    prompt: "镜头围绕主体做水平环绕，保持主体始终在画面中心。",
  },
  {
    id: "spiral-orbit",
    label: "螺旋环绕",
    prompt: "镜头围绕主体螺旋上升环绕，形成有层次的空间运动。",
  },
  {
    id: "space-roam",
    label: "空间漫游",
    prompt: "镜头在空间中缓慢漫游，连续展示路径、层次和氛围。",
  },
  {
    id: "drone-pass",
    label: "无人机穿越",
    prompt: "镜头模拟无人机穿越场景，从前景快速进入主体空间。",
  },
  {
    id: "slow-motion",
    label: "升格慢动作",
    prompt: "镜头使用升格慢动作，强化人物动作、光影变化和氛围细节。",
  },
  {
    id: "season-shift",
    label: "春去秋来",
    prompt: "镜头保持构图稳定，场景季节从春天逐渐过渡到秋天。",
  },
  {
    id: "follow-person",
    label: "跟随人物",
    prompt: "镜头跟随人物移动，保持人物为视觉中心并展示前进路径。",
  },
  {
    id: "person-orbit",
    label: "人物跟拍环绕",
    prompt: "镜头跟拍人物并轻微环绕，突出人物与环境的关系。",
  },
  {
    id: "wide-timelapse",
    label: "大环绕延时",
    prompt: "镜头大范围环绕场景并加入延时感，呈现时间流动和空间全貌。",
  },
  {
    id: "tracking",
    label: "动态移动追踪",
    prompt: "镜头动态追踪移动主体，保持画面稳定且具有速度感。",
  },
  {
    id: "crane-move",
    label: "升降移动",
    prompt: "镜头进行平滑升降移动，强调空间高度和垂直层次。",
  },
  {
    id: "low-follow-push",
    label: "低机位跟随推进",
    prompt: "镜头以低机位跟随向前推进，增强空间压迫感和临场感。",
  },
  {
    id: "push-rise",
    label: "前推缓升",
    prompt: "镜头向前推进并缓慢升高，从细节过渡到整体视角。",
  },
  {
    id: "yaw-right",
    label: "向右摇镜",
    prompt: "镜头原地向右摇动，逐步揭示画面右侧空间。",
  },
  {
    id: "yaw-left",
    label: "向左摇镜",
    prompt: "镜头原地向左摇动，逐步揭示画面左侧空间。",
  },
  {
    id: "dolly-zoom",
    label: "希区柯克变焦",
    prompt: "镜头使用希区柯克变焦，主体尺度相对稳定，背景产生压缩或拉伸感。",
  },
  {
    id: "winter-shift",
    label: "寒冬降临",
    prompt: "镜头保持构图稳定，场景逐渐过渡到寒冬氛围。",
  },
  {
    id: "custom",
    label: "自定义",
    prompt: "",
  },
];

function getVideoPathPoint(event: ReactPointerEvent<SVGSVGElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = rect.width
    ? ((event.clientX - rect.left) / rect.width) * 100
    : 0;
  const y = rect.height
    ? ((event.clientY - rect.top) / rect.height) * 100
    : 0;

  return {
    x: Math.min(100, Math.max(0, x)),
    y: Math.min(100, Math.max(0, y)),
  };
}

function formatVideoPath(points: VideoPathPoint[]) {
  return points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";

      return `${command} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(" ");
}

function getVideoGenerationErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "视频生成失败，请稍后再试。";
  }

  return error.message || "视频生成失败，请稍后再试。";
}

function VideoView({
  canvasGeneratedImages,
}: {
  canvasGeneratedImages: CanvasGeneratedImage[];
}) {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("adaptive");
  const [resolution, setResolution] = useState("1080p");
  const [duration, setDuration] = useState("8s");
  const [videoStatus, setVideoStatus] = useState<"idle" | "loading">("idle");
  const [videoError, setVideoError] = useState("");
  const [selectedCameraPresetId, setSelectedCameraPresetId] =
    useState("zoom-push");
  const [isCameraPresetOpen, setIsCameraPresetOpen] = useState(false);
  const [referenceImage, setReferenceImage] =
    useState<VideoReferenceImage | null>(null);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [imagePaths, setImagePaths] = useState<VideoPathPoint[][]>([]);
  const [activePath, setActivePath] = useState<VideoPathPoint[] | null>(null);
  const [history, setHistory] = useState<VideoHistoryItem[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const canGenerate = prompt.trim().length > 0 && videoStatus !== "loading";
  const selectedHistory =
    history.find((item) => item.id === selectedHistoryId) ?? history[0] ?? null;
  const selectedCameraPreset =
    videoCameraPresets.find((preset) => preset.id === selectedCameraPresetId) ??
    videoCameraPresets[1];
  const selectedProgressStage = selectedHistory
    ? getVideoProgressStage(selectedHistory.progress)
    : null;
  const referenceImageWidth =
    referenceImage && Number.isFinite(referenceImage.width) && referenceImage.width > 0
      ? referenceImage.width
      : 16;
  const referenceImageHeight =
    referenceImage && Number.isFinite(referenceImage.height) && referenceImage.height > 0
      ? referenceImage.height
      : 9;
  const referenceImageFrameStyle = referenceImage
    ? ({
        "--video-image-aspect-ratio": `${referenceImageWidth} / ${referenceImageHeight}`,
        "--video-image-ratio": referenceImageWidth / referenceImageHeight,
      } as CSSProperties)
    : undefined;
  const aspectOptions = [
    { value: "adaptive", label: "自适应" },
    { value: "16:9", label: "16:9 横屏" },
    { value: "9:16", label: "9:16 竖屏" },
    { value: "1:1", label: "1:1 方形" },
    { value: "21:9", label: "21:9 超宽屏" },
    { value: "4:3", label: "4:3 标准" },
    { value: "3:4", label: "3:4 竖构图" },
  ];
  const resolutionOptions = [
    { value: "480p", label: "480p" },
    { value: "720p", label: "720p" },
    { value: "1080p", label: "1080p" },
  ];
  const durationOptions = [
    { value: "4s", label: "4 秒" },
    { value: "6s", label: "6 秒" },
    { value: "8s", label: "8 秒" },
    { value: "11s", label: "11 秒" },
    { value: "12s", label: "12 秒" },
    { value: "15s", label: "15 秒" },
  ];

  useEffect(() => {
    if (
      !referenceImage ||
      (Number.isFinite(referenceImage.width) &&
        referenceImage.width > 0 &&
        Number.isFinite(referenceImage.height) &&
        referenceImage.height > 0)
    ) {
      return;
    }

    let isCurrent = true;

    loadImageSource(referenceImage.src)
      .then((image) => {
        if (!isCurrent || !image.naturalWidth || !image.naturalHeight) {
          return;
        }

        setReferenceImage((current) => {
          if (!current || current.src !== referenceImage.src) {
            return current;
          }

          return {
            ...current,
            width: image.naturalWidth,
            height: image.naturalHeight,
          };
        });
      })
      .catch(() => undefined);

    return () => {
      isCurrent = false;
    };
  }, [referenceImage]);

  async function pollVideoTaskStatus({
    historyId,
    taskId,
    startedAt,
    estimatedWaitMs,
  }: {
    historyId: string;
    taskId: string;
    startedAt: number;
    estimatedWaitMs: number;
  }) {
    const deadline = Date.now() + VIDEO_STATUS_POLL_TIMEOUT_MS;

    while (Date.now() < deadline) {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, VIDEO_STATUS_POLL_INTERVAL_MS);
      });

      const response = await fetch(
        `/api/zerlum-video-status?taskId=${encodeURIComponent(taskId)}`,
      );
      const rawText = await response.text();
      let payload: Record<string, unknown> = {};

      try {
        payload = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
      } catch {
        payload = { outputText: rawText };
      }

      const outputText =
        typeof payload.outputText === "string" && payload.outputText.trim()
          ? payload.outputText
          : "";

      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : outputText || rawText || "视频任务状态查询失败。",
        );
      }

      const videoUrl =
        typeof payload.videoUrl === "string" ? payload.videoUrl : "";
      const status = typeof payload.status === "string" ? payload.status : "";

      if (videoUrl || isVideoDoneStatus(status)) {
        setHistory((items) =>
          items.map((item) =>
            item.id === historyId
              ? {
                  ...item,
                  status: "done",
                  progress: 100,
                  videoUrl,
                  taskId,
                  outputText: outputText || "视频已生成。",
                }
              : item,
          ),
        );
        return;
      }

      if (isVideoFailedStatus(status)) {
        throw new Error(outputText || "视频任务生成失败。");
      }

      const elapsed = Date.now() - startedAt;
      const nextProgress = Math.min(
        96,
        Math.round(28 + (elapsed / estimatedWaitMs) * 68),
      );
      const progressStage = getVideoProgressStage(nextProgress);

      setHistory((items) =>
        items.map((item) =>
          item.id === historyId
            ? {
                ...item,
                status: "submitted",
                progress: Math.max(item.progress, nextProgress),
                taskId,
                outputText: outputText || progressStage.text,
              }
            : item,
        ),
      );
    }

    setHistory((items) =>
      items.map((item) =>
        item.id === historyId
          ? {
              ...item,
              status: "submitted",
              progress: Math.max(item.progress, 96),
              taskId,
              outputText: "视频仍在生成，可保持页面打开继续等待或稍后重试查询。",
            }
          : item,
      ),
    );
  }

  async function handleGenerateVideo() {
    const cleanPrompt = prompt.trim();

    if (!cleanPrompt) {
      return;
    }

    const historyId = createId("video-history");
    const nextItem = {
      id: historyId,
      prompt: cleanPrompt,
      aspectRatio,
      resolution,
      duration,
      createdAt: formatUploadTime(),
      status: "loading" as const,
      progress: 12,
      videoUrl: "",
      taskId: "",
      outputText: "正在提交 Ark Seedance 视频生成任务。",
    };
    const startedAt = Date.now();
    const estimatedWaitMs = getVideoEstimatedWaitMs(duration);
    let progressTimer: number | null = null;

    setHistory((items) => [nextItem, ...items]);
    setSelectedHistoryId(nextItem.id);
    setVideoStatus("loading");
    setVideoError("");

    try {
      progressTimer = window.setInterval(() => {
        const elapsed = Date.now() - startedAt;
        const nextProgress = Math.min(
          92,
          Math.round(12 + (elapsed / estimatedWaitMs) * 80),
        );
        const progressStage = getVideoProgressStage(nextProgress);

        setHistory((items) =>
          items.map((item) =>
            item.id === historyId &&
            (item.status === "loading" || item.status === "submitted")
              ? {
                  ...item,
                  progress: Math.max(item.progress, nextProgress),
                  outputText: progressStage.text,
                }
              : item,
          ),
        );
      }, 1000);

      const videoReferenceImageUrl = referenceImage
        ? await resolveImageUrlForAgentApi(referenceImage.src)
        : "";
      const response = await fetch("/api/zerlum-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: cleanPrompt,
          aspectRatio,
          resolution,
          duration,
          referenceImages: videoReferenceImageUrl
            ? [
                {
                  url: videoReferenceImageUrl,
                  label: referenceImage?.name ?? "",
                },
              ]
            : [],
          imagePaths: imagePaths,
        }),
      });
      const rawText = await response.text();
      let payload: Record<string, unknown> = {};

      try {
        payload = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
      } catch {
        payload = { outputText: rawText };
      }

      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : rawText || "视频生成请求失败。",
        );
      }

      const videoUrl =
        typeof payload.videoUrl === "string" ? payload.videoUrl : "";
      const taskId = typeof payload.taskId === "string" ? payload.taskId : "";
      const outputText =
        typeof payload.outputText === "string" && payload.outputText.trim()
          ? payload.outputText
          : videoUrl
            ? "视频已生成。"
            : "视频任务已提交，生成仍在进行。";
      const nextStatus: VideoGenerationStatus = videoUrl ? "done" : "submitted";

      setHistory((items) =>
        items.map((item) =>
          item.id === historyId
            ? {
                ...item,
                status: nextStatus,
                progress: videoUrl ? 100 : Math.max(item.progress, 28),
                videoUrl,
                taskId,
                outputText,
              }
            : item,
        ),
      );

      if (!videoUrl && taskId) {
        await pollVideoTaskStatus({
          historyId,
          taskId,
          startedAt,
          estimatedWaitMs,
        });
      }
    } catch (error) {
      const errorText = getVideoGenerationErrorMessage(error);

      setVideoError(errorText);
      setHistory((items) =>
        items.map((item) =>
          item.id === historyId
            ? {
                ...item,
                status: "error",
                progress: Math.max(item.progress, 6),
                outputText: errorText,
                errorText,
              }
            : item,
        ),
      );
    } finally {
      if (progressTimer !== null) {
        window.clearInterval(progressTimer);
      }

      setVideoStatus("idle");
    }
  }

  function handleCopyPrompt() {
    if (selectedHistory && navigator.clipboard) {
      navigator.clipboard.writeText(selectedHistory.prompt).catch(() => undefined);
    }
  }

  function handleCameraPresetSelect(preset: VideoCameraPreset) {
    setSelectedCameraPresetId(preset.id);
    setIsCameraPresetOpen(false);

    if (!preset.prompt) {
      return;
    }

    const presetLine = `镜头运动：${preset.prompt}`;

    setPrompt((current) => {
      const cleanPrompt = current
        .split("\n")
        .filter((line) => !line.trim().startsWith("镜头运动："))
        .join("\n")
        .trim();

      return cleanPrompt ? `${cleanPrompt}\n${presetLine}` : presetLine;
    });
  }

  function handleReferenceImageLoad(event: SyntheticEvent<HTMLImageElement>) {
    const loadedWidth = event.currentTarget.naturalWidth;
    const loadedHeight = event.currentTarget.naturalHeight;
    const loadedSrc = event.currentTarget.src;

    if (!loadedWidth || !loadedHeight) {
      return;
    }

    setReferenceImage((image) => {
      if (
        !image ||
        image.src !== loadedSrc ||
        (image.width === loadedWidth && image.height === loadedHeight)
      ) {
        return image;
      }

      return { ...image, width: loadedWidth, height: loadedHeight };
    });
  }

  async function handleReferenceImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = "";

    if (!file || !file.type.startsWith("image/")) {
      return;
    }

    try {
      const src = await readFileAsDataUrl(file);
      const image = await loadImageSource(src);

      setReferenceImage({
        name: file.name,
        src,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      setImagePaths([]);
      setActivePath(null);
      setIsImageDialogOpen(false);
    } catch (error) {
      console.warn("参考图片读取失败。", error);
    }
  }

  async function handleSyncCanvasImageToVideoReference() {
    const syncedImage = canvasGeneratedImages.find((image) =>
      image.imageUrl.trim(),
    );

    if (!syncedImage) {
      return;
    }

    try {
      const image = await loadImageSource(syncedImage.imageUrl);

      setReferenceImage({
        name: syncedImage.label || "画布生成图",
        src: syncedImage.imageUrl,
        width: image.naturalWidth || 16,
        height: image.naturalHeight || 9,
      });
    } catch {
      setReferenceImage({
        name: syncedImage.label || "画布生成图",
        src: syncedImage.imageUrl,
        width: 16,
        height: 9,
      });
    }

    setImagePaths([]);
    setActivePath(null);
    setIsImageDialogOpen(false);
  }

  function handlePathPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (!referenceImage) {
      return;
    }

    const nextPoint = getVideoPathPoint(event);

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some embedded browsers do not capture SVG pointer events reliably.
    }

    setActivePath([nextPoint]);
  }

  function handlePathPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!activePath) {
      return;
    }

    const nextPoint = getVideoPathPoint(event);

    setActivePath((path) => (path ? [...path, nextPoint] : path));
  }

  function handlePathPointerEnd(event: ReactPointerEvent<SVGSVGElement>) {
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Capture can already be gone if the pointer leaves the embedded browser.
    }

    setActivePath((path) => {
      if (path && path.length > 1) {
        setImagePaths((paths) => [...paths, path]);
      }

      return null;
    });
  }

  return (
    <div className="video-workspace">
      <section className="video-input-panel">
        <div className="video-upload-panel">
          <div className="video-upload-head">
            <PanelTitle icon={ImageIcon} title="参考图片" />
            <span>{referenceImage ? "已上传" : "可选"}</span>
          </div>
          <div className="video-upload-row">
            <label className="video-upload-dropzone" htmlFor="video-reference-image">
              <input
                id="video-reference-image"
                type="file"
                accept="image/*"
                aria-label="上传参考图片"
                onChange={handleReferenceImageUpload}
              />
              {referenceImage ? (
                <>
                  <img src={referenceImage.src} alt="" onLoad={handleReferenceImageLoad} />
                  <span>
                    <strong>{referenceImage.name}</strong>
                    <small>重新上传图片</small>
                  </span>
                </>
              ) : (
                <>
                  <UploadSimple size={18} weight="bold" />
                  <span>
                    <strong>上传图片</strong>
                    <small>支持 JPG、PNG、WEBP，用于标注视频运动路径</small>
                  </span>
                </>
              )}
            </label>
            <button
              className="secondary-button compact video-sync-canvas-button"
              type="button"
              aria-label="同步画布生成图到视频参考图片"
              disabled={!canvasGeneratedImages.length}
              title={
                canvasGeneratedImages.length
                  ? "同步 AI 无限画布里的生成图"
                  : "画布暂无生成图"
              }
              onClick={handleSyncCanvasImageToVideoReference}
            >
              <ArrowClockwise size={16} weight="bold" />
              同步画布
            </button>
          </div>
          {referenceImage && (
            <button
              className="secondary-button compact video-open-image-button"
              type="button"
              onClick={() => setIsImageDialogOpen(true)}
            >
              <ImageIcon size={16} weight="bold" />
              打开大窗口
            </button>
          )}
        </div>
        <div className="video-panel-head">
          <PanelTitle icon={VideoCamera} title="视频提示词" />
          <span>可生成</span>
        </div>
        <div className="video-camera-preset-panel">
          <button
            className="video-camera-preset-trigger"
            type="button"
            aria-expanded={isCameraPresetOpen}
            aria-controls="video-camera-preset-grid"
            onClick={() => setIsCameraPresetOpen((open) => !open)}
          >
            <span>
              <VideoCamera size={16} weight="bold" />
              镜头预设
            </span>
            <strong>{selectedCameraPreset.label}</strong>
          </button>
          {isCameraPresetOpen && (
            <div
              id="video-camera-preset-grid"
              className="video-camera-preset-grid"
              aria-label="选择镜头预设"
            >
              {videoCameraPresets.map((preset) => (
                <button
                  className={
                    selectedCameraPresetId === preset.id ? "active" : ""
                  }
                  type="button"
                  key={preset.id}
                  aria-pressed={selectedCameraPresetId === preset.id}
                  onClick={() => handleCameraPresetSelect(preset)}
                >
                  <span>{preset.label}</span>
                  {selectedCameraPresetId === preset.id && (
                    <CheckCircle size={15} weight="bold" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <textarea
          className="video-prompt-input"
          value={prompt}
          placeholder="输入视频画面、镜头运动、时长和旁白要求"
          aria-label="视频提示词"
          onChange={(event) => setPrompt(event.target.value)}
        />
        <div className="video-setting-list" aria-label="视频参数">
          <label>
            <span>画幅</span>
            <DropdownSelect
              value={aspectRatio}
              onValueChange={setAspectRatio}
              ariaLabel="选择视频画幅"
              options={aspectOptions}
            />
          </label>
          <label>
            <span>分辨率</span>
            <DropdownSelect
              value={resolution}
              onValueChange={setResolution}
              ariaLabel="选择视频分辨率"
              options={resolutionOptions}
            />
          </label>
          <label>
            <span>时长</span>
            <DropdownSelect
              value={duration}
              onValueChange={setDuration}
              ariaLabel="选择视频时长"
              options={durationOptions}
            />
          </label>
        </div>
        <button
          className="primary-button full"
          type="button"
          disabled={!canGenerate}
          onClick={handleGenerateVideo}
          title={canGenerate ? "生成视频" : "请输入视频提示词"}
        >
          {videoStatus === "loading" ? (
            <SpinnerGap size={18} weight="bold" className="spin" />
          ) : (
            <Sparkle size={18} weight="bold" />
          )}
          {videoStatus === "loading" ? "生成中" : "生成视频"}
        </button>
        {videoError && <p className="video-error-text">{videoError}</p>}
      </section>

      <section className="video-stage-panel">
        <div className="video-panel-head">
          <PanelTitle icon={Sparkle} title="视频画面" />
          <div className="video-stage-meta" aria-label="当前视频参数">
            <span>{selectedHistory?.aspectRatio ?? aspectRatio}</span>
            <span>{selectedHistory?.resolution ?? resolution}</span>
            <span>{selectedHistory?.duration ?? duration}</span>
          </div>
        </div>
        <div className="video-preview-frame">
          {selectedHistory ? (
            selectedHistory.videoUrl ? (
              <video
                className="video-preview-player"
                src={selectedHistory.videoUrl}
                controls
                playsInline
              />
            ) : (
              <div className={`video-preview-content ${selectedHistory.status}`}>
                <span>{videoStatusLabels[selectedHistory.status]}</span>
                <p>{selectedHistory.outputText || selectedHistory.prompt}</p>
                <div
                  className="video-generation-progress"
                  role="progressbar"
                  aria-label="视频生成进度"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={selectedHistory.progress}
                  style={
                    {
                      "--video-progress": `${selectedHistory.progress}%`,
                    } as CSSProperties
                  }
                />
                <div className="video-generation-progress-meta">
                  <strong>{selectedProgressStage?.label}</strong>
                  <small>{selectedHistory.progress}%</small>
                </div>
                {selectedHistory.taskId && <small>Task {selectedHistory.taskId}</small>}
              </div>
            )
          ) : (
            <EmptyState
              icon={VideoCamera}
              title="暂无视频预览"
              text="输入要求并生成后，当前视频记录会显示在这里。"
            />
          )}
        </div>
      </section>

      <aside className="video-assets-panel">
        <div className="video-panel-head">
          <PanelTitle icon={Archive} title="资产" />
          <span>{history.length} 条</span>
        </div>
        {history.length > 0 ? (
          <>
            <div className="video-asset-list" aria-label="生成历史记录">
              {history.map((item, index) => (
                <button
                  className={item.id === selectedHistory?.id ? "active" : ""}
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedHistoryId(item.id)}
                >
                  <span>
                    {videoStatusLabels[item.status]} · 生成记录{" "}
                    {String(history.length - index).padStart(2, "0")}
                  </span>
                  <strong>{item.prompt}</strong>
                  <small>
                    {item.createdAt} · {item.aspectRatio} · {item.resolution} ·{" "}
                    {item.duration}
                  </small>
                  {item.status !== "done" && (
                    <div
                      className="video-asset-progress"
                      aria-hidden="true"
                      style={
                        {
                          "--video-progress": `${item.progress}%`,
                        } as CSSProperties
                      }
                    />
                  )}
                </button>
              ))}
            </div>
            <div className="video-asset-actions">
              <button
                className="secondary-button compact"
                type="button"
                onClick={handleCopyPrompt}
              >
                <CopySimple size={16} weight="bold" />
                复制提示词
              </button>
              <button className="secondary-button compact" type="button" disabled>
                <DownloadSimple size={16} weight="bold" />
                导出
              </button>
            </div>
          </>
        ) : (
          <EmptyState
            icon={Archive}
            title="暂无资产"
            text="生成的视频历史会归档在这里，方便回看和继续制作。"
          />
        )}
      </aside>
      {isImageDialogOpen && referenceImage && (
        <div className="video-image-dialog-backdrop">
          <section
            className="video-image-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="图片路径绘制窗口"
          >
            <header>
              <div>
                <PanelTitle icon={ImageIcon} title="图片路径绘制" />
                <p>{referenceImage.name}</p>
              </div>
              <div className="video-image-dialog-actions">
                <button
                  className="secondary-button compact"
                  type="button"
                  onClick={() => {
                    setImagePaths([]);
                    setActivePath(null);
                  }}
                >
                  清空路径
                </button>
                <button
                  className="icon-button"
                  type="button"
                  aria-label="关闭图片路径绘制窗口"
                  onClick={() => {
                    setIsImageDialogOpen(false);
                    setActivePath(null);
                  }}
                >
                  <X size={18} weight="bold" />
                </button>
              </div>
            </header>
            <div className="video-path-canvas">
              <div className="video-path-image-frame" style={referenceImageFrameStyle}>
                <img
                  src={referenceImage.src}
                  alt={referenceImage.name}
                  onLoad={handleReferenceImageLoad}
                />
                <svg
                  className="video-path-layer"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-label="在图片上绘制运动路径"
                  onPointerDown={handlePathPointerDown}
                  onPointerMove={handlePathPointerMove}
                  onPointerUp={handlePathPointerEnd}
                  onPointerCancel={handlePathPointerEnd}
                >
                  {imagePaths.map((path, index) => (
                    <path
                      d={formatVideoPath(path)}
                      key={`${path[0]?.x ?? 0}-${index}`}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                  {activePath && (
                    <path
                      className="active"
                      d={formatVideoPath(activePath)}
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                </svg>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function TextView({
  project,
  materials,
  agentMessages,
  onUploadMaterials,
  userName,
  userAvatarUrl,
  documentInput,
  documentMessages,
  outline,
  documentOutput,
  documentOutputPages,
  canvasGeneratedImages,
  documentStatus,
  outputStatus,
  setDocumentInput,
  setDocumentMessages,
  setOutline,
  setDocumentOutput,
  setDocumentOutputPages,
  setDocumentStatus,
  setOutputStatus,
}: {
  project: Project;
  materials: ProjectMaterial[];
  agentMessages: AgentChatMessage[];
  onUploadMaterials: (files: FileList | File[]) => void;
  userName: string;
  userAvatarUrl: string | undefined;
  documentInput: string;
  documentMessages: AgentChatMessage[];
  outline: string;
  documentOutput: string;
  documentOutputPages: DocumentOutputPage[];
  canvasGeneratedImages: CanvasGeneratedImage[];
  documentStatus: AgentStreamStatus;
  outputStatus: AgentStreamStatus;
  setDocumentInput: Dispatch<SetStateAction<string>>;
  setDocumentMessages: Dispatch<SetStateAction<AgentChatMessage[]>>;
  setOutline: Dispatch<SetStateAction<string>>;
  setDocumentOutput: Dispatch<SetStateAction<string>>;
  setDocumentOutputPages: Dispatch<SetStateAction<DocumentOutputPage[]>>;
  setDocumentStatus: Dispatch<SetStateAction<AgentStreamStatus>>;
  setOutputStatus: Dispatch<SetStateAction<AgentStreamStatus>>;
}) {
  const outlineSections = useMemo(
    () =>
      outline
        .split(/\n+/)
        .map((item) => item.trim())
        .filter(Boolean),
    [outline],
  );
  const hasConversation = documentMessages.length > 0;
  const hasOutline = outlineSections.length > 0;
  const hasOutput =
    documentOutputPages.length > 0 ||
    documentOutput.trim().length > 0;
  const canExport = documentOutputPages.length
    ? documentOutputPages.every(
        (page) => page.status === "done" && page.imageUrl,
      )
    : documentOutput.trim().length > 0;
  const documentStage = getDocumentStage(outline, documentOutputPages);
  const documentStageIndex = documentStages.findIndex(
    (stage) => stage.id === documentStage,
  );
  const completedDocumentPages = documentOutputPages.filter(
    (page) => page.status === "done",
  ).length;
  const otherPendingDocumentPages = documentOutputPages.filter(
    (page) => page.status === "idle" || page.status === "error",
  ).length;
  const displayUserName = userName.trim() || "用户";
  const outputAbortControllerRef = useRef<AbortController | null>(null);
  const documentUploadInputRef = useRef<HTMLInputElement | null>(null);

  function handleDocumentMaterialInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      onUploadMaterials(event.target.files);
    }

    event.target.value = "";
  }

  function buildOutlineAgentContext(userRequest: string) {
    const projectBrief = [
      `项目名称：${project.name || "未填写"}`,
      `项目类型：${project.type || "未填写"}`,
      `项目地点：${project.location || "未填写"}`,
      `设计阶段：${project.designStage || "未填写"}`,
      `客户或委托方：${project.client || "未填写"}`,
      `项目目标：${project.brief.goals || "未填写"}`,
      `使用人群：${project.brief.users || "未填写"}`,
      `场地范围：${project.brief.siteScope || "未填写"}`,
      `已知限制：${project.brief.constraints || "未填写"}`,
    ].join("\n");
    const currentProjectMaterials = materials.slice(0, 12);
    const materialSummary = currentProjectMaterials.length
      ? currentProjectMaterials
          .map(
            (material) =>
              `- ${material.name}（${formatFileSize(material.size)}，${material.type || "未知格式"}，${material.uploadedAt}）`,
          )
          .join("\n")
      : "暂无用户提交资料。";
    const materialContent = currentProjectMaterials.length
      ? currentProjectMaterials
          .map((material, index) => {
            const sourceText = material.sourceText?.trim();
            const sourceNote = sourceText
              ? `\n  源文本摘录：${sourceText.slice(0, 6000)}`
              : material.sourceDataUrl?.startsWith("data:image/")
                ? "\n  图片资料：已作为用户提交资料上传，请结合可见画面判断。"
                : "\n  暂无可直接读取的源文本。";

            return `${index + 1}. ${material.name}${sourceNote}`;
          })
          .join("\n\n")
      : "暂无用户提交资料。";
    const agentConversationSummary = agentMessages
      .filter((item) => item.status !== "error" && item.text.trim())
      .slice(-12)
      .map(
        (item, index) =>
          `${index + 1}. ${item.role === "user" ? "用户" : "Zerlum Agent"}：${item.text.trim().slice(0, 3000)}`,
      )
      .join("\n\n") || "暂无有效对话。";
    const canvasImageSummary = canvasGeneratedImages.length
      ? canvasGeneratedImages
          .slice(0, 8)
          .map((image, index) => `${index + 1}. ${image.label || `画布生成图 ${index + 1}`}`)
          .join("\n")
      : "暂无画布生成图片。";

    return [
      "你是 Zerlum 景观设计系统的大纲生成模块。",
      "项目依据只来自用户提交的项目简报与场地资料、Zerlum Agent 已确认结论和画布方案成果。",
      "使用 Landscape Skill 组织景观设计方法、页面角色和质量检查。",
      "不要调用或引用任何 agent.md、数据库或联网检索结果。",
      "Landscape Skill 只能作为专业方法约束，不能当作项目事实来源。",
      "不要读取或引用平台页面信息、项目卡片字段、导航状态或任何未显式传入的页面内容。",
      "如果已收到任一来源，就只根据这些显式输入生成排版规范与大纲。",
      "如果目前没有收到项目简报与场地资料、Agent 已确认结论或画布方案成果，就回复：目前没有收到可用于生成大纲的资料。",
      "只输出结构化 Markdown，不输出身份说明、正文示例、推理过程、引用清单或额外解释。",
      "输出必须以【整套排版风格】开头，并确定唯一一套整案风格，不要提供多个候选路线。",
      "整套排版风格必须写明：16:9 横屏、风格名称与依据、主色/辅助色/强调色及比例、中文与西文字体方向、标题与正文字级、网格/页边距/留白/对齐、图片处理、图表/图标/分析图语言。",
      "排版风格之后，每页使用“第 N 页：页面标题”作为标题。",
      "每页必须写明：页面类型、本页目的、关键信息、主要视觉元素、版面位置与图文层级、画布生成图使用方式、资料依据/设计判断/待复核项。",
      "先判断景观项目类型、设计阶段、场地问题、目标人群和显式资料里可推导的表达基调。",
      "不要让整套方案全篇都放画布生成效果图。",
      "效果图页只用于封面、设计方向、重点节点、关键体验或前后对比等必要页面。",
      "其余页面应使用场地分析、结构图、游线图、植物板、材料板、节点分析或运营时间线等页面类型。",
      "根据资料选择项目理解、场地问题和机会、设计概念、总体空间结构、功能、游线与使用场景、关键节点、植物与季相策略、材料、铺装和构筑物、生态水策略、运营分期和待复核项等页面。",
      "明确区分项目事实、设计判断与待复核项。",
      "每页必须标注页面类型、主要视觉元素、是否使用画布生成图以及使用方式。",
      "随后逐页写清楚每页的排版内容、版面位置和图文层级。",
      "",
      "【左侧项目简报】",
      projectBrief,
      "",
      "【已上传项目资料清单】",
      materialSummary,
      "",
      "【文本交付区上传资料】",
      materialContent,
      "",
      "【Zerlum Agent 有效对话】",
      agentConversationSummary,
      "",
      "【方案画布成果】",
      canvasImageSummary,
      "",
      `用户原始要求：${userRequest}`,
      "",
      outline.trim()
        ? `【当前已有大纲】\n${outline.trim()}\n请在此基础上优化排布，不要完全重写。`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  async function requestDocumentAgent({
    message,
    assistantId,
    onText,
    finalFallback,
    agentTask,
    images = [],
    signal,
    displayText = (text: string) => text,
  }: {
    message: string;
    assistantId: string;
    onText: (text: string) => void;
    finalFallback: string;
    agentTask?: "outline" | "document-output";
    images?: CanvasGeneratedImage[];
    signal?: AbortSignal;
    displayText?: (text: string) => string;
  }) {
    const response = await fetch("/api/zerlum-agent", {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        view: "text",
        agentTask,
        message,
        materials,
        images,
      }),
    });

    if (!response.ok || !response.body) {
      const fallback = await response.text();
      throw new Error(parseApiErrorText(fallback, finalFallback));
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let assistantText = "";
    let streamError = "";

    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split(/\n\n|\r\n\r\n/);
      buffer = events.pop() ?? "";

      events.forEach((event) => {
        event
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.replace(/^data:\s?/, "").trim())
          .forEach((data) => {
            const errorText = extractAgentStreamError(data);

            if (errorText) {
              streamError = errorText;
              return;
            }

            const delta = extractAgentStreamText(data);

            if (!delta) {
              return;
            }

            assistantText += delta;
            onText(assistantText);
            const visibleText = displayText(assistantText);
            setDocumentMessages((current) =>
              current.map((item) =>
                item.id === assistantId
                  ? { ...item, text: visibleText, status: "streaming" }
                  : item,
              ),
            );
          });
      });
    }

    if (buffer.trim()) {
      const errorText = extractAgentStreamError(buffer.trim());

      if (errorText) {
        streamError = errorText;
      }

      const delta = extractAgentStreamText(buffer.trim());

      if (delta) {
        assistantText += delta;
        onText(assistantText);
      }
    }

    if (streamError) {
      throw new Error(
        normalizeAgentErrorMessage(streamError, finalFallback),
      );
    }

    const finalText = assistantText || finalFallback;
    const visibleFinalText = displayText(finalText);

    setDocumentMessages((current) =>
      current.map((item) =>
        item.id === assistantId
          ? {
              ...item,
              text: visibleFinalText || finalFallback,
              status: "done",
            }
          : item,
      ),
    );

    return finalText;
  }

  async function handleDocumentAgentSubmit() {
    const message = documentInput.trim();

    if (!message || documentStatus === "streaming") {
      return;
    }

    const userMessage: AgentChatMessage = {
      id: createId("document-user"),
      role: "user",
      text: message,
      status: "done",
    };
    const assistantId = createId("document-assistant");
    const assistantMessage: AgentChatMessage = {
      id: assistantId,
      role: "assistant",
      text: "",
      status: "streaming",
    };
    const agentPrompt = buildOutlineAgentContext(message);
    const hasProjectBriefInput = Boolean(
      (project.name && project.name !== "未命名景观项目") ||
        project.location.trim() ||
        project.client.trim() ||
        project.brief.goals.trim() ||
        project.brief.users.trim() ||
        project.brief.siteScope.trim() ||
        project.brief.constraints.trim(),
    );
    const hasOutlineInputs =
      hasProjectBriefInput ||
      materials.length > 0 ||
      agentMessages.some(
        (item) =>
          item.status !== "error" &&
          item.text.trim(),
      ) ||
      canvasGeneratedImages.some((image) => image.imageUrl.trim()) ||
      outline.trim();
    const previousOutline = outline.trim();

    setDocumentInput("");
    setDocumentOutput("");
    setDocumentOutputPages([]);

    if (!hasOutlineInputs) {
      setDocumentMessages((current) => [
        ...current,
        userMessage,
        {
          ...assistantMessage,
          text: "我是 Zerlum 景观设计系统。项目依据只来自用户提交的项目简报与场地资料、Zerlum Agent 已确认结论和画布方案成果。目前没有收到可用于生成大纲的资料。",
          status: "done",
        },
      ]);
      return;
    }

    setDocumentMessages((current) => [
      ...current,
      userMessage,
      assistantMessage,
    ]);
    setDocumentStatus("streaming");

    try {
      await requestDocumentAgent({
        message: agentPrompt,
        assistantId,
        onText: (text) => {
          if (text.trim()) {
            setOutline(text);
          }
        },
        finalFallback: previousOutline || "方案 Agent 暂时没有返回可用大纲。",
        agentTask: "outline",
        images: canvasGeneratedImages,
      });
    } catch (error) {
      const errorText = normalizeAgentErrorMessage(
        error instanceof Error ? error.message : "",
        "方案 Agent 连接失败，请稍后再试。",
      );
      setDocumentMessages((current) =>
        current.map((item) =>
          item.id === assistantId
            ? { ...item, text: errorText, status: "error" }
            : item,
        ),
      );
    } finally {
      setDocumentStatus("idle");
    }
  }

  async function handleGenerateDocumentOutput() {
    if (!hasOutline || outputStatus === "streaming") {
      return;
    }

    const outputPages = splitDocumentOutlinePages(outline);

    if (!outputPages.length) {
      return;
    }

    const assistantId = createId("document-output");
    const assistantMessage: AgentChatMessage = {
      id: assistantId,
      role: "assistant",
      text: "",
      status: "streaming",
    };
    const controller = new AbortController();

    outputAbortControllerRef.current = controller;

    setDocumentMessages((current) => [...current, assistantMessage]);
    setDocumentOutput("");
    setDocumentOutputPages(
      outputPages.map((page) => ({
        ...page,
        status: "idle",
        imageUrl: "",
        resultText: "",
        promptText: "",
      })),
    );
    setOutputStatus("streaming");

    try {
      const completedSummaries: string[] = [];
      const failedSummaries: string[] = [];

      for (const page of outputPages) {
        if (controller.signal.aborted) {
          break;
        }

        setDocumentOutputPages((current) =>
          current.map((item) =>
            item.id === page.id ? { ...item, status: "streaming" } : item,
          ),
        );
        setDocumentMessages((current) =>
          current.map((item) =>
            item.id === assistantId
              ? {
                  ...item,
                  text: `正在生成第 ${page.pageNumber}/${outputPages.length} 页图片方案...`,
                  status: "streaming",
                }
              : item,
          ),
        );

        try {
          const rawResult = await requestDocumentAgent({
            message: buildDocumentPageImagePrompt(page, outputPages.length, project),
            assistantId,
            onText: () => undefined,
            finalFallback: "方案 Agent 暂时没有返回可用方案图片。",
            agentTask: "document-output",
            images: canvasGeneratedImages,
            signal: controller.signal,
            displayText: () =>
              `正在生成第 ${page.pageNumber}/${outputPages.length} 页图片方案...`,
          });

          if (controller.signal.aborted) {
            break;
          }

          const parsedResult = parseDocumentOutputPageResult(rawResult);
          const pageStatus = parsedResult.imageUrl ? "done" : "error";
          const resultText =
            parsedResult.resultText ||
            (parsedResult.imageUrl ? "图片已生成。" : "本页没有返回可用图片。");
          const pageSummary = `第 ${page.pageNumber} 页 ${page.title}\n${resultText}`;

          setDocumentOutputPages((current) =>
            current.map((item) =>
              item.id === page.id
                ? {
                    ...item,
                    status: pageStatus,
                    imageUrl: parsedResult.imageUrl,
                    resultText,
                    promptText: parsedResult.promptText,
                    errorText: pageStatus === "error" ? resultText : undefined,
                  }
                : item,
            ),
          );

          if (pageStatus === "error") {
            failedSummaries.push(pageSummary);
          } else {
            completedSummaries.push(pageSummary);
          }

          setDocumentOutput([...completedSummaries, ...failedSummaries].join("\n\n"));
        } catch (pageError) {
          if (controller.signal.aborted) {
            break;
          }

          const pageErrorText = formatDocumentPageError(pageError);
          const pageSummary = `第 ${page.pageNumber} 页 ${page.title}\n${pageErrorText}`;

          failedSummaries.push(pageSummary);
          setDocumentOutputPages((current) =>
            current.map((item) =>
              item.id === page.id
                ? {
                    ...item,
                    status: "error",
                    resultText: pageErrorText,
                    errorText: pageErrorText,
                  }
                : item,
            ),
          );
          setDocumentOutput([...completedSummaries, ...failedSummaries].join("\n\n"));
          continue;
        }
      }

      if (controller.signal.aborted) {
        setDocumentMessages((current) =>
          current.map((item) =>
            item.id === assistantId
              ? {
                  ...item,
                  text: "方案文本生成已暂停。",
                  status: "done",
                }
              : item,
          ),
        );
        setDocumentOutputPages((current) =>
          current.map((item) =>
            item.status === "streaming"
              ? {
                  ...item,
                  status: "idle",
                  resultText: "已暂停，点击生成方案文本可继续重新生成。",
                }
              : item,
          ),
        );
        return;
      }

      setDocumentMessages((current) =>
        current.map((item) =>
          item.id === assistantId
            ? {
                ...item,
                text: failedSummaries.length
                  ? `已生成 ${completedSummaries.length} 张图片方案，部分页面生成失败 ${failedSummaries.length} 页，可稍后重试。`
                  : `已按大纲分页生成 ${outputPages.length} 张图片方案。`,
                status: "done",
              }
            : item,
        ),
      );
    } catch (error) {
      if (controller.signal.aborted) {
        setDocumentMessages((current) =>
          current.map((item) =>
            item.id === assistantId
              ? {
                  ...item,
                  text: "方案文本生成已暂停。",
                  status: "done",
                }
              : item,
          ),
        );
        setDocumentOutputPages((current) =>
          current.map((item) =>
            item.status === "streaming"
              ? {
                  ...item,
                  status: "idle",
                  resultText: "已暂停，点击生成方案文本可继续重新生成。",
                }
              : item,
          ),
        );
        return;
      }

      const errorText =
        error instanceof Error
          ? error.message
          : "方案文本生成失败，请稍后再试。";
      setDocumentMessages((current) =>
        current.map((item) =>
          item.id === assistantId
            ? { ...item, text: errorText, status: "error" }
            : item,
        ),
      );
    } finally {
      if (outputAbortControllerRef.current === controller) {
        outputAbortControllerRef.current = null;
      }
      setOutputStatus("idle");
    }
  }

  async function retryDocumentPage(pageId: string) {
    if (outputStatus === "streaming") {
      return;
    }

    const page = documentOutputPages.find((item) => item.id === pageId);

    if (!page) {
      return;
    }

    const assistantId = createId("document-page-retry");
    const controller = new AbortController();

    outputAbortControllerRef.current = controller;
    setOutputStatus("streaming");
    setDocumentMessages((current) => [
      ...current,
      {
        id: assistantId,
        role: "assistant",
        text: `正在重新生成第 ${page.pageNumber} 页…`,
        status: "streaming",
      },
    ]);
    setDocumentOutputPages((current) =>
      current.map((item) =>
        item.id === pageId
          ? {
              ...item,
              status: "streaming",
              imageUrl: "",
              resultText: "",
              errorText: undefined,
            }
          : item,
      ),
    );

    try {
      const rawResult = await requestDocumentAgent({
        message: buildDocumentPageImagePrompt(
          page,
          documentOutputPages.length,
          project,
        ),
        assistantId,
        onText: () => undefined,
        finalFallback: "本页暂时没有返回可用方案图片。",
        agentTask: "document-output",
        images: canvasGeneratedImages,
        signal: controller.signal,
        displayText: () => `正在重新生成第 ${page.pageNumber} 页…`,
      });
      const parsedResult = parseDocumentOutputPageResult(rawResult);
      const pageStatus = parsedResult.imageUrl ? "done" : "error";
      const resultText =
        parsedResult.resultText ||
        (parsedResult.imageUrl ? "图片已生成。" : "本页没有返回可用图片。");

      setDocumentOutputPages((current) =>
        current.map((item) =>
          item.id === pageId
            ? {
                ...item,
                status: pageStatus,
                imageUrl: parsedResult.imageUrl,
                resultText,
                promptText: parsedResult.promptText,
                errorText: pageStatus === "error" ? resultText : undefined,
              }
            : item,
        ),
      );
    } catch (pageError) {
      if (controller.signal.aborted) {
        setDocumentOutputPages((current) =>
          current.map((item) =>
            item.id === pageId
              ? {
                  ...item,
                  status: "idle",
                  resultText: "本页重试已暂停，可稍后继续。",
                }
              : item,
          ),
        );
        setDocumentMessages((current) =>
          current.map((item) =>
            item.id === assistantId
              ? {
                  ...item,
                  text: `第 ${page.pageNumber} 页重试已暂停。`,
                  status: "done",
                }
              : item,
          ),
        );
      } else {
        const pageErrorText = formatDocumentPageError(pageError);

        setDocumentOutputPages((current) =>
          current.map((item) =>
            item.id === pageId
              ? {
                  ...item,
                  status: "error",
                  resultText: pageErrorText,
                  errorText: pageErrorText,
                }
              : item,
          ),
        );
        setDocumentMessages((current) =>
          current.map((item) =>
            item.id === assistantId
              ? { ...item, text: pageErrorText, status: "error" }
              : item,
          ),
        );
      }
    } finally {
      if (outputAbortControllerRef.current === controller) {
        outputAbortControllerRef.current = null;
      }
      setOutputStatus("idle");
    }
  }

  async function continueGeneratingOtherPages(pageId: string) {
    const pendingPageIds = documentOutputPages
      .filter(
        (page) =>
          page.id !== pageId &&
          (page.status === "idle" || page.status === "error"),
      )
      .map((page) => page.id);

    for (const pendingPageId of pendingPageIds) {
      await retryDocumentPage(pendingPageId);
    }
  }

  function handlePauseDocumentOutput() {
    outputAbortControllerRef.current?.abort();
  }

  function handleExportDocument() {
    if (!canExport) {
      return;
    }

    window.print();
  }

  function handleOutlineChange(value: string) {
    setOutline(value);
    setDocumentOutput("");
    setDocumentOutputPages([]);
  }

  return (
    <div className="document-workspace">
      <ol className="document-stage-bar" aria-label="文本交付流程">
        {documentStages.map((stage, index) => {
          const isActive = stage.id === documentStage;
          const isComplete = index < documentStageIndex;
          let statusText = stage.description;

          if (stage.id === "sources") {
            statusText = materials.length
              ? `${materials.length} 份资料已接入`
              : "等待上传项目资料";
          } else if (stage.id === "outline" && hasOutline) {
            statusText = `${outlineSections.length} 个章节可编辑`;
          } else if (stage.id === "pages" && documentOutputPages.length) {
            statusText = `${completedDocumentPages}/${documentOutputPages.length} 页已完成`;
          } else if (stage.id === "review" && canExport) {
            statusText = "可校对并导出 PDF";
          }

          return (
            <li
              className={`${isActive ? "active" : ""} ${isComplete ? "complete" : ""}`.trim()}
              key={stage.id}
            >
              <span aria-hidden="true">
                {isComplete ? <CheckCircle size={18} weight="fill" /> : index + 1}
              </span>
              <div>
                <strong>{stage.label}</strong>
                <small>{statusText}</small>
              </div>
            </li>
          );
        })}
      </ol>
      <section className="document-agent-panel" aria-label="方案 Agent">
        <header className="document-agent-brand">
          <img src="/brand/zerlum-logo-mark.png" alt="" />
          <div>
            <strong>Zerlum Outline</strong>
            <small>方案大纲排布建议</small>
          </div>
        </header>
        <div className="document-upload-strip">
          <button
            className="document-upload-button"
            type="button"
            onClick={() => documentUploadInputRef.current?.click()}
          >
            <UploadSimple size={15} weight="bold" />
            上传资料
          </button>
          <input
            ref={documentUploadInputRef}
            className="agent-hidden-file"
            type="file"
            multiple
            onChange={handleDocumentMaterialInputChange}
          />
        </div>
        <div className={`document-agent-home ${hasConversation ? "chatting" : ""}`}>
          <div className="document-agent-conversation" aria-live="polite">
            {documentMessages.map((message) => (
              <article
                className={`agent-message ${message.role} ${
                  message.status ?? "done"
                }`}
                key={message.id}
              >
                <div className="agent-message-meta">
                  <div className="agent-message-avatar" aria-hidden="true">
                    {message.role === "assistant" ? (
                      <img src="/brand/zerlum-logo-mark.png" alt="" />
                    ) : (
                      <UserMessageAvatar avatarUrl={userAvatarUrl} />
                    )}
                  </div>
                  <span>
                    {message.role === "assistant" ? "方案 Agent" : displayUserName}
                  </span>
                </div>
                <div className="agent-message-content">
                  <p>
                    {message.text ||
                      (message.status === "streaming" ? "正在生成..." : "")}
                  </p>
                </div>
              </article>
            ))}
          </div>
          <AgentComposer
            value={documentInput}
            onValueChange={setDocumentInput}
            onSubmit={handleDocumentAgentSubmit}
            placeholder="说明方案要求"
            ariaLabel="向方案 Agent 说明要求"
            disabled={documentStatus === "streaming"}
          />
        </div>
      </section>

      <aside className="document-outline-panel">
        <div className="document-panel-head">
          <PanelTitle icon={ClipboardText} title="大纲生成" />
          <span>{hasOutline ? `${outlineSections.length} 个章节` : "待生成"}</span>
        </div>
        <textarea
          className="document-outline-editor"
          value={outline}
          placeholder="方案 Agent 生成的大纲会出现在这里，也可以手动调整。"
          aria-label="方案大纲"
          onChange={(event) => handleOutlineChange(event.target.value)}
        />
        <div className="document-rail-actions">
          <button
            className="primary-button full"
            type="button"
            disabled={!hasOutline || outputStatus === "streaming"}
            title={hasOutline ? "生成图片式方案文本" : "请先生成或填写大纲"}
            onClick={handleGenerateDocumentOutput}
          >
            {outputStatus === "streaming" ? (
              <SpinnerGap size={18} weight="bold" />
            ) : (
              <FileText size={18} weight="bold" />
            )}
            生成方案文本
          </button>
          {outputStatus === "streaming" && (
            <button
              className="secondary-button full"
              type="button"
              aria-label="暂停生成方案文本"
              onClick={handlePauseDocumentOutput}
            >
              暂停
            </button>
          )}
        </div>
      </aside>

      <aside className="document-preview-panel document-preview">
        <div className="document-panel-head">
          <PanelTitle icon={FilePdf} title="方案文本" />
          <span>{hasOutput ? "可导出" : "待生成"}</span>
        </div>
        {hasOutput ? (
          <div className="document-output-body" aria-label="方案文本输出">
            {documentOutputPages.length ? (
              <div className="document-output-pages">
                {documentOutputPages.map((page) => (
                  <article className="document-output-page-card" key={page.id}>
                    <header>
                      <div>
                        <span>第 {page.pageNumber} 页</span>
                        <strong>{page.title}</strong>
                      </div>
                      <small>
                        {page.status === "streaming"
                          ? "生成中"
                          : page.status === "error"
                            ? "需重试"
                            : page.imageUrl
                              ? "已生成"
                              : "等待"}
                      </small>
                    </header>
                    {page.imageUrl ? (
                      <img src={page.imageUrl} alt={`${page.title} 图片方案`} />
                    ) : (
                      <pre>{page.errorText || page.resultText || "正在生成图片方案..."}</pre>
                    )}
                    {page.status === "error" && (
                      <div className="document-page-recovery">
                        <button
                          className="secondary-button compact"
                          type="button"
                          disabled={outputStatus === "streaming"}
                          onClick={() => retryDocumentPage(page.id)}
                        >
                          <ArrowClockwise size={16} weight="bold" />
                          重试本页
                        </button>
                        <button
                          className="ghost-button compact"
                          type="button"
                          disabled={
                            outputStatus === "streaming" ||
                            otherPendingDocumentPages <= 1
                          }
                          onClick={() => continueGeneratingOtherPages(page.id)}
                        >
                          继续生成其他页面
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <pre>{documentOutput}</pre>
            )}
          </div>
        ) : (
          <EmptyState
            icon={FilePdf}
            title="暂无方案文本"
            text="确认大纲后，生成的图片式方案文本会显示在这里。"
          />
        )}
        <div className="document-export-bar">
          <div>
            <span>导出状态</span>
            <strong>
              {canExport ? "PDF 已准备" : "等待方案文本"}
            </strong>
          </div>
          <button
            className="primary-button compact"
            type="button"
            disabled={!canExport}
            title={canExport ? "导出 PDF" : "请先生成方案文本"}
            onClick={handleExportDocument}
          >
            <DownloadSimple size={18} weight="bold" />
            导出 PDF
          </button>
        </div>
      </aside>
    </div>
  );
}


function ModalFrame({
  title,
  children,
  onClose,
  wide,
  softBackdrop,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  softBackdrop?: boolean;
}) {
  return (
    <div
      className={`modal-layer ${softBackdrop ? "soft-backdrop" : ""}`}
      role="presentation"
    >
      <section
        className={`modal-card ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} type="button">
            关闭
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function LabelledInput({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  maxLength,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  maxLength?: number;
  disabled?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        maxLength={maxLength}
        autoComplete={autoComplete}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function AvatarPicker({
  value,
  imageUrl,
  onChange,
}: {
  value: string;
  imageUrl?: string;
  onChange: (value: string, imageUrl?: string) => void;
}) {
  const [localPreviewUrl, setLocalPreviewUrl] = useState(imageUrl ?? "");
  const previewUrl = localPreviewUrl || imageUrl;
  const avatarStatus = value && value !== "未选择头像" ? value : "未选择头像";

  useEffect(() => {
    setLocalPreviewUrl(imageUrl ?? "");
  }, [imageUrl]);

  return (
    <label className="avatar-picker">
      <span className="avatar-preview">
        {previewUrl ? (
          <img src={previewUrl} alt="" />
        ) : (
          <UserCircle size={42} weight="bold" />
        )}
      </span>
      <span className="avatar-picker-copy">
        <strong>头像</strong>
        <small>{avatarStatus}</small>
      </span>
      <span className="avatar-upload-action" aria-hidden="true">
        <UploadSimple size={17} weight="bold" />
        上传头像
      </span>
      <input
        className="avatar-upload-input"
        type="file"
        accept="image/*"
        aria-label="上传头像"
        onChange={async (event) => {
          const file = event.target.files?.[0];

          if (!file) {
            onChange("未选择头像", undefined);
            return;
          }

          try {
            const nextPreviewUrl = await readAvatarFileAsDataUrl(file);
            setLocalPreviewUrl(nextPreviewUrl ?? "");
            onChange(file.name, nextPreviewUrl);
          } catch (error) {
            console.warn("头像读取失败。", error);
          }
          event.target.value = "";
        }}
      />
    </label>
  );
}

function ChoiceButton({
  icon: Icon,
  title,
  text,
  onClick,
}: {
  icon: typeof PlusCircle;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button className="choice-button" onClick={onClick} type="button">
      <Icon size={28} weight="bold" />
      <strong>{title}</strong>
      <span>{text}</span>
    </button>
  );
}

function PanelTitle({
  icon: Icon,
  title,
}: {
  icon: typeof ChatCircleText;
  title: string;
}) {
  return (
    <div className="panel-title">
      <Icon size={19} weight="bold" />
      <h2>{title}</h2>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof ChatCircleText;
  title: string;
  text: string;
}) {
  return (
    <div className="empty-state">
      <Icon size={22} weight="bold" />
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function MetricButton({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button className="metric-card metric-button" type="button" onClick={onClick}>
      <span>{label}</span>
      <strong>{value}</strong>
    </button>
  );
}

function InfoBlock({
  icon: Icon,
  title,
  rows,
}: {
  icon: typeof ChatCircleText;
  title: string;
  rows: string[][];
}) {
  return (
    <section className="info-block">
      <PanelTitle icon={Icon} title={title} />
      {rows.map(([label, value]) => (
        <div className="info-row" key={`${label}-${value}`}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </section>
  );
}

export default App;
