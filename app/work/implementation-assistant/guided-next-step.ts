export type GuidedPhase = {
  index: string;
  title: string;
  body: readonly string[];
  screen: string;
  overlays?: readonly GuidedOverlay[];
};

export type GuidedOverlay = {
  src: string;
  left: number;
  top: number;
  width: number;
  aspectRatio: number;
};

const assetBase = "/cases/implementation-assistant/04-guided-next-step";
const screenBase = `${assetBase}/screens`;

export const PHONE_MOCKUP_ASSET =
  `${assetBase}/mockup/ia-04-phone-mockup-transparent.png`;

export const PHONE_VIEWPORT = {
  left: 65 / 1257,
  top: 54 / 2561,
  width: 1125 / 1257,
  height: 2436 / 2561,
} as const;

export const SCREEN_IMAGE_FIT = {
  leftPercent: 0,
  topPercent: (-3 / 2430) * 100,
  widthPercent: (1125 / 1122) * 100,
  heightPercent: (2436 / 2430) * 100,
} as const;

export const PHASES: readonly GuidedPhase[] = [
  {
    index: "01",
    title: "上层没建，就不让用户猜下一步",
    body: [
      "建筑、楼层、区域、网络和分组之间存在真实的业务依赖。重构的重点，是让这些既有依赖在产品里变得可见。",
      "当上层对象缺失时，系统直接指出当前缺少什么，并把对应的创建入口放在当前任务中；实施人员留在原页面就能补齐。",
    ],
    screen: `${screenBase}/ia-04-phase-01-screen.png`,
  },
  {
    index: "02",
    title: "没有网关，就先把网关补上",
    body: [
      "一些现场操作属于硬前置条件：缺少前置对象时，继续操作不会产生有效结果。",
      "例如当前网络还没有必要网关时，产品会在当前任务上下文中持续提示，并直接提供添加网关入口。用户不需要等到后面的设备配置失败，才回头寻找问题。",
    ],
    screen: `${screenBase}/ia-04-phase-02-screen.png`,
  },
  {
    index: "03",
    title: "别把问题留到调试和验收阶段",
    body: [
      "现场实施里更麻烦的情况是问题出现得太晚。设备版本过低、传感器漏绑、设备掉线等状态，如果直到调试或验收时才发现，就意味着重新定位对象、重新操作，甚至可能需要重新回到现场。",
      "因此我把这些状态从“后面再查的问题”变成当前任务里的持续提醒：先汇总异常，再进入异常列表，最后直接定位到具体设备继续处理。",
    ],
    screen: `${screenBase}/ia-04-phase-03-screen-base.png`,
    overlays: [
      {
        src: `${screenBase}/ia-04-phase-03-alert.png`,
        left: 1.78,
        top: 145.61,
        width: 282.76,
        aspectRatio: 1109 / 224,
      },
      {
        src: `${screenBase}/ia-04-phase-03-device-upgrade.png`,
        left: 41.78,
        top: 246.4,
        width: 282.76,
        aspectRatio: 1109 / 251,
      },
      {
        src: `${screenBase}/ia-04-phase-03-device-sensor-unbound.png`,
        left: 1.78,
        top: 300.31,
        width: 282.76,
        aspectRatio: 1109 / 251,
      },
      {
        src: `${screenBase}/ia-04-phase-03-device-offline.png`,
        left: 41.78,
        top: 354.22,
        width: 282.76,
        aspectRatio: 1109 / 251,
      },
      {
        src: `${screenBase}/ia-04-phase-03-device-radar-unbound.png`,
        left: 1.78,
        top: 408.14,
        width: 282.76,
        aspectRatio: 1109 / 251,
      },
    ],
  },
  {
    index: "04",
    title: "退出前，确认没有遗漏",
    body: [
      "现场配置通常还有收尾动作：如果已经修改了绑定关系，却在离开当前任务前忘记保存，问题可能会被带到后续调试阶段。",
      "因此，当用户带着未保存修改退出时，产品会再次提醒，让他选择继续处理或确认离开，把容易被忽略的收尾动作变成明确的防错节点。",
    ],
    screen: `${screenBase}/ia-04-phase-04-screen.png`,
  },
] as const;

export const PHONE_KEYFRAMES = [
  { scale: 628.425 / 327.6263122558594, x: 0, y: 0 },
  { scale: 628.425 / 327.6263122558594, x: 0, y: 0 },
  { scale: 1, x: 0, y: 0 },
  { scale: 1, x: 0, y: -173 },
] as const;

export const SCROLL_PACING = {
  readingHoldViewports: 0.6,
  bridgeViewports: 0.9,
  sceneViewports: 2.6,
  scrubSeconds: 0.8,
  maxFrameSeconds: 1 / 30,
  phaseStableProgress: 0.08,
  phaseTransitionProgress: (1 - 0.08 * 4) / 3,
  stateExitPortion: 0.44,
  stateClearPortion: 0.12,
  bridge: {
    oldExitEnd: 0.22,
    colorEnd: 0.54,
    clearEnd: 0.62,
    incomingEnd: 0.94,
  },
} as const;

export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(value: number) {
  const progress = clamp01(value);
  return progress * progress * (3 - 2 * progress);
}

function mix(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}

function progressBetween(value: number, start: number, end: number) {
  return smoothstep((value - start) / (end - start));
}

type SceneSlice =
  | { kind: "stable"; phaseIndex: number }
  | {
      kind: "transition";
      fromIndex: number;
      toIndex: number;
      progress: number;
    };

