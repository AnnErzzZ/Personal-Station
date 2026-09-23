"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type MotionState = "idle" | "running" | "paused";

type ProblemMotionScopeProps = {
  children: ReactNode;
  className: string;
};

/**
 * 只负责四张问题卡片的生命周期：进入视口后启动，离开后原地暂停。
 * SVG 本身保持稳定挂载，所有叙事帧均由 CSS 驱动。
 */
export default function ProblemMotionScope({
  children,
  className,
}: ProblemMotionScopeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [motionState, setMotionState] = useState<MotionState>("idle");

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.12) {
          setMotionState("running");
          return;
        }

        setMotionState((current) =>
          current === "idle" ? "idle" : "paused",
        );
      },
      { threshold: [0, 0.12] },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={className}
      data-problem-motion={motionState}
      ref={ref}
    >
      {children}
    </div>
  );
}
