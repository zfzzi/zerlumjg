import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(
  new URL("../src/App.tsx", import.meta.url),
  "utf8",
);
const stylesSource = readFileSync(
  new URL("../src/styles.css", import.meta.url),
  "utf8",
);
const manualPromptFunction = appSource.slice(
  appSource.indexOf("async function generateCanvasNodePrompt"),
  appSource.indexOf("async function generateCanvasImage"),
);
const imageGenerationFunction = appSource.slice(
  appSource.indexOf("async function generateCanvasImage"),
  appSource.indexOf("async function pollCanvasVideoTaskStatus"),
);
const collectCanvasPromptImagesFunction = appSource.slice(
  appSource.indexOf("async function collectCanvasPromptImages"),
  appSource.indexOf("async function requestCanvasGeneratedPrompt"),
);
const canvasNodeCardSource = appSource.slice(
  appSource.indexOf("function CanvasNodeCard"),
  appSource.indexOf("function VideoView"),
);

test("workspace navigation uses one unified AI canvas entry for image and video creation", () => {
  assert.match(appSource, /\{ id: "canvas", label: "AI无限画布", icon: ImageIcon \}/);
  assert.doesNotMatch(appSource, /\{ id: "video", label: "视频创作"/);
  assert.doesNotMatch(appSource, /activeView !== "video"/);
  assert.doesNotMatch(appSource, /activeView === "video"/);
  assert.doesNotMatch(appSource, /<VideoView[\s\S]*\/>/);
});

test("unified canvas exposes image and video node types with version history", () => {
  assert.match(appSource, /type CanvasNodeKind = "image" \| "video";/);
  assert.match(
    appSource,
    /type CanvasEdgeRole =\s*\|\s*"main-image"\s*\|\s*"reference-image"\s*\|\s*"first-frame"\s*\|\s*"reference-video";/,
  );
  assert.match(appSource, /type CanvasGenerationVersion = \{/);
  assert.match(appSource, /versions: CanvasGenerationVersion\[\];/);
  assert.match(appSource, /selectedVersionId\?: string;/);
  assert.match(appSource, /const initialCanvasNodes: CanvasNode\[\] = \[\];/);
  assert.match(appSource, /const initialCanvasEdges: CanvasEdge\[\] = \[\];/);
  assert.doesNotMatch(appSource, /title: "图像节点 A"/);
  assert.doesNotMatch(appSource, /title: "视频节点 B"/);
  assert.doesNotMatch(appSource, /id: "edge-main-image-video"/);
  assert.match(appSource, /imageAspectRatio\?: string;/);
  assert.match(appSource, /imageCount\?: string;/);
});

test("canvas node titles use concise image and video numbering", () => {
  assert.match(appSource, /title: `图像 \$\{count\}`/);
  assert.match(appSource, /title: `视频 \$\{count\}`/);
  assert.doesNotMatch(appSource, /title: `图像节点 \$\{count\}`/);
  assert.doesNotMatch(appSource, /title: `视频节点 \$\{count\}`/);
  assert.doesNotMatch(appSource, /title: `参考图节点 \$\{count\}`/);
});

test("unified canvas connection rules infer edge roles and block video to image", () => {
  assert.match(appSource, /function getDefaultCanvasEdgeRole/);
  assert.match(appSource, /return "main-image";/);
  assert.match(appSource, /return "reference-image";/);
  assert.match(appSource, /return "first-frame";/);
  assert.match(appSource, /return "reference-video";/);
  assert.match(appSource, /function canConnectCanvasNodes/);
  assert.match(appSource, /source\.kind === "video" && target\.kind === "image"[\s\S]*return false;/);
  assert.doesNotMatch(appSource, /className="canvas-node-edge-stack"/);
  assert.doesNotMatch(appSource, /aria-label="选择连线角色"/);
});

test("canvas image references only connect outward from uploaded main images", () => {
  assert.match(appSource, /function isUploadedCanvasImageNode/);
  assert.match(appSource, /const version = getSelectedCanvasVersion\(node\);/);
  assert.match(appSource, /version\?\.prompt === "本地上传"/);
  assert.match(
    appSource,
    /source\.kind === "image" && target\.kind === "image"[\s\S]*return isUploadedCanvasImageNode\(source\) && !isUploadedCanvasImageNode\(target\);/,
  );
  assert.match(
    appSource,
    /if \(source\.kind === "image" && target\.kind === "image"\) \{[\s\S]*return getCanvasImageEdgeRole\(source, target, existingEdges\);/,
  );
  assert.match(
    appSource,
    /if \(!isUploadedCanvasImageNode\(source\)\) \{[\s\S]*return "reference-image";[\s\S]*const hasFirstFrame/,
  );
  assert.match(appSource, /const hasMainImage = existingEdges\.some/);
  assert.match(
    appSource,
    /setCanvasEdges\(\(current\) =>\s*current\.filter\(\(edge\) => edge\.to !== targetNodeId\)/,
  );
});

test("node type chooser validates image creation against a clean draft node", () => {
  assert.match(appSource, /function createCanvasConnectionPreviewNode/);
  assert.match(
    appSource,
    /kind === "image"[\s\S]*versions: \[\][\s\S]*imageResolution: "4K"/,
  );
  assert.match(
    appSource,
    /disabled=\{!canConnectCanvasNodes\(\s*draftSourceNode,\s*createCanvasConnectionPreviewNode\("image"\),\s*\)\}/,
  );
  assert.doesNotMatch(
    appSource,
    /disabled=\{!canConnectCanvasNodes\(draftSourceNode, \{[\s\S]*\.\.\.draftSourceNode[\s\S]*kind: "image"/,
  );
});

test("canvas image and video generation default to adaptive ratios", () => {
  const previewNodeFactory = appSource.slice(
    appSource.indexOf("function createCanvasConnectionPreviewNode"),
    appSource.indexOf("function getDefaultCanvasEdgeRole"),
  );
  const createNodeFactoryStart = appSource.indexOf("function createCanvasNode");
  const createNodeFactory = appSource.slice(
    createNodeFactoryStart,
    appSource.indexOf("function handleCanvasDoubleClick", createNodeFactoryStart),
  );
  const videoGenerationFunction = appSource.slice(
    appSource.indexOf("async function generateCanvasVideo"),
    appSource.indexOf("function previewCanvasNodeImage"),
  );

  assert.match(previewNodeFactory, /imageAspectRatio: "adaptive"/);
  assert.match(previewNodeFactory, /aspectRatio: "adaptive"/);
  assert.match(createNodeFactory, /imageAspectRatio: "adaptive"/);
  assert.match(createNodeFactory, /aspectRatio: "adaptive"/);
  assert.match(
    imageGenerationFunction,
    /const targetAspectRatio = node\.params\.imageAspectRatio \?\? "adaptive";/,
  );
  assert.match(
    videoGenerationFunction,
    /const aspectRatio = node\.params\.aspectRatio \?\? "adaptive";/,
  );
  assert.match(
    canvasNodeCardSource,
    /value=\{node\.params\.imageAspectRatio \?\? "adaptive"\}/,
  );
  assert.match(
    canvasNodeCardSource,
    /value=\{node\.params\.aspectRatio \?\? "adaptive"\}/,
  );
});

test("video generation runs inside video nodes using connected image and video references", () => {
  assert.match(appSource, /async function generateCanvasVideo/);
  assert.match(appSource, /fetch\("\/api\/zerlum-video"/);
  assert.match(appSource, /referenceImages: canvasReferenceImages/);
  assert.match(appSource, /referenceVideos: canvasReferenceVideos/);
  assert.match(appSource, /imagePaths: node\.videoPaths/);
  assert.match(appSource, /await pollCanvasVideoTaskStatus/);
  assert.match(appSource, /status: "submitted"/);
  assert.match(appSource, /progress:\s*100/);
});

test("video node controls use a duration slider and compact send action", () => {
  assert.match(appSource, /const canvasVideoDurationMin = 1;/);
  assert.match(appSource, /const canvasVideoDurationMax = 15;/);
  assert.match(appSource, /function parseCanvasDurationSeconds/);
  assert.match(appSource, /function getCanvasDurationSecondsFromPointer/);
  assert.doesNotMatch(appSource, /const canvasVideoDurationOptions = \[/);
  assert.match(
    appSource,
    /className="canvas-node-control-section video-camera-preset"[\s\S]*className="canvas-node-video-toolbar"/,
  );
  assert.match(
    appSource,
    /className="canvas-node-duration-slider"[\s\S]*type="range"[\s\S]*min=\{canvasVideoDurationMin\}[\s\S]*max=\{canvasVideoDurationMax\}[\s\S]*step=\{1\}/,
  );
  assert.match(
    appSource,
    /className="canvas-node-duration-slider"[\s\S]*onPointerDown=\{\(event\) => \{[\s\S]*event\.stopPropagation\(\);[\s\S]*updateVideoDurationFromPointer\(event\);/,
  );
  assert.match(
    appSource,
    /onPointerMove=\{\(event\) => \{[\s\S]*if \(event\.buttons === 1\)[\s\S]*updateVideoDurationFromPointer\(event\);/,
  );
  assert.match(
    appSource,
    /onParamChange\(node\.id, "duration", `\$\{event\.currentTarget\.value\}s`\)/,
  );
  assert.match(appSource, /className="canvas-node-duration-value"/);
  assert.match(appSource, /aria-label="发送生成视频"/);
  assert.match(
    appSource,
    /<PaperPlaneTilt size=\{17\} weight="bold" \/>/,
  );
  assert.doesNotMatch(appSource, /上传素材/);
  assert.doesNotMatch(appSource, /className="canvas-node-action-row"/);
  assert.match(stylesSource, /\.canvas-node-video-toolbar\s*{/);
  assert.match(stylesSource, /\.canvas-node-duration-control\s*{/);
  assert.match(stylesSource, /\.canvas-node-duration-slider\s*{/);
});

test("uploaded video nodes keep the complete playable file behind a size guard", () => {
  assert.match(appSource, /const CANVAS_VIDEO_UPLOAD_MAX_MB = 20;/);
  assert.match(
    appSource,
    /const CANVAS_VIDEO_UPLOAD_MAX_BYTES = CANVAS_VIDEO_UPLOAD_MAX_MB \* 1024 \* 1024;/,
  );
  assert.match(appSource, /file\.size > CANVAS_VIDEO_UPLOAD_MAX_BYTES/);
  assert.match(appSource, /视频文件不能超过 \$\{CANVAS_VIDEO_UPLOAD_MAX_MB\}MB/);
  assert.match(appSource, /const url = URL\.createObjectURL\(file\);/);
  assert.match(
    appSource,
    /<video[\s\S]*src=\{mediaUrl\}[\s\S]*controls[\s\S]*preload="metadata"[\s\S]*onPointerDown=\{\(event\) => event\.stopPropagation\(\)\}/,
  );
  assert.match(appSource, /url: await resolveMediaUrlForAgentApi\(sourceUrl\)/);
  assert.match(stylesSource, /\.canvas-node-media video\s*{[\s\S]*pointer-events:\s*auto/);
});

test("unified canvas keeps generation controls inline under each media node", () => {
  assert.match(stylesSource, /\.canvas-layout\s*{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\);/);
  assert.match(appSource, /const \[activeCanvasNodeId, setActiveCanvasNodeId\] = useState\(""\);/);
  assert.doesNotMatch(appSource, /className="canvas-floating-toolbar"/);
  assert.doesNotMatch(stylesSource, /\.canvas-floating-toolbar\s*{/);
  assert.doesNotMatch(appSource, /<aside className="canvas-inspector-panel">[\s\S]*<CanvasInspectorPanel/);
  assert.doesNotMatch(appSource, /<UnifiedCanvasView[\s\S]*visualInput=/);
  assert.doesNotMatch(appSource, /function UnifiedCanvasView\([\s\S]*onVisualMessagesChange/);
  assert.match(appSource, /className="canvas-node-media-frame"/);
  assert.match(appSource, /className="canvas-node-control-panel"/);
  assert.match(appSource, /function shouldShowCanvasNodeControlPanel/);
  assert.match(appSource, /function isMainCanvasImageNode/);
  assert.match(appSource, /const showControlPanel = shouldShowCanvasNodeControlPanel/);
  assert.match(appSource, /\{showControlPanel && \([\s\S]*className="canvas-node-control-panel"/);
  assert.match(appSource, /className="canvas-node-prompt"/);
  assert.match(appSource, /function UnifiedCanvasView[\s\S]*const \[pan, setPan\] = useState\(\{ x: 70, y: 90 \}\);/);
  assert.doesNotMatch(appSource, /connectedEdges=\{canvasEdges\.filter/);
  assert.match(appSource, /onPromptChange\(node\.id, event\.currentTarget\.value\)/);
  assert.match(appSource, /\{node\.versions\.length > 0 && \([\s\S]*className="canvas-node-version-strip"/);
  assert.match(stylesSource, /\.canvas-node-control-panel\s*{/);
  assert.match(stylesSource, /\.canvas-node:not\(\.active\)\s*{/);
  assert.match(stylesSource, /\.canvas-node\.media-only\s*{/);
  assert.match(stylesSource, /\.canvas-node-control-grid\s*{/);
  assert.match(stylesSource, /\.canvas-node-prompt\s*{[\s\S]*min-height:\s*58px/);
  assert.match(stylesSource, /\.canvas-node-image-toolbar\s*{/);
  assert.match(stylesSource, /\.canvas-node-send-button\s*{/);
  assert.match(stylesSource, /\.canvas-node-version-strip\s*{/);
  assert.doesNotMatch(stylesSource, /\.canvas-node-edge-stack\s*{/);
  assert.match(
    stylesSource,
    /@media \(max-width: 1180px\)[\s\S]*\.canvas-layout\s*{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/,
  );
});

test("image node generation controls use inline dropdowns and send action", () => {
  assert.match(appSource, /const canvasImageAspectOptions = \[/);
  assert.match(appSource, /const canvasImageCountOptions = \[/);
  assert.match(appSource, /className="canvas-node-image-toolbar"/);
  assert.match(appSource, /className="canvas-node-upload-chip"/);
  assert.match(appSource, /参考图/);
  assert.match(
    appSource,
    /value=\{node\.params\.imageResolution \?\? "4K"\}[\s\S]*onParamChange\(node\.id, "imageResolution", value\)/,
  );
  assert.match(
    appSource,
    /value=\{node\.params\.imageAspectRatio \?\? "adaptive"\}[\s\S]*onParamChange\(node\.id, "imageAspectRatio", value\)/,
  );
  assert.match(
    appSource,
    /value=\{node\.params\.imageCount \?\? "1"\}[\s\S]*onParamChange\(node\.id, "imageCount", value\)/,
  );
  assert.match(appSource, /className="canvas-node-send-button"/);
  assert.match(appSource, /aria-label="发送生成图像"/);
  assert.match(appSource, /<PaperPlaneTilt size=\{17\} weight="bold" \/>/);
  assert.doesNotMatch(appSource, /className="canvas-node-resolution-row"/);
  assert.doesNotMatch(stylesSource, /\.canvas-node-resolution-row\s*{/);
  assert.doesNotMatch(appSource, /\{generationLabel\}/);
});

test("image reference button creates a connected reference image node", () => {
  assert.match(appSource, /function createCanvasReferenceImageNode\(targetNode: CanvasNode\)/);
  assert.match(appSource, /title: `图像 \$\{count\}`/);
  assert.match(
    appSource,
    /from: node\.id,[\s\S]*to: targetNode\.id,[\s\S]*role: "reference-image"/,
  );
  assert.match(
    appSource,
    /pendingUploadNodeId\.current = node\.id;[\s\S]*imageUploadInputRef\.current\?\.click\(\);/,
  );
  assert.match(appSource, /onAddReferenceImage=\{createCanvasReferenceImageNode\}/);
  assert.match(appSource, /onAddReferenceImage: \(node: CanvasNode\) => void;/);

  const referenceButtonMarkup = appSource.match(
    /<button[\s\S]*className="canvas-node-upload-chip"[\s\S]*?<\/button>/,
  )?.[0];

  assert.ok(referenceButtonMarkup);
  assert.match(referenceButtonMarkup, /onClick=\{\(\) => onAddReferenceImage\(node\)\}/);
  assert.match(referenceButtonMarkup, /参考图/);
  assert.doesNotMatch(referenceButtonMarkup, /onUploadMedia\(node\)/);
});

test("manually connected image nodes can become generation references", () => {
  assert.match(appSource, /function getCanvasImageEdgeRole/);
  assert.match(
    appSource,
    /const hasMainImage = existingEdges\.some\([\s\S]*edge\.to === target\.id[\s\S]*edge\.role === "main-image"/,
  );
  assert.match(
    appSource,
    /if \(hasMainImage\) \{[\s\S]*return "reference-image";/,
  );
  assert.match(
    appSource,
    /if \(source\.kind === "image" && target\.kind === "image"\) \{[\s\S]*return getCanvasImageEdgeRole\(source, target, existingEdges\);/,
  );
});

test("canvas version buttons restore the selected generation record", () => {
  assert.match(appSource, /function selectCanvasNodeVersion\(nodeId: string, versionId: string\)/);
  assert.match(
    appSource,
    /const selectedVersion = node\.versions\.find\(\s*\(version\) => version\.id === versionId,\s*\);/,
  );
  assert.match(appSource, /selectedVersionId: versionId/);
  assert.match(appSource, /prompt: selectedVersion\?\.prompt \?\? node\.prompt/);
  assert.match(appSource, /params: selectedVersion\?\.params \?\? node\.params/);
  assert.match(appSource, /onClick=\{\(\) => onSelectVersion\(node\.id, item\.id\)\}/);
  assert.match(stylesSource, /\.canvas-node-version-buttons button\.active/);
});

test("reference image nodes expose a replace image action", () => {
  assert.match(appSource, /function isReferenceCanvasImageNode\(node: CanvasNode, edges: CanvasEdge\[\]\)/);
  assert.match(appSource, /function isMainCanvasReferenceImageNode\(node: CanvasNode, edges: CanvasEdge\[\]\)/);
  assert.match(appSource, /function isReplaceableCanvasImageNode\(node: CanvasNode, edges: CanvasEdge\[\]\)/);
  assert.match(
    appSource,
    /node\.kind === "image"[\s\S]*edge\.from === node\.id && edge\.role === "reference-image"/,
  );
  assert.match(
    appSource,
    /node\.kind === "image"[\s\S]*edge\.from === node\.id && edge\.role === "main-image"/,
  );
  assert.match(appSource, /function replaceCanvasReferenceImageNode\(nodeId: string\)/);
  assert.match(
    appSource,
    /pendingUploadNodeId\.current = nodeId;[\s\S]*imageUploadInputRef\.current\?\.click\(\);/,
  );
  assert.match(appSource, /isReplaceableImage=\{isReplaceableCanvasImageNode\(node, canvasEdges\)\}/);
  assert.match(appSource, /onReplaceReferenceImage=\{replaceCanvasReferenceImageNode\}/);
  assert.match(appSource, /onReplaceReferenceImage: \(nodeId: string\) => void;/);
  assert.match(appSource, /className="canvas-node-replace-action"/);
  assert.match(appSource, /aria-label="更换图片"/);
  assert.match(appSource, /onReplaceReferenceImage\(node\.id\)/);
  assert.match(stylesSource, /\.canvas-node-replace-action\s*{/);
  assert.match(stylesSource, /\.canvas-node:hover \.canvas-node-replace-action/);
});

test("image prompt supports @ selecting connected canvas images", () => {
  assert.match(appSource, /type CanvasImageReference = \{/);
  assert.match(appSource, /mentioned: boolean;/);
  assert.match(appSource, /function getCanvasPromptMentionOptions\(nodeId: string\)/);
  assert.match(appSource, /function shouldShowCanvasMentionMenu\(prompt: string\)/);
  assert.match(appSource, /prompt\.includes\("@"\)/);
  assert.match(appSource, /function insertCanvasPromptMention\(nodeId: string, reference: CanvasImageReference\)/);
  assert.match(appSource, /onInsertMention: \(nodeId: string, reference: CanvasImageReference\) => void;/);
  assert.match(appSource, /mentionOptions=\{getCanvasPromptMentionOptions\(node\.id\)\}/);
  assert.match(appSource, /className="canvas-node-mention-menu"/);
  assert.match(appSource, /className="canvas-node-mention-role"/);
  assert.match(appSource, /onClick=\{\(\) => onInsertMention\(node\.id, option\)\}/);
  assert.match(stylesSource, /\.canvas-node-mention-menu\s*{/);
  assert.match(stylesSource, /\.canvas-node-mention-role\s*{/);
});

test("image prompt highlights selected @ mentions inline", () => {
  assert.match(appSource, /function renderCanvasPromptHighlights\(prompt: string, mentionOptions: CanvasImageReference\[\]\)/);
  assert.match(appSource, /className="canvas-node-prompt-shell"/);
  assert.match(appSource, /className="canvas-node-prompt-highlights"/);
  assert.match(appSource, /className="canvas-node-prompt-mention-token"/);
  assert.match(appSource, /renderCanvasPromptHighlights\(node\.prompt, mentionOptions\)/);
  assert.match(stylesSource, /\.canvas-node-prompt-shell\s*{/);
  assert.match(stylesSource, /\.canvas-node-prompt-highlights\s*{/);
  assert.match(stylesSource, /\.canvas-node-prompt-mention-token\s*{[\s\S]*color:\s*#59b7ff/);
  assert.match(stylesSource, /\.canvas-node-prompt-mention-token\s*{[\s\S]*font-weight:\s*var\(--weight-bold\)/);
});

test("image nodes can generate a night render prompt from canvas images", () => {
  assert.match(appSource, /async function generateCanvasNodePrompt/);
  assert.match(appSource, /async function collectCanvasPromptImages/);
  assert.match(appSource, /getIncomingCanvasReferences\(node\.id\)/);
  assert.match(appSource, /getCanvasNodeMediaUrl\(reference\.node\)/);
  assert.match(appSource, /await resolveImageUrlForAgentApi\(imageUrl\)/);
  assert.match(appSource, /fetch\("\/api\/zerlum-prompt"/);
  assert.match(appSource, /updateCanvasNodePrompt\(node\.id, finalPrompt, "generated"\)/);
  assert.match(appSource, /className="canvas-node-prompt-head"/);
  assert.match(appSource, /aria-label="一键生成提示词"/);
  assert.match(appSource, /正在生成提示词/);
  assert.match(stylesSource, /\.canvas-node-prompt-head\s*{/);
  assert.match(stylesSource, /\.canvas-node-prompt-generate-button\s*{/);
});

test("generated image prompts are marked so sending can skip prompt regeneration", () => {
  assert.match(appSource, /type CanvasPromptSource = "manual" \| "generated";/);
  assert.match(appSource, /promptSource\?: CanvasPromptSource;/);
  assert.match(
    appSource,
    /function updateCanvasNodePrompt\(\s*nodeId: string,\s*prompt: string,\s*promptSource: CanvasPromptSource = "manual",\s*\)/,
  );
  assert.match(manualPromptFunction, /updateCanvasNodePrompt\(node\.id, finalPrompt, "generated"\);/);
  assert.match(imageGenerationFunction, /const shouldUseGeneratedPromptDirectly = node\.promptSource === "generated";/);
  assert.match(
    imageGenerationFunction,
    /const finalPrompt = shouldUseGeneratedPromptDirectly\s*\?\s*userPrompt\s*:\s*await requestCanvasGeneratedPrompt\(\{[\s\S]*node,[\s\S]*images: promptImages,[\s\S]*fallbackPrompt: userPrompt,[\s\S]*\}\);/,
  );
});

test("manual image prompt edits opt back into prompt regeneration", () => {
  assert.match(
    appSource,
    /node\.id === nodeId \? \{ \.\.\.node, prompt, promptSource \} : node/,
  );
  assert.match(
    appSource,
    /prompt: nextPrompt,[\s\S]*promptSource: "manual",/,
  );
  assert.match(
    canvasNodeCardSource,
    /onPromptChange\(node\.id, event\.currentTarget\.value\)/,
  );
});

test("canvas prompt images include the main image without requiring reference images", () => {
  assert.match(appSource, /function getCanvasPromptImageReferences/);
  assert.match(appSource, /const mainImages = nextReferences\.filter\(\s*\(reference\) => reference\.role === "main-image"/);
  assert.match(appSource, /const selectedReferences = referenceImages\.filter\(\s*\(reference\) => reference\.mentioned/);
  assert.match(appSource, /return \[\.\.\.mainImages, \.\.\.\(selectedReferences\.length > 0 \? selectedReferences : referenceImages\)\];/);
  assert.match(
    collectCanvasPromptImagesFunction,
    /getCanvasPromptImageReferences\(\s*node\.prompt,\s*getCanvasImageGenerationReferences\(node\.id\),\s*\)\.forEach/,
  );
  assert.doesNotMatch(collectCanvasPromptImagesFunction, /getSelectedCanvasImageReferences\(/);
});

test("generated image nodes keep regeneration controls and use incoming references", () => {
  assert.match(appSource, /function shouldShowCanvasNodeControlPanel/);
  assert.doesNotMatch(
    appSource,
    /node\.kind === "image" && mediaUrl && !isGenerating/,
  );
  assert.match(appSource, /function getCanvasImageGenerationReferences/);
  assert.match(
    appSource,
    /const canvasImageReferences = getCanvasImageGenerationReferences\(node\.id\);/,
  );
  assert.match(appSource, /const primaryImageUrl = canvasImageReferences\[0\]\?\.url \?\? "";/);
  assert.match(appSource, /const mainImageReference = canvasImageReferences\.find\(\(reference\) => reference\.role === "main-image"\) \?\? null;/);
  assert.match(appSource, /const selectedCanvasImageReferences = getSelectedCanvasImageReferences\(node\.prompt, canvasImageReferences\);/);
  assert.match(
    appSource,
    /imageUrl: await resolveImageUrlForAgentApi\(mainImageReference\?\.url \?\? primaryImageUrl\),/,
  );
  assert.match(
    appSource,
    /mainImage: mainImageReference[\s\S]*imageUrl: await resolveImageUrlForAgentApi\(mainImageReference\.url\)/,
  );
  assert.match(
    appSource,
    /referenceImages: await Promise\.all\([\s\S]*selectedCanvasImageReferences[\s\S]*resolveImageUrlForAgentApi\(reference\.url\)/,
  );
  assert.match(
    appSource,
    /connectedImages: await Promise\.all\([\s\S]*canvasImageReferences\.map[\s\S]*mentioned: reference\.mentioned/,
  );
  assert.match(appSource, /sourceImageUrl: primaryImageUrl,/);
  assert.match(appSource, /sourceTitle: canvasImageReferences\[0\]\?\.title,/);
});

test("image generation first refines the user prompt with source and reference images", () => {
  assert.match(appSource, /async function requestCanvasGeneratedPrompt/);
  assert.match(
    imageGenerationFunction,
    /const finalPrompt = shouldUseGeneratedPromptDirectly\s*\?\s*userPrompt\s*:\s*await requestCanvasGeneratedPrompt\(\{[\s\S]*node,[\s\S]*images: promptImages,[\s\S]*fallbackPrompt: userPrompt,[\s\S]*\}\);/,
  );
  assert.match(
    imageGenerationFunction,
    /const promptImages = await collectCanvasPromptImages\(node,\s*\{[\s\S]*includeCurrentImage: false,[\s\S]*\}\);/,
  );
  assert.match(appSource, /currentPrompt: fallbackPrompt,/);
  assert.match(manualPromptFunction, /updateCanvasNodePrompt\(node\.id, finalPrompt, "generated"\);/);
  assert.doesNotMatch(imageGenerationFunction, /updateCanvasNodePrompt\(node\.id, finalPrompt\);/);
  assert.match(imageGenerationFunction, /prompt: finalPrompt,/);
  assert.match(imageGenerationFunction, /outputText: "正在生成提示词..."/);
  const imageGenerationRequest = appSource.match(
    /const response = await fetch\("\/api\/zerlum-image"[\s\S]*?const payload =/,
  )?.[0];
  assert.ok(imageGenerationRequest);
  assert.doesNotMatch(
    imageGenerationRequest,
    /\n\s*prompt,\s*\n\s*imageUrl: await resolveImageUrlForAgentApi\(primaryImageUrl\)/,
  );
});

test("image generation requires a main or reference image before submitting", () => {
  assert.match(
    imageGenerationFunction,
    /if \(!promptImages\.length\) \{[\s\S]*throw new Error\("请先上传主图或连接参考图，再生成图片。"\);[\s\S]*\}/,
  );
  assert.doesNotMatch(imageGenerationFunction, /promptImages\.length\s*\?/);
});

test("canvas image media opens the full-resolution preview on click", () => {
  const mediaFrameMarkup = canvasNodeCardSource.match(
    /<div[\s\S]*className=\{`visual-node-image canvas-node-media[\s\S]*?onDoubleClick=\{\(event\) => \{/,
  )?.[0];

  assert.ok(mediaFrameMarkup);
  assert.match(mediaFrameMarkup, /onClick=\{\(event\) => \{/);
  assert.match(appSource, /previewCanvasNodeFromPointerSession\(event\);/);
  assert.match(appSource, /const startedOnImageMedia = Boolean/);
  assert.match(
    appSource,
    /Math\.hypot\(\s*event\.clientX - session\.startX,\s*event\.clientY - session\.startY,\s*\) <= 5/,
  );
  assert.match(
    mediaFrameMarkup,
    /if \(mediaUrl && node\.kind === "image"\) \{[\s\S]*onPreviewImage\(node\);/,
  );
  assert.match(mediaFrameMarkup, /event\.stopPropagation\(\);/);
  assert.match(mediaFrameMarkup, /onDoubleClick=\{\(event\) => \{/);
});

test("generated image nodes expose an inline save action", () => {
  assert.match(appSource, /onSaveImage=\{saveCanvasImage\}/);
  assert.match(appSource, /className="canvas-node-save-action"/);
  assert.match(appSource, /className="canvas-node-preview-action"/);
  assert.match(appSource, /aria-label="保存生成图片"/);
  assert.match(appSource, /aria-label="放大查看原图"/);
  assert.match(
    appSource,
    /onSaveImage\(mediaUrl, getCanvasNodeImageTitle\(node, version\)\)/,
  );
  assert.match(appSource, /onPointerDown=\{\(event\) => event\.stopPropagation\(\)\}/);
  assert.match(
    appSource,
    /className="canvas-node-preview-action"[\s\S]*onClick=\{\(event\) => \{[\s\S]*onPreviewImage\(node\);/,
  );
  assert.match(appSource, /function triggerCanvasImageDownload/);
  assert.match(appSource, /if \(!canFetchCanvasImageForDownload\(imageUrl\)\)/);
  assert.match(
    appSource,
    /triggerCanvasImageDownload\(imageUrl, `\$\{baseName\}\.png`, \{[\s\S]*openInNewTab: true,/,
  );
  assert.match(stylesSource, /\.canvas-node-save-action\s*{/);
  assert.match(stylesSource, /\.canvas-node-preview-action\s*{/);
  assert.match(
    stylesSource,
    /\.canvas-node:hover \.canvas-node-save-action,[\s\S]*\.canvas-node:hover \.canvas-node-preview-action,[\s\S]*\.canvas-node.active \.canvas-node-save-action,[\s\S]*\.canvas-node.active \.canvas-node-preview-action/,
  );
});

test("canvas node top-right quick actions omit upload and generate shortcuts", () => {
  assert.doesNotMatch(appSource, /className="canvas-node-quick-actions"/);
  assert.match(appSource, /className="canvas-node-delete-action"/);

  const deleteActionMarkup = appSource.match(
    /<button[\s\S]*className="canvas-node-delete-action"[\s\S]*?<\/button>/,
  )?.[0];

  assert.ok(deleteActionMarkup);
  assert.match(deleteActionMarkup, /onClick=\{\(\) => onDelete\(node\.id\)\}/);
  assert.doesNotMatch(deleteActionMarkup, /onUploadMedia\(node\)/);
  assert.doesNotMatch(deleteActionMarkup, /onGenerate\(node\.id\)/);
});

test("image node inline controls wrap on narrow canvas viewports", () => {
  assert.match(
    stylesSource,
    /@media \(max-width: 640px\)[\s\S]*\.canvas-node\.image \.canvas-node-control-panel\s*{[\s\S]*width:\s*100%;/,
  );
  assert.match(
    stylesSource,
    /@media \(max-width: 640px\)[\s\S]*\.canvas-node-image-toolbar\s*{[\s\S]*flex-wrap:\s*wrap;/,
  );
});

test("unified canvas uses a right-click upload menu instead of the floating toolbar", () => {
  assert.match(appSource, /type CanvasUploadContextMenu = \{/);
  assert.match(appSource, /const \[canvasUploadMenu, setCanvasUploadMenu\]/);
  assert.match(appSource, /function openCanvasUploadContextMenu/);
  assert.match(appSource, /onContextMenu=\{openCanvasUploadContextMenu\}/);
  assert.match(appSource, /function createCanvasNodeForUpload/);
  assert.match(appSource, /pendingUploadNodeId\.current = node\.id;/);
  assert.match(appSource, /imageUploadInputRef\.current\?\.click\(\);/);
  assert.match(appSource, /videoUploadInputRef\.current\?\.click\(\);/);
  assert.match(appSource, /className="canvas-upload-context-menu"/);
  assert.match(appSource, /上传图片/);
  assert.match(appSource, /上传视频/);
  assert.match(stylesSource, /\.canvas-upload-context-menu\s*{/);
  assert.match(stylesSource, /\.canvas-upload-context-menu button\s*{/);
  assert.doesNotMatch(appSource, /addCanvasNode\("image"\)/);
  assert.doesNotMatch(appSource, /addCanvasNode\("video"\)/);
});

test("image node resolution badge only appears for actual media dimensions", () => {
  assert.match(appSource, /function getCanvasNodeMeasure/);
  assert.match(
    appSource,
    /if \(node\.kind === "image"\) \{[\s\S]*return version\?\.width && version\?\.height[\s\S]*\? `\$\{version\.width\} × \$\{version\.height\}`[\s\S]*: "";/,
  );
  assert.match(appSource, /const nodeMeasure = getCanvasNodeMeasure\(node, version\);/);
  assert.match(appSource, /\{nodeMeasure && <small>\{nodeMeasure\}<\/small>\}/);
  assert.doesNotMatch(
    appSource,
    /node\.kind === "image"\s*\?\s*node\.params\.imageResolution \?\? "4K"/,
  );
  assert.match(
    appSource,
    /width = image\.naturalWidth \|\| width;[\s\S]*height = image\.naturalHeight \|\| height;[\s\S]*width,\s*\n\s*height,/,
  );
  assert.match(
    appSource,
    /const image = await loadImageSource\(payload\.imageUrl\);[\s\S]*width = image\.naturalWidth \|\| width;[\s\S]*height = image\.naturalHeight \|\| height;/,
  );
});

test("canvas source image nodes stay image-only and edges can be cut from the line", () => {
  assert.match(appSource, /node\.id === "canvas-image-main"/);
  assert.match(appSource, /isUploadedCanvasImageNode\(node\)/);
  assert.match(
    appSource,
    /if \(!active \|\| isMainCanvasImageNode\(node\) \|\| isUploadedCanvasImageNode\(node\)\)/,
  );
  assert.match(appSource, /function deleteCanvasEdge\(edgeId: string\)/);
  assert.match(
    appSource,
    /setCanvasEdges\(\(current\) =>\s*current\.filter\(\(edge\) => edge\.id !== edgeId\)/,
  );
  assert.match(appSource, /getCanvasEdgeMidpoint/);
  assert.match(appSource, /const \[hoveredCanvasEdgeId, setHoveredCanvasEdgeId\]/);
  assert.match(appSource, /className="canvas-edge-group"/);
  assert.match(appSource, /className=\{`canvas-edge-interaction \$\{edge\.role\}`\}/);
  assert.match(appSource, /onPointerEnter=\{\(\) => setHoveredCanvasEdgeId\(edge\.id\)\}/);
  assert.match(appSource, /onClick=\{\(event\) => \{[\s\S]*deleteCanvasEdge\(edge\.id\)/);
  assert.match(appSource, /className=\{`canvas-edge-cut-button \$\{/);
  assert.match(appSource, /aria-label=\{`断开/);
  assert.match(appSource, /<Scissors size=\{15\} weight="bold" \/>/);
  assert.match(stylesSource, /\.canvas-edge-interaction\s*{/);
  assert.match(stylesSource, /\.canvas-edge-cut-object\s*{/);
  assert.match(stylesSource, /\.canvas-edge-cut-button\s*{/);
  assert.match(stylesSource, /\.canvas-edge-cut-button\.active/);
  assert.match(stylesSource, /\.canvas-edge-group:hover \.canvas-edge-cut-button/);
});

test("canvas media nodes expose a hover connector that opens a node-type chooser", () => {
  assert.match(appSource, /type CanvasConnectionDraft = \{/);
  assert.match(appSource, /connectionDraft: CanvasConnectionDraft \| null/);
  assert.match(appSource, /beginCanvasConnectionDrag/);
  assert.match(appSource, /finishCanvasConnectionDrag/);
  assert.match(appSource, /window\.addEventListener\("pointerup", handleWindowConnectionPointerEnd\)/);
  assert.match(appSource, /function getCanvasConnectionMenuPoint/);
  assert.match(appSource, /createCanvasNodeFromDraft/);
  assert.match(appSource, /className="canvas-node-connector"/);
  assert.match(appSource, /className="canvas-node-type-menu"/);
  assert.match(appSource, /接图片节点/);
  assert.match(appSource, /接视频节点/);
  assert.match(stylesSource, /\.canvas-node \.visual-node-topline/);
  assert.match(stylesSource, /opacity:\s*0/);
  assert.match(stylesSource, /\.canvas-node:hover \.canvas-node-connector/);
  assert.match(stylesSource, /\.canvas-node-type-menu\s*{/);
  assert.match(stylesSource, /\.canvas-draft-edge\s*{/);
});

test("canvas connector drag starts from the visible connector center", () => {
  assert.match(
    appSource,
    /const connectorRect = event\.currentTarget\.getBoundingClientRect\(\);/,
  );
  assert.match(
    appSource,
    /const connectorCenter = getCanvasPoint\(\s*connectorRect\.left \+ connectorRect\.width \/ 2,\s*connectorRect\.top \+ connectorRect\.height \/ 2,\s*\);/,
  );
  assert.match(appSource, /startX: connectorCenter\.x,/);
  assert.match(appSource, /startY: connectorCenter\.y,/);
  assert.doesNotMatch(appSource, /startY: node\.y \+ size\.height \/ 2,/);
});

test("canvas connector stays fixed at the node right center", () => {
  assert.doesNotMatch(appSource, /canvasConnectorMagnet/);
  assert.doesNotMatch(appSource, /function updateConnectorMagnetPoint/);
  assert.doesNotMatch(appSource, /function resetConnectorMagnetPoint/);
  assert.doesNotMatch(appSource, /className="canvas-node-connector-magnet"/);
  assert.doesNotMatch(appSource, /--connector-[xy]/);
  assert.match(
    canvasNodeCardSource,
    /<button\s+className="canvas-node-connector"[\s\S]*onPointerDown=\{\(event\) => onConnectionPointerDown\(event, node\)\}/,
  );

  assert.doesNotMatch(stylesSource, /\.canvas-node-connector-magnet/);
  assert.doesNotMatch(stylesSource, /var\(--connector-[xy]/);
  assert.match(
    stylesSource,
    /\.canvas-node-connector\s*{[\s\S]*top:\s*50%;[\s\S]*right:\s*-18px;[\s\S]*transform:\s*translate\(12px,\s*-50%\) scale\(0\.88\);/,
  );
  assert.match(
    stylesSource,
    /\.canvas-node:hover \.canvas-node-connector,[\s\S]*\.canvas-node.active \.canvas-node-connector,[\s\S]*\.canvas-node-connector:focus-visible\s*{[\s\S]*transform:\s*translate\(50%,\s*-50%\) scale\(1\);/,
  );
});

test("canvas pointer coordinates account for hidden canvas scroll offsets", () => {
  assert.match(appSource, /const scrollLeft = rectElement\.scrollLeft;/);
  assert.match(appSource, /const scrollTop = rectElement\.scrollTop;/);
  assert.match(appSource, /x: \(clientX - rect\.left \+ scrollLeft - pan\.x\) \/ zoom,/);
  assert.match(appSource, /y: \(clientY - rect\.top \+ scrollTop - pan\.y\) \/ zoom,/);
  assert.match(appSource, /const visibleTop = \(scrollTop - pan\.y\) \/ zoom \+ margin;/);
  assert.match(appSource, /const visibleBottom = \(scrollTop \+ rect\.height - pan\.y\) \/ zoom - margin;/);
  assert.match(appSource, /clientX - rect\.left \+ scrollLeft,/);
  assert.match(appSource, /clientY - rect\.top \+ scrollTop,/);
  assert.match(appSource, /scrollTop \+ rect\.height - menuHeight - margin/);
  assert.doesNotMatch(appSource, /y: \(clientY - rect\.top - pan\.y\) \/ zoom,/);
  assert.match(stylesSource, /\.infinite-canvas\s*{[\s\S]*overflow:\s*clip;/);
});

test("canvas connector drag can attach to an existing node left side", () => {
  assert.match(appSource, /const canvasConnectionTargetMargin =/);
  assert.match(appSource, /const \[connectionTargetNodeId, setConnectionTargetNodeId\]/);
  assert.match(appSource, /function getCanvasConnectionTargetNode/);
  assert.match(appSource, /point\.x >= node\.x - canvasConnectionTargetMargin/);
  assert.match(appSource, /function addCanvasEdgeBetweenNodes/);
  assert.match(
    appSource,
    /role: getDefaultCanvasEdgeRole\(sourceNode, targetNode, current\)/,
  );
  assert.match(appSource, /const existingTargetNode = getCanvasConnectionTargetNode/);
  assert.match(
    appSource,
    /if \(sourceNode && existingTargetNode\) \{[\s\S]*addCanvasEdgeBetweenNodes\(sourceNode, existingTargetNode\)/,
  );
  assert.match(appSource, /connectionTarget=\{connectionTargetNodeId === node\.id\}/);
  assert.match(appSource, /connectionTarget: boolean;/);
  assert.match(appSource, /connectionTarget \? "connection-target" : ""/);
  assert.match(stylesSource, /\.canvas-node\.connection-target \.canvas-node-media\s*{/);
  assert.match(stylesSource, /\.canvas-node\.connection-target \.canvas-node-media::before\s*{/);
});

test("uploaded media inside canvas nodes does not block node dragging", () => {
  assert.match(appSource, /<img src=\{mediaUrl\} alt="" draggable=\{false\} \/>/);
  assert.match(appSource, /<video[\s\S]*draggable=\{false\}/);
  assert.match(
    stylesSource,
    /\.canvas-node-media img\s*{[\s\S]*pointer-events:\s*none/,
  );
  assert.match(
    stylesSource,
    /\.canvas-node-media img,\s*\.canvas-node-media video\s*{[\s\S]*-webkit-user-drag:\s*none/,
  );
  assert.match(
    appSource,
    /<video[\s\S]*onPointerDown=\{\(event\) => event\.stopPropagation\(\)\}/,
  );
});
