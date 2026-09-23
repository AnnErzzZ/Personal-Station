"use client";

import Image from "@/components/SiteImage";
import type { CSSProperties, KeyboardEvent } from "react";
import { useRef, useState } from "react";

import {
  DASHBOARD_IMAGE,
  RUNNING_DATA_DIMENSIONS,
  getNextRunningDataId,
  type RunningDataId,
} from "./running-data";
import { focusInset, focusInsetVars } from "./focus-inset";
import styles from "./sections.module.css";

const cx = (...values: Array<string | false | undefined>) => values.filter(Boolean).join(" ");

/** 09 章高亮框不加内缩：遮罩与木框都直接按卡片矩形画（内缩只用于 10 章）。 */
const RUNNING_INSET = { x: 0, y: 0 } as const;

function focusStyle(id: RunningDataId) {
  const item = RUNNING_DATA_DIMENSIONS.find((dimension) => dimension.id === id)!;
  const { x, y, width, height } = item.focus;
  // 遮罩 = 木框 = 卡片完整 bbox。deliveredWidth 在内缩为 0 时不参与任何
  // 计算，这里只是占位（09-23 舞台放宽到 1320 轴线后下发宽度随 srcset 变动，
  // 不再是固定 830，别把占位值当实测值引用）。
  const inset = focusInset(item.focus, { ...DASHBOARD_IMAGE, deliveredWidth: 830 }, RUNNING_INSET.x, RUNNING_INSET.y);
  return {
    "--running-focus-x": `${(x / DASHBOARD_IMAGE.width) * 100}%`,
    "--running-focus-y": `${(y / DASHBOARD_IMAGE.height) * 100}%`,
    "--running-focus-width": `${(width / DASHBOARD_IMAGE.width) * 100}%`,
    "--running-focus-height": `${(height / DASHBOARD_IMAGE.height) * 100}%`,
    ...focusInsetVars("running", inset),
  } as CSSProperties;
}

export default function RunningDataStage() {
  // 09-23 用户指令「点击固定选中的去掉」：交互简化为 hover/键盘即选中，
  // 划过哪项哪项就是当前项，移出不回滚；点击不再有独立行为。
  const [selectedId, setSelectedId] = useState<RunningDataId>("space");
  const viewportRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const insetAttr = focusInset(
    RUNNING_DATA_DIMENSIONS.find((item) => item.id === selectedId)!.focus,
    { ...DASHBOARD_IMAGE, deliveredWidth: 830 },
    RUNNING_INSET.x,
    RUNNING_INSET.y,
  );

  const scrollFocusIntoView = (id: RunningDataId) => {
    const viewport = viewportRef.current;
    const item = RUNNING_DATA_DIMENSIONS.find((dimension) => dimension.id === id);
    if (!viewport || !item || viewport.scrollWidth <= viewport.clientWidth) return;

    const focusCenter = (item.focus.x + item.focus.width / 2) / DASHBOARD_IMAGE.width;
    viewport.scrollTo({
      left: viewport.scrollWidth * focusCenter - viewport.clientWidth / 2,
      behavior: "smooth",
    });
  };

  const select = (id: RunningDataId) => {
    setSelectedId(id);
    scrollFocusIntoView(id);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const nextId = getNextRunningDataId(selectedId, event.key);
    if (nextId === selectedId) return;

    event.preventDefault();
    select(nextId);
    const nextIndex = RUNNING_DATA_DIMENSIONS.findIndex((item) => item.id === nextId);
    itemRefs.current[nextIndex]?.focus();
  };

  return (
    <div className={styles.runningDataLayout} data-running-data-stage="">
      <ol
        className={styles.runningDimensions}
        aria-label="运行数据的五个判断维度"
        data-running-dimensions=""
      >
        {RUNNING_DATA_DIMENSIONS.map((item, index) => {
          const selected = item.id === selectedId;
          return (
            <li
              className={cx(
                styles.runningDimension,
                selected && styles.runningDimensionActive,
                selected && styles.runningDimensionLocked,
              )}
              key={item.id}
            >
              <button
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                type="button"
                className={styles.runningDimensionButton}
                aria-controls="running-data-panel"
                aria-pressed={selected}
                data-running-dimension={item.id}
                onFocus={() => select(item.id)}
                onPointerEnter={() => select(item.id)}
                onKeyDown={handleKeyDown}
              >
                <span className={styles.runningDimensionHead}>
                  <span className={styles.runningDimensionIndex}>{item.index}</span>
                  <span className={styles.runningDimensionTitle}>{item.name}</span>
                </span>
                <span className={styles.runningDimensionExtra} data-running-extra="">
                  <span className={styles.runningDimensionExtraInner}>
                    <span className={styles.runningDimensionQuestion}>{item.question}</span>
                    <span className={styles.runningDimensionBody}>{item.body}</span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className={styles.runningStage} data-running-stage="">
        <figure className={styles.runningFigure}>
          <div className={styles.runningViewport} ref={viewportRef} data-running-viewport="">
            <div
              className={styles.runningCanvas}
              id="running-data-panel"
              role="region"
              aria-label={`运行统计当前焦点：${RUNNING_DATA_DIMENSIONS.find((item) => item.id === selectedId)!.name}`}
              data-running-focus={selectedId}
              data-frame-inset={`${insetAttr.negX} / ${insetAttr.negY}`}
              style={focusStyle(selectedId)}
            >
              <Image
                className={styles.runningImage}
                src={DASHBOARD_IMAGE.src}
                alt={DASHBOARD_IMAGE.alt}
                width={DASHBOARD_IMAGE.width}
                height={DASHBOARD_IMAGE.height}
                sizes="(max-width: 720px) 920px, (max-width: 1320px) calc(100vw - 96px), 920px"
                quality={100}
                unoptimized
                data-running-image=""
              />
              {/* 遮罩 = 高亮框的超大扩散 box-shadow（洞随框圆角），无独立遮罩层。 */}
              <span className={styles.runningFocus} aria-hidden="true" data-running-focus-box="" />
            </div>
          </div>
        </figure>
      </div>
    </div>
  );
}
