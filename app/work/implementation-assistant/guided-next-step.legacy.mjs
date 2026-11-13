import assert from "node:assert/strict";
import test from "node:test";

let model = null;

try {
  model = await import("./guided-next-step.ts");
} catch {
  // The first TDD run intentionally reaches this branch before implementation.
}

test("guided-next-step model exists", () => {
  assert.ok(model, "guided-next-step.ts must provide the scroll model");
});

test("scroll budget gives 03/07 a separate 60vh reading hold before the compact bridge", () => {
  assert.equal(typeof model.getScrollDistances, "function");
  assert.deepEqual(model.getScrollDistances(1000), {
    readingHoldTravel: 600,
    bridgeTravel: 900,
    sceneTravel: 2600,
    totalTravel: 4100,
    motionHeight: 5100,
  });
});

test("scroll progress does not enter the bridge until the independent reading hold ends", () => {
  assert.equal(typeof model.getScrollProgresses, "function");

  assert.deepEqual(model.getScrollProgresses(0, 1000, 4100), {
    bridgeProgress: 0,
    sceneProgress: 0,
  });
  assert.deepEqual(model.getScrollProgresses(599, 1000, 4100), {
    bridgeProgress: 0,
    sceneProgress: 0,
  });
  assert.deepEqual(model.getScrollProgresses(600, 1000, 4100), {
    bridgeProgress: 0,
    sceneProgress: 0,
  });

  const bridgeStarted = model.getScrollProgresses(601, 1000, 4100);
  assert.ok(bridgeStarted.bridgeProgress > 0);
  assert.equal(bridgeStarted.sceneProgress, 0);

  assert.deepEqual(model.getScrollProgresses(1500, 1000, 4100), {
    bridgeProgress: 1,
    sceneProgress: 0,
  });
});

test("scene progress maps to four stable phase ranges", () => {
  assert.deepEqual(
    [0, 0.079, 0.307, 0.386, 0.614, 0.693, 0.92, 1].map(
      (progress) => model.getSceneFrame(progress).phaseIndex,
    ),
    [0, 0, 1, 1, 2, 2, 3, 3],
  );
});

test("phone transforms stay continuous across phase boundaries", () => {
  const epsilon = 0.00001;

  for (const boundary of [0.3066666667, 0.6133333333, 0.92]) {
    const before = model.getSceneFrame(boundary - epsilon).phone;
    const after = model.getSceneFrame(boundary + epsilon).phone;

    assert.ok(Math.abs(before.scale - after.scale) < 0.01);
    assert.ok(Math.abs(before.x - after.x) < 0.1);
    assert.ok(Math.abs(before.y - after.y) < 0.1);
  }
});

test("phone motion occupies the broad scene transition instead of a narrow boundary window", () => {
  const keyframeOne = model.PHONE_KEYFRAMES[1].scale;
  const keyframeTwo = model.PHONE_KEYFRAMES[2].scale;
  const early = model.getSceneFrame(0.43).phone.scale;
  const late = model.getSceneFrame(0.57).phone.scale;

  assert.ok(early < keyframeOne && early > keyframeTwo);
  assert.ok(late < keyframeOne && late > keyframeTwo);
});

test("full-screen transitions exit, clear, then enter without overlapping", () => {
  const transitions = [
    { outgoing: 0.13, clear: 0.193, incoming: 0.257 },
    { outgoing: 0.437, clear: 0.5, incoming: 0.563 },
    { outgoing: 0.743, clear: 0.807, incoming: 0.87 },
  ];

  transitions.forEach((sample, outgoingIndex) => {
    const outgoing = model.getSceneFrame(sample.outgoing).phaseWeights;
    const clear = model.getSceneFrame(sample.clear).phaseWeights;
    const incoming = model.getSceneFrame(sample.incoming).phaseWeights;

    assert.ok(outgoing[outgoingIndex] > 0 && outgoing[outgoingIndex] < 1);
    assert.equal(outgoing[outgoingIndex + 1], 0);
    assert.deepEqual(clear, [0, 0, 0, 0]);
    assert.equal(incoming[outgoingIndex], 0);
    assert.ok(incoming[outgoingIndex + 1] > 0 && incoming[outgoingIndex + 1] < 1);
  });

  for (let step = 0; step <= 1000; step += 1) {
    const visibleScreens = model
      .getSceneFrame(step / 1000)
      .phaseWeights.filter((weight) => weight > 0.1);

    assert.ok(visibleScreens.length <= 1);
  }
});

test("copy transitions exit, clear, then enter without overlapping", () => {
  const transitions = [
    { outgoing: 0.13, clear: 0.193, incoming: 0.257 },
    { outgoing: 0.437, clear: 0.5, incoming: 0.563 },
    { outgoing: 0.743, clear: 0.807, incoming: 0.87 },
  ];

  transitions.forEach((sample, outgoingIndex) => {
    const outgoing = model.getSceneFrame(sample.outgoing).copyWeights;
    const clear = model.getSceneFrame(sample.clear).copyWeights;
    const incoming = model.getSceneFrame(sample.incoming).copyWeights;

    assert.ok(outgoing[outgoingIndex] > 0 && outgoing[outgoingIndex] < 1);
    assert.equal(outgoing[outgoingIndex + 1], 0);
    assert.deepEqual(clear, [0, 0, 0, 0]);
    assert.equal(incoming[outgoingIndex], 0);
    assert.ok(incoming[outgoingIndex + 1] > 0 && incoming[outgoingIndex + 1] < 1);
  });

  for (let step = 0; step <= 1000; step += 1) {
    const visibleCopyLayers = model
      .getSceneFrame(step / 1000)
      .copyWeights.filter((weight) => weight > 0.1);

    assert.ok(visibleCopyLayers.length <= 1);
  }
});

