import {
  Moon,
  PlusCircle,
  Sun,
  UserCircle,
} from "@phosphor-icons/react";
import { useMemo } from "react";
import Dock, { type DockItemData } from "../components/Dock";
import DropdownSelect from "../components/DropdownSelect";
import type { LandscapeProject } from "../domain/landscape";
import type {
  WorkspaceSession,
  WorkspaceTheme,
  WorkspaceView,
} from "../state/workspace";

export const workspaceNavItems = [
  { id: "agent", label: "景观 Agent" },
  { id: "canvas", label: "方案画布" },
  { id: "text", label: "文本交付" },
] satisfies Array<{ id: WorkspaceView; label: string }>;

export type WorkspaceHeaderProps = {
  activeView: WorkspaceView;
  session: WorkspaceSession;
  project: LandscapeProject;
  projects: LandscapeProject[];
  theme: WorkspaceTheme;
  onViewChange: (view: WorkspaceView) => void;
  onProjectChange: (projectId: string) => void;
  onOpenProjectEdit: () => void;
  onOpenNewProject: () => void;
  onThemeToggle: () => void;
  onOpenProfile: () => void;
};

function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: WorkspaceTheme;
  onToggle: () => void;
}) {
  return (
    <button
      className={`theme-toggle ${theme}`}
      type="button"
      onClick={onToggle}
      aria-label={theme === "dark" ? "切换浅色主题" : "切换深色主题"}
    >
      <span className="theme-toggle-track">
        <span className="theme-toggle-thumb">
          {theme === "dark" ? <Moon size={11} /> : <Sun size={11} />}
        </span>
      </span>
    </button>
  );
}

export default function WorkspaceHeader({
  activeView,
  session,
  project,
  projects,
  theme,
  onViewChange,
  onProjectChange,
  onOpenProjectEdit,
  onOpenNewProject,
  onThemeToggle,
  onOpenProfile,
}: WorkspaceHeaderProps) {
  const dockItems = useMemo<DockItemData[]>(
    () =>
      workspaceNavItems.map((item) => ({
        label: item.label,
        onClick: () => onViewChange(item.id),
        className: activeView === item.id ? "active" : "",
      })),
    [activeView, onViewChange],
  );

  return (
    <header className="workspace-header">
      <div className="brand-lockup" aria-label="Zerlum">
        <img
          className="brand-logo-image"
          src="/brand/zerlum-logo-wide.png"
          alt="Zerlum"
        />
        <div className="header-project-context">
          <DropdownSelect
            className="header-project-dropdown"
            value={project.id}
            onValueChange={onProjectChange}
            ariaLabel="切换当前项目"
            options={projects.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
          />
          <button type="button" onClick={onOpenProjectEdit}>
            {project.location || project.type} / {project.designStage}
          </button>
        </div>
      </div>
      <Dock items={dockItems} className="workspace-dock-panel" panelHeight={46} />
      <div className="profile-tools">
        <button
          className="icon-button header-new-project"
          type="button"
          onClick={onOpenNewProject}
          aria-label="新建景观项目"
          title="新建景观项目"
        >
          <PlusCircle size={18} weight="bold" />
        </button>
        <ThemeToggle theme={theme} onToggle={onThemeToggle} />
        <button className="profile-button" type="button" onClick={onOpenProfile}>
          {session.avatarUrl ? (
            <img className="profile-button-avatar" src={session.avatarUrl} alt="" />
          ) : (
            <UserCircle size={22} weight="bold" />
          )}
          <span>{session.displayName}</span>
        </button>
      </div>
    </header>
  );
}
