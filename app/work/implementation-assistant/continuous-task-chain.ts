export const SCROLL_PACING = {
  sceneViewports: 2.5,
  scrubSeconds: 0.55,
  maxFrameSeconds: 0.055,
  firstHoldEnd: 0.24,
  firstTransitionEnd: 0.4,
  secondHoldEnd: 0.64,
  secondTransitionEnd: 0.8,
  stateExitPortion: 0.4,
  stateClearPortion: 0.2,
} as const;

export type TaskChainState = {
  index: string;
  title: string;
  body: readonly string[];
};

export const TASK_CHAIN_STATES: readonly TaskChainState[] = [
  {
    index: "01",
    title: "同一个网关，不该连接两次",
    body: [
      "旧流程把 Wi-Fi 配置与组网拆在不同入口里，同一个网关需要反复寻找和连接。",
      "重构后，我把选择、配网、加入局域网和结果反馈接成一条连续链路。",
    ],
  },
  {
    index: "02",
    title: "跨了小程序，任务也别断",
    body: [
      "策略配置属于另一套产品，但现场任务不会因此停止。",
      "产品边界保持不变，用户通过小程序半屏能力从当前上下文进入策略配置，再回到原任务。",
    ],
  },
  {
    index: "03",
    title: "批量执行之后，还要知道做到哪了",
    body: [
      "批量的难点在于提交之后的执行过程与结果。",
      "我把等待、执行、成功、失败和后续处理持续保留下来，让整项任务始终可追踪。",
    ],
  },
] as const;

type SceneSlice =
  | { kind: "stable"; phaseIndex: number }
  | {
      kind: "transition";
      fromIndex: number;
      toIndex: number;
      progress: number;
    };

export type CopyFrame = {
  opacity: number;
  y: number;
};

export type SlotFrame = {
  opacity: number;
  xPercent: number;
};

export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(value: number) {
  const progress = clamp01(value);
  return progress * progress * (3 - 2 * progress);
}

function getSceneSlice(progress: number): SceneSlice {
  const value = clamp01(progress);

  if (value < SCROLL_PACING.firstHoldEnd) {
    return { kind: "stable", phaseIndex: 0 };
  }

  if (value < SCROLL_PACING.firstTransitionEnd) {
    return {
      kind: "transition",
      fromIndex: 0,
      toIndex: 1,
      progress:
        (value - SCROLL_PACING.firstHoldEnd) /
        (SCROLL_PACING.firstTransitionEnd - SCROLL_PACING.firstHoldEnd),
    };
  }

  if (value < SCROLL_PACING.secondHoldEnd) {
    return { kind: "stable", phaseIndex: 1 };
  }

  if (value < SCROLL_PACING.secondTransitionEnd) {
    return {
      kind: "transition",
      fromIndex: 1,
      toIndex: 2,
      progress:
        (value - SCROLL_PACING.secondHoldEnd) /
        (SCROLL_PACING.secondTransitionEnd - SCROLL_PACING.secondHoldEnd),
    };
  }

  return { kind: "stable", phaseIndex: 2 };
}

function getExclusiveCopyFrames(progress: number) {
  const frames: CopyFrame[] = TASK_CHAIN_STATES.map(() => ({
    opacity: 0,
    y: 0,
  }));
  const slice = getSceneSlice(progress);

  if (slice.kind === "stable") {
    frames[slice.phaseIndex] = { opacity: 1, y: 0 };
    return frames;
  }

  const enterStart =
    SCROLL_PACING.stateExitPortion + SCROLL_PACING.stateClearPortion;

  if (slice.progress < SCROLL_PACING.stateExitPortion) {
    const exitProgress = smoothstep(
      slice.progress / SCROLL_PACING.stateExitPortion,
    );
    frames[slice.fromIndex] = {
      opacity: 1 - exitProgress,
      y: -8 * exitProgress,
    };
    return frames;
  }

  if (slice.progress <= enterStart) {
    return frames;
  }

  const enterProgress = smoothstep(
    (slice.progress - enterStart) / (1 - enterStart),
  );
  frames[slice.toIndex] = {
    opacity: enterProgress,
    y: 8 * (1 - enterProgress),
  };
  return frames;
}

