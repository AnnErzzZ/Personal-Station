"use client";

import Image from "@/components/SiteImage";
import { siteAsset } from "@/lib/site-asset";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef } from "react";

import {
  PHASES,
  PHONE_MOCKUP_ASSET,
  SCREEN_IMAGE_FIT,
  clamp01,
  getBridgeFrame,
  getScrollDistances,
  getScrollProgresses,
  getSceneFrame,
  stepScrubbedProgress,
} from "./guided-next-step";
import EntranceSequence, {
  revealEntranceSequence,
} from "./EntranceSequence";
import styles from "./guided-next-step.module.css";

type GuidedNextStepProps = {
  outgoing: ReactNode;
};

const PHONE_WIDTH = 327.6263122558594;
const PHONE_HEIGHT = 667.427978515625;
const MIN_STAGE_HEIGHT = 720;
const MOTION_VIEWPORTS = getScrollDistances(1).motionHeight;
const screenImageFitStyle: CSSProperties = {
  left: `${SCREEN_IMAGE_FIT.leftPercent}%`,
  top: `${SCREEN_IMAGE_FIT.topPercent}%`,
  width: `${SCREEN_IMAGE_FIT.widthPercent}%`,
  height: `${SCREEN_IMAGE_FIT.heightPercent}%`,
};
const motionExperienceStyle: CSSProperties = {
  height: `${MOTION_VIEWPORTS * 100}vh`,
  minHeight: `${getScrollDistances(MIN_STAGE_HEIGHT).motionHeight}px`,
};

function ProductScreen({
  phase,
  sizes,
  eager = false,
}: {
  phase: (typeof PHASES)[number];
  sizes: string;
  eager?: boolean;
}) {
  return (
    <span className={styles.screenImageFit} style={screenImageFitStyle}>
      <Image
        src={phase.screen}
        alt={`${phase.title}的真实产品界面`}
        fill
        loading={eager ? "eager" : undefined}
        sizes={sizes}
        unoptimized
      />
    </span>
  );
}

function PhaseOverlays({ phase }: { phase: (typeof PHASES)[number] }) {
  if (!phase.overlays?.length) {
    return null;
  }

  return (
    <div className={styles.phaseOverlays} aria-hidden="true">
      {phase.overlays.map((overlay) => (
        <span
          className={styles.phaseOverlay}
          key={overlay.src}
          style={
            {
              left: `${(overlay.left / PHONE_WIDTH) * 100}%`,
              top: `${(overlay.top / PHONE_HEIGHT) * 100}%`,
              width: `${(overlay.width / PHONE_WIDTH) * 100}%`,
              aspectRatio: String(overlay.aspectRatio),
            } as CSSProperties
          }
        >
          <Image src={overlay.src} alt="" fill sizes="290px" unoptimized />
        </span>
      ))}
    </div>
  );
}

function MockupFrame() {
  return (
    <Image
      className={styles.mockupFrame}
      src={PHONE_MOCKUP_ASSET}
      alt=""
      width={1257}
      height={2561}
      unoptimized
      aria-hidden="true"
    />
  );
}

function PhoneShell({
  phase,
  className = "",
}: {
  phase: (typeof PHASES)[number];
  className?: string;
}) {
  return (
    <div className={`${styles.phoneShell} ${className}`}>
      <div className={styles.phoneScreen}>
        <ProductScreen
          phase={phase}
          sizes="(max-width: 900px) 78vw, 320px"
        />
      </div>
      <MockupFrame />
      <PhaseOverlays phase={phase} />
    </div>
  );
}