test("scrub smoothing limits a full progress jump and reverses without overshoot", () => {
  assert.equal(typeof model.stepScrubbedProgress, "function");

  assert.ok(Math.abs(model.stepScrubbedProgress(0, 1, 0.016) - 0.02) < 0.000001);
  assert.ok(Math.abs(model.stepScrubbedProgress(1, 0, 0.016) - 0.98) < 0.000001);
  assert.equal(model.stepScrubbedProgress(0.96, 1, 0.08), 1);
  assert.equal(model.stepScrubbedProgress(0.04, 0, 0.08), 0);
});

test("scrub smoothing caps an idle frame gap instead of jumping across the bridge", () => {
  const expectedFirstStep = (1 / 30) / 0.8;

  assert.ok(
    Math.abs(model.stepScrubbedProgress(0, 1, 1) - expectedFirstStep) <
      0.000001,
  );
});

test("bridge endpoints match the outgoing light scene and incoming phase one", () => {
  assert.deepEqual(model.getBridgeFrame(0), {
    background: [255, 255, 255],
    oldOpacity: 1,
    oldY: 0,
    newOpacity: 0,
    newY: 24,
    phoneScale: 0.92,
  });

  assert.deepEqual(model.getBridgeFrame(1), {
    background: [17, 17, 19],
    oldOpacity: 0,
    oldY: -24,
    newOpacity: 1,
    newY: 0,
    phoneScale: 1,
  });
});

test("bridge inserts a clear-black interval and never overlaps old and new content", () => {
  const bridgeStart = model.getBridgeFrame(0);
  const oldExiting = model.getBridgeFrame(0.04);
  const oldGone = model.getBridgeFrame(0.22);
  const darkening = model.getBridgeFrame(0.38);
  const clearBlack = model.getBridgeFrame(0.58);
  const incomingStart = model.getBridgeFrame(0.62);
  const incoming = model.getBridgeFrame(0.78);
  const settled = model.getBridgeFrame(0.94);

  assert.equal(bridgeStart.oldOpacity, 1);
  assert.deepEqual(bridgeStart.background, [255, 255, 255]);
  assert.ok(oldExiting.oldOpacity > 0 && oldExiting.oldOpacity < 1);
  assert.deepEqual(oldExiting.background, [255, 255, 255]);
  assert.equal(oldGone.oldOpacity, 0);
  assert.equal(oldGone.newOpacity, 0);
  assert.deepEqual(oldGone.background, [255, 255, 255]);
  assert.equal(darkening.oldOpacity, 0);
  assert.equal(darkening.newOpacity, 0);
  assert.ok(darkening.background[0] < 255 && darkening.background[0] > 17);
  assert.deepEqual(clearBlack.background, [17, 17, 19]);
  assert.equal(clearBlack.oldOpacity, 0);
  assert.equal(clearBlack.newOpacity, 0);
  assert.equal(incomingStart.newOpacity, 0);
  assert.ok(incoming.newOpacity > 0 && incoming.newOpacity < 1);
  assert.equal(settled.newOpacity, 1);

  for (let step = 0; step <= 100; step += 1) {
    const frame = model.getBridgeFrame(step / 100);
    if (frame.oldOpacity > 0.1) assert.equal(frame.newOpacity, 0);
    if (frame.newOpacity > 0.1) assert.equal(frame.oldOpacity, 0);
  }
});

test("the approved mockup and exact uploaded screens use formal asset paths", () => {
  const root = "/cases/implementation-assistant/04-guided-next-step";
  const paths = model.PHASES.flatMap((phase) => [
    phase.screen,
    ...(phase.overlays ?? []).map((overlay) => overlay.src),
  ]);

  assert.equal(
    model.PHONE_MOCKUP_ASSET,
    `${root}/mockup/ia-04-phone-mockup-transparent.png`,
  );
  assert.ok(paths.every((path) => path.startsWith(`${root}/screens/`)));
  assert.ok(paths.every((path) => !path.includes("/references/")));
  assert.deepEqual(
    model.PHASES.map((phase) => phase.screen),
    [
      `${root}/screens/ia-04-phase-01-screen.png`,
      `${root}/screens/ia-04-phase-02-screen.png`,
      `${root}/screens/ia-04-phase-03-screen-base.png`,
      `${root}/screens/ia-04-phase-04-screen.png`,
    ],
  );
  assert.equal(model.PHASES[2].overlays.length, 5);
});

test("phone viewport derives from the approved mockup and screen exports", () => {
  assert.deepEqual(model.PHONE_VIEWPORT, {
    left: 65 / 1257,
    top: 54 / 2561,
    width: 1125 / 1257,
    height: 2436 / 2561,
  });
});

test("screen image fit crops the transparent export edge on top, right, and bottom", () => {
  assert.deepEqual(model.SCREEN_IMAGE_FIT, {
    leftPercent: 0,
    topPercent: -0.12345679012345678,
    widthPercent: 100.26737967914439,
    heightPercent: 100.24691358024691,
  });
});

test("phase one and two share the corrected Figma phone composition", () => {
  assert.deepEqual(model.PHONE_KEYFRAMES[0], model.PHONE_KEYFRAMES[1]);
  assert.ok(Math.abs(model.PHONE_KEYFRAMES[0].scale - 628.425 / 327.6263122558594) < 0.000001);
  assert.deepEqual(model.PHONE_KEYFRAMES[0], {
    scale: 628.425 / 327.6263122558594,
    x: 0,
    y: 0,
  });
  assert.deepEqual(model.PHONE_KEYFRAMES[3], { scale: 1, x: 0, y: -173 });
});
