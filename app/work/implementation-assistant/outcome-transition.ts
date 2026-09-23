export const OUTCOME_PACING = {
  sceneViewports: 3,
  designHeight: 1024,
  holdEnd: 0.28,
  exitEnd: 0.46,
  darkenEnd: 0.6,
  clearEnd: 0.68,
  enterEnd: 0.94,
} as const;

export type OutcomeFrame = {
  background: number;
  outgoingOpacity: number;
  outgoingY: number;
  incomingOpacity: number;
  incomingY: number;
};

function smoothstep(value: number) {
  const progress = Math.min(1, Math.max(0, value));
  return progress * progress * (3 - 2 * progress);
}

function segment(value: number, from: number, to: number) {
  if (to <= from) return value >= to ? 1 : 0;
  return Math.min(1, Math.max(0, (value - from) / (to - from)));
}

/** OLD OUT → background darkens → CLEAR DARK → NEW IN，两屏内容不交叉淡入淡出。 */
export function getOutcomeFrame(progress: number): OutcomeFrame {
  const value = Math.min(1, Math.max(0, progress));
  const exit = smoothstep(segment(value, OUTCOME_PACING.holdEnd, OUTCOME_PACING.exitEnd));
  const darken = smoothstep(segment(value, OUTCOME_PACING.exitEnd, OUTCOME_PACING.darkenEnd));
  const enter = smoothstep(segment(value, OUTCOME_PACING.clearEnd, OUTCOME_PACING.enterEnd));

  return {
    background: darken,
    outgoingOpacity: 1 - exit,
    outgoingY: -28 * exit,
    incomingOpacity: enter,
    incomingY: 24 * (1 - enter),
  };
}

export function getOutcomeSceneHeight(viewportHeight: number) {
  const height = Math.max(1, viewportHeight);
  return height * OUTCOME_PACING.sceneViewports;
}

export function getOutcomeScale(viewportHeight: number) {
  const height = Math.max(1, viewportHeight);
  return Math.min(1, height / Math.max(OUTCOME_PACING.designHeight, height));
}
