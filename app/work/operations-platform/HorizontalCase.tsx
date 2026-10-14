"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import a from "./hokaido.module.css";

const SCENES = [
  ["overview", "项目概览"], ["background", "协作难题"], ["users", "用户职责"],
  ["structure", "平台结构"], ["priority", "项目优先级"], ["work-orders", "工单池"],
  ["ownership", "工单详情"], ["history", "异常记录"], ["workflow", "工单流转"],
  ["contribution", "贡献统计"], ["system", "界面规范"], ["reflection", "设计复盘"],
] as const;
const PROTOTYPE = '[data-workspace], #hero-prototype';

export default function HorizontalCase({ children }: { children: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  const pausedRef = useRef(false);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const pause = (value: boolean) => { pausedRef.current = value; setPaused(value); };

  const navigate = (index: number) => {
    const viewport = track.current;
    if (!viewport) return;
    const next = Math.max(0, Math.min(SCENES.length - 1, index));
    const scene = viewport.querySelector<HTMLElement>(`#${SCENES[next][0]}`);
    if (!scene) return;
    pause(false);
    const behavior = matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
    if (matchMedia("(min-width: 1101px)").matches) {
      viewport.scrollTo({ left: scene.offsetLeft - viewport.offsetLeft, behavior });
    } else scene.scrollIntoView({ behavior, block: "start" });
  };

  useEffect(() => {
    const viewport = track.current;
    if (!viewport) return;
    const desktop = matchMedia("(min-width: 1101px)");
    const scenes = Array.from(viewport.querySelectorAll<HTMLElement>("[data-hokaido-scene]"));
    let frame = 0;
    let wheelUntil = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        let index = 0;
        let distance = Infinity;
        scenes.forEach((scene, i) => {
          const rect = scene.getBoundingClientRect();
          const d = Math.abs(desktop.matches ? rect.left : rect.top - 90);
          if (d < distance) { distance = d; index = i; }
          scene.dataset.active = String(i === index);
        });
        scenes.forEach((scene, i) => { scene.dataset.active = String(i === index); });
        activeRef.current = index;
        setActive(index);
      });
    };
    const wheel = (event: WheelEvent) => {
      if (!desktop.matches || event.ctrlKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(PROTOTYPE)) return;
      if (pausedRef.current) { event.preventDefault(); return; }
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      // Longer scene bodies keep their own vertical scroll before the story advances.
      for (let node = target; node && node !== viewport; node = node.parentElement) {
        if (node instanceof HTMLElement && /auto|scroll/.test(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight + 2) {
          if ((event.deltaY > 0 && node.scrollTop < node.scrollHeight - node.clientHeight - 2) || (event.deltaY < 0 && node.scrollTop > 2)) return;
        }
      }
      event.preventDefault();
      if (Math.abs(event.deltaY) < 12 || performance.now() < wheelUntil) return;
      wheelUntil = performance.now() + 850;
      const next = Math.max(0, Math.min(scenes.length - 1, activeRef.current + Math.sign(event.deltaY)));
      const behavior = matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
      viewport.scrollTo({ left: scenes[next].offsetLeft - viewport.offsetLeft, behavior });
    };
    const lock = (event: Event) => {
      if (desktop.matches && event.target instanceof Element && event.target.closest(PROTOTYPE)) pause(true);
    };
    const anchor = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href^="#"]') : null;
      if (!link) return;
      const index = SCENES.findIndex(([id]) => `#${id}` === link.getAttribute("href"));
      if (index < 0) return;
      event.preventDefault();
      navigate(index);
      history.replaceState(null, "", `#${SCENES[index][0]}`);
    };
    const resize = () => {
      if (!desktop.matches) { viewport.scrollLeft = 0; pause(false); }
      sync();
    };
    viewport.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", resize);
    viewport.addEventListener("wheel", wheel, { passive: false });
    viewport.addEventListener("focusin", lock);
    viewport.addEventListener("pointerdown", lock);
    viewport.addEventListener("click", anchor);
    sync();
    const initial = SCENES.findIndex(([id]) => `#${id}` === location.hash);
    if (initial > 0) navigate(initial);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("scroll", sync);
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", resize);
      viewport.removeEventListener("wheel", wheel);
      viewport.removeEventListener("focusin", lock);
      viewport.removeEventListener("pointerdown", lock);
      viewport.removeEventListener("click", anchor);
    };
    // The listeners use refs for interaction state; children retain their shared prototype state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>
    <div ref={track} className={a.track} data-horizontal-case tabIndex={0} aria-label="合一运维平台案例" onKeyDown={(event) => {
      if (event.target instanceof Element && event.target.closest(`${PROTOTYPE}, input, textarea, select, button, a`)) return;
      const step = ["ArrowRight", "PageDown"].includes(event.key) ? 1 : ["ArrowLeft", "PageUp"].includes(event.key) ? -1 : 0;
      if (step || ["Home", "End"].includes(event.key)) {
        event.preventDefault();
        navigate(event.key === "Home" ? 0 : event.key === "End" ? SCENES.length - 1 : activeRef.current + step);
      }
    }}>{children}</div>
    <nav className={a.controller} aria-label="案例章节" data-case-controller data-active={active} data-paused={paused}>
      <div className={a.currentScene}><span>{String(active + 1).padStart(2, "0")}</span><span>/ 12</span><strong>{SCENES[active][1]}</strong></div>
      <div className={a.chapterLinks}>{SCENES.map(([id, label], index) => <button type="button" key={id} data-scene-go={index} aria-label={`第 ${index + 1} 章：${label}`} aria-current={active === index ? "step" : undefined} title={label} onClick={() => navigate(index)}><span>{label}</span><i /></button>)}</div>
      <div className={a.controllerActions}>
        <button type="button" className={a.resume} data-case-resume onClick={() => { pause(false); track.current?.focus({ preventScroll: true }); }}>{paused ? "继续浏览" : "滚动探索"}<IconArrowRight size={16} /></button>
        <button type="button" className={a.arrow} aria-label="上一章" disabled={active === 0} onClick={() => navigate(active - 1)}><IconArrowLeft size={20} /></button>
        <button type="button" className={a.arrow} aria-label="下一章" disabled={active === SCENES.length - 1} onClick={() => navigate(active + 1)}><IconArrowRight size={20} /></button>
      </div>
      <div className={a.progress} style={{ width: `${(active + 1) / SCENES.length * 100}%` }} />
    </nav>
  </>;
}
