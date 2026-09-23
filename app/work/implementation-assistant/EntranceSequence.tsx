"use client";

import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import styles from "./entrance-motion.module.css";

type EntranceElement = "article" | "div" | "figure" | "header" | "ol";
type EntranceVariant = "content" | "fade" | "opacity";
type EntranceState = "idle" | "settled" | "visible";
type EntranceStep =
  | "identity"
  | "primary"
  | "secondary"
  | "stagger-1"
  | "stagger-2"
  | "stagger-3"
  | "support"
  | "title";

type EntranceSequenceProps = {
  as?: EntranceElement;
  children: ReactNode;
  className?: string;
  fillWidth?: boolean;
  manualAtDesktop?: boolean;
  name: string;
  selfStep?: EntranceStep;
  selfVariant?: EntranceVariant;
  style?: CSSProperties;
  taskStickyContent?: boolean;
};

const callbacks = new Map<Element, () => void>();
const REVEAL_EVENT = "implementation-assistant:reveal-entrance";
const SETTLE_AFTER_MS = 1480;
let sharedObserver: IntersectionObserver | null = null;

export function revealEntranceSequence(node: HTMLElement | null | undefined) {
  node?.dispatchEvent(new Event(REVEAL_EVENT));
}

function getObserver() {
  if (sharedObserver || !("IntersectionObserver" in window)) {
    return sharedObserver;
  }

  sharedObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const reveal = callbacks.get(entry.target);
        const triggerLine =
          entry.rootBounds?.bottom ?? window.innerHeight * 0.88;

        // The second clause makes a rapid jump past a section resolve to its
        // final state instead of leaving skipped content invisible.
        if (reveal && (entry.isIntersecting || entry.boundingClientRect.top < triggerLine)) {
          reveal();
          callbacks.delete(entry.target);
          sharedObserver?.unobserve(entry.target);
        }
      }
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
  );

  return sharedObserver;
}

function observe(node: Element, reveal: () => void) {
  const observer = getObserver();
  if (!observer) {
    reveal();
    return () => undefined;
  }

  callbacks.set(node, reveal);
  observer.observe(node);

  return () => {
    callbacks.delete(node);
    observer.unobserve(node);
  };
}

/**
 * React Bits Fade Content / Animated Content principles, expressed with the
 * page's existing 560ms easing and geometry. One shared observer reveals each
 * semantic group once; CSS owns the stagger and reduced-motion final state.
 */
export default function EntranceSequence({
  as = "div",
  children,
  className,
  fillWidth = false,
  manualAtDesktop = false,
  name,
  selfStep = "identity",
  selfVariant,
  style,
  taskStickyContent = false,
}: EntranceSequenceProps) {
  const ref = useRef<HTMLElement>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<EntranceState>("idle");
  const assignRef = useCallback((node: HTMLElement | null) => {
    ref.current = node;
  }, []);

  const reveal = useCallback(() => {
    setState((current) => (current === "idle" ? "visible" : current));
    if (settleTimerRef.current === null) {
      settleTimerRef.current = setTimeout(() => {
        setState("settled");
        settleTimerRef.current = null;
      }, SETTLE_AFTER_MS);
    }
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const desktopMotion = window.matchMedia(
      "(min-width: 901px) and (prefers-reduced-motion: no-preference)",
    );
    let stopObserving: () => void = () => undefined;

    const configure = () => {
      stopObserving();
      if (reducedMotion.matches) {
        setState("settled");
        return;
      }
      if (manualAtDesktop && desktopMotion.matches) {
        return;
      }
      stopObserving = observe(node, reveal);
    };

    configure();
    node.addEventListener(REVEAL_EVENT, reveal);
    reducedMotion.addEventListener("change", configure);
    desktopMotion.addEventListener("change", configure);

    return () => {
      stopObserving();
      node.removeEventListener(REVEAL_EVENT, reveal);
      reducedMotion.removeEventListener("change", configure);
      desktopMotion.removeEventListener("change", configure);
      if (settleTimerRef.current !== null) {
        clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
    };
  }, [manualAtDesktop, reveal]);

  const sharedProps = {
    className: `${styles.root} ${fillWidth ? styles.fillWidth : ""} ${className ?? ""}`,
    "data-entrance-manual": manualAtDesktop ? "desktop" : undefined,
    "data-entrance-name": name,
    "data-entrance-self": selfVariant,
    "data-entrance-self-step": selfStep,
    "data-entrance-state": state,
    "data-task-sticky-content": taskStickyContent ? "true" : undefined,
    style,
  };

  if (as === "article") {
    return <article {...sharedProps} ref={assignRef}>{children}</article>;
  }
  if (as === "header") {
    return <header {...sharedProps} ref={assignRef}>{children}</header>;
  }
  if (as === "figure") {
    return <figure {...sharedProps} ref={assignRef}>{children}</figure>;
  }
  if (as === "ol") {
    return <ol {...sharedProps} ref={assignRef}>{children}</ol>;
  }

  return <div {...sharedProps} ref={assignRef}>{children}</div>;
}
