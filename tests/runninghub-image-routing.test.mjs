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
const localEnv = readFileSync(new URL("../.env.example", import.meta.url), "utf8");
const configImageHandlerBlock = configSource.slice(
  configSource.indexOf('server.middlewares.use("/api/zerlum-image"'),
  configSource.indexOf('server.middlewares.use("/api/zerlum-video"'),
);
const apiImageHandlerBlock = apiSource.slice(
  apiSource.indexOf("export async function handleZerlumImage"),
  apiSource.indexOf("export async function handleZerlumVideo"),
);

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
  assert.match(localEnv, /^RUNNINGHUB_UPSCALE_APP_PATH=\/run\/ai-app\/2074155000317702146$/m);
});

test("environment template documents RunningHub image generation", () => {
  assert.match(localEnv, /^RUNNINGHUB_IMAGE_API_KEY=$/m);
  assert.match(
    localEnv,
    /^RUNNINGHUB_IMAGE_ENDPOINT=https:\/\/www\.runninghub\.ai\/openapi\/v2\/rhart-imagine-image-quality\/edit$/m,
  );
  assert.match(localEnv, /^RUNNINGHUB_UPSCALE_API_KEY=$/m);
  assert.match(localEnv, /^RUNNINGHUB_UPSCALE_WEBAPP_ID=2074155000317702146$/m);
});

test("image generation can use the qweapi OpenAI-compatible image channel", () => {
  assert.match(localEnv, /^IMAGE_GENERATION_PROVIDER=qweapi$/m);
  assert.match(localEnv, /^OPENAI_IMAGE_API_KEY=$/m);
  assert.match(localEnv, /^OPENAI_IMAGE_BASE_URL=https:\/\/qweapi\.com$/m);
  assert.match(localEnv, /^OPENAI_IMAGE_MODEL=gpt-image-2$/m);

  [configSource, apiSource].forEach((source) => {
    assert.match(source, /IMAGE_GENERATION_PROVIDER/);
    assert.match(source, /OPENAI_IMAGE_API_KEY/);
    assert.match(source, /OPENAI_IMAGE_BASE_URL/);
    assert.match(source, /OPENAI_IMAGE_MODEL/);
    assert.match(source, /runOpenAiImageGeneration/);
    assert.match(source, /resolveOpenAiResponsesEndpoint\([^)]*"OPENAI_IMAGE_BASE_URL"/);
    assert.match(source, /collectDocumentOutputImages\(payload\)/);
  });
});

test("image generation sends the canvas prompt directly and upscales qweapi output", () => {
  for (const source of [configImageHandlerBlock, apiImageHandlerBlock]) {
    assert.doesNotMatch(source, /withZerlumSkillGenerationPrompt\(prompt\)/);
    assert.doesNotMatch(source, /prompt:\s*skillPrompt,/);
    assert.match(
      source,
      /const generated = await runOpenAiImageGeneration\({[\s\S]*prompt,[\s\S]*\}\);[\s\S]*const upscaled = await runRunningHubUpscale\({[\s\S]*imageUrl: generated\.imageUrl,[\s\S]*targetResolution,/,
    );
    assert.match(
      source,
      /provider: "qweapi",[\s\S]*upscaled: true,/,
    );
    assert.match(
      source,
      /imageUrl: upscaled\.imageUrl,[\s\S]*baseImageUrl: generated\.imageUrl/,
    );
  }

  for (const source of [configSource, apiSource]) {
    assert.match(source, /const enrichedPrompt = prompt;/);
    assert.match(source, /prompt: enrichedPrompt,/);
  }
});

test("qweapi canvas generation returns its image when RunningHub upscale is not configured", () => {
  for (const source of [configImageHandlerBlock, apiImageHandlerBlock]) {
    const qweapiBlock = source.slice(
      source.indexOf("if (shouldUseOpenAiImageProvider"),
      source.indexOf("const imageApiKey"),
    );

    assert.doesNotMatch(
      qweapiBlock,
      /if \(!upscaleApiKey\) \{[\s\S]{0,220}Missing RUNNINGHUB_UPSCALE_API_KEY/,
    );
    assert.match(
      qweapiBlock,
      /const generated = await runOpenAiImageGeneration\([\s\S]*if \(!upscaleApiKey\) \{[\s\S]*imageUrl: generated\.imageUrl,[\s\S]*provider: "qweapi",[\s\S]*upscaled: false,[\s\S]*return;/,
    );
  }
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
    assert.match(source, /const runningHubUpscaleResolutionValues = \{[\s\S]*"2k": "2",[\s\S]*"4k": "3",[\s\S]*"6k": "4",[\s\S]*"8k": "5",[\s\S]*\} as const;/);
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

test("canvas image generation inlines same-origin image URLs before qweapi submission", () => {
  assert.match(appSource, /function shouldInlineImageUrlForAgentApi/);
  assert.match(appSource, /url\.origin === window\.location\.origin/);
  assert.match(appSource, /async function imageUrlToDataUrl/);
  assert.match(
    appSource,
    /imageUrl\.startsWith\("blob:"\) \|\| shouldInlineImageUrlForAgentApi\(imageUrl\)/,
  );
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
