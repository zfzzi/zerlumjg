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
const localEnv = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const videoProxyBlock = viteSource.slice(
  viteSource.indexOf('server.middlewares.use("/api/zerlum-video"'),
  viteSource.indexOf('server.middlewares.use("/api/open-local-folder"'),
);

test("video generation uses the Ark Seedance task proxy", () => {
  assert.match(appSource, /async function handleGenerateVideo/);
  assert.match(appSource, /fetch\("\/api\/zerlum-video"/);
  assert.match(appSource, /body:\s*JSON\.stringify\(\{\s*prompt: cleanPrompt,/);
  assert.match(appSource, /aspectRatio,/);
  assert.match(appSource, /resolution,/);
  assert.match(appSource, /duration,/);
  assert.match(appSource, /referenceImages:/);
  assert.match(appSource, /imagePaths:/);
  assert.match(appSource, /videoUrl:/);
  assert.match(appSource, /status:\s*"loading"/);
  assert.match(appSource, /status:\s*"done"/);
  assert.match(appSource, /status:\s*"error"/);
});

test("video generation UI shows staged progress while waiting for the task", () => {
  assert.match(appSource, /progress: number;/);
  assert.match(appSource, /const videoProgressStages/);
  assert.match(appSource, /function getVideoProgressStage/);
  assert.match(appSource, /window\.setInterval/);
  assert.match(appSource, /progress:\s*100,/);
  assert.match(appSource, /className="video-generation-progress"/);
  assert.match(appSource, /role="progressbar"/);
  assert.match(appSource, /aria-valuenow=\{selectedHistory\.progress\}/);
  assert.match(appSource, /"--video-progress": `\$\{selectedHistory\.progress\}%`/);
});

test("video generation submits quickly and polls task status on the client", () => {
  assert.match(appSource, /async function pollVideoTaskStatus/);
  assert.match(
    appSource,
    /fetch\(\s*`\/api\/zerlum-video-status\?taskId=\$\{encodeURIComponent\(taskId\)\}`/,
  );
  assert.match(appSource, /await pollVideoTaskStatus\(\{/);
  assert.match(viteSource, /server\.middlewares\.use\("\/api\/zerlum-video-status"/);
  assert.doesNotMatch(videoProxyBlock, /waitForArkVideoTask\(\{/);
});

test("video generation compresses reference images before submitting to the proxy", () => {
  assert.match(appSource, /const videoReferenceImageUrl = referenceImage\s*\?\s*await resolveImageUrlForAgentApi\(referenceImage\.src\)\s*:\s*"";/);
  assert.match(appSource, /referenceImages: videoReferenceImageUrl\s*\?\s*\[/);
  assert.match(appSource, /url: videoReferenceImageUrl,/);
  assert.doesNotMatch(appSource, /url: referenceImage\.src,/);
});

test("video UI exposes Seedance-compatible parameter presets", () => {
  assert.match(appSource, /\{ value: "adaptive", label: "自适应" \}/);
  assert.match(appSource, /\{ value: "21:9", label: "21:9 超宽屏" \}/);
  assert.match(appSource, /\{ value: "4:3", label: "4:3 标准" \}/);
  assert.match(appSource, /\{ value: "3:4", label: "3:4 竖构图" \}/);
  assert.match(appSource, /\{ value: "480p", label: "480p" \}/);
  assert.match(appSource, /\{ value: "720p", label: "720p" \}/);
  assert.match(appSource, /\{ value: "1080p", label: "1080p" \}/);
  assert.match(appSource, /\{ value: "11s", label: "11 秒" \}/);
  assert.doesNotMatch(appSource, /\{ value: "2K", label: "2K" \}/);
  assert.doesNotMatch(appSource, /\{ value: "4K", label: "4K" \}/);
});

test("video proxy creates Seedance content generation tasks with selected parameters", () => {
  assert.match(
    viteSource,
    /const arkVideoTasksEndpoint = "https:\/\/ark\.cn-beijing\.volces\.com\/api\/v3\/contents\/generations\/tasks";/,
  );
  assert.match(viteSource, /const arkDefaultVideoModel = "doubao-seedance-2-0-260128";/);
  assert.match(videoProxyBlock, /ARK_VIDEO_API_KEY/);
  assert.match(videoProxyBlock, /ARK_VIDEO_MODEL/);
  assert.match(videoProxyBlock, /normalizeVideoRatio\(body\.aspectRatio\)/);
  assert.match(videoProxyBlock, /normalizeVideoResolution\(body\.resolution\)/);
  assert.match(videoProxyBlock, /normalizeVideoDuration\(body\.duration\)/);
  assert.match(videoProxyBlock, /model:\s*videoModel,/);
  assert.match(videoProxyBlock, /content:\s*buildArkVideoContent/);
  assert.match(videoProxyBlock, /generate_audio:\s*true,/);
  assert.match(videoProxyBlock, /watermark:\s*false,/);
  assert.match(videoProxyBlock, /ratio,/);
  assert.match(videoProxyBlock, /resolution,/);
  assert.match(videoProxyBlock, /duration,/);
  assert.match(videoProxyBlock, /"reference_image"/);
  assert.match(viteSource, /role:\s*reference\.role/);
});

test("Seedance task payload accepts role-based image video and audio references", () => {
  const contentBuilder = viteSource.slice(
    viteSource.indexOf("function buildArkVideoContent"),
    viteSource.indexOf("function extractArkVideoResult"),
  );

  assert.match(viteSource, /type: "image_url" \| "video_url" \| "audio_url"/);
  assert.match(
    viteSource,
    /role: "reference_image" \| "reference_video" \| "reference_audio"/,
  );
  assert.match(
    videoProxyBlock,
    /const referenceAudio = normalizeArkVideoReferences\([\s\S]*body\.referenceAudio,[\s\S]*"audio_url",[\s\S]*"reference_audio"/,
  );
  assert.match(contentBuilder, /referenceAudio:/);
  assert.match(contentBuilder, /\.\.\.referenceImages,/);
  assert.match(contentBuilder, /\.\.\.referenceVideos,/);
  assert.match(contentBuilder, /\.\.\.referenceAudio,/);
  assert.match(
    contentBuilder,
    /\{\s*type: "text",\s*text,[\s\S]*\.\.\.references,/,
  );
  assert.match(
    contentBuilder,
    /\[reference\.type\]: \{[\s\S]*url: reference\.url,/,
  );
  assert.match(contentBuilder, /role: reference\.role,/);
});

test("canvas default zoom push preset uses the requested architectural camera prompt", () => {
  const cameraPresetBlock = appSource.slice(
    appSource.indexOf("const videoCameraPresets: VideoCameraPreset[] = ["),
    appSource.indexOf("function VideoView"),
  );

  assert.match(
    cameraPresetBlock,
    /id: "zoom-push",[\s\S]*label: "放大推进",[\s\S]*prompt: "镜头缓慢向前推进，保持建筑位于画面中央"/,
  );
});

test("local video generation configuration uses the Ark Seedance channel", () => {
  assert.match(localEnv, /^ARK_VIDEO_API_KEY=.+$/m);
  assert.match(localEnv, /^ARK_VIDEO_MODEL=doubao-seedance-2-0-260128$/m);
});
