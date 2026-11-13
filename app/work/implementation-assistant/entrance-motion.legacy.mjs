import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PAGE_URL =
  process.env.IMPLEMENTATION_ASSISTANT_URL ??
  "http://127.0.0.1:3000/work/implementation-assistant";

async function getPageHtml() {
  const response = await fetch(PAGE_URL);
  assert.equal(response.status, 200);
  return response.text();
}

function entranceRoot(html, name) {
  const marker = `data-entrance-name="${name}"`;
  const markerIndex = html.indexOf(marker);
  assert.ok(markerIndex >= 0, `${name} must expose an entrance root`);

  const start = html.lastIndexOf("<", markerIndex);
  const nextRoot = html.indexOf('data-entrance-name="', markerIndex + marker.length);
  return html.slice(start, nextRoot >= 0 ? nextRoot : html.length);
}

function openingTag(html, name) {
  const marker = `data-entrance-name="${name}"`;
  const markerIndex = html.indexOf(marker);
  assert.ok(markerIndex >= 0, `${name} must expose an entrance root`);
  return html.slice(html.lastIndexOf("<", markerIndex), html.indexOf(">", markerIndex) + 1);
}

function customProperty(style, name) {
  return style
    .split(";")
    .map((declaration) => declaration.split(":"))
    .find(([property]) => property === name)?.[1];
}

test("the page exposes the approved entrance groups from hero through section 08", async () => {
  const html = await getPageHtml();
  const expectedGroups = [
    "hero-media",
    "hero-copy",
    "section-01-header",
    "section-01-cards",
    "section-02-header",
    "section-02-evidence",
    "section-03-header",
    "section-03-flow",
    "section-04-heading",
    "section-04-static-phase",
    "section-05-motion",
    "section-05-static-header",
    "section-05-static-card",
    "section-06-header",
    "section-06-article",
    "section-07-outcome",
    "section-08-spec",
  ];

  for (const name of expectedGroups) {
    assert.match(html, new RegExp(`data-entrance-name="${name}"`));
  }
});

test("semantic groups use the approved identity, title, support, and evidence order", async () => {
  const html = await getPageHtml();

  for (const name of [
    "hero-copy",
    "section-01-header",
    "section-02-header",
    "section-03-header",
    "section-04-heading",
    "section-05-motion",
    "section-06-header",
    "section-07-outcome",
    "section-08-spec",
  ]) {
    const root = entranceRoot(html, name);
    assert.match(root, /data-entrance-(?:self-)?step="identity"/);
    assert.match(root, /data-entrance-step="title"/);
  }

  assert.match(
    entranceRoot(html, "hero-copy"),
    /data-entrance-step="support"[\s\S]*data-entrance-step="secondary"/,
  );
  assert.match(
    entranceRoot(html, "section-02-evidence"),
    /data-entrance-step="primary"[\s\S]*data-entrance-step="secondary"/,
  );
});

test("repeated evidence uses the restrained 120ms stagger contract", async () => {
  const html = await getPageHtml();
  const projectCards = entranceRoot(html, "section-01-cards");
  const problemEvidence = entranceRoot(html, "section-02-evidence");

  assert.match(
    projectCards,
    /data-entrance-step="primary"[\s\S]*data-entrance-step="stagger-1"[\s\S]*data-entrance-step="stagger-2"/,
  );
  assert.match(
    problemEvidence,
    /data-entrance-step="secondary"[\s\S]*data-entrance-step="stagger-1"[\s\S]*data-entrance-step="stagger-2"[\s\S]*data-entrance-step="stagger-3"/,
  );

  const projectDelays = [
    ...html.matchAll(/data-entrance-repeat="project"[^>]*style="([^"]+)"/g),
  ].map((match) => customProperty(match[1], "--entrance-delay"));
  const problemDelays = [
    ...html.matchAll(/data-motion-card="[^"]+"[^>]*style="([^"]+)"/g),
  ].map((match) => customProperty(match[1], "--entrance-delay"));

  assert.deepEqual(projectDelays, ["420ms", "540ms", "660ms"]);
  assert.deepEqual(problemDelays, ["560ms", "680ms", "800ms", "920ms"]);
});

test("a semantic group owns at most one translate or scale entrance layer", async () => {
  const html = await getPageHtml();

  for (const name of [
    "hero-copy",
    "section-01-header",
    "section-02-header",
    "section-03-header",
    "section-04-static-phase",
    "section-05-static-card",
    "section-06-header",
  ]) {
    assert.doesNotMatch(openingTag(html, name), /data-entrance-self=/);
  }

  for (const name of ["section-07-outcome", "section-08-spec"]) {
    assert.doesNotMatch(
      entranceRoot(html, name),
      /data-entrance-variant="(?:content|fade)"/,
    );
  }
});

test("locked scroll scenes keep their motion hooks while receiving only an entrance shell", async () => {
  const html = await getPageHtml();

  assert.match(html, /data-copy-phase="0"/);
  assert.match(html, /data-visual-phase="0"/);
  assert.match(html, /data-phone="true"|data-phone=""/);
  assert.match(html, /data-task-copy="0"/);
  assert.match(html, /data-task-slot="0"/);
  assert.match(html, /data-task-indicator="0"/);
  assert.match(html, /data-task-sticky-content="true"/);
  assert.match(html, /data-outcome-incoming="true"/);
});

test("section 07 declares desktop-manual sequencing so its hidden transition layer cannot pre-fire", async () => {
  const html = await getPageHtml();
  const outcome = entranceRoot(html, "section-07-outcome");

  assert.match(outcome, /data-entrance-manual="desktop"/);
});

test("manual scroll scenes request a React-owned reveal instead of mutating entrance state", async () => {
  const directory = new URL(".", import.meta.url);
  const sources = await Promise.all([
    readFile(new URL("GuidedNextStep.tsx", directory), "utf8"),
    readFile(new URL("OutcomeTransition.tsx", directory), "utf8"),
  ]);

  for (const source of sources) {
    assert.match(source, /revealEntranceSequence\(incomingEntrance\)/);
    assert.doesNotMatch(source, /dataset\.entranceState\s*=(?!=)/);
  }
});

test("the controller stays visible through the longest staged transition", async () => {
  const directory = new URL(".", import.meta.url);
  const [controller, motionCss] = await Promise.all([
    readFile(new URL("EntranceSequence.tsx", directory), "utf8"),
    readFile(new URL("entrance-motion.module.css", directory), "utf8"),
  ]);
  const html = await getPageHtml();

  const duration = Number(
    motionCss.match(/--entrance-duration:\s*(\d+)ms/)?.[1],
  );
  const settleAfter = Number(
    controller.match(/const SETTLE_AFTER_MS = (\d+);/)?.[1],
  );
  const problemDelays = [
    ...html.matchAll(/data-motion-card="[^"]+"[^>]*style="([^"]+)"/g),
  ].map((match) => Number(customProperty(match[1], "--entrance-delay")?.replace("ms", "")));

  assert.ok(Number.isFinite(duration));
  assert.ok(Number.isFinite(settleAfter));
  assert.equal(Math.max(...problemDelays), 920);
  assert.ok(
    settleAfter >= Math.max(...problemDelays) + duration,
    "settled must not remove transition styles before the longest stagger finishes",
  );
  assert.match(controller, /setTimeout\([\s\S]*SETTLE_AFTER_MS/);
});
