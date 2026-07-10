import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("workspace uses one versioned landscape project context", async () => {
  const [domain, state] = await Promise.all([
    readFile(new URL("../src/domain/landscape.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/state/workspace.ts", import.meta.url), "utf8"),
  ]);

  assert.match(domain, /export type LandscapeProject/);
  assert.match(domain, /location:/);
  assert.match(domain, /designStage:/);
  assert.match(domain, /brief:/);
  assert.match(domain, /export function createLandscapeProject/);
  assert.match(state, /zerlum-landscape-workspace-v1/);
  assert.match(state, /export function readWorkspaceState/);
  assert.match(state, /export function writeWorkspaceState/);
  assert.match(state, /本地存储空间不足，请移除大型资料后重试。/);
  assert.doesNotMatch(domain + state, /Collaboration|TeamMember|MemberRole|Permissions/);
});
