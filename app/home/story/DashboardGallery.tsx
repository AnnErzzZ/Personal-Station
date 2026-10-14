"use client";

import { useRef, useState } from "react";
import Image from "@/components/SiteImage";
import { nextDashboardIndex, type DashboardImage } from "./dashboard-gallery";
import styles from "./dashboard-gallery.module.css";

export default function DashboardGallery({
  active,
  images,
}: {
  active: boolean;
  images: readonly DashboardImage[];
}) {
  const [index, setIndex] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const count = images.length || 3;
  const activeIndex = index % count;
  const current = images[activeIndex];
  const thumbnailStart = Math.min(Math.max(0, activeIndex - 1), Math.max(0, count - 3));
  const thumbnailIndices = Array.from({ length: Math.min(3, count) }, (_, position) => thumbnailStart + position);
  const change = (direction: -1 | 1) => {
    setIndex((value) => nextDashboardIndex(value, direction, count));
  };

  return (
    <section
      className={styles.gallery}
      data-dashboard-gallery=""
      data-active={active}
      aria-labelledby="dashboard-gallery-title"
      aria-roledescription="轮播"
      aria-hidden={!active}
      inert={!active}
      onKeyDown={(event) => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          change(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
    >
      <div className={styles.content}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>DATA VISUALIZATION</p>
          <h2 id="dashboard-gallery-title">数据大屏</h2>
        </header>
        <div
          className={styles.viewer}
          tabIndex={active && count > 1 ? 0 : -1}
          aria-label="数据大屏图片，可使用左右方向键切换"
          onTouchStart={(event) => {
            const touch = event.touches.length === 1 ? event.touches[0] : null;
            touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
          }}
          onTouchEnd={(event) => {
            const start = touchStart.current;
            const end = event.changedTouches[0];
            touchStart.current = null;
            if (!start || !end) return;
            const dx = end.clientX - start.x;
            const dy = end.clientY - start.y;
            if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.3) {
              change(dx < 0 ? 1 : -1);
            }
          }}
          onTouchCancel={() => { touchStart.current = null; }}
        >
          {current ? (
            <Image
              key={current.src}
              className={styles.image}
              src={current.src}
              alt={current.alt}
              fill
              sizes="(max-width: 640px) 92vw, 88vw"
              loading={active ? "eager" : "lazy"}
              data-dashboard-image=""
            />
          ) : (
            <div className={styles.empty} data-dashboard-placeholder="">
              <span className={styles.placeholderNumber}>{String(activeIndex + 1).padStart(2, "0")}</span>
              <p>数据大屏 · 图片占位</p>
            </div>
          )}
        </div>
        <div className={styles.thumbnailNavigation}>
          <button type="button" className={styles.arrow} data-dashboard-previous="" aria-label="上一张大屏" onClick={() => change(-1)} disabled={count < 2}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14 6-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <div className={styles.thumbnails} role="group" aria-label="选择大屏图片">
            {thumbnailIndices.map((thumbnailIndex) => (
              <button
                key={images[thumbnailIndex]?.src ?? thumbnailIndex}
                type="button"
                className={styles.thumbnail}
                data-dashboard-thumbnail={thumbnailIndex}
                aria-label={`查看第 ${thumbnailIndex + 1} 张大屏`}
                aria-pressed={thumbnailIndex === activeIndex}
                onClick={() => setIndex(thumbnailIndex)}
              >
                {images[thumbnailIndex] ? (
                  <Image src={images[thumbnailIndex].src} alt="" fill sizes="112px" className={styles.thumbnailImage} />
                ) : (
                  <span className={styles.thumbnailNumber} aria-hidden="true">{String(thumbnailIndex + 1).padStart(2, "0")}</span>
                )}
              </button>
            ))}
          </div>
          <button type="button" className={styles.arrow} data-dashboard-next="" aria-label="下一张大屏" onClick={() => change(1)} disabled={count < 2}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m10 6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
        <footer className={styles.footer}>
          <span className={styles.counter} aria-live="polite" aria-atomic="true">
            {String(activeIndex + 1).padStart(2, "0")} <span className={styles.total}>/ {String(count).padStart(2, "0")}</span>
          </span>
        </footer>
      </div>
    </section>
  );
}
