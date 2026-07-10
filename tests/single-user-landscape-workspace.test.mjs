import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");

test("login creates a single-user landscape session and enters Agent", () => {
  assert.match(app, /setSession\(\{[\s\S]*displayName:/);
  assert.match(app, /setActiveView\("agent"\)/);
  assert.match(app, /createLandscapeProject/);
  assert.doesNotMatch(app, /setOnboardingOpen\(true\)/);
});

test("workspace contains no collaboration onboarding or permission roles", () => {
  assert.doesNotMatch(
    app,
    /OnboardingDialog|OnboardingStep|Collaboration|TeamMember|MemberRole|Permissions/,
  );
  assert.doesNotMatch(app, /项目码|创建项目空间|打开项目空间|独自创作/);
});

test("workspace consumes the canonical landscape state boundary", () => {
  assert.match(app, /from "\.\/domain\/landscape"/);
  assert.match(app, /from "\.\/state\/workspace"/);
  assert.match(app, /writeWorkspaceState/);
  assert.doesNotMatch(app, /zerlum-mvp-workspace/);
});
