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
const skillHelperTypesPath = join(root, "api", "zerlum-skill.d.ts");
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
const obsoleteSkillFiles = [
  "references/architecture.md",
  "references/interior.md",
  "references/landscape.md",
  "references/toolbox.md",
];
const vercelConfigPath = join(root, "vercel.json");

test("backend uses the previous nine-file lighting design skill package", () => {
  assert.equal(existsSync(oldSkillMarkdownPath), false);
  assert.equal(existsSync(skillRootPath), true);

  for (const relativePath of expectedSkillFiles) {
    assert.equal(
      existsSync(join(skillRootPath, relativePath)),
      true,
      `${relativePath} should exist`,
    );
  }

  for (const relativePath of obsoleteSkillFiles) {
    assert.equal(
      existsSync(join(skillRootPath, relativePath)),
      false,
      `${relativePath} should be removed after restoring the previous nine-file skill`,
    );
  }

  const skillIndex = readFileSync(join(skillRootPath, "SKILL.md"), "utf8");
  assert.match(skillIndex, /Zerlum Lighting Design Skill/);
  assert.match(skillIndex, /Four Layers/);
  assert.match(skillIndex, /references\/00-universal-design-thinking\.md/);
  assert.match(skillIndex, /references\/02-domain-interior-lighting\.md/);
  assert.match(skillIndex, /references\/07-variation-variables\.md/);

  const universalFile = readFileSync(
    join(skillRootPath, "references", "00-universal-design-thinking.md"),
    "utf8",
  );
  assert.match(universalFile, /Universal Design Thinking/);
  assert.match(universalFile, /Three Lighting Layers/);

  const variationFile = readFileSync(
    join(skillRootPath, "references", "07-variation-variables.md"),
    "utf8",
  );
  assert.match(variationFile, /Variation Variables/);
  assert.match(variationFile, /Differentiation Variable Pool/);
});

test("lighting skill markdown uses the previous English-led reference package", () => {
  for (const relativePath of expectedSkillFiles) {
    const markdown = readFileSync(join(skillRootPath, relativePath), "utf8");

    assert.match(markdown, /Zerlum|Lighting|Purpose|Output|Design|Prompt|Use|Avoid/);
  }

  const skillIndex = readFileSync(join(skillRootPath, "SKILL.md"), "utf8");

  assert.match(skillIndex, /Core Rule/);
  assert.match(skillIndex, /Selection Discipline/);
  assert.match(skillIndex, /Output Discipline/);
});

test("backend exposes a shared skill context helper", () => {
  assert.equal(existsSync(skillHelperPath), true);
  assert.equal(existsSync(skillHelperTypesPath), true);

  const skillHelperSource = readFileSync(skillHelperPath, "utf8");
  const skillHelperTypes = readFileSync(skillHelperTypesPath, "utf8");
  assert.match(skillHelperSource, /zerlum-lighting-skill\/SKILL\.md/);
  assert.match(skillHelperSource, /references\/00-universal-design-thinking\.md/);
  assert.match(skillHelperSource, /references\/01-domain-facade-lighting\.md/);
  assert.match(skillHelperSource, /references\/02-domain-interior-lighting\.md/);
  assert.match(skillHelperSource, /references\/03-domain-landscape-lighting\.md/);
  assert.match(skillHelperSource, /references\/04-domain-cultural-tourism-night-tour\.md/);
  assert.match(skillHelperSource, /references\/05-typology-hotel-lobby\.md/);
  assert.match(skillHelperSource, /references\/06-output-quality-rubric\.md/);
  assert.match(skillHelperSource, /references\/07-variation-variables\.md/);
  assert.doesNotMatch(skillHelperSource, /references\/architecture\.md/);
  assert.doesNotMatch(skillHelperSource, /references\/toolbox\.md/);
  assert.doesNotMatch(skillHelperSource, /zerlum-facade-lighting-skill\.md/);
  assert.match(skillHelperSource, /function buildZerlumSkillContext/);
  assert.match(skillHelperSource, /function withZerlumSkillContext/);
  assert.match(skillHelperSource, /function withZerlumSkillGenerationPrompt/);
  assert.match(skillHelperSource, /forGeneration = true/);
  assert.match(skillHelperTypes, /export function withZerlumSkillContext/);
  assert.match(skillHelperTypes, /forGeneration\?: boolean/);
  assert.match(skillHelperTypes, /export function withZerlumSkillGenerationPrompt/);
});

test("skill context sent to model calls stays within a safe request size", async () => {
  const { withZerlumSkillContext, withZerlumSkillGenerationPrompt } =
    await import(new URL("../api/zerlum-skill.js", import.meta.url));
  const ordinaryPrompt = withZerlumSkillContext("请根据参考图生成照明方案建议。");
  const generationPrompt = withZerlumSkillGenerationPrompt("生成夜景效果图。");

  assert.match(ordinaryPrompt, /Zerlum 后端统一灯光设计 Skill/);
  assert.match(ordinaryPrompt, /Zerlum Lighting Design Skill/);
  assert.match(ordinaryPrompt, /Universal Design Thinking/);
  assert.match(ordinaryPrompt, /Differentiation Variable Pool/);
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
  assert.doesNotMatch(generationPrompt, /references\/architecture\.md/);
});

test("deployment config includes the skill markdown in API function bundles", () => {
  assert.equal(existsSync(vercelConfigPath), true);

  const vercelConfig = JSON.parse(readFileSync(vercelConfigPath, "utf8"));
  const includeFiles = vercelConfig.functions?.["api/*.ts"]?.includeFiles;

  assert.equal(typeof includeFiles, "string");
  assert.match(includeFiles, /api\/zerlum-lighting-skill\/\*\*/);
  assert.doesNotMatch(includeFiles, /api\/zerlum-agent-context\/\*\*/);
  assert.doesNotMatch(includeFiles, /knowledge\/desktop-lighting-library/);
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

  assert.match(
    viteSource,
    /const enrichedMessage = isOutlineTask\s*\?\s*withZerlumSkillContext\(baseMessage,\s*\{\s*forGeneration:\s*false\s*\}\)\s*:\s*withZerlumSkillContext\(baseMessage\);/,
  );
  assert.match(
    apiServerSource,
    /return isOutlineTask\s*\?\s*withZerlumSkillContext\(basePrompt,\s*\{\s*forGeneration:\s*false\s*\}\)\s*:\s*withZerlumSkillContext\(basePrompt\);/,
  );
});
