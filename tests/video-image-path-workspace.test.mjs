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
  assert.notEqual(start, -1, `Missing CSS selector ${selector}`);
  const end = stylesSource.indexOf("\n}", start);
  assert.notEqual(end, -1, `Missing closing brace for ${selector}`);

  return stylesSource.slice(start, end + 2);
}

test("video workspace supports image upload and path drawing", () => {
  assert.match(appSource, /className="video-upload-panel"/);
  assert.match(appSource, /aria-label="上传参考图片"/);
  assert.match(appSource, /accept="image\/\*"/);
  assert.match(appSource, /className="video-image-dialog"/);
  assert.match(appSource, /aria-label="图片路径绘制窗口"/);
  assert.match(appSource, /onPointerDown=\{handlePathPointerDown\}/);
  assert.match(appSource, /onPointerMove=\{handlePathPointerMove\}/);
  assert.match(appSource, /onPointerUp=\{handlePathPointerEnd\}/);
  assert.match(appSource, /清空路径/);
});

test("video workspace supports selectable camera motion presets", () => {
  const presetPanelBlock = cssBlock(".video-camera-preset-panel");
  const presetTriggerBlock = cssBlock(".video-camera-preset-trigger");
  const presetGridBlock = cssBlock(".video-camera-preset-grid");

  assert.match(appSource, /const videoCameraPresets/);
  assert.match(appSource, /label: "平稳推进"/);
  assert.match(appSource, /label: "放大推进"/);
  assert.match(appSource, /label: "希区柯克变焦"/);
  assert.match(appSource, /label: "自定义"/);
  assert.match(appSource, /className="video-camera-preset-panel"/);
  assert.match(appSource, /aria-label="选择镜头预设"/);
  assert.match(appSource, /aria-pressed=\{selectedCameraPresetId === preset.id\}/);
  assert.match(appSource, /onClick=\{\(\) => handleCameraPresetSelect\(preset\)\}/);
  assert.match(presetPanelBlock, /display:\s*grid/);
  assert.match(presetTriggerBlock, /justify-content:\s*space-between/);
  assert.match(presetGridBlock, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(presetGridBlock, /max-height:\s*236px/);
  assert.match(
    stylesSource,
    /@media \(max-width: 760px\)[\s\S]*\.video-camera-preset-grid\s*{[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
  );
});

test("zoom push camera preset uses the requested building-centered motion", () => {
  assert.match(appSource, /label: "放大推进"/);
  assert.match(
    appSource,
    /prompt: "镜头缓慢向前推进，保持建筑位于画面中央"/,
  );
  assert.doesNotMatch(
    appSource,
    /镜头向前推进并轻微放大，突出主体细节和空间纵深。/,
  );
});

test("selecting a camera motion preset writes it into the video prompt", () => {
  assert.match(appSource, /function handleCameraPresetSelect/);
  assert.match(appSource, /const presetLine = `镜头运动：\$\{preset.prompt\}`;/);
  assert.match(appSource, /\.filter\(\(line\) => !line\.trim\(\)\.startsWith\("镜头运动："\)\)/);
  assert.match(appSource, /setPrompt\(\(current\) =>/);
  assert.match(appSource, /cleanPrompt \? `\$\{cleanPrompt\}\\n\$\{presetLine\}` : presetLine/);
});

test("unified canvas derives reusable images from image node versions", () => {
  assert.match(
    appSource,
    /<UnifiedCanvasView[\s\S]*onGeneratedImagesChange=\{setCanvasGeneratedImages\}/,
  );
  assert.match(appSource, /canvasNodes[\s\S]*\.filter\(\(node\) => node\.kind === "image"\)/);
  assert.match(appSource, /imageUrl: getCanvasNodeMediaUrl\(node\)/);
  assert.match(appSource, /label:[\s\S]*getSelectedCanvasVersion\(node\)\?\.label/);
  assert.match(appSource, /onGeneratedImagesChange\(\s*canvasNodes/);
});

test("unified canvas stays mounted and replaces the standalone video view", () => {
  assert.match(
    appSource,
    /<div[\s\S]*aria-hidden=\{activeView !== "canvas"\}[\s\S]*className=\{`workspace-preserved-view \$\{[\s\S]*activeView === "canvas" \? "active" : "is-hidden"[\s\S]*\}`\}[\s\S]*<UnifiedCanvasView[\s\S]*permissions=\{permissions\}/,
  );
  assert.doesNotMatch(appSource, /aria-hidden=\{activeView !== "video"\}/);
  assert.doesNotMatch(appSource, /<VideoView[\s\S]*canvasGeneratedImages=\{canvasGeneratedImages\}/);
});

test("video prompt panel removes the Zerlum Video composer", () => {
  assert.doesNotMatch(appSource, /videoAgentInput/);
  assert.doesNotMatch(appSource, /handleVideoAgentSubmit/);
  assert.doesNotMatch(appSource, /className="video-agent-composer"/);
  assert.doesNotMatch(appSource, /Ask Zerlum Video/);
  assert.doesNotMatch(appSource, /ariaLabel="向 Zerlum Video 提问"/);
  assert.doesNotMatch(stylesSource, /\.video-agent-composer/);
});

test("video preview no longer renders the bottom storyboard status strip", () => {
  assert.doesNotMatch(appSource, /video-storyboard-strip/);
  assert.doesNotMatch(appSource, /aria-label="视频制作状态"/);
});

test("uploaded video reference images fit inside a neutral drawing frame", () => {
  const backdropBlock = cssBlock(".video-image-dialog-backdrop");
  const dialogBlock = cssBlock(".video-image-dialog");
  const canvasBlock = cssBlock(".video-path-canvas");
  const frameBlock = cssBlock(".video-path-image-frame");
  const imageBlock = cssBlock(".video-path-image-frame img");

  assert.match(appSource, /className="video-path-image-frame"/);
  assert.match(stylesSource, /\.video-path-image-frame\s*{/);
  assert.match(dialogBlock, /--surface:\s*#ffffff/);
  assert.match(dialogBlock, /--text:\s*#111111/);
  assert.match(backdropBlock, /rgb\(245 245 245 \/ 0\.86\)/);
  assert.match(dialogBlock, /background:\s*#ffffff/);
  assert.match(canvasBlock, /background:[^}]*#f3f4f6/s);
  assert.match(canvasBlock, /container-type:\s*size/);
  assert.match(frameBlock, /background:\s*#ffffff/);
  assert.match(frameBlock, /aspect-ratio:\s*var\(--video-image-aspect-ratio\)/);
  assert.match(
    frameBlock,
    /width:\s*min\(100cqw,\s*calc\(100cqh \* var\(--video-image-ratio\)\)\)/,
  );
  assert.match(imageBlock, /object-fit:\s*contain/);
  assert.match(imageBlock, /(?:^|\n)\s{2}width:\s*100%;/);
  assert.match(imageBlock, /(?:^|\n)\s{2}height:\s*100%;/);
  assert.match(imageBlock, /max-width:\s*100%/);
  assert.match(imageBlock, /max-height:\s*100%/);
  assert.doesNotMatch(backdropBlock, /var\(--surface\)/);
  assert.doesNotMatch(dialogBlock, /var\(--surface\)/);
  assert.doesNotMatch(canvasBlock, /var\(--input\)|var\(--surface\)/);
  assert.doesNotMatch(frameBlock, /var\(--surface-elevated\)/);
  assert.doesNotMatch(backdropBlock, /rgb\(0 0 0 \/ 0\.58\)/);
  assert.doesNotMatch(canvasBlock, /#111/);
});

test("video path dialog sizes the drawing frame from the uploaded image ratio", () => {
  assert.match(
    appSource,
    /type VideoReferenceImage = \{[\s\S]*width: number;[\s\S]*height: number;[\s\S]*\}/,
  );
  assert.match(
    appSource,
    /const image = await loadImageSource\(src\);[\s\S]*setReferenceImage\(\{[\s\S]*name: file\.name,[\s\S]*src,[\s\S]*width: image\.naturalWidth,[\s\S]*height: image\.naturalHeight,[\s\S]*\}\);/,
  );
  assert.match(
    appSource,
    /"--video-image-aspect-ratio": `\$\{referenceImageWidth\} \/ \$\{referenceImageHeight\}`/,
  );
  assert.match(
    appSource,
    /"--video-image-ratio": referenceImageWidth \/ referenceImageHeight/,
  );
});

test("video reference images can recover dimensions from an already loaded image", () => {
  assert.match(appSource, /function handleReferenceImageLoad/);
  assert.match(appSource, /const loadedWidth = event\.currentTarget\.naturalWidth;/);
  assert.match(appSource, /const loadedHeight = event\.currentTarget\.naturalHeight;/);
  assert.match(appSource, /Number\.isFinite\(referenceImage\.width\)/);
  assert.match(appSource, /Number\.isFinite\(referenceImage\.height\)/);
  assert.match(appSource, /onLoad=\{handleReferenceImageLoad\}/);
});

test("video reference image dimensions recover when hot state lacks them", () => {
  assert.match(appSource, /useEffect\(\(\) => \{[\s\S]*loadImageSource\(referenceImage\.src\)/);
  assert.match(appSource, /let isCurrent = true;/);
  assert.match(appSource, /return \(\) => \{[\s\S]*isCurrent = false;[\s\S]*\};/);
  assert.match(appSource, /current\.src !== referenceImage\.src/);
});

test("uploading a video reference image does not automatically open the drawing dialog", () => {
  const uploadHandlerStart = appSource.indexOf(
    "async function handleReferenceImageUpload",
  );
  const uploadHandlerEnd = appSource.indexOf(
    "function handlePathPointerDown",
    uploadHandlerStart,
  );
  const uploadHandler = appSource.slice(uploadHandlerStart, uploadHandlerEnd);

  assert.ok(uploadHandlerStart > -1);
  assert.ok(uploadHandlerEnd > uploadHandlerStart);
  assert.doesNotMatch(uploadHandler, /setIsImageDialogOpen\(true\)/);
  assert.match(appSource, /onClick=\{\(\) => setIsImageDialogOpen\(true\)\}/);
});

test("video path annotation reads pointer coordinates before state updates", () => {
  const moveHandlerStart = appSource.indexOf("function handlePathPointerMove");
  const moveHandlerEnd = appSource.indexOf(
    "function handlePathPointerEnd",
    moveHandlerStart,
  );
  const moveHandler = appSource.slice(moveHandlerStart, moveHandlerEnd);

  assert.ok(moveHandlerStart > -1);
  assert.ok(moveHandlerEnd > moveHandlerStart);
  assert.match(moveHandler, /const nextPoint = getVideoPathPoint\(event\);/);
  assert.match(moveHandler, /\[\.\.\.path,\s*nextPoint\]/);
  assert.doesNotMatch(moveHandler, /\[\.\.\.path,\s*getVideoPathPoint\(event\)\]/);
});
