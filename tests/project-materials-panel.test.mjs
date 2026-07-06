import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(
  new URL("../src/App.tsx", import.meta.url),
  "utf8",
);
const stylesSource = readFileSync(
  new URL("../src/styles.css", import.meta.url),
  "utf8",
);
const panelBlock = appSource.slice(
  appSource.indexOf("function ProjectMaterialsPanel"),
  appSource.indexOf("function AgentComposer"),
);
const agentSubmitBlock = appSource.slice(
  appSource.indexOf("async function handleAgentSubmit"),
  appSource.indexOf("function handleAgentVoiceSubmit"),
);

test("project materials panel can delete uploaded files", () => {
  assert.match(appSource, /function handleProjectMaterialDelete/);
  assert.match(appSource, /onProjectMaterialDelete=\{handleProjectMaterialDelete\}/);
  assert.match(panelBlock, /onDelete:\s*\(materialId: string\) => void/);
  assert.match(panelBlock, /aria-label=\{`删除 \$\{material\.name\}`\}/);
  assert.match(panelBlock, /onClick=\{\(\) => onDelete\(material\.id\)\}/);
  assert.match(stylesSource, /\.material-delete-button/);
});

test("agent chat sends current project materials with the typed message", () => {
  assert.match(agentSubmitBlock, /message: requestMessage/);
  assert.match(
    agentSubmitBlock,
    /materials:\s*prepareAgentMaterialsForChat\(\s*projectMaterials\[activeProject\.id\] \?\? \[\],\s*\)/,
  );
});

test("agent chat does not send large material data URLs to the function", () => {
  assert.match(appSource, /function prepareAgentMaterialsForChat/);
  assert.match(
    appSource,
    /\(\{\s*sourceDataUrl,\s*sourceText,\s*sourceMimeType,\s*\.\.\.material\s*\}\)/,
  );
  assert.match(appSource, /sourceText:\s*sourceText\?\.slice\(0,\s*AGENT_MATERIAL_TEXT_LIMIT\)/);
  assert.doesNotMatch(agentSubmitBlock, /sourceDataUrl/);
});
