"use client";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import styles from "./case-study.module.css";
export default function CaseMotion({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const sections = [...root.querySelectorAll<HTMLElement>("[data-chapter], [data-illustration]")];
    const visible = new Set<Element>();
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => sections.forEach(section => { section.dataset.motion = visible.has(section) && !document.hidden && !media.matches ? "running" : "paused"; });
    const observer = new IntersectionObserver(entries => { entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target)); update(); }, { threshold: 0 });
    sections.forEach(section => observer.observe(section));
    media.addEventListener("change", update); document.addEventListener("visibilitychange", update);
    return () => { observer.disconnect(); media.removeEventListener("change", update); document.removeEventListener("visibilitychange", update); };
  }, []);
  return <div className={styles.case} ref={ref}>{children}</div>;
}
/** Only the original product display scales; page text reflows independently. */
export function MockupViewport({ width, height, children, className = "", label }: { width: number; height: number; children: ReactNode; className?: string; label: string; }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const resize = () => el.style.setProperty("--art-scale", String(el.clientWidth / width));
    const observer = new ResizeObserver(resize); observer.observe(el); resize(); return () => observer.disconnect();
  }, [width]);
  return <div className={`${styles.artViewport} ${className}`} ref={ref} role="img" aria-label={label} style={{ aspectRatio: `${width} / ${height}`, "--art-width": `${width}px`, "--art-height": `${height}px` } as CSSProperties}><div className={styles.artCanvas} aria-hidden="true">{children}</div></div>;
}
