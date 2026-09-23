"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import styles from "./reveal-motion.module.css";

type RevealGroupProps = {
  children: ReactNode;
  variant?: "fade" | "content";
  delay?: number;
  className?: string;
};

/**
 * React Bits 参考的等价实现（无第三方依赖）：
 * - Fade Content：https://www.reactbits.dev/get-started/index （Animations / Fade Content）
 * - Animated Content / Scroll Reveal：同文档 Animations 分组
 * 只做一次（once）、只改 opacity 与极小 translateY，元素进入视口即回到 Figma 静态状态。
 */
export default function RevealGroup({
  children,
  variant = "fade",
  delay = 0,
  className,
}: RevealGroupProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // reduced motion 下最终状态由 CSS 直接给出，不注册观察器。
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`${styles.group} ${className ?? ""}`}
      data-revealed={revealed ? "true" : "false"}
      data-reveal-variant={variant}
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
