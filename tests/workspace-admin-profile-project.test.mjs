import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const headerSource = readFileSync(
  new URL("../src/shell/WorkspaceHeader.tsx", import.meta.url),
  "utf8",
);
const stateSource = readFileSync(
  new URL("../src/state/workspace.ts", import.meta.url),
  "utf8",
);

test("single-user workspace can create and edit landscape projects", () => {
  assert.match(appSource, /function handleCreateProject/);
  assert.match(appSource, /const nextProject = createProject\(newProjectDraft\)/);
  assert.match(appSource, /function handleUpdateProject/);
  assert.match(appSource, /name: projectEditDraft\.name\.trim\(\) \|\| "未命名景观项目"/);
  assert.match(appSource, /designStage: projectEditDraft\.designStage \|\| "概念方案"/);
  assert.doesNotMatch(appSource, /canCreateProject|canEditProject|当前角色没有/);
});

test("user detail dialog edits display name and avatar", () => {
  assert.match(appSource, /function UserProfileDialog/);
  assert.match(appSource, /onProfileUpdate/);
  assert.match(appSource, /编辑名称/);
  assert.match(appSource, /className="profile-avatar-edit"/);
  assert.match(appSource, /aria-label="更换头像"/);
  assert.match(headerSource, /className="profile-button-avatar"/);
  assert.match(appSource, /保存用户信息/);
  assert.match(appSource, /displayName: nextName/);
  assert.doesNotMatch(appSource, /项目码|Token 使用量/);
});

test("versioned profile persistence reports quota errors and compresses avatars", () => {
  assert.match(stateSource, /function writeWorkspaceState/);
  assert.match(stateSource, /storage\.setItem\(LANDSCAPE_STORAGE_KEY/);
  assert.match(stateSource, /本地存储空间不足，请移除大型资料后重试。/);
  assert.match(appSource, /function readAvatarFileAsDataUrl/);
  assert.match(appSource, /MAX_AVATAR_IMAGE_SIZE/);
  assert.match(appSource, /canvas\.toDataURL\("image\/jpeg",\s*0\.82\)/);
});

test("uploaded avatars appear in Agent and document conversations", () => {
  assert.match(appSource, /function UserMessageAvatar/);
  assert.match(appSource, /userAvatarUrl=\{session\.avatarUrl\}/);
  assert.match(appSource, /userAvatarUrl:\s*string \| undefined/);
  assert.match(appSource, /avatarUrl=\{userAvatarUrl\}/);
});
