"use client";

import { scrollToSection } from "./story/scroll-to-section";
import styles from "./hero-cta.module.css";

/** Hero 左下 CTA：平滑滚动到 Selected Work 的可读阶段（hold 起点）。 */
export default function HeroCta() {
  return (
    <button
      type="button"
      className={styles.cta}
      onClick={() => scrollToSection("work")}
    >
      <span>先看作品</span>
      <span className={styles.arrow} aria-hidden="true">
        ↗
      </span>
    </button>
  );
}
