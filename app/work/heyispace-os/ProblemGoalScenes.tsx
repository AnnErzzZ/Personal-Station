import type { ReactElement } from "react";

/**
 * 05 章五张 Problem × Goal 卡顶部的深色场景插画。
 *
 * 设计源：Ardot 画布「设计目标图标规格板」（file 728691930801580）。
 * 风格语言来自用户提供的参考图：深色底（#202329）上的微型场景画，
 * 使用灰白线框骨架 + 一条点线叙事 + 单强调色只落在
 * 「当前 / 正确」的语义位置。每幅 230×96 viewBox，承载一句设计目标的
 * 字面示意（切层锚点 / 任务归拢 / 空间路径 / 数据核验 / 层次暴露）。
 *
 * hover 动效：选择器挂在 .pgCard:hover 上、带 .pgReveal[data-entered]
 * 前缀（见 sections.module.css .pgScene 段）。SVG 元素用 data-r 属性
 * 而非 className 作动效钩子——规避 CSS Modules 哈希，也符合本站
 * 「选择器用 [data-*] 不按类名」的铁律。
 *
 * 遮挡铁律（v4 修正）：深色场景里的「卡片 / 面板」类元素必须带
 * 与底同色的 fill（#202329）才有真实遮挡，纯描边会互相透视。
 */

