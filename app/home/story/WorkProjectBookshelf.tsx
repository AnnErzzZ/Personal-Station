"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type { WorkProject } from "./WorkProjectFolder";
import styles from "./work-project-bookshelf.module.css";

const ProjectBookshelf = dynamic(() => import("./ProjectBookshelf"), {
  ssr: false,
  loading: () => <p className={styles.loading} role="status">正在整理书架…</p>,
});

export default function WorkProjectBookshelf({ projects, open, onOpenChange }: {
  projects: WorkProject[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const layer = useRef<HTMLDivElement>(null);
  const [prepared, setPrepared] = useState(false);
  const [active, setActive] = useState(false);
  const items = useMemo(() => projects.map((project) => {
    const id = project.href.split("/").at(-1)!;
    return { ...project, id, date: project.meta.slice(2).join(" / "),
      jacket: `/lab/project-bookshelf/${id}-jacket.png`,
      color: "#30343b", foil: "#e4e8ed", tags: project.meta };
  }), [projects]);

  useEffect(() => {
    const node = layer.current;
    if (!node) return;
    const story = node.closest<HTMLElement>("[data-story-container]");
    const update = () => {
      const visible = (node.dataset.sectionMotion === "entering" || node.dataset.sectionMotion === "entered")
        && (!story?.dataset.workContent || story.dataset.workContent === "projects");
      if (visible) setPrepared(true);
      setActive(visible);
    };
    const observer = new MutationObserver(update);
    observer.observe(node, { attributes: true, attributeFilter: ["data-section-motion"] });
    if (story) observer.observe(story, { attributes: true, attributeFilter: ["data-work-content"] });
    const frame = requestAnimationFrame(update);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, []);

  return <div ref={layer} className={styles.layer} data-work-folder="" data-work-bookshelf="" data-render-active={active} data-section-motion="hidden" data-state="off">
    {prepared && <ProjectBookshelf items={items} brand="Zirong Wu / Selected Work"
      variant="home" height="100%" active={active} open={open} onOpenChange={onOpenChange} />}
  </div>;
}
