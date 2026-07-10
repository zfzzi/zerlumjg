import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const envExampleUrl = new URL("../.env.example", import.meta.url);

test("repository provides a secret-free environment template", async () => {
  const template = await readFile(envExampleUrl, "utf8");

  for (const key of [
    "OPENAI_API_KEY",
    "OPENAI_PROMPT_API_KEY",
    "OPENAI_DOCUMENT_OUTPUT_API_KEY",
    "OPENAI_IMAGE_API_KEY",
    "RUNNINGHUB_IMAGE_API_KEY",
    "RUNNINGHUB_UPSCALE_API_KEY",
    "ARK_VIDEO_API_KEY",
  ]) {
    assert.match(template, new RegExp(`^${key}=$`, "m"));
  }

  assert.match(template, /^OPENAI_BASE_URL=https:\/\/qweapi\.com$/m);
  assert.match(template, /^OPENAI_AGENT_MODEL=gpt-5\.5$/m);
  assert.match(template, /^OPENAI_DOCUMENT_OUTPUT_MODEL=gpt-image-2$/m);
  assert.match(template, /^ARK_VIDEO_MODEL=doubao-seedance-2-0-260128$/m);
});
