import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const scriptModule = await import(
  new URL("../scripts/build-desktop-markdown-index.mjs", import.meta.url)
);
const currentStandardsDoc = readFileSync(
  new URL("../docs/lighting-current-national-standards.md", import.meta.url),
  "utf8",
);

test("superseded national standards are flagged but still indexed", () => {
  assert.equal(
    scriptModule.shouldSkipSupersededNationalStandard(
      "06_标准与规范/GB 50034-2013 建筑照明设计标准.md",
      "# GB 50034-2013 建筑照明设计标准",
    ),
    true,
  );
  assert.equal(
    scriptModule.shouldSkipSupersededNationalStandard(
      "06_标准与规范/GB_T 50034-2024 建筑照明设计标准.md",
      "# GB/T 50034-2024 建筑照明设计标准",
    ),
    false,
  );

  const tempRoot = mkdtempSync(join(tmpdir(), "zerlum-standards-index-"));

  try {
    writeFileSync(
      join(tempRoot, "GB 50034-2013 建筑照明设计标准.md"),
      "# GB 50034-2013 建筑照明设计标准\n\n旧版标准条文片段。",
      "utf8",
    );

    const index = scriptModule.buildIndex({ sourceRoot: tempRoot });

    assert.deepEqual(
      index.documents.map((document) => document.relativePath),
      ["GB 50034-2013 建筑照明设计标准.md"],
    );
    assert.equal(index.supersededNationalStandards.length, 1);
    assert.equal(index.documents[0].supersededBy, "GB/T 50034-2024");
    assert.equal(index.documents[0].standardStatus, "requires-current-version-check");
    assert.equal(index.chunks[0].supersededBy, "GB/T 50034-2024");
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("current national standards registry keeps latest lighting standards", () => {
  [
    "GB/T 50034-2024",
    "GB 17945-2024",
    "GB/T 7000.1-2023",
    "GB/T 19510.1-2023",
    "GB/T 31831-2025",
    "GB/T 31832-2025",
    "GB 37478-2025",
  ].forEach((standardCode) => {
    assert.match(currentStandardsDoc, new RegExp(standardCode.replace("/", "\\/")));
  });
  assert.doesNotMatch(currentStandardsDoc, /GB 50034-2013/);
  assert.doesNotMatch(currentStandardsDoc, /GB 17945-2010/);
});

test("internal implementation plans are not indexed as agent knowledge", () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "zerlum-desktop-index-"));

  try {
    writeFileSync(join(tempRoot, "knowledge.md"), "# 知识资料\n\n可入库内容。", "utf8");
    mkdirSync(join(tempRoot, "superpowers", "plans"), { recursive: true });
    writeFileSync(
      join(tempRoot, "superpowers", "plans", "implementation-plan.md"),
      "# Internal Implementation Plan\n\n不应进入 Agent 知识库。",
      "utf8",
    );

    const index = scriptModule.buildIndex({ sourceRoot: tempRoot });
    assert.deepEqual(
      index.documents.map((document) => document.relativePath),
      ["knowledge.md"],
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
