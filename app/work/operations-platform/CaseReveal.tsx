"use client";

import { useEffect, useRef, type ReactNode } from "react";
import a from "./athos.module.css";

/** Keep server-rendered content readable; only prepare offscreen content for entry. */
export default function CaseReveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !window.IntersectionObserver) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    const reveal = () => { element.dataset.motion = "visible"; };
    const prepare = () => {
      observer?.disconnect();
      if (preference.matches) { reveal(); return; }
      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) { reveal(); return; }
      element.dataset.motion = "pending";
      observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          reveal();
          observer?.disconnect();
        }
      }, { rootMargin: "0px 0px -40px 0px", threshold: 0 });
      observer.observe(element);
    };
    prepare();
    preference.addEventListener("change", prepare);
    return () => { observer?.disconnect(); preference.removeEventListener("change", prepare); };
  }, []);

  return <div ref={ref} className={`${a.reveal} ${className}`} onFocusCapture={() => {
    if (ref.current) ref.current.dataset.motion = "visible";
  }}>{children}</div>;
}
