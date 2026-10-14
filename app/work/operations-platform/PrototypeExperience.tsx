"use client";

import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconArrowUpRight, IconX } from "@tabler/icons-react";
import Image from "@/components/SiteImage";
import s from "./page.module.css";
import a from "./landing.module.css";
import previewSizes from "./preview-sizes.json";
import fullPreviewSizes from "./full-preview-sizes.json";

export type PrototypeId = "priority" | "work-orders" | "ownership" | "history" | "contribution";
const PANELS: [PrototypeId, string][] = [["priority", "项目总览"], ["work-orders", "工单池"], ["ownership", "工单详情"], ["history", "异常记录"], ["contribution", "贡献统计"]];
const PREVIEW_DETAILS: Record<PrototypeId, string> = {
  priority: "切换项目分组、筛选异常，并展开项目明细。",
  "work-orders": "筛选处理状态，打开工单继续排查。",
  ownership: "核对设备证据，填写处理记录并提交审批。",
  history: "在房间工单与设备异常之间切换，查看发生与恢复记录。",
  contribution: "按月份与处理人查看贡献，并追溯对应工单。",
};
const Context = createContext<{ active: PrototypeId | null; host: HTMLDivElement | null; open: (id: PrototypeId) => void } | null>(null);
const subscribe = () => () => {};
const focusable = 'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]';
export function usePrototypeExperience() {
  const context = useContext(Context);
  if (!context) throw new Error("Prototype experience requires its provider");
  return context;
}

export function PrototypeLaunch({ id }: { id: PrototypeId }) {
  const { open } = usePrototypeExperience();
  const name = PANELS.find(([panel]) => panel === id)?.[1];
  return <button type="button" className={a.prototypeLaunch} data-open-prototype={id} onClick={() => open(id)}>体验{name}<IconArrowUpRight size={17} /></button>;
}

export function PrototypeExperience({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<PrototypeId | null>(null);
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const body = useSyncExternalStore(subscribe, () => document.body, () => null);
  const open = (id: PrototypeId) => {
    if (!active) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setActive(id);
  };
  const isOpen = active !== null;
  useEffect(() => {
    if (!isOpen) return;
    const main = document.querySelector("main");
    const previousInert = main?.inert ?? false;
    const previousOverflow = document.documentElement.style.overflow;
    if (main) main.inert = true;
    document.documentElement.style.overflow = "hidden";
    overlay.current?.querySelector<HTMLButtonElement>('[data-close-experience]')?.focus({ preventScroll: true });
    const key = (event: KeyboardEvent) => {
      const poppers = Array.from(document.querySelectorAll<HTMLElement>('.ops-original-popper')).filter((el) => el.checkVisibility() && getComputedStyle(el).visibility !== "hidden");
      if (event.key === "Escape" && !poppers.length) { event.preventDefault(); setActive(null); }
      if (event.key !== "Tab") return;
      const elements = [...Array.from(overlay.current?.querySelectorAll<HTMLElement>(focusable) ?? []), ...poppers.flatMap((el) => Array.from(el.querySelectorAll<HTMLElement>(focusable)))].filter((el) => el.checkVisibility());
      const first = elements[0]; const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      document.documentElement.style.overflow = previousOverflow;
      if (main) main.inert = previousInert;
      opener.current?.focus({ preventScroll: true });
    };
  }, [isOpen]);

  return <Context.Provider value={{ active, host, open }}>
    {children}
    {body && createPortal(<div ref={overlay} className={`${s.page} ${a.experience}`} role="dialog" aria-modal="true" aria-labelledby="prototype-experience-title" hidden={!isOpen} data-prototype-experience data-active={active ?? ""}>
      <header className={a.experienceHeader}><div><span>合一运维平台</span><h2 id="prototype-experience-title">{PANELS.find(([id]) => id === active)?.[1] ?? "交互体验"}</h2></div><button type="button" data-close-experience onClick={() => setActive(null)}>返回案例<IconX size={20} /></button></header>
      <nav className={a.experienceNav} aria-label="体验界面">{PANELS.map(([id, label]) => <button type="button" key={id} data-experience-go={id} aria-current={active === id ? "page" : undefined} onClick={() => open(id)}>{label}</button>)}</nav>
      <div className={a.experienceContent} ref={setHost} />
    </div>, body)}
  </Context.Provider>;
}

export function PrototypePreview({ id, name, caption, children }: { id: PrototypeId; name: string; caption: string; children: ReactNode }) {
  const { active, host } = usePrototypeExperience();
  const file = id === "work-orders" ? "pool" : id === "ownership" ? "detail" : id;
  const fullSize = (fullPreviewSizes as Partial<Record<PrototypeId, { width: number; height: number }>>)[id];
  const size = fullSize ?? previewSizes[id];
  return <>
    <figure className={`${a.preview}${fullSize ? ` ${a.previewFull}` : ""}`} data-interface-preview={id} data-full-interface={fullSize ? "true" : undefined} style={{ "--preview-width": `${(fullSize ? previewSizes.priority.width : size.width) / 2}px`, "--full-preview-ratio": `${size.width} / ${size.height}` } as CSSProperties}>
      <div className={a.previewFrame}>
        <div className={a.previewMedia} tabIndex={fullSize ? undefined : 0} aria-label={fullSize ? `${name}完整页面预览` : `${name}界面，可横向查看完整内容`}><Image src={`/cases/operations-platform/previews/${file}${fullSize ? "-stage" : ""}.png`} alt={fullSize ? `${name}完整界面，包含工作台导航、页面位置与业务内容` : `${name}真实界面预览`} width={size.width} height={size.height} unoptimized sizes="(max-width: 700px) calc(100vw - 80px), (max-width: 1600px) calc(100vw - 160px), 1400px" /></div>
      </div>
      <figcaption><strong>{caption}</strong><p>{PREVIEW_DETAILS[id]}</p>{!fullSize && <span className={a.previewHint}>可横向查看完整界面</span>}</figcaption>
    </figure>
    {host && createPortal(<div className={a.experiencePanel} hidden={active !== id} data-experience-panel={id}>{children}</div>, host)}
  </>;
}
