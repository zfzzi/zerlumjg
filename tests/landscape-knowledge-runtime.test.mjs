import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("repository knowledge runtime is landscape-only", async () => {
  await access(
    new URL("../knowledge/landscape-design-library/README.md", import.meta.url),
  );
  await assert.rejects(
    access(new URL("../knowledge/desktop-lighting-library", import.meta.url)),
  );

  const pkg = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.equal(
    pkg.scripts["ingest:landscape-md"],
    "powershell -ExecutionPolicy Bypass -File scripts/ingest-landscape-markdown.ps1",
  );
  assert.equal(
    pkg.scripts["search:landscape-md"],
    "powershell -ExecutionPolicy Bypass -File scripts/search-landscape-markdown.ps1",
  );
  assert.equal("ingest:desktop-md" in pkg.scripts, false);
  assert.equal("search:desktop-md" in pkg.scripts, false);
});

test("landscape knowledge scripts and docs describe reviewed landscape sources", async () => {
  const files = await Promise.all(
    [
      "../scripts/build-landscape-markdown-index.mjs",
      "../scripts/ingest-landscape-markdown.ps1",
      "../scripts/search-landscape-markdown.mjs",
      "../scripts/search-landscape-markdown.ps1",
      "../docs/agent-knowledge-runtime.md",
      "../docs/desktop-knowledge-ingestion-plan.md",
    ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
  );
  const source = files.join("\n");

  assert.match(source, /landscape-design-library/);
  assert.match(source, /项目简报|场地资料/);
  assert.match(source, /复核|review/i);
  assert.doesNotMatch(source, /desktop-lighting-library|lighting-foundation|照明设计/);
});
