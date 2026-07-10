import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const viteSource = readFileSync(join(root, "vite.config.ts"), "utf8");
const apiServerSource = readFileSync(join(root, "api", "_zerlum-server.ts"), "utf8");
const viteImageRouteSource = viteSource.slice(
  viteSource.indexOf('server.middlewares.use("/api/zerlum-image"'),
  viteSource.indexOf('server.middlewares.use("/api/zerlum-video"'),
);
const apiImageRouteSource = apiServerSource.slice(
  apiServerSource.indexOf("export async function handleZerlumImage"),
  apiServerSource.indexOf("export async function handleZerlumVideo"),
);
const skillHelperPath = join(root, "api", "zerlum-landscape-skill.js");
const skillHelperTypesPath = join(root, "api", "zerlum-landscape-skill.d.ts");
const skillRootPath = join(root, "api", "zerlum-landscape-skill");
const expectedSkillFiles = [
  "SKILL.md",
  "references/00-universal-landscape-thinking.md",
  "references/01-site-analysis.md",
  "references/02-spatial-program-circulation.md",
  "references/03-users-scenarios-operations.md",
  "references/04-grading-water-ecology.md",
  "references/05-planting-seasonality.md",
  "references/06-materials-details.md",
  "references/07-project-typologies.md",
  "references/08-visualization-prompts.md",
  "references/09-document-delivery.md",
  "references/10-quality-variation.md",
];

test("backend ships a complete landscape design skill package", () => {
  assert.equal(existsSync(skillRootPath), true);
  assert.equal(existsSync(join(root, "api", "zerlum-lighting-skill")), false);

  for (const relativePath of expectedSkillFiles) {
    assert.equal(
      existsSync(join(skillRootPath, relativePath)),
      true,
      `${relativePath} should exist`,
    );
  }

  const skillIndex = readFileSync(join(skillRootPath, "SKILL.md"), "utf8");
  const allSkillMarkdown = expectedSkillFiles
    .map((relativePath) => readFileSync(join(skillRootPath, relativePath), "utf8"))
    .join("\n");
  assert.match(skillIndex, /Zerlum Landscape Design Skill/);
  assert.match(skillIndex, /用户明确要求、项目简报和场地资料优先/);
  assert.match(allSkillMarkdown, /场地分析/);
  assert.match(allSkillMarkdown, /空间结构/);
  assert.match(allSkillMarkdown, /植物群落/);
  assert.match(allSkillMarkdown, /竖向|排水/);
  assert.doesNotMatch(allSkillMarkdown, /Lighting Skill|立面照明|酒店大堂照明/);
});

test("backend exposes one shared landscape context helper", () => {
  assert.equal(existsSync(skillHelperPath), true);
  assert.equal(existsSync(skillHelperTypesPath), true);
  assert.equal(existsSync(join(root, "api", "zerlum-skill.js")), false);

  const helper = readFileSync(skillHelperPath, "utf8");
  const declarations = readFileSync(skillHelperTypesPath, "utf8");
  assert.match(helper, /zerlum-landscape-skill\/SKILL\.md/);
  for (const relativePath of expectedSkillFiles.slice(1)) {
    assert.match(helper, new RegExp(relativePath.split("/").at(-1).replace(".md", "")));
  }
  assert.match(helper, /function buildZerlumLandscapeContext/);
  assert.match(helper, /function withZerlumLandscapeContext/);
  assert.match(helper, /function withZerlumLandscapeGenerationPrompt/);
  assert.match(helper, /forGeneration = true/);
  assert.match(declarations, /export function withZerlumLandscapeContext/);
  assert.match(declarations, /forGeneration\?: boolean/);
  assert.match(declarations, /export function withZerlumLandscapeGenerationPrompt/);
});

test("landscape context stays inside provider request limits", async () => {
  const { withZerlumLandscapeContext, withZerlumLandscapeGenerationPrompt } =
    await import(new URL("../api/zerlum-landscape-skill.js", import.meta.url));
  const ordinaryPrompt = withZerlumLandscapeContext("分析场地并比较两个设计方向。", {
    forGeneration: false,
  });
  const generationPrompt = withZerlumLandscapeGenerationPrompt(
    "保留场地结构，深化入口植物与铺装。",
  );

  assert.match(ordinaryPrompt, /Zerlum Landscape Design Skill/);
  assert.match(ordinaryPrompt, /用户明确要求、项目简报和场地资料优先/);
  assert.ok(Buffer.byteLength(ordinaryPrompt, "utf8") < 70_000);
  assert.ok(Buffer.byteLength(generationPrompt, "utf8") < 4_000);
  assert.match(generationPrompt, /Zerlum 景观生成约束/);
  assert.match(generationPrompt, /保结构优化、概念改造、局部替换/);
  assert.match(generationPrompt, /用户原始生成提示词/);
  assert.doesNotMatch(generationPrompt, /zerlum-landscape-design/);
});

test("deployment bundles the landscape markdown package", () => {
  const vercelConfig = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
  const includeFiles = vercelConfig.functions?.["api/*.ts"]?.includeFiles;

  assert.equal(typeof includeFiles, "string");
  assert.match(includeFiles, /api\/zerlum-landscape-skill\/\*\*/);
  assert.doesNotMatch(includeFiles, /zerlum-lighting-skill/);
});

test("local and production routes share landscape context while image providers receive clean prompts", () => {
  assert.match(viteSource, /from "\.\/api\/zerlum-landscape-skill\.js"/);
  assert.match(apiServerSource, /from "\.\/zerlum-landscape-skill\.js"/);

  for (const source of [viteSource, apiServerSource]) {
    assert.match(source, /withZerlumLandscapeContext/);
    assert.match(source, /withZerlumLandscapeGenerationPrompt/);
    assert.match(source, /promptInstruction = withZerlumLandscapeContext/);
    assert.match(
      source,
      /promptInstruction = withZerlumLandscapeContext\([\s\S]*\{\s*forGeneration:\s*false\s*\}/,
    );
    assert.match(source, /skillPrompt = withZerlumLandscapeGenerationPrompt\(prompt\)/);
    assert.match(source, /buildArkVideoContent\(\{\s*prompt:\s*skillPrompt,/);
  }

  for (const imageRouteSource of [viteImageRouteSource, apiImageRouteSource]) {
    assert.doesNotMatch(imageRouteSource, /withZerlumLandscapeGenerationPrompt\(prompt\)/);
    assert.doesNotMatch(imageRouteSource, /prompt:\s*skillPrompt,/);
  }

  assert.match(
    viteSource,
    /const enrichedMessage = isOutlineTask\s*\?\s*withZerlumLandscapeContext\(baseMessage,\s*\{\s*forGeneration:\s*false\s*\}\)\s*:\s*withZerlumLandscapeContext\(baseMessage\);/,
  );
  assert.match(
    apiServerSource,
    /return isOutlineTask\s*\?\s*withZerlumLandscapeContext\(basePrompt,\s*\{\s*forGeneration:\s*false\s*\}\)\s*:\s*withZerlumLandscapeContext\(basePrompt\);/,
  );
});
