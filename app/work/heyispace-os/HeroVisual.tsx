"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

import { siteAsset } from "@/lib/site-asset";

import { HERO_GAP_BOTTOM, HERO_GAP_TOP, HERO_MIN_WIDTH } from "./hero-stage";
import styles from "./page.module.css";

/**
 * Hero 主图（agent.png，2026-09-24 换为 2880×1800 的矮版）。
 *
 * 尺寸不写死：每帧解一次「首屏还剩下多少高度给主图」——
 *   availH = innerHeight − 导航高 − 主图下方全部内容（场景 padding + 标题
 *            + 卡片组 + 组间间距）
 * 再按图片自身的宽高比换算宽度，上限取内容轴（1320）与可用宽度。
 * 结果写进 --ho-hero-w，CSS 只负责宽度与圆角。
 *
 * 这样不管什么窗口高度（或 Anner 换成更矮的主图），
 * 「主图 + 标题行 + 三卡」都能完整落在同一屏里，顶部不会被顶掉 —— 这是
 * 外层 .heroStage 整组吸顶（一枚滚动行程内位置不变）的前提。
 *
 * 主图下方的距离与主图高度无关（量的是「图片底到卡片底」的固定距离），
 * 因此一次测量即可，不存在图片改高→重新测量的循环。
 *
 * 同一处还负责两件事（都写在 DOM 上，供 CSS / Section01ProjectContext 读）：
 *   · --ho-hero-top：吸顶位，写在 .heroStage 上（吸顶由整组承担）；
 *   · data-ho-stack：整组装得下 = rigid（吸顶保持），装不下 = flow（回流式）。
 */
export default function HeroVisual() {
  const figRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const fig = figRef.current;
    const stage = fig?.closest<HTMLElement>("[data-ho-stage]");
    const track = fig?.closest<HTMLElement>("[data-ho-stage-track]");
    const img = fig?.querySelector("img");
    const facts = document.querySelector<HTMLElement>('[data-ho-context-part="facts"]');
    const nav = document.querySelector<HTMLElement>("[data-ho-case-nav]");
    if (!fig || !stage || !track || !img || !facts || !nav) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      // 吸顶位 = 导航实测高度 + GAP_TOP：不写死 65px（导航改高就不会再压住主图），
      // 高度撑满时主图顶与导航之间也始终留一条缝。
      const navH = nav.getBoundingClientRect().height;
      const top = Math.round(navH + HERO_GAP_TOP);
      // 吸顶位写在舞台（外层）上：整组共用同一个吸顶位，主图的
      // scroll-margin-top 也从这里继承。
      stage.style.setProperty("--ho-hero-top", `${top}px`);

      // 单栏（≤767）时卡片竖向堆叠，首屏塞不下整组，「剩余高度」没有意义：
      // 交给 CSS 的轴线宽度（100% - 2×inset），主图保持完整比例，舞台回流式。
      if (window.innerWidth < 768) {
        fig.style.removeProperty("--ho-hero-w");
        track.dataset.hoStack = "flow";
        return;
      }
      // 位图未就绪时的兜底比例 = 当前素材 2880×1800（16:10）。
      const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 16 / 10;
      // 图片底到卡片底：主图下方所有需要同屏的内容（场景内衬 + 标题区 + 卡片组）。
      const below =
        facts.getBoundingClientRect().bottom - fig.getBoundingClientRect().bottom;
      const availH = window.innerHeight - top - below - HERO_GAP_BOTTOM;
      // 尺寸以高度为准（宽度不强制撑满内容轴）；仅保留内容轴作为超宽屏上限，
      // 免得主图比正文列还宽。
      const axis = facts.getBoundingClientRect().width;
      const width = Math.max(HERO_MIN_WIDTH, Math.min(availH * ratio, axis));
      fig.style.setProperty("--ho-hero-w", `${Math.round(width)}px`);
      // 主图被最小宽度顶住时整组必然放不进一屏：退回普通文档流，
      // 否则吸顶会把卡片组压在视口下缘之外。
      track.dataset.hoStack = availH * ratio >= HERO_MIN_WIDTH - 0.5 ? "rigid" : "flow";
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    schedule();
    // 图片位图就绪后才能读到真实宽高比（Anner 换图也不用改代码）。
    if (img.complete) schedule();
    else img.addEventListener("load", schedule, { once: true });
    document.fonts?.ready.then(schedule).catch(() => {});
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    // 断点跨越要重新量：手机仿真 / 旋转时视口 meta 生效不一定会发 resize，
    // 漏掉会让 data-ho-stack 停在错误的一档。
    const narrow = window.matchMedia("(max-width: 767px)");
    narrow.addEventListener("change", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      narrow.removeEventListener("change", schedule);
    };
  }, []);

  return (
    <div className={styles.heroVisualTrack}>
      <figure ref={figRef} id="heyispace-hero-image" className={styles.heroVisual}>
        <Image
          className={styles.heroImage}
          src={siteAsset("/cases/heyispace-os/hero/agent.png")}
          alt="Heyispace OS 的 Agent 与空间运行数据界面"
          width={2880}
          height={1800}
          sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1400px) calc(100vw - 120px), 1320px"
          loading="eager"
        />
      </figure>
    </div>
  );
}
