import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(
  new URL("../src/App.tsx", import.meta.url),
  "utf8",
);
const documentAgentBlock = appSource.slice(
  appSource.indexOf("async function requestDocumentAgent"),
  appSource.indexOf("async function handleDocumentAgentSubmit"),
);
const outlineSubmitBlock = appSource.slice(
  appSource.indexOf("async function handleDocumentAgentSubmit"),
  appSource.indexOf("async function handleGenerateDocumentOutput"),
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
  assert.match(
    appSource,
    /const responseText = await response\.text\(\);[\s\S]*throw new Error\(parseApiErrorText\(responseText, "提示词生成失败"\)\);/,
  );
});

test("agent low-level stream termination errors show a user-readable retry message", () => {
  assert.match(appSource, /function normalizeAgentErrorMessage\(message: string, fallback: string\)/);
  assert.match(appSource, /terminated\|aborted\|AbortError\|network\|fetch failed/);
  assert.match(appSource, /请求连接已中断，请重新发送。/);
  assert.match(appSource, /normalizeAgentErrorMessage\(\s*error instanceof Error\s*\?\s*error\.message\s*:\s*"",\s*"Zerlum Agent 连接失败，请稍后再试。",?\s*\)/);
  assert.match(appSource, /normalizeAgentErrorMessage\(streamError, "Zerlum Agent 暂时无法响应。"\)/);
});

test("document outline agent errors are parsed and normalized before display", () => {
  assert.match(
    documentAgentBlock,
    /throw new Error\(parseApiErrorText\(fallback, finalFallback\)\);/,
  );
  assert.match(
    documentAgentBlock,
    /throw new Error\(\s*normalizeAgentErrorMessage\(streamError, finalFallback\),?\s*\);/,
  );
  assert.match(
    outlineSubmitBlock,
    /const rawMessage = error instanceof Error \? error\.message : "";/,
  );
  assert.match(
    outlineSubmitBlock,
    /Failed to fetch\|NetworkError\|Load failed/,
  );
  assert.match(
    outlineSubmitBlock,
    /normalizeAgentErrorMessage\(\s*rawMessage,\s*"方案 Agent 连接失败，请稍后再试。",?\s*\)/,
  );
});
