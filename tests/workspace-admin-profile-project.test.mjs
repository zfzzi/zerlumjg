import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(
  new URL("../src/App.tsx", import.meta.url),
  "utf8",
);

test("only administrators can create or edit projects", () => {
  assert.match(appSource, /canCreateProject:\s*role === "管理员"/);
  assert.match(appSource, /canEditProject:\s*role === "管理员"/);
  assert.match(appSource, /permissions\.canCreateProject\s*&&\s*\(/);
  assert.match(appSource, /permissions\.canEditProject\s*&&\s*\(/);
});

test("user detail dialog edits display name and avatar", () => {
  assert.match(appSource, /function UserProfileDialog/);
  assert.match(appSource, /onProfileUpdate/);
  assert.match(appSource, /编辑名称/);
  assert.match(appSource, /className="profile-avatar-edit"/);
  assert.match(appSource, /aria-label="更换头像"/);
  assert.match(appSource, /avatarUrl\?: string/);
  assert.match(appSource, /className="profile-button-avatar"/);
  assert.match(appSource, /保存用户信息/);
  assert.doesNotMatch(appSource, /label="姓名"/);
});

test("administrators can update the current project metadata", () => {
  assert.match(appSource, /onOpenProjectEdit/);
  assert.match(appSource, /编辑项目/);
  assert.match(appSource, /handleUpdateProject/);
  assert.match(appSource, /setProjects\(\(current\) =>\s*current\.map/);
});

test("profile persistence is resilient to large avatar payloads", () => {
  assert.match(appSource, /function persistWorkspaceState/);
  assert.match(appSource, /try\s*{\s*window\.localStorage\.setItem/s);
  assert.match(appSource, /catch\s*\(/);
  assert.match(appSource, /function readAvatarFileAsDataUrl/);
  assert.match(appSource, /MAX_AVATAR_IMAGE_SIZE/);
  assert.match(appSource, /canvas\.toDataURL\("image\/jpeg",\s*0\.82\)/);
});

test("uploaded avatars appear in every agent conversation", () => {
  assert.match(appSource, /function UserMessageAvatar/);
  assert.match(appSource, /userAvatarUrl=\{currentMember\.avatarUrl\}/);
  assert.match(appSource, /userAvatarUrl:\s*string \| undefined/);
  assert.match(appSource, /avatarUrl=\{userAvatarUrl\}/);
  assert.doesNotMatch(
    appSource,
    /\{member\.role\}\s*·\s*\{member\.status\}\s*·/,
  );
});
