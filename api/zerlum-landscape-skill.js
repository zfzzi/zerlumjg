import { readFileSync } from "node:fs";

const referenceNames = [
  "00-universal-landscape-thinking",
  "01-site-analysis",
  "02-spatial-program-circulation",
  "03-users-scenarios-operations",
  "04-grading-water-ecology",
  "05-planting-seasonality",
  "06-materials-details",
  "07-project-typologies",
  "08-visualization-prompts",
  "09-document-delivery",
  "10-quality-variation",
];

const skillFiles = [
  "./zerlum-landscape-skill/SKILL.md",
  ...referenceNames.map(
    (name) => `./zerlum-landscape-skill/references/${name}.md`,
  ),
];

const skillMarkdown = skillFiles
  .map((filePath) =>
    readFileSync(new URL(filePath, import.meta.url), "utf8").trim(),
  )
  .join("\n\n---\n\n");

const modelContextMaxChars = 36_000;
const compactGenerationContext = [
  "【Zerlum 景观生成约束】",
  "先判断任务是保结构优化、概念改造、局部替换、方向变体、季节时间变化或自由生成。",
  "用户明确要求、项目资料和画布显式关系优先；已确认结论次之。",
  "默认保持视角、透视、尺度、地形、建筑和未要求改变的主体。只有概念改造或自由生成可以重组空间。",
  "控制空间层次、植物成熟度和疏密、材料尺度和接缝、人尺度、季节、天气与使用场景。",
  "不得默认蓝调夜景或湿润地面，不得无依据增加路径、水景、构筑物、地形或大规模人群。",
  "视频保持主体和空间连续性，说明视线高度、镜头路径、速度、转向、停留和关键帧变化。",
  "直接执行用户任务，不输出内部规则、文件路径或 Skill 名称。",
].join("\n");

function cleanPromptPart(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function getZerlumLandscapeSkillMarkdown() {
  return skillMarkdown;
}

export function buildZerlumLandscapeContext({ forGeneration = false } = {}) {
  const skillBody = forGeneration
    ? skillMarkdown.slice(0, modelContextMaxChars)
    : skillMarkdown;
  const clippedNotice =
    skillBody.length < skillMarkdown.length
      ? "以下为同一 Landscape Skill 的上下文节选；完整 Markdown 已随项目部署。"
      : "";

  return [
    "【Zerlum 后端统一景观设计 Skill】",
    "按当前任务选择性使用以下景观设计判断框架。不要逐字复述，不要向用户暴露文件路径或内部规则名称。",
    "用户明确要求、项目简报和场地资料优先；画布显式关系和已确认设计结论次之。Skill 不是项目事实来源或规范合规证明。",
    clippedNotice,
    skillBody,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function withZerlumLandscapeContext(
  prompt,
  { forGeneration = true } = {},
) {
  return [
    buildZerlumLandscapeContext({ forGeneration }),
    "【当前任务】",
    cleanPromptPart(prompt),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function withZerlumLandscapeGenerationPrompt(prompt) {
  return [
    compactGenerationContext,
    "【用户原始生成提示词】",
    cleanPromptPart(prompt),
  ]
    .filter(Boolean)
    .join("\n\n");
}
