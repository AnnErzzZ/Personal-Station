"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

import { revealEntranceSequence } from "./EntranceSequence";
import { clamp01, stepScrubbedProgress } from "./continuous-task-chain";
import {
  OUTCOME_PACING,
  getOutcomeFrame,
  getOutcomeScale,
} from "./outcome-transition";
import styles from "./outcome-transition.module.css";

type OutcomeTransitionProps = {
  outgoing: ReactNode;
  incoming: ReactNode;
};

export default function OutcomeTransition({
  outgoing,
  incoming,
}: OutcomeTransitionProps) {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const motionQuery = window.matchMedia(
      "(min-width: 901px) and (prefers-reduced-motion: no-preference)",
    );
    const background = scene.querySelector<HTMLElement>("[data-outcome-bg]");
    const outgoingLayer = scene.querySelector<HTMLElement>(
      "[data-outcome-outgoing]",
    );
    const incomingLayer = scene.querySelector<HTMLElement>(
      "[data-outcome-incoming]",
    );
    const incomingEntrance = incomingLayer?.querySelector<HTMLElement>(
      '[data-entrance-manual="desktop"]',
    );
    let renderedProgress = 0;
    let lastFrameTime: number | null = null;
    let isInitialized = false;
    let frameId: number | null = null;

    const applyScale = () => {
      scene.style.setProperty(
        "--outcome-scale",
        String(getOutcomeScale(window.innerHeight)),
      );
    };

    const readTargetProgress = () => {
      const bounds = scene.getBoundingClientRect();
      const travel = Math.max(1, scene.offsetHeight - window.innerHeight);
      return clamp01(-bounds.top / travel);
    };

    const render = (frameTime: number) => {
      frameId = null;
      if (!motionQuery.matches) {
        lastFrameTime = null;
        isInitialized = false;
        return;
      }

      const deltaSeconds =
        lastFrameTime === null
          ? 0
          : Math.max(0, (frameTime - lastFrameTime) / 1000);
      const target = readTargetProgress();

      if (!isInitialized) {
        renderedProgress = target;
        isInitialized = true;
      } else {
        renderedProgress = stepScrubbedProgress(
          renderedProgress,
          target,
          deltaSeconds,
        );
      }
      lastFrameTime = frameTime;

      const frame = getOutcomeFrame(renderedProgress);
      if (background) {
        background.style.opacity = String(frame.background);
      }
      if (outgoingLayer) {
        outgoingLayer.style.opacity = String(frame.outgoingOpacity);
        outgoingLayer.style.transform = `translate3d(0, ${frame.outgoingY}px, 0)`;
        outgoingLayer.style.visibility =
          frame.outgoingOpacity > 0.001 ? "visible" : "hidden";
      }
      if (incomingLayer) {
        incomingLayer.style.opacity = String(frame.incomingOpacity);
        incomingLayer.style.transform = `translate3d(0, ${frame.incomingY}px, 0)`;
        incomingLayer.style.visibility =
          frame.incomingOpacity > 0.001 ? "visible" : "hidden";
      }
      if (
        incomingEntrance &&
        frame.incomingOpacity > 0.001 &&
        incomingEntrance.dataset.entranceState === "idle"
      ) {
        revealEntranceSequence(incomingEntrance);
      }

      if (Math.abs(renderedProgress - target) > 0.0001) {
        lastFrameTime = frameTime;
        requestUpdate();
      } else {
        lastFrameTime = null;
      }
    };

    const requestUpdate = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(render);
    };

    const handleResize = () => {
      applyScale();
      requestUpdate();
    };

    const handleMotionChange = () => {
      lastFrameTime = null;
      isInitialized = false;
      requestUpdate();
    };

    applyScale();
    requestUpdate();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    motionQuery.addEventListener("change", handleMotionChange);

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", handleResize);
      motionQuery.removeEventListener("change", handleMotionChange);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div
      className={styles.scene}
      data-outcome-scene="true"
      ref={sceneRef}
      style={{ height: `${OUTCOME_PACING.sceneViewports * 100}vh` }}
    >
      <div className={styles.sticky} data-outcome-sticky="true">
        <span aria-hidden="true" className={styles.background} data-outcome-bg="true" />
        <div className={styles.layer} data-outcome-outgoing="true">
          {outgoing}
        </div>
        <div className={styles.layer} data-outcome-incoming="true">
          {incoming}
        </div>
      </div>
    </div>
  );
}
