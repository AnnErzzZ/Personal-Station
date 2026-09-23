"use client";

import type { GlyphStyle, Keyframe } from "../../vendor/glyphdust-fork/dist/index.js";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";

import { HERO_NAME_WRAP_ID } from "./HeroName";
import { HOME_SECTIONS, type HomeTransition } from "./home-sections";
import styles from "./glyph-dust-morph.module.css";
import { useMotionSupport } from "./use-motion-support";

const GlyphDust = dynamic(
  () =>
    import("../../vendor/glyphdust-fork/dist/index.js").then(
      (mod) => mod.GlyphDust,
    ),
  { ssr: false },
);

const STYLE: GlyphStyle = {
  size: 1.15,
  blend: "normal",
  drift: 0.3,
  sparkle: 0,
  stagger: 0.65,
  curl: 0.2,
  burst: 0,
  alphaVar: 0.3,
  dof: 0,
  easing: "smootherstep",
  charOrder: 1,
};

const COLORS = { ink: "#111113", accent: "#111113", accentRatio: 0 };
const COUNT = { desktop: 22000, mobile: 10000 };
const DPR: [number, number] = [1, 1.75];

// 1.2 s 时间轴：150 ms 保持、150–600 ms 解散至最散、600–1100 ms 重组，
// 最后约 100 ms 留给 DOM 标题与页面内容完全落稳。
const TIMING = [0.125, 0.5, 0.92];

function transitionKeyframes(
  from: HomeTransition["from"],
  to: HomeTransition["to"],
): Keyframe[] {
  const current = HOME_SECTIONS[from];
  const next = HOME_SECTIONS[to];
  return [
    {
      type: "text",
      text: "dustTitle" in current ? current.dustTitle : current.title,
      domSelector: current.selector,
      resolveToDom: true,
    },
    { type: "scatter", spread: 0.85, around: "glyph" },
    {
      type: "text",
      text: "dustTitle" in next ? next.dustTitle : next.title,
      domSelector: next.selector,
      resolveToDom: true,
    },
  ];
}

function libraryHasRendered(from: HomeTransition["from"]) {
  const selector = HOME_SECTIONS[from].selector;
  return Boolean(document.querySelector<HTMLElement>(selector)?.style.opacity);
}

export default function GlyphDustMorph({
  transition,
  dark,
}: {
  transition: HomeTransition;
  dark: boolean;
}) {
  const motion = useMotionSupport();
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const pauseTimerRef = useRef<number | null>(null);
  const pauseAttemptsRef = useRef(0);
  const keyframes = useMemo(
    () => transitionKeyframes(transition.from, transition.to),
    [transition.from, transition.to],
  );

  useEffect(() => {
    if (!motion) return;
    const timer = window.setTimeout(() => setReady(true), 180);
    return () => window.clearTimeout(timer);
  }, [motion]);

  useEffect(() => {
    if (!ready) return;
    if (pauseTimerRef.current !== null) {
      window.clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    if (transition.running) {
      pauseAttemptsRef.current = 0;
      return;
    }

    // paused 冻结的是“最后绘制的一帧”，因此边界状态要先真正画出来。
    const freeze = () => {
      pauseTimerRef.current = null;
      if (!libraryHasRendered(transition.from) && pauseAttemptsRef.current < 30) {
        pauseAttemptsRef.current += 1;
        pauseTimerRef.current = window.setTimeout(freeze, 100);
        return;
      }
      setPaused(true);
    };
    pauseTimerRef.current = window.setTimeout(freeze, 120);
    return () => {
      if (pauseTimerRef.current !== null) {
        window.clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = null;
      }
    };
  }, [ready, transition.from, transition.running, transition.sequence]);

  useEffect(() => {
    if (transition.from !== 0 || transition.progress < 0.1) return;
    const wrap = document.getElementById(HERO_NAME_WRAP_ID);
    if (wrap?.dataset.morph === "armed") wrap.dataset.morph = "handoff";
  }, [transition.from, transition.progress]);

  if (!motion || !ready) return null;

  return (
    <div
      className={styles.layer}
      data-dark={dark ? "true" : "false"}
      aria-hidden="true"
    >
      <GlyphDust
        keyframes={keyframes}
        timing={TIMING}
        driver={{ type: "manual", progress: transition.progress }}
        preset="minimal"
        style={STYLE}
        colors={COLORS}
        count={COUNT}
        dpr={DPR}
        resampleSignal={transition.sequence}
        paused={transition.running ? false : paused}
        fallback={null}
      />
    </div>
  );
}
