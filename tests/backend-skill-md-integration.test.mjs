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
const skillHelperPath = join(root, "api", "zerlum-skill.js");
const oldSkillMarkdownPath = join(root, "api", "zerlum-facade-lighting-skill.md");
const skillRootPath = join(root, "api", "zerlum-lighting-skill");
const expectedSkillFiles = [
  "SKILL.md",
  "references/00-universal-design-thinking.md",
  "references/01-domain-facade-lighting.md",
  "references/02-domain-interior-lighting.md",
  "references/03-domain-landscape-lighting.md",
  "references/04-domain-cultural-tourism-night-tour.md",
  "references/05-typology-hotel-lobby.md",
  "references/06-output-quality-rubric.md",
  "references/07-variation-variables.md",
];
const vercelConfigPath = join(root, "vercel.json");

test("backend replaces the old monolithic skill markdown with layered lighting design files", () => {
  assert.equal(existsSync(oldSkillMarkdownPath), false);
  assert.equal(existsSync(skillRootPath), true);

  for (const relativePath of expectedSkillFiles) {
    assert.equal(
      existsSync(join(skillRootPath, relativePath)),
      true,
      `${relativePath} should exist`,
    );
  }

  const skillIndex = readFileSync(join(skillRootPath, "SKILL.md"), "utf8");
  assert.match(skillIndex, /Universal Design Thinking|通用设计思维/);
  assert.match(skillIndex, /Typology Playbook|项目类型微调策略/);
  assert.match(skillIndex, /用户意图、参考图和项目资料优先/);

  const variationFile = readFileSync(
    join(skillRootPath, "references", "07-variation-variables.md"),
    "utf8",
  );
  assert.match(variationFile, /差异化变量池/);
  assert.match(variationFile, /不要把变量写成固定风格模板/);
});

test("backend exposes a shared skill context helper", () => {
  assert.equal(existsSync(skillHelperPath), true);

  const skillHelperSource = readFileSync(skillHelperPath, "utf8");
  assert.match(skillHelperSource, /zerlum-lighting-skill\/SKILL\.md/);
  assert.match(skillHelperSource, /07-variation-variables\.md/);
  assert.doesNotMatch(skillHelperSource, /zerlum-facade-lighting-skill\.md/);
  assert.match(skillHelperSource, /function buildZerlumSkillContext/);
  assert.match(skillHelperSource, /function withZerlumSkillContext/);
  assert.match(skillHelperSource, /function withZerlumSkillGenerationPrompt/);
  assert.match(skillHelperSource, /forGeneration = true/);
});

test("skill context sent to model calls stays within a safe request size", async () => {
  const { withZerlumSkillContext, withZerlumSkillGenerationPrompt } =
    await import(new URL("../api/zerlum-skill.js", import.meta.url));
  const ordinaryPrompt = withZerlumSkillContext("请根据参考图生成照明方案建议。");
  const generationPrompt = withZerlumSkillGenerationPrompt("生成夜景效果图。");

  assert.match(ordinaryPrompt, /Zerlum 后端统一灯光设计 Skill/);
  assert.match(ordinaryPrompt, /通用设计思维/);
  assert.match(ordinaryPrompt, /差异化变量/);
  assert.ok(Buffer.byteLength(ordinaryPrompt, "utf8") < 60_000);
  assert.ok(Buffer.byteLength(generationPrompt, "utf8") < 60_000);
});

test("generation model skill context stays compact for image and video providers", async () => {
  const { withZerlumSkillGenerationPrompt } =
    await import(new URL("../api/zerlum-skill.js", import.meta.url));
  const generationPrompt = withZerlumSkillGenerationPrompt(
    "生成一个酒店大堂室内灯光效果图，保留原图构图。",
  );

  assert.ok(Buffer.byteLength(generationPrompt, "utf8") < 4_000);
  assert.match(generationPrompt, /Zerlum 生成模型压缩灯光设计约束/);
  assert.match(generationPrompt, /室内、室外建筑、景观、文旅夜游、视频镜头或不确定/);
  assert.match(generationPrompt, /用户原始生成提示词/);
  assert.doesNotMatch(generationPrompt, /---\s*\nname: zerlum-lighting-design/);
  assert.doesNotMatch(generationPrompt, /references\/00-universal-design-thinking\.md/);
});

test("deployment config includes the skill markdown in API function bundles", () => {
  assert.equal(existsSync(vercelConfigPath), true);

  const vercelConfig = JSON.parse(readFileSync(vercelConfigPath, "utf8"));
  assert.equal(
    vercelConfig.functions?.["api/*.ts"]?.includeFiles,
    "api/zerlum-lighting-skill/**",
  );
});

test("local and production backend routes attach skill to chat and video prompts but not image generation prompts", () => {
  assert.match(
    viteSource,
    /from "\.\/api\/zerlum-skill\.js"/,
  );
  assert.match(
    apiServerSource,
    /from "\.\/zerlum-skill\.js"/,
  );

  for (const source of [viteSource, apiServerSource]) {
    assert.match(source, /withZerlumSkillContext/);
    assert.match(source, /withZerlumSkillGenerationPrompt/);
    assert.match(source, /promptInstruction = withZerlumSkillContext/);
    assert.match(
      source,
      /promptInstruction = withZerlumSkillContext\([\s\S]*\{\s*forGeneration:\s*false\s*\}/,
    );
    assert.match(source, /skillPrompt = withZerlumSkillGenerationPrompt\(prompt\)/);
    assert.match(source, /buildArkVideoContent\(\{\s*prompt:\s*skillPrompt,/);
  }

  for (const imageRouteSource of [viteImageRouteSource, apiImageRouteSource]) {
    assert.doesNotMatch(imageRouteSource, /withZerlumSkillGenerationPrompt\(prompt\)/);
    assert.doesNotMatch(imageRouteSource, /prompt:\s*skillPrompt,/);
  }

  assert.match(viteSource, /enrichedMessage = withZerlumSkillContext/);
  assert.match(apiServerSource, /return withZerlumSkillContext\(basePrompt\);/);
});
