"use client";

import { useEffect, useId, useRef, useState } from "react";
import { siteAsset } from "@/lib/site-asset";

type ControlProps = { kind: "multi" | "input" | "pagination" | "select" | "person" | "date" | "month" | "upload" | "project-table"; [key: string]: unknown };
type Instance = { update: (props: ControlProps) => void; destroy: () => void };
declare global {
  interface Window { OperationsOriginalUI?: { mount: (element: HTMLElement, props: ControlProps, onChange: (value: unknown) => void) => Instance } }
}

export function OriginalSelect({ label, value, options, onChange, disabled = false, clearable = false, filterable = false }: { label: string; value: string | number; options: { label: string; value: string | number }[]; onChange: (value: string | number) => void; disabled?: boolean; clearable?: boolean; filterable?: boolean }) {
  const placeholder = options.find((option) => option.value === value)?.label ?? "请选择";
  return <OriginalControl options={{ kind: "select", label, value, options, placeholder, disabled, clearable, filterable }} onChange={(next) => onChange(next as string | number)} />;
}
export function OriginalDate({ label, value, onChange, month = false }: { label: string; value: string; onChange: (value: string) => void; month?: boolean }) {
  return <OriginalControl options={{ kind: month ? "month" : "date", label, value }} onChange={(next) => onChange(String(next))} />;
}
export function OriginalInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  const id = useId();
  return <OriginalControl options={{ kind: "input", label, value, id, placeholder }} onChange={(next) => onChange(String(next))} />;
}
let runtime: Promise<void> | undefined;
function loadRuntime() {
  if (!runtime) runtime = new Promise<void>((resolve, reject) => {
    const style = document.createElement("link");
    style.rel = "stylesheet"; style.href = siteAsset("/work/operations-platform/controls/style.css?v=attachment-plus-2");
    document.head.appendChild(style);
    const script = document.createElement("script");
    script.src = siteAsset("/work/operations-platform/controls/controls.js?v=attachment-plus-2");
    script.onload = () => window.OperationsOriginalUI ? resolve() : reject(new Error("Component runtime unavailable"));
    script.onerror = () => reject(new Error("Component runtime failed to load"));
    document.head.appendChild(script);
  });
  return runtime;
}

export default function OriginalControl({ options, onChange, className = "" }: { options: ControlProps; onChange?: (value: unknown) => void; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const instance = useRef<Instance | null>(null);
  const latest = useRef({ options, onChange });
  const [failed, setFailed] = useState(false);
  useEffect(() => { latest.current = { options, onChange }; instance.current?.update(options); });
  useEffect(() => {
    let cancelled = false;
    loadRuntime().then(() => {
      if (!cancelled && host.current) instance.current = window.OperationsOriginalUI!.mount(host.current, latest.current.options, (value) => latest.current.onChange?.(value));
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; instance.current?.destroy(); instance.current = null; };
  }, []);
  return <div className={`ops-vue-control ${className}`} data-original-control={options.kind}>
    <div ref={host} />{failed && <p role="alert">组件加载失败，请刷新页面重试。</p>}
  </div>;
}
