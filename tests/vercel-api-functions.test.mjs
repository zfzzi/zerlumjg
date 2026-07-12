import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("production exposes Vercel functions for all app API routes", () => {
  const routes = [
    "zerlum-agent",
    "zerlum-prompt",
    "zerlum-image",
    "zerlum-image-upscale-status",
    "zerlum-video",
    "zerlum-video-status",
  ];

  for (const route of routes) {
    const routeFile = join(root, "api", `${route}.ts`);

    assert.equal(existsSync(routeFile), true, `${routeFile} should exist`);
    assert.match(
      readFileSync(routeFile, "utf8"),
      /export\s+default\s+async\s+function\s+handler/,
      `${route} should export a Vercel handler`,
    );
  }
});

test("Vercel route imports use explicit ESM extensions", () => {
  ["zerlum-agent", "zerlum-prompt", "zerlum-image", "zerlum-image-upscale-status", "zerlum-video", "zerlum-video-status"].forEach((route) => {
    const source = readFileSync(join(root, "api", `${route}.ts`), "utf8");

    assert.match(source, /from\s+"\.\/_zerlum-server\.js"/);
  });
});

test("Vercel functions share the same provider env names as local dev", () => {
  const serverSource = readFileSync(join(root, "api", "_zerlum-server.ts"), "utf8");

  [
    "OPENAI_API_KEY",
    "OPENAI_PROMPT_API_KEY",
    "OPENAI_PROMPT_BASE_URL",
    "OPENAI_DOCUMENT_OUTPUT_API_KEY",
    "OPENAI_IMAGE_API_KEY",
    "OPENAI_IMAGE_BASE_URL",
    "ARK_API_KEY",
    "RUNNINGHUB_IMAGE_API_KEY",
    "RUNNINGHUB_UPSCALE_API_KEY",
    "ARK_VIDEO_API_KEY",
  ].forEach((name) => assert.match(serverSource, new RegExp(name)));
});

test("Vercel image function normalizes relative RunningHub endpoints", () => {
  const serverSource = readFileSync(join(root, "api", "_zerlum-server.ts"), "utf8");

  assert.match(serverSource, /function resolveRunningHubEndpoint\(endpoint: string\)/);
  assert.match(serverSource, /const normalized = endpoint\.trim\(\);/);
  assert.match(serverSource, /\^https\?:\\\/\\\//);
  assert.match(
    serverSource,
    /normalized\.startsWith\("\/"\)\s*\?\s*`\$\{runningHubBaseUrl\}\$\{normalized\}`\s*:\s*`\$\{runningHubBaseUrl\}\/\$\{normalized\}`/,
  );
  assert.match(serverSource, /fetch\(resolveRunningHubEndpoint\(endpoint\),/);
});

test("Vercel prompt images keep one typed shape for string and object inputs", () => {
  const serverSource = readFileSync(join(root, "api", "_zerlum-server.ts"), "utf8");
  const normalizeImagesBlock = serverSource.slice(
    serverSource.indexOf("function normalizeAgentImages"),
    serverSource.indexOf("function normalizeAgentAudio"),
  );

  assert.match(
    normalizeImagesBlock,
    /typeof item === "string"[\s\S]*imageUrl: item,[\s\S]*label: "",[\s\S]*nodeId: "",[\s\S]*edgeId: "",[\s\S]*targetNodeId: "",[\s\S]*role: "",[\s\S]*mentionToken: "",[\s\S]*mentioned: false/,
  );
});

test(
  "Vercel build produced API function bundles",
  {
    skip:
      process.env.CHECK_VERCEL_OUTPUT === "1"
        ? false
        : "Set CHECK_VERCEL_OUTPUT=1 after running vercel build.",
  },
  () => {
  const functionsRoot = join(root, ".vercel", "output", "functions");

  ["zerlum-agent", "zerlum-prompt", "zerlum-image", "zerlum-image-upscale-status", "zerlum-video", "zerlum-video-status"].forEach((route) => {
    assert.equal(
      existsSync(join(functionsRoot, "api", `${route}.func`)),
      true,
      `${route} should be bundled as a production function`,
    );
  });
  },
);
