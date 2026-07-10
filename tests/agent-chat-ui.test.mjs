import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const agentViewBlock = appSource.slice(
  appSource.indexOf("function AgentWorkspaceContent"),
  appSource.indexOf("function AgentComposer"),
);

test("zerlum agent chat auto-scrolls while assistant output streams", () => {
  assert.match(agentViewBlock, /const agentConversationEndRef = useRef<HTMLDivElement \| null>\(null\);/);
  assert.match(
    agentViewBlock,
    /useEffect\(\(\) => \{[\s\S]*agentConversationEndRef\.current\?\.scrollIntoView\(\{ block: "end" \}\);[\s\S]*\}, \[agentMessages, agentStatus\]\);/,
  );
  assert.match(agentViewBlock, /<div className="agent-conversation-end" ref=\{agentConversationEndRef\} aria-hidden="true" \/>/);
});

test("zerlum agent message text can be partially selected without selecting the whole chat", () => {
  assert.match(agentViewBlock, /function stopAgentMessageTextPointerDown/);
  assert.match(agentViewBlock, /onMouseDown=\{stopAgentMessageTextPointerDown\}/);
  assert.match(agentViewBlock, /className="agent-message-text"/);
  assert.match(stylesSource, /\.agent-message-content\s*\{[\s\S]*user-select:\s*text;/);
  assert.match(stylesSource, /\.agent-message-text\s*\{[\s\S]*user-select:\s*text;/);
  assert.match(stylesSource, /\.agent-message-actions\s*\{[\s\S]*user-select:\s*none;/);
});

test("long zerlum agent messages collapse with an explicit expand control", () => {
  assert.match(appSource, /const AGENT_MESSAGE_COLLAPSE_LENGTH = 1200;/);
  assert.match(agentViewBlock, /const \[expandedAgentMessageIds, setExpandedAgentMessageIds\] = useState<Set<string>>/);
  assert.match(agentViewBlock, /const isLongAssistantMessage = message\.role === "assistant" && message\.text\.length > AGENT_MESSAGE_COLLAPSE_LENGTH;/);
  assert.match(agentViewBlock, /const shouldCollapseMessage = isLongAssistantMessage && !expandedAgentMessageIds\.has\(message\.id\);/);
  assert.match(agentViewBlock, /aria-expanded=\{!shouldCollapseMessage\}/);
  assert.match(agentViewBlock, /shouldCollapseMessage \? "展开全文" : "收起"/);
  assert.match(stylesSource, /\.agent-message-content\.is-collapsed\s*\{/);
  assert.match(stylesSource, /\.agent-message-content\.is-collapsed::after\s*\{/);
  assert.match(stylesSource, /\.agent-message-collapse-button\s*\{/);
});
