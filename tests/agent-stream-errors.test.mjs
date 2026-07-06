import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(
  new URL("../src/App.tsx", import.meta.url),
  "utf8",
);

test("agent streaming parser extracts OpenAI error events", () => {
  assert.match(appSource, /function extractAgentStreamError\(data: string\)/);
  assert.match(appSource, /payload\.error/);
  assert.match(appSource, /response\.error/);
  assert.match(appSource, /insufficient_quota/);
  assert.match(appSource, /OpenAI 项目额度不足或账单不可用/);
});

test("agent streaming loops surface upstream stream errors", () => {
  assert.match(appSource, /let streamError = "";/);
  assert.match(appSource, /const errorText = extractAgentStreamError\(data\);/);
  assert.match(appSource, /streamError = errorText;/);
  assert.match(appSource, /if \(streamError\) \{\s*throw new Error\(streamError\);/);
});

test("agent non-streaming error responses show readable proxy error messages", () => {
  assert.match(appSource, /function parseApiErrorText\(rawText: string, fallback: string\)/);
  assert.match(appSource, /const payload = JSON\.parse\(rawText\) as Record<string, unknown>;/);
  assert.match(appSource, /const payloadError = getAgentStreamErrorMessage\(payload\.error\);/);
  assert.match(appSource, /if \(payloadError\) \{\s*return payloadError;/);
  assert.match(
    appSource,
    /throw new Error\(parseApiErrorText\(fallback, "Zerlum Agent 暂时无法响应。"\)\);/,
  );
  assert.match(
    appSource,
    /throw new Error\(parseApiErrorText\(fallback, "Zerlum Visual 暂时无法响应。"\)\);/,
  );
});
