"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type RevealOnViewProps = {
  children: ReactNode;
  className?: string;
};

/**
 * 断点触发式入场（03 Users & Tasks 章专用）：
 * 元素进入视口后给容器写 data-entered="true"，子块的 opacity / translateY
 * 过渡和 stagger 延迟全部交给 sections.module.css 的 .revealItem 控制。
 *
 * 机制与 implementation-assistant 的 RevealGroup 一致（只做一次、只动
 * opacity 与极小位移），但样式不跨 case 复用，避免两个案例页耦合。
 * reduced motion 下直接进入终态，不注册观察器。
 */
export default function RevealOnView({
  children,
  className,
}: RevealOnViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setEntered(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setEntered(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      data-entered={entered ? "true" : "false"}
    >
      {children}
    </div>
  );
}
