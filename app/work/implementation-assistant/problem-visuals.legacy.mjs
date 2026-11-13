import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PAGE_URL =
  process.env.IMPLEMENTATION_ASSISTANT_URL ??
  "http://127.0.0.1:3000/work/implementation-assistant";

const MOTION_CSS_URL = new URL("./problem-visuals.module.css", import.meta.url);

async function getMotionCss() {
  return readFile(MOTION_CSS_URL, "utf8");
}

function keyframesBlock(css, name) {
  const marker = `@keyframes ${name}`;
  const start = css.indexOf(marker);
  assert.ok(start >= 0, `${name} keyframes must exist`);

  const open = css.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] === "}") depth -= 1;
    if (depth === 0) return css.slice(start, index + 1);
  }

  assert.fail(`${name} keyframes must close`);
}

async function getPageHtml() {
  const response = await fetch(PAGE_URL);
  assert.equal(response.status, 200);

  return response.text();
}

async function getProblemSection() {
  const html = await getPageHtml();
  const start = html.indexOf('data-visual="flow-break"');
  const end = html.indexOf('data-visual="guidance-gap"');
  assert.ok(start >= 0 && end > start, "SSR must include the four problem visuals");

  const closingSvg = html.indexOf("</svg>", end);
  return html.slice(start, closingSvg + "</svg>".length);
}

function visualMarkup(section, name, nextName) {
  const start = section.indexOf(`data-visual="${name}"`);
  assert.ok(start >= 0, `${name} visual must be rendered`);

  const end = nextName
    ? section.indexOf(`data-visual="${nextName}"`, start)
    : section.length;
  return section.slice(start, end);
}

test("problem motion scope starts idle so animation waits for the viewport", async () => {
  const html = await getPageHtml();

  assert.match(html, /data-problem-motion="idle"/);
});

test("semantic correction starts all four card loops without a masking stagger", async () => {
  const html = await getPageHtml();
  const matches = [
    ...html.matchAll(
      /data-motion-card="([^"]+)"[^>]*style="[^"]*--motion-offset:([^;\"]+)/g,
    ),
  ];

  assert.deepEqual(
    matches.map((match) => [match[1], match[2]]),
    [
      ["flow-break", "0ms"],
      ["repeat", "0ms"],
      ["cross-tool", "0ms"],
      ["guidance-gap", "0ms"],
    ],
  );
});

test("positioned SVG icons never animate transform and cannot jump to the origin", async () => {
  const css = await getMotionCss();

  for (const name of [
    "flowWarning",
    "questionPause",
    "guidanceWarning",
    "guidanceSuccess",
  ]) {
    assert.doesNotMatch(keyframesBlock(css, name), /\btransform\s*:/);
  }
});

test("flow progress ends at the yellow break ring without entering pending nodes", async () => {
  const css = await getMotionCss();
  const progress = keyframesBlock(css, "flowProgress");
  const section = await getProblemSection();
  const flow = visualMarkup(section, "flow-break", "repeat");

  assert.match(
    css,
    /\[data-motion-card="flow-break"\][\s\S]*?animation-duration: 3s;/,
  );
  assert.match(
    flow,
    /flowNodeBreakRing[^>]*cx="102"[^>]*r="10"[\s\S]*flowNodeBreak[^>]*cx="102"/,
  );
  assert.match(progress, /80%,\s*96%\s*{[^}]*translateX\(0\)/s);
  assert.doesNotMatch(progress, /translateX\(79px\)/);
});

test("flow progress fades out before resetting invisibly to the start", async () => {
  const css = await getMotionCss();
  const progress = keyframesBlock(css, "flowProgress");
  const opacity = keyframesBlock(css, "flowOpacity");

  assert.match(
    progress,
    /0%,\s*8%\s*{[^}]*translateX\(-84px\)/s,
  );
  assert.doesNotMatch(progress, /\bopacity\s*:/);
  assert.match(
    opacity,
    /0%\s*{[^}]*opacity:\s*0;/s,
  );
  assert.match(
    opacity,
    /8%,\s*88%\s*{[^}]*opacity:\s*1;/s,
  );
  assert.match(
    progress,
    /96\.01%,\s*100%\s*{[^}]*translateX\(-84px\)/s,
  );
  assert.match(opacity, /96%,\s*100%\s*{[^}]*opacity:\s*0;/s);
  assert.doesNotMatch(opacity, /\btransform\s*:/);
});

test("problem card loops share a three second cadence without linear timing", async () => {
  const css = await getMotionCss();

  assert.equal((css.match(/animation-duration:\s*3s;/g) ?? []).length, 4);
  assert.doesNotMatch(css, /animation-timing-function:\s*linear/);
});

