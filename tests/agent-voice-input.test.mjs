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

test("agent composer records microphone input and encodes it as wav audio", () => {
  assert.match(appSource, /type AgentVoiceInput =/);
  assert.match(appSource, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(appSource, /new MediaRecorder/);
  assert.match(appSource, /encodeAudioBufferAsWav/);
  assert.match(appSource, /readBlobAsDataUrl/);
  assert.match(appSource, /onVoiceSubmit/);
  assert.match(stylesSource, /\.agent-icon-action\.recording/);
});

test("canvas visual submits microphone audio to the agent proxy", () => {
  assert.match(
    appSource,
    /async function submitVisualMessage\(\s*voiceInput\?: AgentVoiceInput/,
  );
  assert.match(appSource, /audio:\s*voiceInput/);
  assert.match(appSource, /onVoiceSubmit=\{submitVisualVoiceMessage\}/);
});

test("zerlum agent submits microphone audio to the agent proxy", () => {
  assert.match(
    appSource,
    /function handleAgentVoiceSubmit\(\s*voiceInput: AgentVoiceInput,\s*textInstruction: string,/,
  );
  assert.match(appSource, /onVoiceSubmit=\{handleAgentVoiceSubmit\}/);
});

test("microphone permission errors show an actionable Chinese message", () => {
  assert.match(appSource, /function getVoiceRecordingErrorMessage/);
  assert.match(appSource, /NotAllowedError/);
  assert.match(appSource, /Permission denied/);
  assert.match(appSource, /浏览器没有麦克风权限，请在地址栏允许麦克风后重试。/);
});
