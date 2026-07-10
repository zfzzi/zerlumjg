import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const appSource = read("src/App.tsx");
const stylesSource = read("src/styles.css");
const workspaceSource = read("src/state/workspace.ts");
const headerSource = read("src/shell/WorkspaceHeader.tsx");
const viteSource = read("vite.config.ts");
const productionSource = read("api/_zerlum-server.ts");
const packageSource = read("package.json");
const activeRuntimeSource = [
  appSource,
  stylesSource,
  workspaceSource,
  headerSource,
  viteSource,
  productionSource,
  packageSource,
].join("\n");

test("active product runtime has no lighting or collaboration residue", () => {
  assert.doesNotMatch(
    activeRuntimeSource,
    /desktop-lighting|lighting designer|照明设计|灯光|灯具|luminaire|fixture-card|fixture-grid|member-controls|member-role-dropdown|add-member-form|workspace code|project code/i,
  );
});

test("workspace exposes exactly the three landscape product views", () => {
  assert.match(
    workspaceSource,
    /export type WorkspaceView = "agent" \| "canvas" \| "text";/,
  );
  assert.match(headerSource, /景观 Agent/);
  assert.match(headerSource, /方案画布/);
  assert.match(headerSource, /文本交付/);
  assert.doesNotMatch(headerSource, /团队|成员|协作|加入项目|项目码/);
});

test("only the landscape knowledge library remains mounted", () => {
  assert.equal(
    existsSync(new URL("../knowledge/desktop-lighting-library", import.meta.url)),
    false,
  );
  assert.equal(
    existsSync(new URL("../knowledge/landscape-design-library/README.md", import.meta.url)),
    true,
  );
  assert.match(packageSource, /ingest:landscape-md/);
  assert.match(packageSource, /search:landscape-md/);
  assert.doesNotMatch(packageSource, /desktop-md|desktop-lighting/);
});
