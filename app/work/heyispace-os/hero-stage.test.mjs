/**
 * 首屏 + 01 舞台的入场判定单测（hero-stage.ts 的 heroStageEntered）。
 *
 * 守住的语义：入场那一刻卡片已经在最终位置 —— 吸顶档按「落位线」，
 * 矮窗口三列按「完整落位」，单栏堆叠按「组上缘进视口」。
 * 用法：node --test app/work/heyispace-os/hero-stage.test.mjs
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  heroStageEntered,
  HERO_FLOW_REVEAL_RATIO,
  HERO_GAP_BOTTOM,
  HERO_GAP_TOP,
  HERO_MIN_WIDTH,
  HERO_STACK_BREAKPOINT,
} from "./hero-stage.ts";

const base = {
  sticky: true,
  stageTop: 82,
  pinnedTop: HERO_GAP_TOP + 62,
  cardsTop: 970,
  cardsBottom: 1237,
  viewportWidth: 1440,
  viewportHeight: 900,
};

test("吸顶档：落位前不入场，落位那一刻入场", () => {
  assert.equal(heroStageEntered({ ...base, stageTop: base.pinnedTop + 40 }), false);
  assert.equal(heroStageEntered({ ...base, stageTop: base.pinnedTop }), true);
  // 2px 容差：子像素取整不至于让落位瞬间抖一下。
  assert.equal(heroStageEntered({ ...base, stageTop: base.pinnedTop + 2 }), true);
  assert.equal(heroStageEntered({ ...base, stageTop: base.pinnedTop + 2.5 }), false);
});

test("吸顶档：吸顶位读不到（NaN）时不入场，不会误触发", () => {
  assert.equal(heroStageEntered({ ...base, pinnedTop: Number.NaN }), false);
});

test("吸顶档：入场只由落位决定，与卡片是否已进视口无关", () => {
  // 高视口（卡片早就在视口里，但舞台还没落位）→ 仍然不入场，
  // 否则又会出现「先出现、再滚一段才落位」的两段式。
  const tall = { ...base, viewportHeight: 1600, cardsTop: 900, cardsBottom: 1200 };
  assert.equal(heroStageEntered({ ...tall, stageTop: base.pinnedTop + 200 }), false);
  assert.equal(heroStageEntered({ ...tall, stageTop: base.pinnedTop }), true);
});

test("矮窗口三列（流式回退）：卡片完整落位才入场", () => {
  const flow = { ...base, sticky: false, viewportHeight: 650, cardsTop: 400, cardsBottom: 626 };
  assert.equal(heroStageEntered(flow), true);
  assert.equal(
    heroStageEntered({ ...flow, cardsBottom: flow.viewportHeight - HERO_GAP_BOTTOM + 1 }),
    false,
  );
});

test("单栏堆叠：组上缘进视口下 8% 线入场", () => {
  const mobile = {
    ...base,
    sticky: false,
    viewportWidth: HERO_STACK_BREAKPOINT,
    viewportHeight: 844,
    cardsTop: 994,
    cardsBottom: 1505,
  };
  const line = mobile.viewportHeight * HERO_FLOW_REVEAL_RATIO;
  assert.equal(heroStageEntered({ ...mobile, cardsTop: line }), true);
  assert.equal(heroStageEntered({ ...mobile, cardsTop: line + 1 }), false);
});

test("断点边界：>900 走三列判据，≤900 走堆叠判据", () => {
  const shared = {
    ...base,
    sticky: false,
    viewportHeight: 844,
    cardsTop: 700,
    cardsBottom: 1400,
  };
  // 三列档：卡片底在视口外 → 不入场。
  assert.equal(heroStageEntered({ ...shared, viewportWidth: HERO_STACK_BREAKPOINT + 1 }), false);
  // 堆叠档：同样几何下按组上缘判定 → 已过线 → 入场。
  assert.equal(heroStageEntered({ ...shared, viewportWidth: HERO_STACK_BREAKPOINT }), true);
});

test("常量自身：吸顶缝、底呼吸、最小宽度都在合理区间", () => {
  assert.equal(HERO_GAP_TOP, 20);
  assert.equal(HERO_GAP_BOTTOM, 24);
  assert.ok(HERO_MIN_WIDTH >= 480 && HERO_MIN_WIDTH <= 720);
});
