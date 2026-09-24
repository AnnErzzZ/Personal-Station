"use client";

/**
 * Hero 首屏渐变波浪背景（GradientWaves，React Bits）。
 *
 * 职责两件事：
 *   1) 把 GradientWaves 挂成 heroScene 里的绝对定位背景层
 *      （z-index -1 + heroScene isolation:isolate，压在页面底色上、
 *      所有正文内容之下）；
 *   2) 滚动淡出：scrollY 越过一个视口的 70% 即完全淡出并 visibility:hidden。
 *      不用 motion scrollYProgress —— 项目记忆里有移动端仿真初值异常的坑，
 *      纯 rAF + scroll 监听在全端行为一致。
 *
 * 性能：层高只有一屏，滚过首屏后容器离开视口，组件内部的
 * IntersectionObserver 会自动停掉 rAF 渲染循环。
 */

import { useEffect, useRef } from "react";

import GradientWaves from "./GradientWaves";
import styles from "./page.module.css";

/** 滚过多长距离后完全淡出（× 视口高）。 */
const FADE_RANGE = 0.7;

export default function HeroWaves() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const p = Math.min(
        1,
        Math.max(0, window.scrollY / (window.innerHeight * FADE_RANGE)),
      );
      layer.style.opacity = (1 - p).toFixed(3);
      layer.style.visibility = p >= 1 ? "hidden" : "visible";
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  // detail 档位：小屏降到 low（raymarch 步数 70 → 40）。只在 effect 外读一次
  // matchMedia；该 prop 只影响 canvas 内部 uniforms，不产生 SSR 水合差异。
  const detail =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 767px)").matches
      ? "low"
      : "medium";

  return (
    <div ref={layerRef} className={styles.heroWavesLayer} aria-hidden="true">
      <GradientWaves
        horizonColor="#17623e"
        waveColor="#b6f4d3"
        crestColor="#ffffff"
        speed={0.4}
        amplitude={2.5}
        waveScale={0.6}
        waveRatio={0.9}
        swell={35}
        turbulence={20}
        tilt={1.11}
        zoom={1.0}
        height={5.5}
        fogDepth={15}
        detail={detail}
        brightness={1.0}
        opacity={1.0}
        mouseInteraction
        parallaxStrength={0.5}
        grain
        grainIntensity={0.05}
      />
    </div>
  );
}
