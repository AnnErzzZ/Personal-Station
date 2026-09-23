"use client";

import { useSyncExternalStore } from "react";

// reduced-motion / 无 WebGL 时不上粒子层（也不加载 three）。
// server snapshot 一律按"支持"渲染，水合后再切换，避免 hydration mismatch。
let cached: boolean | null = null;

function getMotionSupport() {
  if (cached !== null) return cached;
  const reduced =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  let webgl = false;
  try {
    const probe = document.createElement("canvas");
    webgl = Boolean(probe.getContext("webgl2") ?? probe.getContext("webgl"));
  } catch {
    webgl = false;
  }
  cached = !reduced && webgl;
  return cached;
}

function subscribeMotionSupport(onChange: () => void) {
  const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  query?.addEventListener("change", onChange);
  return () => query?.removeEventListener("change", onChange);
}

export function useMotionSupport() {
  return useSyncExternalStore(
    subscribeMotionSupport,
    getMotionSupport,
    () => true,
  );
}