const SCENES: Record<string, ReactElement> = {
  "01": (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 230 96"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <marker
          id="pgSceneArrow01"
          markerHeight="5"
          markerWidth="5"
          orient="auto"
          refX="9"
          refY="5"
          viewBox="0 0 10 10"
        >
          <path d="M0 0L10 5L0 10z" fill="#6C9EFF" />
        </marker>
      </defs>
      <rect
        data-r="pA"
        height="56"
        rx="8"
        stroke="#C6CCD4"
        strokeWidth="1.5"
        width="78"
        x="18"
        y="20"
      />
      <rect fill="#4A5058" height="5" rx="2.5" width="44" x="30" y="36" />
      <rect fill="#4A5058" height="5" rx="2.5" width="36" x="30" y="48" />
      <rect fill="#4A5058" height="5" rx="2.5" width="28" x="30" y="60" />
      <rect
        data-r="pB"
        height="56"
        rx="8"
        stroke="#5D636C"
        strokeWidth="1.5"
        width="78"
        x="134"
        y="20"
      />
      <rect fill="#3A3F46" height="5" rx="2.5" width="44" x="146" y="36" />
      <rect fill="#3A3F46" height="5" rx="2.5" width="36" x="146" y="48" />
      <rect fill="#3A3F46" height="5" rx="2.5" width="28" x="146" y="60" />
      <path
        d="M97 44C110 33 121 33 133 44"
        markerEnd="url(#pgSceneArrow01)"
        stroke="#6C9EFF"
        strokeDasharray="4 4"
        strokeWidth="1.5"
      />
      <circle
        cx="97"
        cy="44"
        data-r="anchor"
        r="9"
        stroke="#6C9EFF59"
        strokeWidth="1.5"
      />
      <circle cx="97" cy="44" data-r="anchor" fill="#6C9EFF" r="4.5" />
    </svg>
  ),
  "02": (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 230 96"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        fill="#202329"
        height="56"
        rx="8"
        stroke="#C6CCD4"
        strokeWidth="1.5"
        width="86"
        x="18"
        y="20"
      />
      <rect
        data-r="taskbar"
        fill="#A78BFA"
        height="10"
        rx="5"
        width="50"
        x="30"
        y="32"
      />
      <rect fill="#4A5058" height="5" rx="2.5" width="56" x="30" y="50" />
      <rect fill="#4A5058" height="5" rx="2.5" width="40" x="30" y="62" />
      <path
        d="M130 28C114 28 112 38 105 42"
        data-r="dash"
        stroke="#A78BFAA6"
        strokeDasharray="3 3"
        strokeWidth="1.2"
      />
      <path
        d="M136 50C120 50 114 49 106 48"
        data-r="dash"
        stroke="#A78BFAA6"
        strokeDasharray="3 3"
        strokeWidth="1.2"
      />
      <path
        d="M130 72C114 72 112 60 105 55"
        data-r="dash"
        stroke="#A78BFAA6"
        strokeDasharray="3 3"
        strokeWidth="1.2"
      />
      <rect
        data-r="loose1"
        fill="#202329"
        height="12"
        rx="6"
        stroke="#4A5058"
        strokeWidth="1.5"
        width="74"
        x="130"
        y="22"
      />
      <rect
        data-r="loose2"
        fill="#202329"
        height="12"
        rx="6"
        stroke="#4A5058"
        strokeWidth="1.5"
        width="74"
        x="136"
        y="44"
      />
      <rect
        data-r="loose3"
        fill="#202329"
        height="12"
        rx="6"
        stroke="#4A5058"
        strokeWidth="1.5"
        width="74"
        x="130"
        y="66"
      />
    </svg>
  ),
  "03": (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 230 96"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        height="60"
        rx="8"
        stroke="#9AA1AB"
        strokeWidth="1.5"
        width="170"
        x="30"
        y="18"
      />
      <path d="M96 18v60M96 52h104" stroke="#4A5058" strokeWidth="1.5" />
      <path
        d="M46 64V40q0-6 6-6h62q6 0 6 6v16q0 6 6 6h24"
        data-r="flow"
        pathLength={1}
        stroke="#45C48C38"
        strokeLinecap="round"
        strokeWidth="6"
      />
      <path
        d="M46 64V40q0-6 6-6h62q6 0 6 6v16q0 6 6 6h24"
        data-r="flow"
        pathLength={1}
        stroke="#45C48C"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
      <circle cx="46" cy="64" fill="#45C48C" r="4.5" />
      <circle
        cx="156"
        cy="62"
        data-r="endpt"
        fill="#202329"
        r="4.5"
        stroke="#45C48C"
        strokeWidth="2"
      />
    </svg>
  ),
  "04": (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 230 96"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M30 76h96" stroke="#4A5058" strokeLinecap="round" strokeWidth="1.5" />
      <rect fill="#4A5058" height="24" rx="3" width="14" x="42" y="52" />
      <rect fill="#5A6068" height="36" rx="3" width="14" x="66" y="40" />
      <rect fill="#E8A33D" height="48" rx="3" width="14" x="90" y="28" />
      <path
        d="M106 28c16-6 26-7 34-7"
        data-r="ann"
        pathLength={1}
        stroke="#E8A33D"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
      <circle cx="156" cy="21" data-r="badge" fill="#3E9B6C" r="12" />
      <path
        d="M150.5 21l4 4 7.5-8.5"
        stroke="#EAF2ED"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
    </svg>
  ),
  "05": (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 230 96"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        data-r="bpanel"
        fill="#202329"
        height="50"
        rx="8"
        stroke="#3A3F46"
        strokeWidth="1.5"
        width="84"
        x="122"
        y="30"
      />
      <rect
        data-r="mpanel"
        fill="#202329"
        height="50"
        rx="8"
        stroke="#555C66"
        strokeWidth="1.5"
        width="84"
        x="90"
        y="24"
      />
      <rect
        data-r="fpanel"
        fill="#202329"
        height="60"
        rx="8"
        stroke="#C6CCD4"
        strokeWidth="1.5"
        width="92"
        x="24"
        y="16"
      />
      <circle cx="38" cy="30" fill="#9AA1AB" r="3.5" />
      <rect fill="#4A5058" height="5" rx="2.5" width="60" x="36" y="42" />
      <rect fill="#3A3F46" height="5" rx="2.5" width="46" x="36" y="54" />
      <rect fill="#3A3F46" height="5" rx="2.5" width="52" x="36" y="66" />
    </svg>
  ),
};

export function ProblemGoalScene({ index }: { index: string }) {
  return SCENES[index] ?? null;
}
