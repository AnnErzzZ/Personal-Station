"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { projects } from "./projects";
import styles from "../../home/story/project-bookshelf.module.css";

const ProjectBookshelf = dynamic(() => import("./ProjectBookshelf"), {
  ssr: false,
  loading: () => <div className={styles.loading} role="status">正在整理书架…</div>,
});

export default function BookshelfDemo() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.wordmark}>伍子荣 <span>Zirong Wu</span></Link>
        <span className={styles.experiment}><i aria-hidden="true" />独立验证页</span>
      </header>
      <div className={styles.intro}>
        <h1>项目书架<span>.</span></h1>
        <p>把做过的项目，收成几本可以翻看的设计记录。</p>
      </div>
      <ProjectBookshelf items={projects} brand="Zirong Wu / Selected Work" />
      <footer className={styles.footer}>
        <span>交互原型 · 个人站项目选择器探索</span>
        <a href="https://componentry.dev/docs/components/newsletter-bookshelf" target="_blank" rel="noreferrer">基于 Componentry Newsletter Bookshelf ↗</a>
      </footer>
    </main>
  );
}
