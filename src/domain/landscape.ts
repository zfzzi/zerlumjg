export const landscapeProjectTypes = [
  "居住景观",
  "商业景观",
  "城市公园",
  "滨水景观",
  "酒店度假",
  "校园景观",
  "文旅景观",
  "其他",
] as const;

export const designStages = [
  "前期研究",
  "概念方案",
  "方案深化",
  "汇报交付",
] as const;

export type DesignStage = (typeof designStages)[number];

export type LandscapeProjectBrief = {
  goals: string;
  users: string;
  siteScope: string;
  constraints: string;
};

export type LandscapeProject = {
  id: string;
  name: string;
  type: string;
  location: string;
  designStage: DesignStage;
  client: string;
  updatedAt: string;
  brief: LandscapeProjectBrief;
};

const emptyBrief: LandscapeProjectBrief = {
  goals: "",
  users: "",
  siteScope: "",
  constraints: "",
};

export function createLandscapeProject(now = new Date()): LandscapeProject {
  return {
    id: `landscape-${now.getTime()}`,
    name: "未命名景观项目",
    type: "其他",
    location: "",
    designStage: "概念方案",
    client: "",
    updatedAt: now.toISOString().slice(0, 10),
    brief: { ...emptyBrief },
  };
}

export function normalizeLandscapeProject(
  value: unknown,
  fallback = createLandscapeProject(),
): LandscapeProject {
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const source = value as Partial<LandscapeProject>;
  const brief =
    source.brief && typeof source.brief === "object" ? source.brief : emptyBrief;

  return {
    id: typeof source.id === "string" && source.id ? source.id : fallback.id,
    name:
      typeof source.name === "string" && source.name.trim()
        ? source.name.trim()
        : fallback.name,
    type:
      typeof source.type === "string" && source.type.trim()
        ? source.type.trim()
        : fallback.type,
    location: typeof source.location === "string" ? source.location.trim() : "",
    designStage: designStages.includes(source.designStage as DesignStage)
      ? (source.designStage as DesignStage)
      : fallback.designStage,
    client: typeof source.client === "string" ? source.client.trim() : "",
    updatedAt:
      typeof source.updatedAt === "string" && source.updatedAt
        ? source.updatedAt
        : fallback.updatedAt,
    brief: {
      goals: typeof brief.goals === "string" ? brief.goals : "",
      users: typeof brief.users === "string" ? brief.users : "",
      siteScope: typeof brief.siteScope === "string" ? brief.siteScope : "",
      constraints:
        typeof brief.constraints === "string" ? brief.constraints : "",
    },
  };
}
