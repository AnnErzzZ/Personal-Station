"use client";

import { gsap } from "gsap";
import {
  createContext,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import pageStyles from "../home.module.css";
import GlyphDustMorph from "./GlyphDustMorph";
import {
  HOME_SECTIONS,
  type HomeSectionIndex,
  type HomeTransition,
  type TransitionPhase,
} from "./home-sections";
import SiteNav from "./SiteNav";
import { useMotionSupport } from "./use-motion-support";

export type { HomeSectionIndex } from "./home-sections";

type HomePagerContextValue = {
  activeSection: HomeSectionIndex;
  phase: TransitionPhase;
  transition: HomeTransition;
  transitionTo: (next: HomeSectionIndex) => void;
};

// 导出给 HeroVideo 等需要感知「当前激活 Section」的 Hero 子组件使用。
export const HomePagerContext = createContext<HomePagerContextValue | null>(null);

const WHEEL_THRESHOLD = 72;
const WHEEL_RESET_MS = 240;
const TRANSITION_SECONDS = 1.2;
// 1.2 s 时间轴上的阶段切换点（秒），取值对应 docs/HOME_DESIGN_RULES.md §7.3：
// 150 ms 起粒子化、600 ms 达到最散、860 ms 起新内容进入。
// preparing 是 entering 之前的显式保持段：新 Section 已经挂载在隐藏态，
// 这段时间内不参与 transition，phase 翻到 entering 时动画才起步。
const PHASE_MORPH_AT = 0.15;
const PHASE_PREPARE_AT = 0.7;
const PHASE_ENTER_AT = 0.86;

function sectionFromHash(): HomeSectionIndex | null {
  const hash = window.location.hash.slice(1);
  const index = HOME_SECTIONS.findIndex((section) => section.id === hash);
  return index >= 0 ? (index as HomeSectionIndex) : null;
}

function normalizeWheelDelta(event: WheelEvent) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * window.innerHeight;
  }
  return event.deltaY;
}

function nextFromDirection(
  current: HomeSectionIndex,
  direction: -1 | 1,
): HomeSectionIndex | null {
  const next = current + direction;
  return next >= 0 && next < HOME_SECTIONS.length
    ? (next as HomeSectionIndex)
    : null;
}

function updateHash(index: HomeSectionIndex) {
  const id = HOME_SECTIONS[index].id;
  const url = id === "top" ? window.location.pathname : `#${id}`;
  window.history.replaceState(null, "", url);
}