test("problem visuals keep the approved per-card scale and lower visual center", async () => {
  const css = await getMotionCss();

  for (const [card, scale, offset] of [
    ["flow-break", "1.06", "4px"],
    ["repeat", "1.08", "6px"],
    ["cross-tool", "1.03", "4px"],
    ["guidance-gap", "1.06", "5px"],
  ]) {
    assert.match(
      css,
      new RegExp(
        `\\[data-motion-card="${card}"\\]\\s+\\.visual\\s*\\{[^}]*transform:\\s*translateY\\(${offset}\\)\\s+scale\\(${scale}\\);`,
        "s",
      ),
    );
  }
});

test("moving dots use separate ease-out position and opacity tracks", async () => {
  const css = await getMotionCss();

  assert.match(
    css,
    /\.flowNodeBreak\s*{[^}]*animation-name:\s*flowProgress,\s*flowOpacity;[^}]*animation-timing-function:\s*cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\),\s*cubic-bezier\(0\.4,\s*0,\s*0\.2,\s*1\);/s,
  );
  assert.match(
    css,
    /\.startNode\s*{[^}]*animation-name:\s*guidanceProgress,\s*guidanceOpacity;[^}]*animation-timing-function:\s*cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\),\s*cubic-bezier\(0\.4,\s*0,\s*0\.2,\s*1\);/s,
  );
});

test("repeat units execute one through six without group translation", async () => {
  const css = await getMotionCss();

  for (let item = 1; item <= 6; item += 1) {
    assert.match(
      css,
      new RegExp(
        `\\[data-part="repeat-item-${item}"\\][\\s\\S]*?animation-name: repeatExecute${item};`,
      ),
    );
    assert.doesNotMatch(
      keyframesBlock(css, `repeatExecute${item}`),
      /\btransform\s*:/,
    );
  }
});

test("repeat reset leaves unit 03 inactive instead of replaying it out of order", async () => {
  const css = await getMotionCss();
  const itemThree = keyframesBlock(css, "repeatExecute3");

  assert.match(
    itemThree,
    /0%[^}]*rgba\(237, 238, 240, 0\.2\)[^}]*opacity: 0\.62/,
  );
  assert.match(
    itemThree,
    /100%[^}]*rgba\(237, 238, 240, 0\.2\)[^}]*opacity: 0\.62/,
  );
});

test("cross-tool task stays inside the panel gap while moving between tools", async () => {
  const css = await getMotionCss();
  const transfer = keyframesBlock(css, "taskTransfer");

  assert.match(transfer, /translateX\(-20px\)/);
  assert.match(transfer, /translateX\(20px\)/);
  assert.doesNotMatch(transfer, /translateX\((?:-)?(?:2[1-9]|[3-9]\d)px\)/);
});

test("cross-tool path and arrowhead share mutually exclusive direction feedback", async () => {
  const css = await getMotionCss();
  const outbound = keyframesBlock(css, "outboundPathState");
  const returning = keyframesBlock(css, "returnPathState");

  assert.match(
    css,
    /:is\(\.transferPath,\s*\[data-part="forward-arrow"\]\)\s*\{[^}]*animation-name:\s*outboundPathState;/s,
  );
  assert.match(
    css,
    /:is\(\.returnPath,\s*\[data-part="return-arrow"\]\)\s*\{[^}]*animation-name:\s*returnPathState;/s,
  );
  assert.match(
    outbound,
    /12\.5%,\s*37\.5%\s*\{[^}]*color:\s*var\(--pv-warning\)/s,
  );
  assert.match(
    outbound,
    /46%,\s*100%\s*\{[^}]*color:\s*var\(--pv-faint\)/s,
  );
  assert.match(
    returning,
    /0%,\s*46%\s*\{[^}]*color:\s*var\(--pv-faint\)/s,
  );
  assert.match(
    returning,
    /50%,\s*79\.17%\s*\{[^}]*color:\s*var\(--pv-warning\)/s,
  );
  assert.match(
    returning,
    /88%,\s*100%\s*\{[^}]*color:\s*var\(--pv-faint\)/s,
  );
});

test("flow break exposes completed, interruption, warning, and pending stages", async () => {
  const section = await getProblemSection();
  const flow = visualMarkup(section, "flow-break", "repeat");

  assert.equal((flow.match(/data-stage="completed"/g) ?? []).length, 2);
  assert.equal((flow.match(/data-stage="interruption"/g) ?? []).length, 1);
  assert.equal((flow.match(/data-stage="pending"/g) ?? []).length, 2);
  assert.match(
    flow,
    /data-icon-source="fill\/ui-layout\/18px_triangle-warning\.svg"/,
  );
});

