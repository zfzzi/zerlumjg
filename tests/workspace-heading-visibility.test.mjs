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
const dockStylesSource = readFileSync(
  new URL("../src/components/Dock.css", import.meta.url),
  "utf8",
);

test("project heading row only renders on agent and hub views", () => {
  assert.match(
    appSource,
    /const showViewHeading = activeView === "agent" \|\| activeView === "hub";/,
  );
  assert.match(
    appSource,
    /className=\{`workspace-body \$\{[\s\S]*showViewHeading \? "with-view-heading" : "without-view-heading"[\s\S]*\}`\}/,
  );
  assert.match(
    appSource,
    /\{showViewHeading && \(\s*<div className="view-heading">/,
  );
  assert.doesNotMatch(
    appSource,
    /<section className="workspace-body">\s*<div className="view-heading">/,
  );
});

test("workspace body uses a single content row when the heading is hidden", () => {
  assert.match(
    stylesSource,
    /\.workspace-body\s*{[\s\S]*grid-template-rows:\s*minmax\(0,\s*1fr\)/,
  );
  assert.match(
    stylesSource,
    /\.workspace-body\.with-view-heading\s*{[\s\S]*grid-template-rows:\s*auto minmax\(0,\s*1fr\)/,
  );
});

test("workspace dock starts with a home button that returns to the welcome screen", () => {
  assert.match(appSource, /function handleReturnHome\(\)/);
  assert.match(appSource, /onReturnHome=\{handleReturnHome\}/);
  assert.match(appSource, /onReturnHome: \(\) => void;/);
  assert.match(
    appSource,
    /const dockItems = useMemo<DockItemData\[\]>\(\s*\(\) =>\s*\[\s*\{\s*label: "主页",\s*onClick: onReturnHome,/,
  );
});

test("home navigation shows welcome without erasing workspace state", () => {
  assert.match(
    appSource,
    /const \[showWelcomeHome, setShowWelcomeHome\] = useState\(false\);/,
  );
  assert.match(
    appSource,
    /const shouldShowWelcome = showWelcomeHome \|\| !session \|\| !activeProject \|\| !currentMember;/,
  );
  assert.match(
    appSource,
    /function handleReturnHome\(\) {[\s\S]*?setShowWelcomeHome\(true\);[\s\S]*?setAuthOpen\(false\);[\s\S]*?setOnboardingOpen\(false\);[\s\S]*?}/,
  );
  assert.doesNotMatch(
    appSource,
    /function handleReturnHome\(\) {[\s\S]*?window\.localStorage\.removeItem\(STORAGE_KEY\)/,
  );
  assert.doesNotMatch(
    appSource,
    /function handleReturnHome\(\) {[\s\S]*?setProjects\(\[\]\)/,
  );
});

test("workspace dock frame is long enough for the expanded menu", () => {
  assert.match(
    dockStylesSource,
    /\.dock-outer\s*{[\s\S]*width:\s*min\(100%,\s*1080px\)/,
  );
  assert.match(appSource, /baseItemSize=\{98\}/);
  assert.match(appSource, /magnification=\{132\}/);
});
