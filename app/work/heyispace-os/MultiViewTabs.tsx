"use client";

import Image from "@/components/SiteImage";
import { useState } from "react";

import RubberSegment from "./RubberSegment";

import {
  MULTI_VIEWS,
  MULTI_VIEW_FACTS,
  MULTI_VIEW_PANEL_ID,
  type MultiViewId,
} from "./multi-view-views";
import styles from "./sections.module.css";

const cx = (...values: Array<string | false | undefined>) =>
  values.filter(Boolean).join(" ");

/**
 * 08 / 12 的主舞台与分段切换器（由旧 05/07 迁移）。
 * 结构：大主图 → 主图下方居中的 pill Tab → 当前视图一句话说明。
 * 四个 Tab 共用同一个 tabpanel：四张真实素材保持挂载以避免首次切换空帧；
 * active / leaving 只有 300ms 纯淡入淡出，结束后所有图片回到静止态，
 * 容器高度由 16 / 10 的 aspect-ratio 固定，切换时不会推动后续内容。
 */
export default function MultiViewTabs() {
  const [activeView, setActiveView] = useState<MultiViewId>(MULTI_VIEWS[0].id);
  // 退场的那张单独标记，等 300ms 淡出结束后再摘掉，避免瞬间消失。
  const [leavingView, setLeavingView] = useState<MultiViewId | null>(null);

  const switchTo = (next: MultiViewId) => {
    if (next === activeView) return;
    setLeavingView(activeView);
    setActiveView(next);
  };

  const activeViewData = MULTI_VIEWS.find((view) => view.id === activeView);

  return (
    <>
      {/* 主舞台在前，Tab 与说明跟在下方：与 2026-09-18 参考版式一致。 */}
      <div className={styles.spatialWindow} data-section08-window>
        <div
          className={styles.spatialStage}
          role="tabpanel"
          id={MULTI_VIEW_PANEL_ID}
          aria-labelledby={`section08-tab-${activeView}`}
          tabIndex={0}
          data-section08-stage={activeView}
        >
          {MULTI_VIEWS.map((view) => {
            const selected = view.id === activeView;
            const leaving = view.id === leavingView && !selected;

            return (
              <Image
                key={view.id}
                className={cx(
                  styles.multiViewLayer,
                  selected && styles.multiViewLayerActive,
                  leaving && styles.multiViewLayerLeaving,
                )}
                src={view.image}
                alt={view.alt}
                fill
                sizes="(max-width: 720px) calc(100vw - 40px), (max-width: 1320px) calc(100vw - 96px), 1160px"
                unoptimized
                aria-hidden={selected ? undefined : true}
                data-section08-image={view.id}
                onAnimationEnd={() => {
                  if (leaving) setLeavingView(null);
                }}
              />
            );
          })}
        </div>
      </div>

      {/* 分段切换器与主舞台是同一组 tab / tabpanel：点击或键盘切换 activeView。 */}
      <div className={styles.rubberSwitcher} data-section08-switcher>
        <RubberSegment
          items={MULTI_VIEWS.map((view) => ({ value: view.id, label: view.name }))}
          value={activeView}
          onChange={(value) => switchTo(value as MultiViewId)}
          trackColor="#e8e8ed"
          thumbColor="#1d1d1f"
          textColor="#45454b"
          activeTextColor="#ffffff"
          size="lg"
          radius={999}
          inset={4}
          equalSlots
          draggable
          panelId={MULTI_VIEW_PANEL_ID}
          tabIdPrefix="section08-tab-"
          itemDataAttribute="data-section08-tab"
          aria-label="多视图状态"
        />
      </div>

      <div className={styles.viewDescriptionWrap}>
        <p className={styles.viewDescription} data-section08-description>
          {activeViewData?.description}
        </p>
        <p className={styles.viewFacts} data-section08-facts>
          {MULTI_VIEW_FACTS}
        </p>
      </div>
    </>
  );
}
