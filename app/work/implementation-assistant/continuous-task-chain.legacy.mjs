import assert from "node:assert/strict";
import test from "node:test";

let model = null;

try {
  model = await import("./continuous-task-chain.ts");
} catch {
  // The first TDD run intentionally reaches this branch before implementation.
}

test("desktop stage gives the three-state scene 250vh of scroll travel", () => {
  assert.ok(model, "continuous-task-chain.ts must provide the scroll model");
  assert.deepEqual(model.getScrollDistances(900), {
    sceneTravel: 2250,
    motionHeight: 3150,
  });
});

test("reading holds resolve to the intended active state", () => {
  assert.deepEqual(
    [0, 0.239, 0.4, 0.639, 0.8, 1].map(
      (progress) => model.getTaskChainFrame(progress).phaseIndex,
    ),
    [0, 0, 1, 1, 2, 2],
  );
});

test("each transition exits, clears, then enters without copy overlap", () => {
  const transitions = [
    { outgoing: 0.27, clear: 0.32, incoming: 0.37, from: 0, to: 1 },
    { outgoing: 0.67, clear: 0.72, incoming: 0.77, from: 1, to: 2 },
  ];

  transitions.forEach(({ outgoing, clear, incoming, from, to }) => {
    const outgoingFrame = model.getTaskChainFrame(outgoing).copyFrames;
    const clearFrame = model.getTaskChainFrame(clear).copyFrames;
    const incomingFrame = model.getTaskChainFrame(incoming).copyFrames;

    assert.ok(outgoingFrame[from].opacity > 0);
    assert.ok(outgoingFrame[from].y < 0);
    assert.equal(outgoingFrame[to].opacity, 0);
    assert.deepEqual(
      clearFrame.map((frame) => frame.opacity),
      [0, 0, 0],
    );
    assert.equal(incomingFrame[from].opacity, 0);
    assert.ok(incomingFrame[to].opacity > 0);
    assert.ok(incomingFrame[to].y > 0);
  });

  for (let step = 0; step <= 1000; step += 1) {
    const visible = model
      .getTaskChainFrame(step / 1000)
      .copyFrames.filter((frame) => frame.opacity > 0.01);
    assert.ok(visible.length <= 1);
  }
});

test("product slots stay exclusive and identify the same visible state as copy", () => {
  for (let step = 0; step <= 1000; step += 1) {
    const frame = model.getTaskChainFrame(step / 1000);
    const visibleSlots = frame.slotFrames
      .map((slotFrame, index) => ({ index, opacity: slotFrame.opacity }))
      .filter((slotFrame) => slotFrame.opacity > 0.01);
    const visibleCopies = frame.copyFrames
      .map((copyFrame, index) => ({ index, opacity: copyFrame.opacity }))
      .filter((copyFrame) => copyFrame.opacity > 0.01);

    assert.ok(visibleSlots.length <= 1);
    assert.ok(visibleCopies.length <= 1);
    if (visibleSlots.length === 1 && visibleCopies.length === 1) {
      assert.equal(visibleSlots[0].index, visibleCopies[0].index);
    }
  }
});

test("scrub smoothing limits large jumps and reverses without overshoot", () => {
  assert.ok(
    Math.abs(model.stepScrubbedProgress(0, 1, 0.055) - 0.1) < 0.000001,
  );
  assert.ok(
    Math.abs(model.stepScrubbedProgress(1, 0, 0.055) - 0.9) < 0.000001,
  );
  assert.equal(model.stepScrubbedProgress(0.98, 1, 0.055), 1);
  assert.equal(model.stepScrubbedProgress(0.02, 0, 0.055), 0);
});


test("a stopped scroll renderer can be awakened by the next scroll update", () => {
  const queuedFrames = [];
  const renderedTargets = [];
  let targetProgress = 0.1;

  const scheduler = model.createScrollRenderScheduler({
    cancelFrame: () => {},
    readTarget: () => targetProgress,
    renderFrame: (_frameTime, target) => {
      renderedTargets.push(target);
      return false;
    },
    requestFrame: (callback) => {
      queuedFrames.push(callback);
      return queuedFrames.length;
    },
  });

  scheduler.requestUpdate();
  scheduler.requestUpdate();
  assert.equal(queuedFrames.length, 1, "scroll bursts must coalesce to one frame");

  queuedFrames.shift()(16);
  assert.deepEqual(renderedTargets, [0.1]);

  targetProgress = 0.6;
  scheduler.requestUpdate();
  assert.equal(queuedFrames.length, 1, "a later scroll must wake the renderer again");
  queuedFrames.shift()(32);
  assert.deepEqual(renderedTargets, [0.1, 0.6]);
});