function getSceneSlice(progress: number): SceneSlice {
  const value = clamp01(progress);
  let cursor = 0;

  for (let phaseIndex = 0; phaseIndex < PHASES.length; phaseIndex += 1) {
    const stableEnd = cursor + SCROLL_PACING.phaseStableProgress;

    if (value < stableEnd || phaseIndex === PHASES.length - 1) {
      return { kind: "stable", phaseIndex };
    }

    const transitionEnd = stableEnd + SCROLL_PACING.phaseTransitionProgress;

    if (value < transitionEnd) {
      return {
        kind: "transition",
        fromIndex: phaseIndex,
        toIndex: phaseIndex + 1,
        progress: clamp01(
          (value - stableEnd) / SCROLL_PACING.phaseTransitionProgress,
        ),
      };
    }

    cursor = transitionEnd;
  }

  return { kind: "stable", phaseIndex: PHASES.length - 1 };
}

function getExclusiveStateWeights(progress: number) {
  const weights = Array.from({ length: PHASES.length }, () => 0);
  const slice = getSceneSlice(progress);

  if (slice.kind === "stable") {
    weights[slice.phaseIndex] = 1;
    return weights;
  }

  const exitEnd = SCROLL_PACING.stateExitPortion;
  const enterStart = exitEnd + SCROLL_PACING.stateClearPortion;

  if (slice.progress < exitEnd) {
    weights[slice.fromIndex] =
      1 - progressBetween(slice.progress, 0, exitEnd);
    return weights;
  }

  if (slice.progress <= enterStart) {
    return weights;
  }

  weights[slice.toIndex] = progressBetween(
    slice.progress,
    enterStart,
    1,
  );
  return weights;
}

function getPhoneTransform(progress: number) {
  const slice = getSceneSlice(progress);

  if (slice.kind === "stable") {
    return PHONE_KEYFRAMES[slice.phaseIndex];
  }

  return interpolatePhone(
    slice.fromIndex,
    slice.toIndex,
    smoothstep(slice.progress),
  );
}

function interpolatePhone(fromIndex: number, toIndex: number, progress: number) {
  const from = PHONE_KEYFRAMES[fromIndex];
  const to = PHONE_KEYFRAMES[toIndex];

  return {
    scale: mix(from.scale, to.scale, progress),
    x: mix(from.x, to.x, progress),
    y: mix(from.y, to.y, progress),
  };
}

export function getScreenWeights(count: number, phaseProgress: number) {
  if (count <= 1) {
    return [1];
  }

  const value = clamp01(phaseProgress) * (count - 1);
  const from = Math.min(count - 1, Math.floor(value));
  const to = Math.min(count - 1, from + 1);
  const transition = smoothstep(value - from);
  const weights = Array.from({ length: count }, () => 0);

  weights[from] = 1 - transition;
  weights[to] += transition;
  return weights;
}

export function getSceneFrame(progress: number) {
  const value = clamp01(progress);
  const slice = getSceneSlice(value);
  const phaseIndex =
    slice.kind === "stable"
      ? slice.phaseIndex
      : slice.progress < 0.5
        ? slice.fromIndex
        : slice.toIndex;
  const phaseProgress = slice.kind === "transition" ? slice.progress : 0;

  return {
    progress: value,
    phaseIndex,
    phaseProgress,
    phaseWeights: getExclusiveStateWeights(value),
    copyWeights: getExclusiveStateWeights(value),
    phone: getPhoneTransform(value),
  };
}

export function getBridgeFrame(progress: number) {
  const value = clamp01(progress);
  const oldProgress = progressBetween(
    value,
    0,
    SCROLL_PACING.bridge.oldExitEnd,
  );
  const colorProgress = progressBetween(
    value,
    SCROLL_PACING.bridge.oldExitEnd,
    SCROLL_PACING.bridge.colorEnd,
  );
  const newProgress = progressBetween(
    value,
    SCROLL_PACING.bridge.clearEnd,
    SCROLL_PACING.bridge.incomingEnd,
  );

  return {
    background: [
      Math.round(mix(255, 17, colorProgress)),
      Math.round(mix(255, 17, colorProgress)),
      Math.round(mix(255, 19, colorProgress)),
    ],
    oldOpacity: 1 - oldProgress,
    oldY: mix(0, -24, oldProgress),
    newOpacity: newProgress,
    newY: mix(24, 0, newProgress),
    phoneScale: mix(0.92, 1, newProgress),
  };
}

export function getScrollDistances(viewportHeight: number) {
  const height = Math.max(1, viewportHeight);
  const readingHoldTravel = height * SCROLL_PACING.readingHoldViewports;
  const bridgeTravel = height * SCROLL_PACING.bridgeViewports;
  const sceneTravel = height * SCROLL_PACING.sceneViewports;
  const totalTravel = readingHoldTravel + bridgeTravel + sceneTravel;

  return {
    readingHoldTravel,
    bridgeTravel,
    sceneTravel,
    totalTravel,
    motionHeight: totalTravel + height,
  };
}

export function getScrollProgresses(
  travelled: number,
  viewportHeight: number,
  totalTravel = getScrollDistances(viewportHeight).totalTravel,
) {
  const plannedDistances = getScrollDistances(viewportHeight);
  const availableTravel = Math.max(1, totalTravel);
  const currentTravel = Math.min(
    availableTravel,
    Math.max(0, travelled),
  );
  const readingHoldTravel = Math.min(
    plannedDistances.readingHoldTravel,
    availableTravel,
  );
  const travelAfterHold = Math.max(0, availableTravel - readingHoldTravel);
  const bridgeTravel = Math.min(
    plannedDistances.bridgeTravel,
    travelAfterHold,
  );
  const sceneTravel = Math.max(1, travelAfterHold - bridgeTravel);

  return {
    bridgeProgress: clamp01(
      (currentTravel - readingHoldTravel) / Math.max(1, bridgeTravel),
    ),
    sceneProgress: clamp01(
      (currentTravel - readingHoldTravel - bridgeTravel) / sceneTravel,
    ),
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
