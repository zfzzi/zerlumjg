import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [app, styles] = await Promise.all([
  readFile(new URL("../src/App.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/styles.css", import.meta.url), "utf8"),
]);

test("welcome and workspace share the landscape product language", () => {
  assert.match(app, /从场地到方案/);
  assert.match(app, /理解场地，推演方向，完成表达。/);
  assert.match(app, /景观 Agent/);
  assert.match(app, /方案画布/);
  assert.match(app, /文本交付/);
  assert.doesNotMatch(app, /Welcome Zerlum|照明设计工具台/);
});

test("Agent empty state offers the six landscape workflow tasks", () => {
  for (const task of [
    "分析场地问题与机会",
    "提出概念方向",
    "梳理功能与游线",
    "深化关键设计节点",
    "建立植物与季相策略",
    "检查方案完整性",
  ]) {
    assert.match(app, new RegExp(task));
  }
  assert.match(app, /onChatInput\(task\)/);
  assert.match(app, /\.focus\(\)/);
});

test("Agent exposes project brief fields and recent design outcomes", () => {
  for (const label of [
    "项目类型",
    "项目地点",
    "设计阶段",
    "客户或委托方",
    "项目目标",
    "使用人群",
    "场地范围",
    "已知限制",
    "设计方向",
    "设计节点",
    "待确认项",
  ]) {
    assert.match(app, new RegExp(label));
  }
  assert.match(app, /onProjectUpdate/);
});

test("shell uses the graphite and moss token system with reduced motion", () => {
  assert.match(styles, /--page:\s*#0c0e0d/);
  assert.match(styles, /--surface:\s*#121513/);
  assert.match(styles, /--accent:\s*#8da68f/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /\.workspace-persistence-status/);
});