function getExclusiveSlotFrames(progress: number) {
  const frames: SlotFrame[] = TASK_CHAIN_STATES.map(() => ({
    opacity: 0,
    xPercent: 110,
  }));
  const slice = getSceneSlice(progress);

  if (slice.kind === "stable") {
    frames[slice.phaseIndex] = { opacity: 1, xPercent: 0 };
    return frames;
  }

  const enterStart =
    SCROLL_PACING.stateExitPortion + SCROLL_PACING.stateClearPortion;

  if (slice.progress < SCROLL_PACING.stateExitPortion) {
    const exitProgress = smoothstep(
      slice.progress / SCROLL_PACING.stateExitPortion,
    );
    frames[slice.fromIndex] = {
      opacity: 1,
      xPercent: -110 * exitProgress,
    };
    return frames;
  }

  if (slice.progress <= enterStart) {
    return frames;
  }

  const enterProgress = smoothstep(
    (slice.progress - enterStart) / (1 - enterStart),
  );
  frames[slice.toIndex] = {
    opacity: 1,
    xPercent: 110 * (1 - enterProgress),
  };
  return frames;
}
export function getTaskChainFrame(progress: number) {
  const value = clamp01(progress);
  const slice = getSceneSlice(value);
  const enterStart =
    SCROLL_PACING.stateExitPortion + SCROLL_PACING.stateClearPortion;
  const phaseIndex =
    slice.kind === "stable"
      ? slice.phaseIndex
      : slice.progress <= enterStart
        ? slice.fromIndex
        : slice.toIndex;
  const copyFrames = getExclusiveCopyFrames(value);
  const slotFrames = getExclusiveSlotFrames(value);

  return {
    progress: value,
    phaseIndex,
    copyFrames,
    slotFrames,
    slotWeights: slotFrames.map((frame) => frame.opacity),
  };
}

export function getScrollDistances(viewportHeight: number) {
  const height = Math.max(1, viewportHeight);
  const sceneTravel = height * SCROLL_PACING.sceneViewports;

  return {
    sceneTravel,
    motionHeight: sceneTravel + height,
  };
}

export function stepScrubbedProgress(
  current: number,
  target: number,
  deltaSeconds: number,
) {
  const from = clamp01(current);
  const to = clamp01(target);
  const frameSeconds = Math.min(
    SCROLL_PACING.maxFrameSeconds,
    Math.max(0, deltaSeconds),
  );
  const maxStep = frameSeconds / SCROLL_PACING.scrubSeconds;
  const distance = to - from;

  if (Math.abs(distance) <= maxStep) {
    return to;
  }

  return from + Math.sign(distance) * maxStep;
}


type ScrollRenderSchedulerOptions = {
  cancelFrame: (frameId: number) => void;
  readTarget: () => number;
  renderFrame: (frameTime: number, targetProgress: number) => boolean;
  requestFrame: (callback: (frameTime: number) => void) => number;
};

export function createScrollRenderScheduler({
  cancelFrame,
  readTarget,
  renderFrame,
  requestFrame,
}: ScrollRenderSchedulerOptions) {
  let frameId: number | null = null;

  const requestUpdate = () => {
    if (frameId !== null) {
      return;
    }

    frameId = requestFrame((frameTime) => {
      frameId = null;
      const shouldContinue = renderFrame(frameTime, readTarget());

      if (shouldContinue) {
        requestUpdate();
      }
    });
  };

  const cancel = () => {
    if (frameId !== null) {
      cancelFrame(frameId);
      frameId = null;
    }
  };

  return { cancel, requestUpdate };
}
