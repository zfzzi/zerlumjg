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

test("project heading row is removed from the tool-platform workspace", () => {
  assert.match(
    appSource,
    /const showViewHeading = false;/,
  );
  assert.match(
    appSource,
    /className=\{`workspace-body \$\{[\s\S]*showViewHeading \? "with-view-heading" : "without-view-heading"[\s\S]*\}`\}/,
  );
  assert.doesNotMatch(
    appSource,
    /const showViewHeading = activeView === "agent" \|\| activeView === "hub";/,
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

test("workspace dock omits the home button", () => {
  assert.doesNotMatch(appSource, /label: "主页"/);
  assert.doesNotMatch(appSource, /onReturnHome=\{handleReturnHome\}/);
  assert.doesNotMatch(appSource, /onReturnHome: \(\) => void;/);
  assert.match(
    appSource,
    /const dockItems = useMemo<DockItemData\[\]>\(\s*\(\) =>\s*navItems\.map/,
  );
});

test("workspace no longer keeps home-navigation state", () => {
  assert.doesNotMatch(appSource, /showWelcomeHome/);
  assert.doesNotMatch(appSource, /setShowWelcomeHome/);
  assert.doesNotMatch(appSource, /function handleReturnHome\(\)/);
  assert.match(appSource, /const shouldShowWelcome = !session \|\| !activeProject;/);
  assert.doesNotMatch(appSource, /currentMember/);
});

test("workspace dock is compact and uses direct state transitions", () => {
  assert.match(
    dockStylesSource,
    /\.dock-outer\s*{[\s\S]*width:\s*min\(100%,\s*620px\)/,
  );
  assert.match(dockStylesSource, /\.dock-item\s*{[\s\S]*height:\s*38px/);
  assert.doesNotMatch(dockStylesSource, /box-shadow:[\s\S]*0 18px 48px/);
});
