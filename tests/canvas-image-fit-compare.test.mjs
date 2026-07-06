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

function cssBlock(selector) {
  const start = stylesSource.indexOf(`${selector} {`);

  assert.notEqual(start, -1, `Missing CSS block for ${selector}`);

  const end = stylesSource.indexOf("\n}", start);

  assert.notEqual(end, -1, `Missing CSS block end for ${selector}`);

  return stylesSource.slice(start, end + 2);
}

test("canvas image nodes preserve full image content", () => {
  assert.match(stylesSource, /\.visual-node-image img[\s\S]*object-fit: contain/);
});

test("canvas workspace stays mounted when switching to other views", () => {
  assert.doesNotMatch(
    appSource,
    /activeView === "canvas"\s*&&\s*\(\s*<CanvasView/,
  );
  assert.match(appSource, /workspace-preserved-view/);
  assert.match(
    stylesSource,
    /\.workspace-preserved-view\.is-hidden\s*{[\s\S]*display:\s*none/,
  );
});

test("preview modal scales opened images into the available viewport", () => {
  assert.match(
    stylesSource,
    /\.visual-preview-shell[\s\S]*height:\s*min\(860px,\s*calc\(100vh - 32px\)\)/,
  );
  assert.match(stylesSource, /\.visual-preview-frame[\s\S]*overflow:\s*hidden/);
  assert.match(
    stylesSource,
    /\.visual-preview-frame[\s\S]*box-sizing:\s*border-box/,
  );
  assert.match(
    stylesSource,
    /\.visual-preview-frame > img[\s\S]*width:\s*100%[\s\S]*height:\s*100%[\s\S]*object-fit:\s*contain/,
  );
  assert.match(
    stylesSource,
    /@media \(max-width: 760px\)[\s\S]*\.visual-preview-shell[\s\S]*width:\s*calc\(100vw - 16px\)/,
  );
});

test("generated canvas nodes remember the source image for comparison", () => {
  assert.match(appSource, /sourceImageUrl\?: string/);
  assert.match(appSource, /sourceImageUrl:\s*imageNode\?\.imageUrl/);
});

test("preview modal exposes draggable generated image comparison", () => {
  assert.match(appSource, /comparisonSlider/);
  assert.match(appSource, /visual-preview-compare/);
  assert.match(stylesSource, /\.visual-preview-comparison-layer/);
});

test("canvas image preview supports wheel zoom while staying fitted to the window", () => {
  assert.match(appSource, /const \[previewZoom, setPreviewZoom\] = useState\(1\)/);
  assert.match(appSource, /function handlePreviewWheel/);
  assert.match(appSource, /setPreviewZoom\(\(current\) => clamp\(/);
  assert.match(appSource, /onWheel=\{handlePreviewWheel\}/);
  assert.match(appSource, /"--preview-zoom": previewZoom,/);
  assert.match(stylesSource, /\.visual-preview-frame\.zoomable\s*{/);
  assert.match(
    stylesSource,
    /transform:\s*scale\(var\(--preview-zoom,\s*1\)\)/,
  );
});

test("canvas workspace fills the workspace without an outer frame", () => {
  assert.match(
    stylesSource,
    /\.workspace-body\.is-canvas-view\s*{[\s\S]*padding:\s*0;[\s\S]*background:\s*var\(--surface\);/,
  );
  assert.match(
    appSource,
    /activeView === "canvas" \? "is-canvas-view" : ""/,
  );
  assert.match(
    stylesSource,
    /\.canvas-layout\s*{[\s\S]*gap:\s*0;[\s\S]*border:\s*0;[\s\S]*border-radius:\s*0;[\s\S]*background:\s*transparent;[\s\S]*box-shadow:\s*none;/,
  );
  assert.match(
    stylesSource,
    /\.visual-agent-panel\s*{[\s\S]*border:\s*0;[\s\S]*border-right:\s*1px solid color-mix\(in srgb, var\(--text\) 20%, transparent\);[\s\S]*border-radius:\s*0;/,
  );
  assert.match(
    stylesSource,
    /\.infinite-canvas\s*{[\s\S]*border:\s*0;[\s\S]*border-radius:\s*0;/,
  );
  assert.match(
    stylesSource,
    /@media \(max-width: 1180px\)[\s\S]*\.visual-agent-panel\s*{[\s\S]*border-right:\s*0;[\s\S]*border-bottom:\s*1px solid color-mix\(in srgb, var\(--text\) 20%, transparent\);/,
  );
});

test("infinite canvas background uses a dotted array instead of grid lines", () => {
  const canvasBlock = cssBlock(".infinite-canvas");

  assert.match(appSource, /"--canvas-dot-size": `\$\{40 \* zoom\}px`/);
  assert.match(canvasBlock, /radial-gradient\(\s*circle/);
  assert.match(canvasBlock, /background-size:[\s\S]*var\(--canvas-dot-size,\s*40px\) var\(--canvas-dot-size,\s*40px\)/);
  assert.match(canvasBlock, /background-position:[\s\S]*var\(--canvas-grid-x,\s*0\) var\(--canvas-grid-y,\s*0\)/);
  assert.doesNotMatch(canvasBlock, /linear-gradient\(var\(--line\) 1px, transparent 1px\)/);
  assert.doesNotMatch(canvasBlock, /linear-gradient\(90deg, var\(--line\) 1px, transparent 1px\)/);
});

test("canvas dot array fades out at the furthest zoom level", () => {
  const dotOpacityMatches = appSource.match(
    /"--canvas-dot-opacity": getCanvasDotOpacity\(zoom\)/g,
  ) ?? [];
  const canvasBlock = cssBlock(".infinite-canvas");

  assert.match(appSource, /const canvasZoomMin = 0\.35;/);
  assert.match(appSource, /const canvasZoomMax = 2\.6;/);
  assert.match(appSource, /function getCanvasDotOpacity\(zoom: number\)/);
  assert.match(
    appSource,
    /return clamp\(\(zoom - canvasZoomMin\) \/ \(1 - canvasZoomMin\), 0, 1\);/,
  );
  assert.match(
    appSource,
    /const nextZoom = clamp\(zoom \* \(deltaY > 0 \? 0\.9 : 1\.1\), canvasZoomMin, canvasZoomMax\);/,
  );
  assert.equal(dotOpacityMatches.length, 2);
  assert.match(canvasBlock, /--canvas-dot-opacity/);
  assert.match(
    canvasBlock,
    /color-mix\(in srgb, var\(--text\) calc\(24% \* var\(--canvas-dot-opacity,\s*1\)\), transparent\)/,
  );
});

test("Zerlum Visual prompt preserves source image structure, perspective, scale, and material", () => {
  assert.match(
    appSource,
    /必须保持原图结构、构图、主体位置、镜头视角、透视关系、建筑比例和主要材质不变/,
  );
});
