"use client";

import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import styles from "./gradient-text.module.css";

type GradientDirection = "horizontal" | "vertical" | "diagonal";

type GradientTextProps = {
  children: ReactNode;
  className?: string;
  colors?: string[];
  animationSpeed?: number;
  direction?: GradientDirection;
  pauseOnHover?: boolean;
  yoyo?: boolean;
  showBorder?: boolean;
};

const DEFAULT_COLORS = ["#5227FF", "#FF9FFC", "#B497CF"];

export default function GradientText({
  children,
  className = "",
  colors = DEFAULT_COLORS,
  animationSpeed = 8,
  direction = "horizontal",
  pauseOnHover = false,
  yoyo = true,
  showBorder = false,
}: GradientTextProps) {
  const [isPaused, setIsPaused] = useState(false);
  const progress = useMotionValue(0);
  const prefersReducedMotion = useReducedMotion();
  const elapsedRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const animationDuration = Math.max(animationSpeed, 0.1) * 1000;

  useAnimationFrame((time) => {
    if (isPaused || prefersReducedMotion) {
      lastTimeRef.current = null;
      return;
    }

    if (lastTimeRef.current === null) {
      lastTimeRef.current = time;
      return;
    }

    elapsedRef.current += time - lastTimeRef.current;
    lastTimeRef.current = time;

    if (yoyo) {
      const fullCycle = animationDuration * 2;
      const cycleTime = elapsedRef.current % fullCycle;
      const nextProgress =
        cycleTime < animationDuration
          ? (cycleTime / animationDuration) * 100
          : 100 - ((cycleTime - animationDuration) / animationDuration) * 100;
      progress.set(nextProgress);
      return;
    }

    progress.set((elapsedRef.current / animationDuration) * 100);
  });

  useEffect(() => {
    elapsedRef.current = 0;
    lastTimeRef.current = null;
    progress.set(0);
  }, [animationSpeed, progress, yoyo]);

  const backgroundPosition = useTransform(progress, (value) => {
    if (direction === "vertical") return `50% ${value}%`;
    return `${value}% 50%`;
  });

  const handleMouseEnter = useCallback(() => {
    if (pauseOnHover) setIsPaused(true);
  }, [pauseOnHover]);

  const handleMouseLeave = useCallback(() => {
    if (pauseOnHover) setIsPaused(false);
  }, [pauseOnHover]);

  const gradientAngle =
    direction === "horizontal"
      ? "to right"
      : direction === "vertical"
        ? "to bottom"
        : "to bottom right";
  const resolvedColors = colors.length > 0 ? colors : DEFAULT_COLORS;
  const gradientColors = [...resolvedColors, resolvedColors[0]].join(", ");
  const gradientStyle = {
    backgroundImage: `linear-gradient(${gradientAngle}, ${gradientColors})`,
    backgroundSize:
      direction === "horizontal"
        ? "300% 100%"
        : direction === "vertical"
          ? "100% 300%"
          : "300% 300%",
    backgroundRepeat: "repeat",
  } as const;

  return (
    <motion.span
      className={`${styles.root} ${showBorder ? styles.withBorder : ""} ${className}`.trim()}
      data-gradient-text
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {showBorder ? (
        <motion.span
          aria-hidden="true"
          className={styles.overlay}
          data-gradient-overlay
          style={{ ...gradientStyle, backgroundPosition }}
        />
      ) : null}
      <motion.span
        className={styles.content}
        data-gradient-content
        style={{ ...gradientStyle, backgroundPosition }}
      >
        {children}
      </motion.span>
    </motion.span>
  );
}
