import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("App delegates shell and Agent layout to focused modules", async () => {
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");

  assert.match(app, /from "\.\/shell\/WelcomeScreen"/);
  assert.match(app, /from "\.\/shell\/AuthDialog"/);
  assert.match(app, /from "\.\/shell\/WorkspaceHeader"/);
  assert.match(app, /from "\.\/views\/agent\/AgentView"/);
  assert.doesNotMatch(app, /function WelcomeScreen\(/);
  assert.doesNotMatch(app, /function AuthDialog\(/);
  assert.doesNotMatch(app, /function WorkspaceHeader\(/);
  assert.doesNotMatch(app, /function AgentView\(/);
});
