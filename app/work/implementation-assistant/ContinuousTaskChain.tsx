"use client";

import Image from "@/components/SiteImage";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef } from "react";

import {
  TASK_CHAIN_STATES,
  clamp01,
  createScrollRenderScheduler,
  getScrollDistances,
  getTaskChainFrame,
  stepScrubbedProgress,
} from "./continuous-task-chain";
import EntranceSequence from "./EntranceSequence";
import styles from "./continuous-task-chain.module.css";

const STATE02_ASSET_BASE =
  "/cases/implementation-assistant/05-task-continuity/state-02-cross-product";
const PHONE_FRAME_ASSET =
  "/cases/implementation-assistant/figma/phone-frame-deep-purple.png";

const STATE02_SCREENS = {
  workspace: `${STATE02_ASSET_BASE}/workspace-context.png`,
  strategy: `${STATE02_ASSET_BASE}/strategy-configuration.png`,
  library: `${STATE02_ASSET_BASE}/strategy-library.png`,
} as const;

const STATE01_ASSET_BASE =
  "/cases/implementation-assistant/05-task-continuity/state-01-gateway";
const STATE03_ASSET_BASE =
  "/cases/implementation-assistant/05-task-continuity/state-03-batch-feedback";

const STATE01_SCREENS = [
  {
    alt: "选择待配置网关",
    role: "gateway-discovery",
    src: `${STATE01_ASSET_BASE}/gateway-discovery.png`,
  },
  {
    alt: "配置网关 Wi-Fi",
    role: "wifi-configuration",
    src: `${STATE01_ASSET_BASE}/wifi-configuration.png`,
  },
  {
    alt: "网关加入局域网并反馈结果",
    role: "device-networking",
    src: `${STATE01_ASSET_BASE}/device-networking.png`,
  },
] as const;

const STATE02_SCREENS_LIST = [
  {
    alt: "实施助手业务办公区，左下角有我的策略入口",
    role: "workspace",
    src: STATE02_SCREENS.workspace,
  },
  {
    alt: "合一空间策略配置半屏",
    role: "strategy",
    src: STATE02_SCREENS.strategy,
  },
  {
    alt: "策略库列表",
    role: "library",
    src: STATE02_SCREENS.library,
  },
] as const;

const STATE03_SCREENS = [
  {
    alt: "批量选择待添加设备",
    role: "device-add-list",
    src: `${STATE03_ASSET_BASE}/device-add-list.png`,
  },
  {
    alt: "批量任务执行结果总览",
    role: "upgrade-queue-complete",
    src: `${STATE03_ASSET_BASE}/upgrade-queue-complete.png`,
  },
  {
    alt: "批量任务失败项与后续处理",
    role: "upgrade-queue-failed",
    src: `${STATE03_ASSET_BASE}/upgrade-queue-failed.png`,
  },
] as const;

type ContinuousTaskChainProps = {
  stageSlots?: readonly [ReactNode?, ReactNode?, ReactNode?];
};

const MIN_STAGE_HEIGHT = 720;
// 与 continuous-task-chain.module.css 中 .stickyContent 的高度保持一致
const STICKY_CONTENT_HEIGHT = 1090.24;
const MOTION_VIEWPORTS = getScrollDistances(1).motionHeight;
const motionExperienceStyle: CSSProperties = {
  height: `${MOTION_VIEWPORTS * 100}vh`,
  minHeight: `${getScrollDistances(MIN_STAGE_HEIGHT).motionHeight}px`,
};

function ChapterHeader({
  entranceName,
  titleId,
}: {
  entranceName?: string;
  titleId?: string;
}) {
  const content = (
    <>
      <div
        className={styles.chapterMeta}
        data-entrance-item
        data-entrance-step="identity"
        data-entrance-variant="fade"
      >
        <span>Implementation Assistant</span>
        <span>05/07</span>
      </div>
      <h2
        data-entrance-item
        data-entrance-step="title"
        data-entrance-variant="fade"
        id={titleId}
      >
        把分散操作接回同一条任务链
      </h2>
    </>
  );

  return entranceName ? (
    <EntranceSequence
      as="header"
      className={styles.chapterHeader}
      name={entranceName}
    >
      {content}
    </EntranceSequence>
  ) : (
    <header className={styles.chapterHeader} data-task-chapter-header="true">
      {content}
    </header>
  );
}

