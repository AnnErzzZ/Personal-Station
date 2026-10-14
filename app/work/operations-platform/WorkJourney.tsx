"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import a from "./landing.module.css";

export default function WorkJourney({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const navigate = useCallback((index: number, instant = false) => {
    const container = root.current; if (!container) return;
    const section = container.querySelectorAll<HTMLElement>("[data-case-chapter]")[index];
    if (!section) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const offset = 100;
    const target = scrollY + section.getBoundingClientRect().top - offset;
    window.scrollTo({ top: target, behavior: instant || reduced ? "instant" : "smooth" });
  }, []);
  useEffect(() => {
    const container = root.current;
    if (!container) return;
    const ids = ["work-orders", "ownership", "history"];
    const anchor = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href^="#"]') : null;
      const index = ids.indexOf(link?.getAttribute("href")?.slice(1) ?? "");
      if (index < 0) return;
      event.preventDefault(); navigate(index);
      history.replaceState(null, "", `#${ids[index]}`);
    };
    document.addEventListener("click", anchor);
    const initial = ids.indexOf(location.hash.slice(1));
    if (initial >= 0) navigate(initial, true);
    return () => { document.removeEventListener("click", anchor); };
  }, [navigate]);
  return <div ref={root} className={a.journey} data-work-journey>
    <div className={a.journeyStage} data-journey-stage>
      <div className={a.journeyWindow} data-journey-window><div className={a.journeyTrack}>{children}</div></div>
    </div>
  </div>;
}
