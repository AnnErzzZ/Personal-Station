import assert from "node:assert/strict";
import test from "node:test";

const model = await import("./continuous-task-chain.ts");

test("product evidence slides one state at a time in both scroll directions", () => {
  assert.deepEqual(model.getTaskChainFrame(0).slotFrames, [
    { opacity: 1, xPercent: 0 },
    { opacity: 0, xPercent: 110 },
    { opacity: 0, xPercent: 110 },
  ]);

  const outgoing = model.getTaskChainFrame(0.27).slotFrames;
  assert.equal(outgoing[0].opacity, 1);
  assert.ok(outgoing[0].xPercent < 0);
  assert.equal(outgoing[1].opacity, 0);

  const clear = model.getTaskChainFrame(0.32).slotFrames;
  assert.deepEqual(clear.map((frame) => frame.opacity), [0, 0, 0]);

  const incoming = model.getTaskChainFrame(0.37).slotFrames;
  assert.equal(incoming[0].opacity, 0);
  assert.equal(incoming[1].opacity, 1);
  assert.ok(incoming[1].xPercent > 0);

  assert.deepEqual(
    model.getTaskChainFrame(0.37).slotFrames,
    incoming,
    "the same scroll position must render the same frame when reversing",
  );

  for (let step = 0; step <= 1000; step += 1) {
    const visible = model
      .getTaskChainFrame(step / 1000)
      .slotFrames.filter((frame) => frame.opacity > 0.01);
    assert.ok(visible.length <= 1, `UI overlap at progress ${step / 1000}`);
  }
});

test("indicator changes only when the incoming state starts entering", () => {
  assert.equal(model.getTaskChainFrame(0.32).phaseIndex, 0);
  assert.equal(model.getTaskChainFrame(0.37).phaseIndex, 1);
  assert.equal(model.getTaskChainFrame(0.72).phaseIndex, 1);
  assert.equal(model.getTaskChainFrame(0.77).phaseIndex, 2);
});

test("SSR keeps the chapter header and one persistent card in the same sticky stage", async () => {
  const response = await fetch("http://localhost:3000/work/implementation-assistant");
  assert.equal(response.status, 200);
  const html = await response.text();

  const stickyIndex = html.indexOf('data-task-sticky-stage="true"');
  const headerIndex = html.indexOf('data-task-chapter-header="true"', stickyIndex);
  const cardIndex = html.indexOf('data-stage-card="true"', headerIndex);

  assert.ok(stickyIndex >= 0, "05/07 must expose a persistent sticky stage");
  assert.ok(headerIndex > stickyIndex, "chapter header must live inside the sticky stage");
  assert.ok(cardIndex > headerIndex, "the persistent card must follow the header inside the stage");
});

test("SSR renders all three Figma states from the existing formal 05 assets", async () => {
  const response = await fetch("http://localhost:3000/work/implementation-assistant");
  assert.equal(response.status, 200);
  const html = await response.text();

  const assetGroups = [
    [
      'data-state-evidence="01"',
      "/cases/implementation-assistant/05-task-continuity/state-01-gateway/gateway-discovery.png",
      "/cases/implementation-assistant/05-task-continuity/state-01-gateway/wifi-configuration.png",
      "/cases/implementation-assistant/05-task-continuity/state-01-gateway/device-networking.png",
    ],
    [
      'data-state-evidence="02"',
      "/cases/implementation-assistant/05-task-continuity/state-02-cross-product/workspace-context.png",
      "/cases/implementation-assistant/05-task-continuity/state-02-cross-product/strategy-configuration.png",
      "/cases/implementation-assistant/05-task-continuity/state-02-cross-product/strategy-library.png",
    ],
    [
      'data-state-evidence="03"',
      "/cases/implementation-assistant/05-task-continuity/state-03-batch-feedback/device-add-list.png",
      "/cases/implementation-assistant/05-task-continuity/state-03-batch-feedback/upgrade-queue-complete.png",
      "/cases/implementation-assistant/05-task-continuity/state-03-batch-feedback/upgrade-queue-failed.png",
    ],
  ];

  assetGroups.forEach(([marker, ...assets]) => {
    const markerIndex = html.indexOf(marker);
    assert.ok(markerIndex >= 0, `${marker} must be rendered`);
    assets.forEach((asset) => {
      assert.ok(html.includes(`src="${asset}"`), `${asset} must use the existing formal path`);
    });
  });
});


test("SSR provides post-hold scroll space so the sticky stage can fully leave", async () => {
  const response = await fetch("http://localhost:3000/work/implementation-assistant");
  assert.equal(response.status, 200);
  const html = await response.text();

  const stickyIndex = html.indexOf('data-task-sticky-stage="true"');
  const runwayIndex = html.indexOf('data-task-exit-runway="true"', stickyIndex);

  assert.ok(runwayIndex > stickyIndex, "an exit runway must follow the sticky experience");
});