function StateCopy({
  state,
  className,
  dataIndex,
}: {
  state: (typeof TASK_CHAIN_STATES)[number];
  className: string;
  dataIndex?: number;
}) {
  return (
    <div
      className={className}
      data-task-copy={dataIndex}
      aria-hidden={dataIndex === undefined ? undefined : dataIndex !== 0}
    >
      <span className={styles.stateIndex}>{state.index}</span>
      <h3>{state.title}</h3>
      <p>{state.body.join(" ")}</p>
    </div>
  );
}

function EvidencePhone({
  alt,
  className,
  role,
  src,
  stateIndex,
}: {
  alt: string;
  className: string;
  role: string;
  src: string;
  stateIndex: "01" | "02" | "03";
}) {
  return (
    <div
      className={`${styles.statePhone} ${className}`}
      data-state-screen={`${stateIndex}-${role}`}
      data-state02-screen={stateIndex === "02" ? role : undefined}
    >
      <div className={styles.stateScreen}>
        <Image
          alt={alt}
          className={styles.stateScreenImage}
          fill
          sizes="(max-width: 900px) 31vw, 251px"
          src={src}
          unoptimized
        />
      </div>
      <Image
        alt=""
        aria-hidden="true"
        className={styles.statePhoneFrame}
        fill
        sizes="(max-width: 900px) 31vw, 251px"
        src={PHONE_FRAME_ASSET}
        unoptimized
      />
    </div>
  );
}

type EvidenceScreen = {
  alt: string;
  role: string;
  src: string;
};

function StateEvidence({
  ariaLabel,
  screens,
  stateIndex,
}: {
  ariaLabel: string;
  screens: readonly EvidenceScreen[];
  stateIndex: "01" | "02" | "03";
}) {
  const phoneClasses = [
    styles.statePhoneLeft,
    styles.statePhoneCenter,
    styles.statePhoneRight,
  ];

  return (
    <div
      aria-label={ariaLabel}
      className={styles.stateEvidence}
      data-state-evidence={stateIndex}
      data-state02-evidence={stateIndex === "02" ? "true" : undefined}
      data-state02-layout={stateIndex === "02" ? "figma" : undefined}
      role="group"
    >
      <div
        className={styles.statePhones}
        data-state-order={screens.map((screen) => screen.role).join(" ")}
        data-state02-order={
          stateIndex === "02"
            ? screens.map((screen) => screen.role).join(" ")
            : undefined
        }
      >
        {screens.map((screen, index) => (
          <EvidencePhone
            alt={screen.alt}
            className={phoneClasses[index]}
            key={screen.role}
            role={screen.role}
            src={screen.src}
            stateIndex={stateIndex}
          />
        ))}
      </div>
    </div>
  );
}

export function State01Evidence() {
  return (
    <StateEvidence
      ariaLabel="网关选择、配网与组网的连续操作证据"
      screens={STATE01_SCREENS}
      stateIndex="01"
    />
  );
}

export function State02Evidence() {
  return (
    <StateEvidence
      ariaLabel="跨小程序策略配置的连续操作证据"
      screens={STATE02_SCREENS_LIST}
      stateIndex="02"
    />
  );
}

