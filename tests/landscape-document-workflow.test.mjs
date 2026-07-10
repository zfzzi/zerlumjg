import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(
  new URL("../src/App.tsx", import.meta.url),
  "utf8",
);
const stylesSource = readFileSync(
  new URL("../src/styles.css", import.meta.url),
  "utf8",
);
const viteSource = readFileSync(
  new URL("../vite.config.ts", import.meta.url),
  "utf8",
);
const productionSource = readFileSync(
  new URL("../api/_zerlum-server.ts", import.meta.url),
  "utf8",
);

const requiredOutlineSections = [
  "场地问题和机会",
  "总体空间结构",
  "功能、游线与使用场景",
  "植物与季相策略",
  "材料、铺装和构筑物",
  "待复核项",
];

test("landscape document outline uses the same professional sections in local and production runtimes", () => {
  for (const section of requiredOutlineSections) {
    assert.match(appSource, new RegExp(section));
    assert.match(viteSource, new RegExp(section));
    assert.match(productionSource, new RegExp(section));
  }

  assert.doesNotMatch(viteSource, /desktop lighting|lighting designer/i);
  assert.doesNotMatch(productionSource, /desktop lighting|lighting designer/i);
});

test("document workspace exposes a four-stage delivery workflow", () => {
  assert.match(appSource, /type DocumentStage = "sources" \| "outline" \| "pages" \| "review";/);
  assert.match(appSource, /function getDocumentStage\(/);
  assert.match(appSource, /资料确认/);
  assert.match(appSource, /大纲生成/);
  assert.match(appSource, /页面生成/);
  assert.match(appSource, /校对与导出/);
  assert.match(appSource, /className="document-stage-bar"/);
  assert.match(stylesSource, /\.document-stage-bar/);
});

test("failed document pages can retry independently without discarding completed pages", () => {
  assert.match(appSource, /async function retryDocumentPage\(pageId: string\)/);
  assert.match(appSource, /重试本页/);
  assert.match(appSource, /继续生成其他页面/);
  assert.match(appSource, /item\.id === pageId/);
  assert.match(
    appSource,
    /buildDocumentPageImagePrompt\(\s*page,\s*documentOutputPages\.length,\s*project,?\s*\)/,
  );
  assert.match(
    appSource,
    /documentOutputPages\.every\(\s*\(page\) => page\.status === "done" && page\.imageUrl,?\s*\)/,
  );
  assert.match(appSource, /item\.id === assistantId[\s\S]*status: "error"/);
  assert.match(appSource, /controller\.signal\.aborted[\s\S]*status: "idle"/);
});

test("single-page generation prompt carries project identity and fact boundaries", () => {
  assert.match(appSource, /function buildDocumentPageImagePrompt\([\s\S]*project: Project/);
  assert.match(appSource, /当前项目：\$\{project\.name\}/);
  assert.match(appSource, /明确区分项目事实、设计判断与待复核项/);
  assert.match(appSource, /不要添加虚构项目事实/);
});
