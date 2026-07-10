import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const vite = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");
const server = readFileSync(
  new URL("../api/_zerlum-server.ts", import.meta.url),
  "utf8",
);

test("canvas expresses landscape reference roles", () => {
  for (const label of [
    "场地底图",
    "主场景",
    "风格参考",
    "材料参考",
    "植物参考",
    "视频首帧",
    "视频尾帧",
  ]) {
    assert.match(app, new RegExp(label));
  }
  assert.doesNotMatch(app, /"main-image"|"reference-image"/);
});

test("connector menu offers landscape scheme actions", () => {
  for (const label of [
    "生成方案图",
    "添加参考",
    "创建方向变体",
    "局部深化",
    "生成漫游",
  ]) {
    assert.match(app, new RegExp(label));
  }
  assert.match(app, /type CanvasBranchAction =/);
});

test("image nodes carry an explicit landscape generation mode", () => {
  assert.match(app, /type LandscapeGenerationMode =/);
  for (const mode of [
    "preserve",
    "concept",
    "local-edit",
    "variation",
    "season-time",
    "free",
  ]) {
    assert.match(app, new RegExp(`"${mode}"`));
  }
  for (const label of [
    "保留结构",
    "概念改造",
    "局部深化",
    "方向变体",
    "季节时间",
    "自由生成",
  ]) {
    assert.match(app, new RegExp(label));
  }
  assert.match(app, /generationMode: LandscapeGenerationMode;/);
  assert.match(app, /generationMode: node\.params\.generationMode/);
  assert.match(app, /描述空间、植物、材料、季节与使用场景/);
});

test("local and production prompt routes honor landscape modes and relationship roles", () => {
  for (const source of [vite, server]) {
    assert.match(source, /const generationMode = String\(body\.generationMode/);
    assert.match(source, /const generationModeInstruction/);
    assert.match(source, /用户明确要求 > 项目资料 > 画布显式关系/);
    assert.match(source, /图片关系/);
  }
});

test("empty landscape canvas offers four direct starts", () => {
  for (const label of [
    "上传场地底图",
    "上传现状照片",
    "添加意向参考",
    "创建方案图节点",
  ]) {
    assert.match(app, new RegExp(label));
  }
  assert.match(app, /className="canvas-empty-state"/);
  assert.match(app, /canvasNodes\.length === 0/);
});

test("node generation errors stay inside the failed node", () => {
  assert.match(app, /className="canvas-node-error"/);
  assert.match(app, /重试当前节点/);
  assert.match(app, /version\?\.status === "error"/);
});

test("canvas connector supports keyboard open, escape close, and reduced motion", () => {
  assert.match(app, /function openCanvasConnectionMenuFromKeyboard/);
  assert.match(app, /event\.key === "Enter" \|\| event\.key === " "/);
  assert.match(app, /event\.key !== "Escape"/);
  assert.match(app, /data-canvas-connector-node-id=\{node\.id\}/);
  assert.match(
    styles,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.canvas-node-connector-icon[\s\S]*transition:\s*none/,
  );
});
