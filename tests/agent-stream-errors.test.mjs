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
