"use client";

import { useEffect, useRef, type ReactNode } from "react";
import a from "./landing.module.css";

export default function ClosingSequence({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = root.current;
    const standards = container?.querySelector<HTMLElement>("#system");
    if (!container || !standards) return;

    // Hold the bottom of a tall chapter only after all its content has scrolled past.
    const measure = () => {
      container.style.setProperty("--standards-height", `${standards.offsetHeight}px`);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(standards, { box: "border-box" });
    measure();
    return () => observer.disconnect();
  }, []);

  return <div ref={root} className={a.closingSequence}>{children}</div>;
}
