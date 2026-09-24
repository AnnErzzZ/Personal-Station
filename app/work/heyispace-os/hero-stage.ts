/**
 * Hero + 01「空间管理工作台」舞台（主图 + 标题 + 三卡）的编排常量。
 *
 * 这里只放两个组件都要用的量：HeroVisual 量尺寸 / 定吸顶位，
 * Section01ProjectContext 定卡片入场时机。改一处就等于两边同步。
 */

/** 吸顶时主图顶与导航底之间的缝（「保留一点点间距」）。 */
export const HERO_GAP_TOP = 20;

/** 卡片底与视口底之间的呼吸，避免构图贴死底边。 */
export const HERO_GAP_BOTTOM = 24;

/** 主图最小宽度：低于这条线整组放不进一屏，舞台退回流式回退。 */
export const HERO_MIN_WIDTH = 520;

/**
 * 三卡改单栏堆叠的断点（与 page.module.css / sections.module.css 的
 * `max-width: 900px` 同源）。单栏时整组必然超过一屏，入场回到
 * 「卡片组上缘进入视口」的触发。
 */
export const HERO_STACK_BREAKPOINT = 900;

/** 入场回落触发线：卡片组上缘进入视口下 8% 线。 */
export const HERO_FLOW_REVEAL_RATIO = 0.92;

/** 卡片入场判定需要的实测值（全部 px / 布尔，便于单测直接喂数）。 */
export type HeroRevealInput = {
  /** 舞台是不是吸顶态（computed position === "sticky"）。 */
  sticky: boolean;
  /** 舞台顶（getBoundingClientRect().top）与吸顶位（computed top）。 */
  stageTop: number;
  pinnedTop: number;
  /** 卡片组上下缘。 */
  cardsTop: number;
  cardsBottom: number;
  viewportWidth: number;
  viewportHeight: number;
};

/**
 * 三卡是否该入场。
 *
 * 唯一目标是「入场那一刻就是最终构图」：不再有「先出现、再滚一段才落位」
 * 的第二段，也不会为了让卡片落位而把主图顶进导航栏。三个判据：
 *   1. 吸顶（rigid）：舞台顶触到吸顶位 —— 之后整个保持行程里位置不变；
 *   2. 三列 + 矮窗口（整组放不进一屏，流式回退）：卡片完整落在视口内；
 *   3. 单栏堆叠：组上缘进入视口下 8% 线（整组天然高于一屏，逐段读）。
 */
export function heroStageEntered({
  sticky,
  stageTop,
  pinnedTop,
  cardsTop,
  cardsBottom,
  viewportWidth,
  viewportHeight,
}: HeroRevealInput): boolean {
  if (sticky) {
    // 2px 容差吃掉子像素取整，避免落位瞬间抖动。
    return Number.isFinite(pinnedTop) && stageTop <= pinnedTop + 2;
  }
  if (viewportWidth > HERO_STACK_BREAKPOINT) {
    return cardsBottom <= viewportHeight - HERO_GAP_BOTTOM;
  }
  return cardsTop <= viewportHeight * HERO_FLOW_REVEAL_RATIO;
}
