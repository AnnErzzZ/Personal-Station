"use client";

import styles from "./home-name.module.css";

export const HERO_NAME_ID = "hero-name";
export const HERO_NAME_WRAP_ID = "hero-name-wrap";

/**
 * Hero 左侧主标题（三行堆叠，版式参考作品集 Hero Banner 的左标题区）：
 * - h1 即粒子转场的采样源（#hero-name）：GlyphDustMorph 按 dustTitle 的显式换行
 *   逐行采样，行数、断行、字号、行高必须与这里的 DOM 排版完全一致；
 * - 入场用 clip-path 逐行揭示：字形本身不发生位移，采样矩形在动画全程稳定；
 * - 文字始终可见（旧描边层已随居中姓名版式一起移除）。
 */
export default function HeroName() {
  return (
    <div className={styles.wrap} id={HERO_NAME_WRAP_ID}>
      <h1 className={styles.title} id={HERO_NAME_ID}>
        <span className={styles.line}>Making</span>
        <span className={`${styles.line} ${styles.lineSecond}`}>Complex</span>
        <span className={`${styles.line} ${styles.lineThird}`}>Clear.</span>
      </h1>
    </div>
  );
}