export default function HomePager({ children }: { children: ReactNode }) {
  const motion = useMotionSupport();
  const [activeSection, setActiveSection] = useState<HomeSectionIndex>(0);
  const [phase, setPhase] = useState<TransitionPhase>("idle");
  const [transition, setTransition] = useState<HomeTransition>({
    from: 0,
    to: 1,
    progress: 0,
    running: false,
    sequence: 0,
  });

  const activeSectionRef = useRef<HomeSectionIndex>(0);
  const isTransitioningRef = useRef(false);
  const inputArmedRef = useRef(true);
  const sequenceRef = useRef(0);
  const wheelAccumulatorRef = useRef(0);
  const wheelResetRef = useRef<number | null>(null);
  const rearmRef = useRef<number | null>(null);
  const startFrameRef = useRef<number | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const touchStartRef = useRef<number | null>(null);

  const scheduleRearm = useCallback(() => {
    inputArmedRef.current = false;
    if (rearmRef.current !== null) window.clearTimeout(rearmRef.current);
    rearmRef.current = window.setTimeout(() => {
      inputArmedRef.current = true;
      wheelAccumulatorRef.current = 0;
      rearmRef.current = null;
    }, WHEEL_RESET_MS);
  }, []);

  const settleImmediately = useCallback((next: HomeSectionIndex) => {
    timelineRef.current?.kill();
    if (startFrameRef.current !== null) {
      window.cancelAnimationFrame(startFrameRef.current);
      startFrameRef.current = null;
    }
    activeSectionRef.current = next;
    setActiveSection(next);
    setPhase("idle");
    setTransition((current) => ({
      ...current,
      from: next,
      to: next === 3 ? 2 : ((next + 1) as HomeSectionIndex),
      progress: 0,
      running: false,
    }));
    isTransitioningRef.current = false;
    inputArmedRef.current = true;
    wheelAccumulatorRef.current = 0;
    updateHash(next);
  }, []);

  const transitionTo = useCallback(
    (next: HomeSectionIndex) => {
      const from = activeSectionRef.current;
      if (next === from || isTransitioningRef.current) return;

      if (!motion) {
        settleImmediately(next);
        return;
      }

      isTransitioningRef.current = true;
      inputArmedRef.current = false;
      wheelAccumulatorRef.current = 0;
      sequenceRef.current += 1;
      const sequence = sequenceRef.current;
      setPhase("exiting");
      setTransition({ from, to: next, progress: 0, running: true, sequence });

      const playhead = { progress: 0 };
      const begin = () => {
        startFrameRef.current = null;
        const timeline = gsap.timeline({
          onComplete: () => {
            activeSectionRef.current = next;
            setActiveSection(next);
            setPhase("idle");
            setTransition({
              from,
              to: next,
              progress: 1,
              running: false,
              sequence,
            });
            isTransitioningRef.current = false;
            updateHash(next);
            scheduleRearm();
          },
        });
        timelineRef.current = timeline;
        timeline
          .to(playhead, {
            progress: 1,
            duration: TRANSITION_SECONDS,
            ease: "none",
            onUpdate: () => {
              setTransition((current) =>
                current.sequence === sequence
                  ? { ...current, progress: playhead.progress }
                  : current,
              );
            },
          })
          .call(() => setPhase("morphing"), [], PHASE_MORPH_AT)
          .call(() => setPhase("preparing"), [], PHASE_PREPARE_AT)
          .call(() => setPhase("entering"), [], PHASE_ENTER_AT);
      };

      // 先让 React 提交新的 current / next 状态（下一 Section 在这一提交里就带着
      // 隐藏态进 DOM），再用双 rAF 确认这一帧已经上屏，时间轴才起步。
      // 这样 morph 与 entering 都不会跑在"新内容还没落到隐藏态"的前面。
      startFrameRef.current = window.requestAnimationFrame(() => {
        startFrameRef.current = window.requestAnimationFrame(begin);
      });
    },
    [motion, scheduleRearm, settleImmediately],
  );

  useEffect(() => {
    const initial = sectionFromHash();
    if (initial === null || initial === 0) return;
    const frame = window.requestAnimationFrame(() => settleImmediately(initial));
    return () => window.cancelAnimationFrame(frame);
  }, [settleImmediately]);

  useEffect(() => {
    const resetAccumulatorSoon = () => {
      if (wheelResetRef.current !== null) {
        window.clearTimeout(wheelResetRef.current);
      }
      wheelResetRef.current = window.setTimeout(() => {
        wheelAccumulatorRef.current = 0;
        wheelResetRef.current = null;
      }, WHEEL_RESET_MS);
    };

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();

      if (isTransitioningRef.current || !inputArmedRef.current) {
        wheelAccumulatorRef.current = 0;
        if (!isTransitioningRef.current) scheduleRearm();
        return;
      }

      const delta = normalizeWheelDelta(event);
      if (Math.abs(delta) < 0.5) return;
      const accumulator = wheelAccumulatorRef.current;
      if (accumulator !== 0 && Math.sign(accumulator) !== Math.sign(delta)) {
        wheelAccumulatorRef.current = delta;
      } else {
        wheelAccumulatorRef.current = Math.max(
          -WHEEL_THRESHOLD * 2,
          Math.min(WHEEL_THRESHOLD * 2, accumulator + delta),
        );
      }
      resetAccumulatorSoon();

      if (Math.abs(wheelAccumulatorRef.current) < WHEEL_THRESHOLD) return;
      const direction = wheelAccumulatorRef.current > 0 ? 1 : -1;
      wheelAccumulatorRef.current = 0;
      const next = nextFromDirection(activeSectionRef.current, direction);
      if (next !== null) transitionTo(next);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.matches("input, textarea, select, [contenteditable='true']") ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return;
      }

      let next: HomeSectionIndex | null = null;
      if (["ArrowDown", "PageDown"].includes(event.key) || (event.key === " " && !event.shiftKey)) {
        next = nextFromDirection(activeSectionRef.current, 1);
      } else if (["ArrowUp", "PageUp"].includes(event.key) || (event.key === " " && event.shiftKey)) {
        next = nextFromDirection(activeSectionRef.current, -1);
      } else if (event.key === "Home") {
        next = 0;
      } else if (event.key === "End") {
        next = 3;
      }
      if (next === null) return;
      event.preventDefault();
      transitionTo(next);
    };

    const onTouchStart = (event: TouchEvent) => {
      touchStartRef.current = event.touches.length === 1 ? event.touches[0].clientY : null;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (touchStartRef.current !== null) event.preventDefault();
    };
    const onTouchEnd = (event: TouchEvent) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (start === null || isTransitioningRef.current || !inputArmedRef.current) return;
      const end = event.changedTouches[0]?.clientY;
      if (end === undefined || Math.abs(start - end) < 48) return;
      const next = nextFromDirection(activeSectionRef.current, start > end ? 1 : -1);
      if (next !== null) transitionTo(next);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      if (wheelResetRef.current !== null) window.clearTimeout(wheelResetRef.current);
      if (rearmRef.current !== null) window.clearTimeout(rearmRef.current);
      if (startFrameRef.current !== null) window.cancelAnimationFrame(startFrameRef.current);
      timelineRef.current?.kill();
    };
  }, [scheduleRearm, transitionTo]);

  const context = useMemo<HomePagerContextValue>(
    () => ({ activeSection, phase, transition, transitionTo }),
    [activeSection, phase, transition, transitionTo],
  );
  const visualSection = transition.running ? transition.to : activeSection;
  const pageStyle = {
    backgroundColor: HOME_SECTIONS[visualSection].tone,
  } as CSSProperties;

  return (
    <HomePagerContext.Provider value={context}>
      <div
        className={pageStyles.page}
        data-active-section={activeSection}
        data-target-section={transition.running ? transition.to : activeSection}
        data-transition-phase={phase}
        data-transition-progress={transition.progress.toFixed(3)}
        style={pageStyle}
      >
        {/* SiteNav 已改为自然滚动版（自含状态），此组件整体处于退役状态：
            保留编译通过，页面不再挂载。 */}
        <SiteNav />
        <main className={pageStyles.deck}>{children}</main>
        <GlyphDustMorph transition={transition} dark={visualSection === 3} />
        <div className={pageStyles.pageStatus} aria-live="polite" aria-atomic="true">
          <span>{String(activeSection + 1).padStart(2, "0")}</span>
          <span aria-hidden="true">/</span>
          <span>{String(HOME_SECTIONS.length).padStart(2, "0")}</span>
          <span className={pageStyles.statusLabel}>{HOME_SECTIONS[activeSection].title}</span>
        </div>
      </div>
    </HomePagerContext.Provider>
  );
}

type HomeSectionProps = HTMLAttributes<HTMLElement> & {
  index: HomeSectionIndex;
};

export function HomeSection({ index, className = "", ...props }: HomeSectionProps) {
  const context = useContext(HomePagerContext);
  if (!context) throw new Error("HomeSection must be rendered inside HomePager");
  const { activeSection, phase, transition } = context;
  let state: "active" | "outgoing" | "incoming" | "hidden" =
    index === activeSection ? "active" : "hidden";
  if (transition.running) {
    if (index === transition.from) state = "outgoing";
    else if (index === transition.to) state = "incoming";
    else state = "hidden";
  }
  const interactive = state === "active" && phase === "idle";

  return (
    <section
      {...props}
      className={`${pageStyles.homeSection} ${className}`.trim()}
      data-home-section={index}
      data-section-state={state}
      aria-hidden={state === "hidden" ? "true" : undefined}
      inert={!interactive}
    />
  );
}
