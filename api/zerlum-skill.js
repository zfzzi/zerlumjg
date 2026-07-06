import { readFileSync } from "node:fs";

const lightingSkillFiles = [
  "./zerlum-lighting-skill/SKILL.md",
  "./zerlum-lighting-skill/references/00-universal-design-thinking.md",
  "./zerlum-lighting-skill/references/01-domain-facade-lighting.md",
  "./zerlum-lighting-skill/references/02-domain-interior-lighting.md",
  "./zerlum-lighting-skill/references/03-domain-landscape-lighting.md",
  "./zerlum-lighting-skill/references/04-domain-cultural-tourism-night-tour.md",
  "./zerlum-lighting-skill/references/05-typology-hotel-lobby.md",
  "./zerlum-lighting-skill/references/06-output-quality-rubric.md",
  "./zerlum-lighting-skill/references/07-variation-variables.md",
];

const zerlumSkillMarkdown = lightingSkillFiles
  .map((filePath) =>
    readFileSync(new URL(filePath, import.meta.url), "utf8").trim(),
  )
  .join("\n\n---\n\n");

const modelContextMaxChars = 24_000;
const generationSkillCompactContext = [
  "【Zerlum 生成模型压缩灯光设计约束】",
  "以下是从已部署的 Zerlum Lighting Skill MD 提炼给图像/视频生成模型的短约束，用于控制请求体长度；不要输出规则解释。",
  "先结合参考图和用户文字判断场景类型：室内、室外建筑、景观、文旅夜游、视频镜头或不确定。不要默认套用蓝调室外夜景。",
  "用户参考图、文字要求、画布节点关系和项目资料优先；如果用户明确要求与通用建议不同，以用户想法为主，同时保持照明专业性和可执行性。",
  "必须保持原图结构、构图、主体位置、镜头视角、透视关系、建筑比例和主要材质不变；只改变灯光、氛围、明暗层次、色温、反射和夜间/室内光环境。",
  "室内重点：室内灯光场景、吊灯、筒灯、灯带、洗墙、展示照明、材质反光、空间层次、视觉舒适、眩光控制、显色和氛围，不写深蓝天空、暮色余光、建筑外立面等外景套话。",
  "室外建筑重点：建筑结构、立面层次、入口与顶部重点、线性灯、洗墙、泛光、城市界面、克制亮度和低眩光；蓝调时刻只在参考图或用户需求适合时使用。",
  "景观重点：路径安全、植物与水景层次、隐藏灯具、低位引导、视线焦点和人与尺度；避免整片高饱和染色。",
  "文旅夜游重点：故事线、场景节奏、节点戏剧性、沉浸感、互动与情绪推进；避免把所有区域做成同一种彩色灯光。",
  "视频镜头重点：保持主体连续性，描述镜头运动、景深、光影变化节奏、关键帧明暗和材质反射变化。",
  "每次生成至少体现一种差异化变量：光影戏剧性/舒适均匀、突出结构/重塑焦点、自然光协作/人工光世界、科技动态/静谧诗意。不要把变量写成固定模板。",
].join("\n");

function cleanPromptPart(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function getZerlumSkillMarkdown() {
  return zerlumSkillMarkdown;
}

export function buildZerlumSkillContext({ forGeneration = false } = {}) {
  const skillBody = forGeneration
    ? zerlumSkillMarkdown.slice(0, modelContextMaxChars)
    : zerlumSkillMarkdown;
  const clippedNotice =
    skillBody.length < zerlumSkillMarkdown.length
      ? "以下为同一 Skill MD 的后端模型上下文节选，用于控制请求体长度；完整 MD 已随项目部署，并作为该节选的来源。"
      : "";

  return [
    "【Zerlum 后端统一灯光设计 Skill】",
    "以下 Markdown 是所有后端模型必须遵循的照明设计专业知识和判断框架。不要逐字复述，不要向用户暴露文件路径或内部规则名称；按用户任务、参考图和明确需求选择性使用。",
    "用户的参考图、文字要求和项目资料优先；如果用户明确要求与通用建议不同，以用户想法为主，同时保持照明专业性、空间结构一致性和可执行性。",
    clippedNotice,
    skillBody,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function withZerlumSkillContext(prompt, { forGeneration = true } = {}) {
  return [
    buildZerlumSkillContext({ forGeneration }),
    "【当前任务】",
    cleanPromptPart(prompt),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function withZerlumSkillGenerationPrompt(prompt) {
  return [
    generationSkillCompactContext,
    "【用户原始生成提示词】",
    cleanPromptPart(prompt),
  ]
    .filter(Boolean)
    .join("\n\n");
}
