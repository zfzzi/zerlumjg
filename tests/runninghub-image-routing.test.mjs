import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const configSource = readFileSync(
  new URL("../vite.config.ts", import.meta.url),
  "utf8",
);
const apiSource = readFileSync(
  new URL("../api/_zerlum-server.ts", import.meta.url),
  "utf8",
);
const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const localEnv = readFileSync(new URL("../.env.local", import.meta.url), "utf8");

test("image generation defaults to RunningHub image-quality edit endpoint", () => {
  assert.match(configSource, /\/rhart-imagine-image-quality\/edit/);
});

test("RunningHub endpoints accept relative OpenAPI paths from environment variables", () => {
  assert.match(configSource, /function resolveRunningHubEndpoint\(endpoint: string\)/);
  assert.match(configSource, /const normalized = endpoint\.trim\(\);/);
  assert.match(configSource, /\^https\?:\\\/\\\//);
  assert.match(
    configSource,
    /normalized\.startsWith\("\/"\)\s*\?\s*`\$\{runningHubBaseUrl\}\$\{normalized\}`\s*:\s*`\$\{runningHubBaseUrl\}\/\$\{normalized\}`/,
  );
  assert.match(configSource, /fetch\(resolveRunningHubEndpoint\(endpoint\),/);
});

test("image upscale calls RunningHub AI App API with configured webapp id", () => {
  assert.match(configSource, /\/task\/openapi\/ai-app\/run/);
  assert.match(configSource, /webappId,\s*\n\s*apiKey,\s*\n\s*nodeInfoList/);
});

test("image upscale can resolve the RunningHub AI App run path", () => {
  assert.match(
    configSource,
    /const runningHubDefaultUpscaleAppPath = `\/run\/ai-app\/\$\{runningHubDefaultUpscaleWebappId\}`;/,
  );
  assert.match(configSource, /function resolveRunningHubUpscaleWebappId/);
  assert.match(configSource, /RUNNINGHUB_UPSCALE_APP_PATH/);
  assert.match(configSource, /run\\\/ai-app/);
  assert.match(configSource, /ai-detail/);
  assert.match(localEnv, /^RUNNINGHUB_UPSCALE_APP_PATH=\/run\/ai-app\/2063809922772594690$/m);
});

test("local image generation credentials are configured", () => {
  assert.match(localEnv, /^RUNNINGHUB_IMAGE_API_KEY=.+$/m);
  assert.match(
    localEnv,
    /^RUNNINGHUB_IMAGE_ENDPOINT=https:\/\/www\.runninghub\.ai\/openapi\/v2\/rhart-imagine-image-quality\/edit$/m,
  );
  assert.match(localEnv, /^RUNNINGHUB_UPSCALE_API_KEY=.+$/m);
  assert.match(localEnv, /^RUNNINGHUB_UPSCALE_WEBAPP_ID=2063809922772594690$/m);
});

test("canvas image generation supports adaptive source-image aspect ratio", () => {
  assert.match(appSource, /value: "adaptive", label: "自适应"/);
  assert.match(configSource, /function normalizeRunningHubImageAspectRatio/);
  assert.match(apiSource, /function normalizeRunningHubImageAspectRatio/);
  assert.match(
    configSource,
    /if \(\["adaptive", "auto", "source", "same-as-source"\]\.includes\(normalized\)\) \{[\s\S]*return "auto";/,
  );
  assert.match(
    apiSource,
    /if \(\["adaptive", "auto", "source", "same-as-source"\]\.includes\(normalized\)\) \{[\s\S]*return "auto";/,
  );
  assert.match(configSource, /const normalizedAspectRatio = normalizeRunningHubImageAspectRatio\(aspectRatio\);/);
  assert.match(apiSource, /const normalizedAspectRatio = normalizeRunningHubImageAspectRatio\(aspectRatio\);/);
  assert.match(configSource, /aspectRatio: normalizedAspectRatio \|\| "auto"/);
  assert.match(apiSource, /aspectRatio: normalizedAspectRatio \|\| "auto"/);
});

test("image generation upscales the generated base image to the selected 2K-8K resolution", () => {
  assert.match(appSource, /const targetResolution = node\.params\.imageResolution \?\? "4K";/);
  assert.match(appSource, /resolution: targetResolution,/);
  assert.match(configSource, /const targetResolution = normalizeUpscaleResolution/);
  assert.match(apiSource, /const targetResolution = normalizeUpscaleResolution/);
  assert.match(
    configSource,
    /const generated = await runRunningHubImageToImage\({[\s\S]*const upscaled = await runRunningHubUpscale\({[\s\S]*imageUrl: generated\.imageUrl,[\s\S]*targetResolution,/,
  );
  assert.match(
    apiSource,
    /const generated = await runRunningHubImageToImage\({[\s\S]*const upscaled = await runRunningHubUpscale\({[\s\S]*imageUrl: generated\.imageUrl,[\s\S]*targetResolution,/,
  );
  assert.match(configSource, /imageUrl: upscaled\.imageUrl,[\s\S]*baseImageUrl: generated\.imageUrl/);
  assert.match(apiSource, /imageUrl: upscaled\.imageUrl,[\s\S]*baseImageUrl: generated\.imageUrl/);
});

test("image upscale sends RunningHub resolution value ids", () => {
  [configSource, apiSource].forEach((source) => {
    assert.match(source, /const runningHubUpscaleResolutionValues = \{[\s\S]*"2k": "0\.2",[\s\S]*"4k": "0\.4",[\s\S]*"6k": "0\.6",[\s\S]*"8k": "0\.8",[\s\S]*\} as const;/);
    assert.match(source, /function normalizeUpscaleResolutionValue\(value: string\)/);
    assert.match(source, /return runningHubUpscaleResolutionValues\[normalizedResolution\];/);
    assert.match(source, /const resolutionValue = normalizeUpscaleResolutionValue\(targetResolution\);/);
    assert.match(source, /resolutionValue,/);
    assert.match(source, /return \{ \.\.\.node, fieldValue: resolutionValue \};/);
    assert.match(source, /nodePatches\.push\(buildNodePatch\(resolutionNode, resolutionValue\)\);/);
  });
});

test("image generation forwards all canvas reference images to RunningHub", () => {
  assert.match(appSource, /referenceImages: await Promise\.all\(/);
  assert.match(configSource, /const referenceImages = normalizeAgentImages\(body\.referenceImages\);/);
  assert.match(apiSource, /const referenceImages = normalizeAgentImages\(body\.referenceImages\);/);
  assert.match(configSource, /const referenceImageUrls = referenceImages[\s\S]*\.map\(\(image\) => image\.imageUrl\)/);
  assert.match(apiSource, /const referenceImageUrls = referenceImages[\s\S]*\.map\(\(image\) => image\.imageUrl\)/);
  assert.match(configSource, /referenceImageUrls,/);
  assert.match(apiSource, /referenceImageUrls,/);
  assert.match(configSource, /imageUrls: uploadedImageUrls,/);
  assert.match(apiSource, /imageUrls: uploadedImageUrls,/);
});

test("image generation proxy preserves canvas image role metadata", () => {
  assert.match(appSource, /mainImage: mainImageReference/);
  assert.match(appSource, /connectedImages: await Promise\.all\(/);
  assert.match(configSource, /const nodeId = typeof record\.nodeId === "string" \? record\.nodeId : "";/);
  assert.match(apiSource, /const nodeId = typeof record\.nodeId === "string" \? record\.nodeId : "";/);
  assert.match(configSource, /const targetNodeId = typeof record\.targetNodeId === "string" \? record\.targetNodeId : "";/);
  assert.match(apiSource, /const targetNodeId = typeof record\.targetNodeId === "string" \? record\.targetNodeId : "";/);
  assert.match(configSource, /const role = typeof record\.role === "string" \? record\.role : "";/);
  assert.match(apiSource, /const role = typeof record\.role === "string" \? record\.role : "";/);
  assert.match(configSource, /mentioned: record\.mentioned === true/);
  assert.match(apiSource, /mentioned: record\.mentioned === true/);
});
