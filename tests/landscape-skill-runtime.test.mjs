import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const skillFiles = [
  "api/zerlum-landscape-skill/SKILL.md",
  "api/zerlum-landscape-skill/references/00-universal-landscape-thinking.md",
  "api/zerlum-landscape-skill/references/01-site-analysis.md",
  "api/zerlum-landscape-skill/references/02-spatial-program-circulation.md",
  "api/zerlum-landscape-skill/references/03-users-scenarios-operations.md",
  "api/zerlum-landscape-skill/references/04-grading-water-ecology.md",
  "api/zerlum-landscape-skill/references/05-planting-seasonality.md",
  "api/zerlum-landscape-skill/references/06-materials-details.md",
  "api/zerlum-landscape-skill/references/07-project-typologies.md",
  "api/zerlum-landscape-skill/references/08-visualization-prompts.md",
  "api/zerlum-landscape-skill/references/09-document-delivery.md",
  "api/zerlum-landscape-skill/references/10-quality-variation.md",
];

test("backend ships the complete landscape design skill package", async () => {
  await Promise.all(skillFiles.map((path) => access(new URL(path, root))));
  const markdown = await Promise.all(
    skillFiles.map((path) => readFile(new URL(path, root), "utf8")),
  );
  const combined = markdown.join("\n");

  assert.match(combined, /场地分析/);
  assert.match(combined, /空间结构/);
  assert.match(combined, /植物群落/);
  assert.match(combined, /竖向|排水/);
  assert.match(combined, /用户明确要求.*项目简报.*场地资料/s);
  assert.doesNotMatch(combined, /Lighting Skill|立面照明|酒店大堂照明/);
});

test("legacy lighting skill package is removed", async () => {
  await assert.rejects(access(new URL("api/zerlum-lighting-skill", root)));
});

test("local and production routes use one landscape prompt runtime", async () => {
  const [loader, declarations, server, vite, vercel] = await Promise.all([
    readFile(new URL("api/zerlum-landscape-skill.js", root), "utf8"),
    readFile(new URL("api/zerlum-landscape-skill.d.ts", root), "utf8"),
    readFile(new URL("api/_zerlum-server.ts", root), "utf8"),
    readFile(new URL("vite.config.ts", root), "utf8"),
    readFile(new URL("vercel.json", root), "utf8"),
  ]);

  assert.match(loader, /withZerlumLandscapeContext/);
  assert.match(loader, /withZerlumLandscapeGenerationPrompt/);
  assert.match(declarations, /withZerlumLandscapeContext/);
  assert.match(server, /from "\.\/zerlum-landscape-skill\.js"/);
  assert.match(vite, /from "\.\/api\/zerlum-landscape-skill\.js"/);
  assert.match(vercel, /api\/zerlum-landscape-skill\/\*\*/);
  assert.doesNotMatch(server + vite + loader, /统一灯光设计|Lighting Skill/);
});

test("landscape generation context stays compact and preserves evidence priority", async () => {
  const { withZerlumLandscapeContext, withZerlumLandscapeGenerationPrompt } =
    await import(new URL("../api/zerlum-landscape-skill.js", import.meta.url));
  const ordinaryPrompt = withZerlumLandscapeContext("分析场地并提出两个设计方向。");
  const generationPrompt = withZerlumLandscapeGenerationPrompt(
    "保留场地结构，深化入口植物和铺装。",
  );

  assert.match(ordinaryPrompt, /Zerlum Landscape Design Skill/);
  assert.match(ordinaryPrompt, /用户明确要求、项目简报和场地资料优先/);
  assert.ok(Buffer.byteLength(ordinaryPrompt, "utf8") < 70_000);
  assert.ok(Buffer.byteLength(generationPrompt, "utf8") < 4_000);
  assert.match(generationPrompt, /保结构优化、概念改造、局部替换、方向变体、季节时间变化或自由生成/);
  assert.match(generationPrompt, /用户原始生成提示词/);
});
