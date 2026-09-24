"use client";

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

type SmoothAnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  /** 同页锚点，形如 `#section-04`。 */
  href: string;
  children?: ReactNode;
};

/**
 * 站内同页锚点：滚动到底时补一段平滑滚动。
 *
 * 为什么不是交给 CSS：`html { scroll-behavior }` 是全局的，设成 smooth 会
 * 连带把「路由切换时的滚动归零」也变成动画（症状 = 新页面从下面滚上来，见
 * globals.css 的注释）。所以那条全局规则固定为 auto，平滑滚动只在这些真正
 * 是「页内跳转」的锚点上显式发起。
 *
 * `href` 原样保留：中键 / Cmd+点击 / 无 JS 时仍然走浏览器原生跳转。
 * 落点会把目标自身的 `scroll-margin-top` 算进去（与原生锚点行为一致，
 * 章节顶部因此仍然让开导航条）。
 */
export default function SmoothAnchor({
  href,
  children,
  onClick,
  ...rest
}: SmoothAnchorProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    // 修饰键 / 中键：交给浏览器开新标签或新窗口。
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    if (!href.startsWith("#") || href.length < 2) return;
    const target = document.getElementById(href.slice(1));
    if (!target) return;

    event.preventDefault();
    const margin = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - margin);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
    // 与原生锚点一致：地址栏跟着更新，但不产生额外历史记录。
    window.history.pushState(null, "", href);
  };

  return (
    <a href={href} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
