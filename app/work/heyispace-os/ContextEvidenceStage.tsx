"use client";

import Image from "@/components/SiteImage";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  CONTEXT_EVIDENCE_STEPS,
  getNextContextEvidenceId,
  type ContextEvidenceId,
} from "./context-evidence";
import styles from "./sections.module.css";

const cx = (...values: Array<string | false | undefined>) =>
  values.filter(Boolean).join(" ");

/**
 * 高亮框几何 → CSS 自定义属性（**像素**）。
 *
 * 使用像素的原因：高亮框是「浮在一个已知宽高比舞台之上的绝对定位
 * 矩形」，需要 top / left / width / height 四个值**互相独立**且都能被 CSS
 * transition 插值。百分比在同一个元素上会彼此牵连 —— `height` 的百分比按
 * 包含块解析、又会参与包含块尺寸推导，实测把框压成一条线（`h=0.807%`）；
 * 换上 flex-basis + padding-top 折高度也只是把问题挪了个位置。
 * 舞台的框是实测出来的确定值，直接算像素最稳，也让「宽高比」这件事只存在
 * 于 JS 里一处。
 *
 * 舞台几何：桌面 / 平板 `aspect-ratio: 16 / 10`，≤720 `4 / 5`；
 * 后者图片走 `object-fit: cover`，因此横纵百分比另有一套（`focusCover`）。
 * 依据 data-* 断点标记选口径，不读 720 这个魔数。
 */
function focusStyle(
  id: ContextEvidenceId,
  width: number,
  height: number,
  isCover: boolean,
): CSSProperties {
  const step = CONTEXT_EVIDENCE_STEPS.find((item) => item.id === id)!;
  const box = isCover ? step.focusCover : step.focus;
  return {
    // 视觉量用 round 收进整像素：避免亚像素重采样导致的描边发虚。
    "--context-focus-top": `${Math.round((box.y / 100) * height)}px`,
    "--context-focus-left": `${Math.round((box.x / 100) * width)}px`,
    "--context-focus-w": `${Math.round((box.width / 100) * width)}px`,
    "--context-focus-h": `${Math.round((box.height / 100) * height)}px`,
  } as CSSProperties;
}

export default function ContextEvidenceStage() {
  // Hover 临时预览 + Click 锁定，与 09 / 10 章 tab 同一套交互：
  // 指针悬停时右侧焦点框跟随预览段，移开或失焦后回到锁定的那一段。
  const [lockedId, setLockedId] = useState<ContextEvidenceId>("location");
  const [previewId, setPreviewId] = useState<ContextEvidenceId | null>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [isCover, setIsCover] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const stageRef = useRef<HTMLDivElement>(null);
  const activeId = previewId ?? lockedId;
  const activeStep = CONTEXT_EVIDENCE_STEPS.find((step) => step.id === activeId)!;

  /** 量舞台：像素几何的唯一来源。容器尺寸变了框要跟着重算，否则会错位。 */
  const measure = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    setStageSize((previous) =>
      previous.width === rect.width && previous.height === rect.height
        ? previous
        : { width: rect.width, height: rect.height },
    );
    // 断点只有 1180 / 720；由 data-* 标记取口径，别在 JS 里重复魔数。
    setIsCover(
      window.matchMedia("(max-width: 720px)").matches,
    );
  }, []);

  useEffect(() => {
    measure();
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;
    // 注意不要写成 `new ResizeObserver(measure)`：回调会把 entries 当第一个
    // 实参传进去，measure 收到后会把它当成调用参数而忽略真实量测。
    const observer = new ResizeObserver(() => measure());
    observer.observe(stage);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentId: ContextEvidenceId,
  ) => {
    const nextId = getNextContextEvidenceId(currentId, event.key);
    if (nextId === currentId) return;

    event.preventDefault();
    setLockedId(nextId);
    setPreviewId(null);
    tabRefs.current[CONTEXT_EVIDENCE_STEPS.findIndex((step) => step.id === nextId)]?.focus();
  };

  return (
    <div className={styles.contextEvidenceLayout} data-section07-evidence="">
      <div className={styles.contextNarrative}>
        <div
          className={styles.contextActionList}
          role="tablist"
          aria-label="上下文证据焦点"
          aria-orientation="vertical"
          onPointerLeave={() => setPreviewId(null)}
        >
          {CONTEXT_EVIDENCE_STEPS.map((step, index) => {
            const locked = step.id === lockedId;
            const active = step.id === activeId;

            return (
              <button
                key={step.id}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                type="button"
                role="tab"
                id={`context-evidence-tab-${step.id}`}
                className={cx(
                  styles.contextAction,
                  active && styles.contextActionActive,
                )}
                aria-selected={locked}
                aria-controls="context-evidence-panel"
                tabIndex={locked ? 0 : -1}
                data-context-action={step.id}
                onClick={() => {
                  setLockedId(step.id);
                  setPreviewId(null);
                }}
                onPointerEnter={() => setPreviewId(step.id)}
                onKeyDown={(event) => handleKeyDown(event, step.id)}
              >
                <span className={styles.contextActionHead}>
                  <span className={styles.contextActionIndex}>{step.index}</span>
                  <span className={styles.contextActionTitle} data-part-name="">{step.title}</span>
                </span>
                <span className={styles.contextActionCopy}>
                  <span className={styles.contextActionBody}>{step.body}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <figure className={styles.contextProductFigure}>
        <div
          ref={stageRef}
          className={styles.contextProductStage}
          role="tabpanel"
          id="context-evidence-panel"
          aria-labelledby={`context-evidence-tab-${activeId}`}
          tabIndex={0}
          data-context-stage={activeId}
        >
          {CONTEXT_EVIDENCE_STEPS.map((step) => (
            <Image
              key={step.id}
              className={cx(
                styles.contextProductImage,
                step.id === activeId && styles.contextProductImageActive,
              )}
              src={step.src}
              alt={step.id === activeId ? step.alt : ""}
              aria-hidden={step.id === activeId ? undefined : true}
              fill
              sizes="(max-width: 720px) 92vw, (max-width: 1180px) 62vw, 900px"
            />
          ))}
          {/*
            单个高亮框承载全部三个状态：切换时只改 CSS 自定义属性，
            top / left / width / height 直接插值，框会平滑变形位移过去。
            不再叠三个框靠 opacity 交叉淡入——那样中途两个框同时半透明，
            视觉上就是「旧框灭了、新框亮起来」的闪烁。
          */}
          <div
            className={cx(
              styles.contextFocus,
              stageSize.width > 0 && styles.contextFocusHasSize,
              activeStep.evidenceStatus === "gap" && styles.contextFocusGap,
            )}
            style={focusStyle(activeId, stageSize.width, stageSize.height, isCover)}
            aria-hidden="true"
            data-context-focus={activeId}
          >
            <span className={styles.contextFocusLabel}>
              <span>{activeStep.index}</span>
              {activeStep.annotationShort ?? activeStep.annotation}
            </span>
          </div>
        </div>
      </figure>
    </div>
  );
}