export function State03Evidence() {
  return (
    <StateEvidence
      ariaLabel="批量执行过程与结果反馈的连续操作证据"
      screens={STATE03_SCREENS}
      stateIndex="03"
    />
  );
}
function ProductStage({
  slots,
  isStatic = false,
}: {
  slots: ContinuousTaskChainProps["stageSlots"];
  isStatic?: boolean;
}) {
  return (
    <div
      className={isStatic ? styles.staticProductStage : styles.productStage}
      aria-label="产品证据舞台"
    >
      {isStatic ? (
        slots?.[0]
      ) : (
        <div className={styles.stageSlots}>
          {TASK_CHAIN_STATES.map((state, index) => (
            <div
              className={styles.stageSlot}
              data-task-slot={index}
              key={state.index}
              aria-hidden={index !== 0}
            >
              {slots?.[index]}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StateIndicator({ activeIndex = 0 }: { activeIndex?: number }) {
  return (
    <div className={styles.indicator} aria-label="三个任务状态">
      {TASK_CHAIN_STATES.map((state, index) => (
        <span
          className={styles.indicatorDot}
          data-task-indicator={index}
          key={state.index}
          aria-current={index === activeIndex ? "step" : undefined}
        >
          <span className={styles.visuallyHidden}>状态 {state.index}</span>
        </span>
      ))}
    </div>
  );
}

function MotionScene({ slots }: { slots: ContinuousTaskChainProps["stageSlots"] }) {
  return (
    <div
      className={styles.stickyScene}
      data-task-sticky-stage="true"
    >
      <EntranceSequence
        className={styles.stickyContent}
        name="section-05-motion"
        taskStickyContent
      >
        <ChapterHeader titleId="continuous-task-chain-title" />

        <article
          className={styles.stageCard}
          data-entrance-item
          data-entrance-step="primary"
          data-entrance-variant="opacity"
          data-stage-card="true"
        >
          <header className={styles.cardHeader} data-card-header="true">
            <div className={styles.copyViewport}>
              {TASK_CHAIN_STATES.map((state, index) => (
                <StateCopy
                  className={styles.copyLayer}
                  dataIndex={index}
                  key={state.index}
                  state={state}
                />
              ))}
            </div>
          </header>

          <div className={styles.cardBody} data-card-body="true">
            <ProductStage slots={slots} />
          </div>

          <footer className={styles.cardFooter} data-card-footer="true">
            <StateIndicator />
          </footer>
        </article>
      </EntranceSequence>
    </div>
  );
}
function StaticScene({ slots }: { slots: ContinuousTaskChainProps["stageSlots"] }) {
  return (
    <div className={styles.staticSequence}>
      {TASK_CHAIN_STATES.map((state, index) => (
        <EntranceSequence
          as="article"
          className={`${styles.stageCard} ${styles.staticStageCard}`}
          name="section-05-static-card"
          key={state.index}
        >
          <header
            className={styles.cardHeader}
            data-card-header="true"
            data-entrance-item
            data-entrance-step="support"
            data-entrance-variant="fade"
          >
            <StateCopy className={styles.staticCopy} state={state} />
          </header>

          <div
            className={styles.cardBody}
            data-card-body="true"
            data-entrance-item
            data-entrance-step="primary"
            data-entrance-variant="content"
          >
            <ProductStage isStatic slots={[slots?.[index]]} />
          </div>

          <footer
            className={styles.cardFooter}
            data-card-footer="true"
            data-entrance-item
            data-entrance-step="secondary"
            data-entrance-variant="fade"
          >
            <StateIndicator activeIndex={index} />
          </footer>
        </EntranceSequence>
      ))}
    </div>
  );
}

export default function ContinuousTaskChain({
  stageSlots,
}: ContinuousTaskChainProps) {
  const motionRef = useRef<HTMLDivElement>(null);
  const activePhaseRef = useRef(0);

  useEffect(() => {
    const motion = motionRef.current;

    if (!motion) {
      return;
    }

    const motionQuery = window.matchMedia(
      "(min-width: 901px) and (prefers-reduced-motion: no-preference)",
    );
    const copyLayers = Array.from(
      motion.querySelectorAll<HTMLElement>("[data-task-copy]"),
    );
    const stageSlots = Array.from(
      motion.querySelectorAll<HTMLElement>("[data-task-slot]"),
    );
    const indicators = Array.from(
      motion.querySelectorAll<HTMLElement>("[data-task-indicator]"),
    );
    const stickyContent = motion.querySelector<HTMLElement>(
      "[data-task-sticky-content]",
    );
    let renderedProgress = 0;
    let lastFrameTime: number | null = null;
    let isInitialized = false;

    const updateScale = () => {
      const widthScale = (window.innerWidth - 32) / 1320;
      // 上下各留 80px：给 Main Stage Card 的柔和阴影留出可见空间
      const heightScale = (window.innerHeight - 160) / STICKY_CONTENT_HEIGHT;
      const scale = Math.max(0.38, Math.min(1, widthScale, heightScale));
      stickyContent?.style.setProperty("--task-chain-scale", String(scale));
    };

    const resetAnimation = () => {
      lastFrameTime = null;
      isInitialized = false;
    };

    const readTargetProgress = () => {
      const bounds = motion.getBoundingClientRect();
      const totalTravel = Math.max(
        1,
        motion.offsetHeight - window.innerHeight,
      );

      return clamp01(-bounds.top / totalTravel);
    };

    const render = (frameTime: number, targetProgress: number) => {
      if (!motionQuery.matches) {
        resetAnimation();
        return false;
      }

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
      const scene = getTaskChainFrame(renderedProgress);

      copyLayers.forEach((layer, index) => {
        const copyFrame = scene.copyFrames[index];
        layer.style.opacity = String(copyFrame.opacity);
        layer.style.transform = `translate3d(0, ${copyFrame.y}px, 0)`;
        layer.style.visibility = copyFrame.opacity > 0.001 ? "visible" : "hidden";
        layer.setAttribute(
          "aria-hidden",
          copyFrame.opacity > 0.05 ? "false" : "true",
        );
      });

      stageSlots.forEach((slot, index) => {
        const slotFrame = scene.slotFrames[index];
        slot.style.opacity = String(slotFrame.opacity);
        slot.style.transform = `translate3d(${slotFrame.xPercent}%, 0, 0)`;
        slot.style.visibility = slotFrame.opacity > 0.001 ? "visible" : "hidden";
        slot.setAttribute(
          "aria-hidden",
          slotFrame.opacity > 0.05 ? "false" : "true",
        );
      });

      if (activePhaseRef.current !== scene.phaseIndex) {
        activePhaseRef.current = scene.phaseIndex;
        motion.dataset.currentState = String(scene.phaseIndex + 1);
        indicators.forEach((indicator, index) => {
          if (index === scene.phaseIndex) {
            indicator.setAttribute("aria-current", "step");
          } else {
            indicator.removeAttribute("aria-current");
          }
        });
      }

      const shouldContinue =
        Math.abs(renderedProgress - targetProgress) > 0.0001;

      if (!shouldContinue) {
        lastFrameTime = null;
      }

      return shouldContinue;
    };

    const scheduler = createScrollRenderScheduler({
      cancelFrame: (frameId) => window.cancelAnimationFrame(frameId),
      readTarget: readTargetProgress,
      renderFrame: render,
      requestFrame: (callback) => window.requestAnimationFrame(callback),
    });

    const requestUpdate = () => {
      scheduler.requestUpdate();
    };

    const handleResize = () => {
      updateScale();
      requestUpdate();
    };

    const handleMotionChange = () => {
      resetAnimation();
      requestUpdate();
    };

    updateScale();
    requestUpdate();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    motionQuery.addEventListener("change", handleMotionChange);

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", handleResize);
      motionQuery.removeEventListener("change", handleMotionChange);
      scheduler.cancel();
    };
  }, []);

  return (
    <section
      className={styles.section}
      aria-labelledby="continuous-task-chain-title"
    >
      <div
        className={styles.motionExperience}
        data-current-state="1"
        ref={motionRef}
        style={motionExperienceStyle}
      >
        <MotionScene slots={stageSlots} />
      </div>

      <div aria-hidden="true" className={styles.exitRunway} data-task-exit-runway="true" />

      <div className={styles.staticFallback}>
        <ChapterHeader entranceName="section-05-static-header" />
        <StaticScene slots={stageSlots} />
      </div>
    </section>
  );
}
