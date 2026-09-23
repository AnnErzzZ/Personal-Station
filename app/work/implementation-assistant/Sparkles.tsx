"use client";

import { useEffect, useRef } from "react";

import styles from "./sparkles.module.css";

type SparklesProps = {
  className?: string;
  /** 每 400×400 区域的粒子数，对应参考实现里的 particleDensity。 */
  density?: number;
  minSize?: number;
  maxSize?: number;
  /** 闪烁与漂移速度倍率，对应参考实现里的 speed。 */
  speed?: number;
  color?: string;
};

const DENSITY_BASE_AREA = 400 * 400;
const MIN_PARTICLES = 120;
const MAX_PARTICLES = 2400;

type Particle = {
  x: number;
  y: number;
  radius: number;
  peakOpacity: number;
  twinkleSpeed: number;
  phase: number;
  driftX: number;
  driftY: number;
};

function hexToRgb(hex: string) {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((char) => char + char)
          .join("")
      : raw;
  const value = Number.parseInt(full, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

/** 预渲染一颗带柔边的粒子，避免逐帧画上千个圆弧。 */
function createSprite(color: string) {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const { r, g, b } = hexToRgb(color);
  const mid = size / 2;
  const gradient = ctx.createRadialGradient(mid, mid, 0, mid, mid, mid);
  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
  gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.82)`);
  gradient.addColorStop(0.62, `rgba(${r}, ${g}, ${b}, 0.2)`);
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return canvas;
}

/**
 * Aceternity「Sparkles」的等价实现（无第三方依赖）：
 * https://ui.aceternity.com/components/sparkles
 * 行为对齐 @tsparticles 的默认参数：面积决定粒子数、尺寸 0.4–1、
 * 透明度在 0.1–1 之间随机闪烁、缓慢漂移；reduced motion 下只画静态一帧。
 */
export default function Sparkles({
  className,
  density = 1200,
  minSize = 0.4,
  maxSize = 1.1,
  speed = 4,
  color = "#ffffff",
}: SparklesProps) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const sprite = createSprite(color);

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let frameId = 0;
    let running = false;
    let visible = false;
    let lastTimestamp = 0;
    let elapsed = 0;

    const seed = () => {
      const count = Math.max(
        MIN_PARTICLES,
        Math.min(
          MAX_PARTICLES,
          Math.round((width * height) / DENSITY_BASE_AREA * density),
        ),
      );

      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: minSize + Math.random() * Math.max(0, maxSize - minSize),
        peakOpacity: 0.1 + Math.random() * 0.9,
        twinkleSpeed: speed * (0.9 + Math.random() * 1.2),
        phase: Math.random() * Math.PI * 2,
        driftX: (Math.random() - 0.5) * speed * 0.9,
        driftY: (Math.random() - 0.5) * speed * 0.9,
      }));
    };

    const paint = () => {
      ctx.clearRect(0, 0, width, height);

      for (const particle of particles) {
        const pulse =
          0.5 + 0.5 * Math.sin(particle.phase + elapsed * particle.twinkleSpeed);
        ctx.globalAlpha = 0.08 + (particle.peakOpacity - 0.08) * pulse;

        const size = particle.radius * 3.2;
        ctx.drawImage(
          sprite,
          particle.x - size / 2,
          particle.y - size / 2,
          size,
          size,
        );
      }

      ctx.globalAlpha = 1;
    };

    const step = (timestamp: number) => {
      if (!lastTimestamp) lastTimestamp = timestamp;
      const delta = Math.min(0.05, (timestamp - lastTimestamp) / 1000);
      lastTimestamp = timestamp;
      elapsed += delta;

      for (const particle of particles) {
        particle.x += particle.driftX * delta;
        particle.y += particle.driftY * delta;

        if (particle.x < 0) particle.x += width;
        else if (particle.x > width) particle.x -= width;
        if (particle.y < 0) particle.y += height;
        else if (particle.y > height) particle.y -= height;
      }

      paint();
      frameId = window.requestAnimationFrame(step);
    };

    const start = () => {
      if (running || reduceMotion || !visible || document.hidden) return;
      running = true;
      lastTimestamp = 0;
      frameId = window.requestAnimationFrame(step);
    };

    const stop = () => {
      running = false;
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
    };

    const resize = () => {
      // clientWidth/Height 取布局尺寸，不受父级 reveal 过渡的 transform 影响。
      const hostWidth = host.clientWidth;
      const hostHeight = host.clientHeight;
      if (hostWidth < 1 || hostHeight < 1) return;

      width = hostWidth;
      height = hostHeight;

      const ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      seed();
      paint();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    // 只在进入视口时跑 rAF，避免与 04/05 的滚动模型抢帧。
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visible = entry.isIntersecting;
          if (visible) start();
          else stop();
        }
      },
      { rootMargin: "200px" },
    );
    intersectionObserver.observe(host);

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    resize();

    return () => {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [color, density, maxSize, minSize, speed]);

  return (
    <span aria-hidden="true" className={className} ref={hostRef}>
      <canvas className={styles.canvas} ref={canvasRef} />
    </span>
  );
}
