import {
  createLandscapeProject,
  normalizeLandscapeProject,
  type LandscapeProject,
} from "../domain/landscape";

export const LANDSCAPE_STORAGE_KEY = "zerlum-landscape-workspace-v1";
const LEGACY_STORAGE_KEY = "zerlum-mvp-workspace";

export type WorkspaceTheme = "dark" | "light";
export type WorkspaceView = "agent" | "canvas" | "text";

export type WorkspaceSession = {
  displayName: string;
  email: string;
  avatarUrl?: string;
};

export type WorkspaceState = {
  theme: WorkspaceTheme;
  activeView: WorkspaceView;
  session: WorkspaceSession | null;
  projects: LandscapeProject[];
  activeProjectId: string;
};

type StorageAdapter = Pick<Storage, "getItem" | "setItem">;
type WriteWorkspaceResult = { ok: true } | { ok: false; message: string };

export function createWorkspaceState(): WorkspaceState {
  const project = createLandscapeProject();

  return {
    theme: "dark",
    activeView: "agent",
    session: null,
    projects: [project],
    activeProjectId: project.id,
  };
}

function getBrowserStorage(): StorageAdapter | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

function normalizeSession(value: unknown): WorkspaceSession | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Record<string, unknown>;
  const displayName =
    typeof source.displayName === "string" ? source.displayName.trim() : "";
  const email = typeof source.email === "string" ? source.email.trim() : "";

  if (!displayName && !email) {
    return null;
  }

  return {
    displayName: displayName || email.split("@")[0] || "Zerlum 用户",
    email,
    ...(typeof source.avatarUrl === "string" && source.avatarUrl
      ? { avatarUrl: source.avatarUrl }
      : {}),
  };
}

function normalizeWorkspaceState(value: unknown): WorkspaceState {
  const defaults = createWorkspaceState();

  if (!value || typeof value !== "object") {
    return defaults;
  }

  const source = value as Partial<WorkspaceState>;
  const projects = Array.isArray(source.projects)
    ? source.projects.map((project, index) =>
        normalizeLandscapeProject(
          project,
          createLandscapeProject(new Date(Date.now() + index)),
        ),
      )
    : [];
  const safeProjects = projects.length ? projects : defaults.projects;
  const activeProjectId = safeProjects.some(
    (project) => project.id === source.activeProjectId,
  )
    ? String(source.activeProjectId)
    : safeProjects[0].id;

  return {
    theme: source.theme === "light" ? "light" : "dark",
    activeView:
      source.activeView === "canvas" || source.activeView === "text"
        ? source.activeView
        : "agent",
    session: normalizeSession(source.session),
    projects: safeProjects,
    activeProjectId,
  };
}

function migrateLegacyDisplayState(value: unknown): WorkspaceState {
  const next = createWorkspaceState();

  if (!value || typeof value !== "object") {
    return next;
  }

  const legacy = value as Record<string, unknown>;
  const legacySession =
    legacy.session && typeof legacy.session === "object"
      ? (legacy.session as Record<string, unknown>)
      : null;
  const profile =
    legacySession?.profile && typeof legacySession.profile === "object"
      ? (legacySession.profile as Record<string, unknown>)
      : null;

  next.theme = legacy.theme === "light" ? "light" : "dark";
  next.session = profile
    ? normalizeSession({
        displayName: profile.username,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
      })
    : null;
  return next;
}

export function readWorkspaceState(
  storage: StorageAdapter | null = getBrowserStorage(),
): WorkspaceState {
  if (!storage) {
    return createWorkspaceState();
  }

  try {
    const current = storage.getItem(LANDSCAPE_STORAGE_KEY);

    if (current) {
      return normalizeWorkspaceState(JSON.parse(current));
    }

    const legacy = storage.getItem(LEGACY_STORAGE_KEY);
    return legacy ? migrateLegacyDisplayState(JSON.parse(legacy)) : createWorkspaceState();
  } catch {
    return createWorkspaceState();
  }
}

export function writeWorkspaceState(
  state: WorkspaceState,
  storage: StorageAdapter | null = getBrowserStorage(),
): WriteWorkspaceResult {
  if (!storage) {
    return { ok: true };
  }

  try {
    storage.setItem(LANDSCAPE_STORAGE_KEY, JSON.stringify(normalizeWorkspaceState(state)));
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: "本地存储空间不足，请移除大型资料后重试。",
    };
  }
}