test("flow break masks the rail before drawing the highlighted node", async () => {
  const section = await getProblemSection();
  const flow = visualMarkup(section, "flow-break", "repeat");
  const rail = flow.indexOf('data-part="flow-rail-done"');
  const mask = flow.indexOf('data-part="flow-node-break-mask"');
  const node = flow.indexOf('data-part="flow-node-break"');
  const css = await getMotionCss();

  assert.ok(rail >= 0 && mask > rail && node > mask);
  assert.match(css, /\.flowNodeBreakMask\s*{[^}]*fill:\s*var\(--pv-surface\)/s);
});

test("repeat visual renders one highlighted task among six identical task items", async () => {
  const section = await getProblemSection();
  const repeat = visualMarkup(section, "repeat", "cross-tool");

  assert.equal((repeat.match(/data-role="repeat-item"/g) ?? []).length, 6);
  assert.equal((repeat.match(/data-state="highlighted"/g) ?? []).length, 1);
});

test("cross-tool visual contains exactly two tools and one transferred task", async () => {
  const section = await getProblemSection();
  const crossTool = visualMarkup(section, "cross-tool", "guidance-gap");

  assert.equal((crossTool.match(/data-role="tool-panel"/g) ?? []).length, 2);
  assert.equal((crossTool.match(/data-role="transferred-task"/g) ?? []).length, 1);
  assert.equal(
    (crossTool.match(
      /data-icon-source="fill\/arrows\/18px_caret-right\.svg"/g,
    ) ?? []).length,
    2,
  );
});

test("cross-tool uses separate upper forward and lower return routes", async () => {
  const section = await getProblemSection();
  const crossTool = visualMarkup(section, "cross-tool", "guidance-gap");

  assert.match(
    crossTool,
    /data-part="forward-path"[^>]*d="M78 26H158"/,
  );
  assert.match(
    crossTool,
    /data-part="return-path"[^>]*d="M162 74H82"/,
  );
  assert.match(crossTool, /data-part="forward-arrow"/);
  assert.match(crossTool, /data-part="return-arrow"/);
});

test("guidance visual branches from the Nucleo circular question icon", async () => {
  const section = await getProblemSection();
  const guidance = visualMarkup(section, "guidance-gap");

  assert.match(guidance, /data-shape="circle"/);
  assert.match(
    guidance,
    /data-icon-source="outline-duo\/ui-layout\/18px_circle-question\.svg"/,
  );
  assert.match(
    guidance,
    /data-icon-source="fill\/ui-layout\/18px_triangle-warning\.svg"/,
  );
  assert.match(
    guidance,
    /data-icon-source="fill\/ui-layout\/18px_circle-check\.svg"/,
  );
});

test("guidance hides the moving circle while the warning icon is visible", async () => {
  const css = await getMotionCss();
  const opacity = keyframesBlock(css, "guidanceOpacity");
  const warning = keyframesBlock(css, "guidanceWarning");

  assert.match(
    opacity,
    /52%,\s*62%\s*{[^}]*opacity:\s*0;/s,
  );
  assert.match(warning, /0%,\s*46%\s*{[^}]*opacity:\s*0;/s);
  assert.match(warning, /49%,\s*55%\s*{[^}]*opacity:\s*1;/s);
  assert.match(warning, /60%,\s*100%\s*{[^}]*opacity:\s*0;/s);
});

test("guidance resets both path segments only while the moving circle is hidden", async () => {
  const css = await getMotionCss();
  const progress = keyframesBlock(css, "guidanceProgress");
  const opacity = keyframesBlock(css, "guidanceOpacity");

  assert.match(
    progress,
    /0%,\s*6%\s*{[^}]*translate\(0, 0\)/s,
  );
  assert.doesNotMatch(progress, /\bopacity\s*:/);
  assert.match(
    opacity,
    /0%\s*{[^}]*opacity:\s*0;/s,
  );
  assert.match(
    progress,
    /52\.01%,\s*62%\s*{[^}]*translate\(74px, 0\)/s,
  );
  assert.match(
    progress,
    /84%,\s*96%\s*{[^}]*translate\(191px, 29px\)/s,
  );
  assert.match(
    progress,
    /96\.01%,\s*100%\s*{[^}]*translate\(0, 0\)/s,
  );
  assert.match(opacity, /52%,\s*62%\s*{[^}]*opacity:\s*0;/s);
  assert.match(opacity, /96%,\s*100%\s*{[^}]*opacity:\s*0;/s);
  assert.doesNotMatch(opacity, /\btransform\s*:/);
});

test("problem visuals stay static and expose independently addressable parts", async () => {
  const section = await getProblemSection();

  assert.doesNotMatch(section, /<(?:animate|animateMotion|animateTransform)\b/);
  assert.doesNotMatch(section, /style="[^"]*(?:animation|transition):/);
  assert.ok(
    (section.match(/data-part=/g) ?? []).length >= 30,
    "paths, nodes, icons, panels, and task items must remain separately addressable",
  );
});