function MotionPhone() {
  return (
    <div className={styles.phoneMotion} data-phone>
      <div className={styles.phoneShell}>
        <div className={styles.phoneScreen}>
          {PHASES.map((phase, phaseIndex) => (
            <div
              className={styles.screenPhase}
              data-visual-phase={phaseIndex}
              key={phase.index}
            >
              <ProductScreen
                phase={phase}
                sizes="(min-width: 901px) 565px, 80vw"
                eager
              />
            </div>
          ))}
        </div>

        <MockupFrame />

        {PHASES.map((phase, phaseIndex) => (
          <div
            className={styles.overlayPhase}
            data-visual-phase={phaseIndex}
            key={`overlay-${phase.index}`}
          >
            <PhaseOverlays phase={phase} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ChapterHeading({ manualAtDesktop = false }: { manualAtDesktop?: boolean }) {
  return (
    <EntranceSequence
      as="header"
      className={styles.chapterHeading}
      manualAtDesktop={manualAtDesktop}
      name="section-04-heading"
    >
      <div
        className={styles.chapterMeta}
        data-entrance-item
        data-entrance-step="identity"
        data-entrance-variant="fade"
      >
        <span>Implementation Assistant</span>
        <span>04/07</span>
      </div>
      <h2
        data-entrance-item
        data-entrance-step="title"
        data-entrance-variant="fade"
      >
        把交付经验写进「下一步」
      </h2>
    </EntranceSequence>
  );
}

function PhaseCopy() {
  return (
    <div className={styles.copyViewport}>
      {PHASES.map((phase, index) => (
        <article
          className={styles.copyLayer}
          data-copy-phase={index}
          key={phase.index}
        >
          <p className={styles.mechanismLabel}>
            <span className={styles.mechanismName}>Core Product Mechanisms</span>
            <span className={styles.mechanismIndex}>{phase.index}</span>
          </p>
          <div className={styles.copyContent}>
            <h3>{phase.title}</h3>
            <div className={styles.phaseBody}>
              {phase.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function StaticPhase({ phase }: { phase: (typeof PHASES)[number] }) {
  return (
    <EntranceSequence
      as="article"
      className={styles.staticPhase}
      name="section-04-static-phase"
    >
      <div className={styles.staticCopy}>
        <p
          className={styles.mechanismLabel}
          data-entrance-item
          data-entrance-step="identity"
          data-entrance-variant="fade"
        >
          <span className={styles.mechanismName}>Core Product Mechanisms</span>
          <span className={styles.mechanismIndex}>{phase.index}</span>
        </p>
        <div className={styles.copyContent}>
          <h3
            data-entrance-item
            data-entrance-step="title"
            data-entrance-variant="fade"
          >
            {phase.title}
          </h3>
          <div
            className={styles.phaseBody}
            data-entrance-item
            data-entrance-step="support"
            data-entrance-variant="fade"
          >
            {phase.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </div>

      <div
        className={styles.staticScreens}
        data-entrance-item
        data-entrance-step="primary"
        data-entrance-variant="content"
      >
        <PhoneShell className={styles.staticPhone} phase={phase} />
      </div>
    </EntranceSequence>
  );
}

export default function GuidedNextStep({ outgoing }: GuidedNextStepProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const currentPhaseRef = useRef(-1);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const motionQuery = window.matchMedia(
      "(min-width: 901px) and (prefers-reduced-motion: no-preference)",
    );
    const copyLayers = Array.from(
      root.querySelectorAll<HTMLElement>("[data-copy-phase]"),
    );
    const visualPhases = Array.from(
      root.querySelectorAll<HTMLElement>("[data-visual-phase]"),
    );
    const outgoingLayer = root.querySelector<HTMLElement>("[data-outgoing]");
    const incomingLayer = root.querySelector<HTMLElement>("[data-incoming]");
    const incomingEntrance = incomingLayer?.querySelector<HTMLElement>(
      '[data-entrance-name="section-04-heading"]',
    );
    const phone = root.querySelector<HTMLElement>("[data-phone]");
    let renderedProgress = 0;
    let lastFrameTime: number | null = null;
    let isInitialized = false;

    for (const phase of PHASES) {
      for (const screen of [
        phase.screen,
        ...(phase.overlays ?? []).map((overlay) => overlay.src),
      ]) {
        const image = new window.Image();
        image.decoding = "async";
        image.src = siteAsset(screen);
      }
    }

    const mockup = new window.Image();
    mockup.decoding = "async";
    mockup.src = siteAsset(PHONE_MOCKUP_ASSET);

    const update = (frameTime: number) => {
      frameRef.current = null;

      if (!motionQuery.matches) {
        isInitialized = false;
        lastFrameTime = null;
        return;
      }

      const bounds = root.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const totalTravel = Math.max(1, bounds.height - viewportHeight);
      const travelled = Math.min(totalTravel, Math.max(0, -bounds.top));
      const targetProgress = clamp01(travelled / totalTravel);
      const deltaSeconds =
        lastFrameTime === null
          ? 0
          : Math.max(0, (frameTime - lastFrameTime) / 1000);

      if (!isInitialized) {
        renderedProgress = targetProgress;
        isInitialized = true;
      } else {
        renderedProgress = stepScrubbedProgress(
          renderedProgress,
          targetProgress,
          deltaSeconds,
        );
      }

      lastFrameTime = frameTime;

      const renderedTravel = renderedProgress * totalTravel;
      const { bridgeProgress, sceneProgress } = getScrollProgresses(
        renderedTravel,
        viewportHeight,
        totalTravel,
      );
      const bridge = getBridgeFrame(bridgeProgress);
      const scene = getSceneFrame(sceneProgress);

      root.style.setProperty(
        "--guided-background",
        bridge.background.join(" "),
      );

      if (outgoingLayer) {
        outgoingLayer.style.opacity = String(bridge.oldOpacity);
        outgoingLayer.style.transform = `translate3d(0, ${bridge.oldY}px, 0)`;
        outgoingLayer.setAttribute(
          "aria-hidden",
          bridge.oldOpacity < 0.05 ? "true" : "false",
        );
      }

      if (incomingLayer) {
        incomingLayer.style.opacity = String(bridge.newOpacity);
        incomingLayer.style.transform = `translate3d(0, ${bridge.newY}px, 0)`;
        incomingLayer.setAttribute(
          "aria-hidden",
          bridge.newOpacity < 0.05 ? "true" : "false",
        );
      }
      if (
        incomingEntrance &&
        bridge.newOpacity > 0.001 &&
        incomingEntrance.dataset.entranceState === "idle"
      ) {
        revealEntranceSequence(incomingEntrance);
      }

      if (phone) {
        phone.style.setProperty("--phone-scale", String(scene.phone.scale));
        phone.style.setProperty("--phone-x", `${scene.phone.x}px`);
        phone.style.setProperty("--phone-y", `${scene.phone.y}px`);
        phone.style.setProperty(
          "--phone-bridge-scale",
          String(bridge.phoneScale),
        );
      }

      copyLayers.forEach((layer, index) => {
        const weight = scene.copyWeights[index];
        layer.style.opacity = String(weight);
        layer.style.transform = "none";
        layer.setAttribute("aria-hidden", weight < 0.05 ? "true" : "false");
      });

      visualPhases.forEach((phaseNode) => {
        const index = Number(phaseNode.dataset.visualPhase);
        const phaseWeight = scene.phaseWeights[index] ?? 0;
        phaseNode.style.opacity = String(phaseWeight);
      });

      if (currentPhaseRef.current !== scene.phaseIndex) {
        currentPhaseRef.current = scene.phaseIndex;
        root.dataset.currentPhase = String(scene.phaseIndex + 1);
      }

      if (Math.abs(targetProgress - renderedProgress) > 0.0001) {
        frameRef.current = window.requestAnimationFrame(update);
      }
    };

    const requestUpdate = () => {
      if (frameRef.current === null) {
        frameRef.current = window.requestAnimationFrame(update);
      }
    };

    update(window.performance.now());
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    motionQuery.addEventListener("change", requestUpdate);

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      motionQuery.removeEventListener("change", requestUpdate);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return (
    <div className={styles.guidedExperience} ref={rootRef}>
      <section
        className={styles.motionExperience}
        aria-label="03 到 04 章节过渡与滚动叙事"
        style={motionExperienceStyle}
      >
        <div className={styles.stickyStage}>
          <div className={styles.outgoing} data-outgoing>
            {outgoing}
          </div>

          <div className={styles.incoming} data-incoming>
            <ChapterHeading manualAtDesktop />
            <div className={styles.stageContent}>
              <PhaseCopy />
              <div className={styles.phoneViewport}>
                <MotionPhone />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.staticFallback}>
        <div className={styles.staticOutgoing}>{outgoing}</div>
        <section className={styles.staticGuided}>
          <ChapterHeading />
          <div className={styles.staticSequence}>
            {PHASES.map((phase) => (
              <StaticPhase phase={phase} key={phase.index} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
