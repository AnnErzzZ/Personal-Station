"use client";

/**
 * 叙事 Section 的滚动定位。
 *
 * 换幕改版后，四个 Section 都叠在同一个 sticky 舞台上（inset: 0），
 * 它们的 `offsetTop` 全是 0 —— 所以可读阶段的起点直接写在
 * `data-scroll-start-vh` 上（= 该 hold 段在时间轴上的起点，单位 vh），
 * 由 StoryScrolly 按 story-config 的段长写出来。
 *
 * `data-move-vh` 是改版前的写法（Section 自己占位 + 内层 sticky），
 * 作为兜底保留：容器外的普通 Section 仍走它。
 */
export function sectionScrollTarget(id: string): number | null {
  const el = document.getElementById(id);
  if (!el) return null;
  const container = el.closest("[data-story-container]");
  if (!container) {
    return el.getBoundingClientRect().top + window.scrollY;
  }
  const containerTop = container.getBoundingClientRect().top + window.scrollY;
  const startVh = el.getAttribute("data-scroll-start-vh");
  if (startVh !== null) {
    // ⚠ 必须向上取整到整数 px：平滑滚动落地时浏览器把目标吸附到整数像素，
    // 小数目标可能向下丢零点几 px —— 恰好落在 hold 边界**外侧**，segmentAt
    // 仍解析为前一个 move 段，静态帧接管 / hash / 停帧判定全部不触发
    //（2026-09-21 实测：work 起点 4874.2px，落在 4874.0px，差 0.2px）。
    // ceil 后落点恒在边界内侧 ≤1px，视觉上仍是同一构图。
    return Math.ceil(containerTop + (Number(startVh) / 100) * window.innerHeight);
  }
  const moveVh = Number(el.getAttribute("data-move-vh") ?? 0);
  return containerTop + el.offsetTop + (moveVh / 100) * window.innerHeight;
}

export function scrollToSection(id: string) {
  if (id === "top") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const target = sectionScrollTarget(id);
  if (target !== null) {
    window.scrollTo({ top: target, behavior: "smooth" });
  }
}
