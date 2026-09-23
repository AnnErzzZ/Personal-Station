"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import styles from "./sections.module.css";

/**
 * 04/14 · 核心链路动画总览（2026-09-22 新增，嵌在「复杂度从哪里来」章首）。
 *
 * 以 NexusFlow 式「中心辐射 + 放射连线」呈现系统六个模块的依赖关系，
 * 模块清单沿用旧 02 系统协同图的六项 capabilities（01 空间与地图 / 02 设备 /
 * 03 策略 / 04 运行数据 / 05 系统与权限 / 06 Agent），中心为核心枢纽。
 *
 * 事实边界（docs/cases/heyispace-os.md §0 / §G）：
 * - Agent 为点线连接 + dashed 边框，只读取与分析；节点与浮层上的
 *   「Demo / 内部验证」状态胶囊已于 2026-09-23 按用户决定下线，
 *   状态口径改由 12 章状态分组与导语承载；
 * - 模块描述与 04 章 System Relationship Map 同源，不引入新能力声明；
 * - 动画为氛围性总览，能力细节仍以下方静态关系图为准。
 *
 * 2026-09-22 hover 说明补齐：七个节点（六模块 + 中心 Heyispace OS）全部
 * 支持 hover 说明，文案为定稿版本（只描述能力，不含发布状态 / 客户数量 /
 * 使用频率 / 效率数据 / 用户反馈 / 业务收益）。中心节点 hover 时叠加
 * data-tip="core"，仅强化中心自身（图标提亮 + 外圈增强），外部模块保持
 * 默认；模块 hover 时对应连线变亮、其余连线退暗（见 sections.module.css
 * 「说明浮层」块）。说明浮层仍是节点附近的轻量卡片，不遮挡关键节点。
 *
 * 实现要点：
 * - 三档坐标模式（重排而非缩放，与 Map 移动端策略一致）：
 *   ≥1181 桌面 1240×640 / 721–1180 平板 900×560 / ≤720 移动 236×640；
 *   1440 / 1080 / 390 三个验收视口下面板内宽均 ≥ 舞台宽，1:1 呈现；
 * - 循环动画：中心光晕呼吸、恰好 3 个环形轨道光点绕行（同心圆顺时针，
 *   常亮连贯；2026-09-22 按反馈由 9 轨道点 + 5 漂浮点精简为 3 个）；
 *   连线为静态虚线；prefers-reduced-motion 下全部静态化；
 * - 悬停聚焦：激活模块放大、连线高亮，其余元素退暗（触屏点按同样生效）；
 *   说明浮层为定稿文案（2026-09-22），七个节点全部可 hover；
 * - 中文文本一律 ≥14px（章节字号底线断言）。
 */

type ChainModule = {
  key: string;
  idx: string;
  name: string;
  desc: string;
  color: string;
  /** 粒子亮芯颜色（比主色浅一档）。 */
  coreColor: string;
  icon: ReactNode;
  /** Agent 只读接入：点线连接 + dashed 边框。 */
  dotted?: boolean;
  desktop: { x: number; y: number };
  tablet: { x: number; y: number };
  mobile: { x: number; y: number };
};

const MODULES: ChainModule[] = [
  {
    key: "space",
    idx: "01",
    name: "空间与地图",
    desc: "组织空间结构与地图信息，承载多视图查看和空间配置。",
    color: "#fb923c",
    coreColor: "#fbca9a",
    icon: (
      <>
        <path d="M21 8 12 3 3 8v8l9 5 9-5Z" />
        <path d="M3 8l9 5 9-5" />
        <path d="M12 13v8" />
      </>
    ),
    desktop: { x: 620, y: 125 },
    tablet: { x: 450, y: 110 },
    mobile: { x: 64, y: 250 },
  },
  {
    key: "device",
    idx: "02",
    name: "设备",
    desc: "管理设备的位置、状态、控制、日志与异常信息。",
    color: "#3b82f6",
    coreColor: "#aecbfa",
    icon: (
      <>
        <rect x="6.5" y="6.5" width="11" height="11" rx="2" />
        <rect x="10" y="10" width="4" height="4" />
        <path d="M9 3v3.5M15 3v3.5M9 17.5V21M15 17.5V21M3 9h3.5M3 15h3.5M17.5 9H21M17.5 15H21" />
      </>
    ),
    desktop: { x: 900, y: 222 },
    tablet: { x: 675, y: 205 },
    mobile: { x: 172, y: 250 },
  },
  {
    key: "policy",
    idx: "03",
    name: "策略",
    desc: "配置自动控制规则，定义触发条件、执行动作与运行状态。",
    color: "#a78bfa",
    coreColor: "#ddd0fe",
    icon: (
      <path d="M3 6h18M3 12h18M3 18h18M15 3.2v5.6M8 9.2v5.6M17 15.2v5.6" />
    ),
    desktop: { x: 900, y: 418 },
    tablet: { x: 675, y: 355 },
    mobile: { x: 64, y: 400 },
  },
  {
    key: "data",
    idx: "04",
    name: "运行数据",
    desc: "汇总空间使用、设备运行与环境变化等数据，帮助判断空间运行情况。",
    color: "#4ade80",
    coreColor: "#b8f5cd",
    icon: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
    desktop: { x: 620, y: 515 },
    tablet: { x: 450, y: 450 },
    mobile: { x: 172, y: 400 },
  },
  {
    key: "perm",
    idx: "05",
    name: "系统与权限",
    desc: "管理用户、角色与权限，约束可见范围和操作边界。",
    color: "#f472b6",
    coreColor: "#fbd3e8",
    icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />,
    desktop: { x: 340, y: 418 },
    tablet: { x: 225, y: 355 },
    mobile: { x: 64, y: 550 },
  },
  {
    key: "agent",
    idx: "06",
    name: "Agent",
    desc: "基于已有业务数据提供查询、分析与追问能力，并将结果组织为结论、指标、图表、发现与明细。",
    color: "#eab308",
    coreColor: "#f5e39a",
    dotted: true,
    icon: (
      <>
        <path d="M12 7v4" />
        <circle cx="12" cy="6" r="1" />
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M9 15.5h.01M15 15.5h.01" />
      </>
    ),
    desktop: { x: 340, y: 222 },
    tablet: { x: 225, y: 205 },
    mobile: { x: 172, y: 550 },
  },
];

const STAGE = {
  desktop: { w: 1240, h: 640, cx: 620, cy: 320 },
  tablet: { w: 900, h: 560, cx: 450, cy: 280 },
  mobile: { w: 236, h: 640, cx: 118, cy: 96 },
} as const;

type Mode = keyof typeof STAGE;

/**
 * 环形轨道光点：光点沿以核心为圆心的同心圆轨道绕行。
 * 三档轨道半径与可见同心环一致（移动档只放内两圈，外圈会伸出舞台顶缘）；
 * dur 与半径同比例，各圈线速度接近，方向全部为顺时针（sweep=1）。
 */
const ORBITS: Record<Mode, { r: number; dur: number }[]> = {
  desktop: [
    { r: 150, dur: 16 },
    { r: 220, dur: 22 },
    { r: 290, dur: 28 },
  ],
  tablet: [
    { r: 130, dur: 14 },
    { r: 190, dur: 19 },
    { r: 250, dur: 24 },
  ],
  mobile: [
    { r: 60, dur: 9 },
    { r: 95, dur: 13 },
  ],
};

/**
 * 动画光点（恰好 3 个）：沿用轨道样式（blur halo + 亮芯）沿同心圆绕行。
 * 桌面 / 平板三圈各 1 个；移动档两圈（内圈 2 个对相 + 外圈 1 个）。
 * phase 为初始相位占比，begin 取负值使页面加载时即分布在不同位置。
 */
const ORBIT_DOTS: Record<Mode, { orbit: number; color: string; phase: number }[]> = {
  desktop: [
    { orbit: 0, color: "#fb923c", phase: 0 },
    { orbit: 1, color: "#3b82f6", phase: 0.45 },
    { orbit: 2, color: "#c7c7cf", phase: 0.78 },
  ],
  tablet: [
    { orbit: 0, color: "#fb923c", phase: 0 },
    { orbit: 1, color: "#3b82f6", phase: 0.45 },
    { orbit: 2, color: "#c7c7cf", phase: 0.78 },
  ],
  mobile: [
    { orbit: 0, color: "#fb923c", phase: 0 },
    { orbit: 0, color: "#3b82f6", phase: 0.5 },
    { orbit: 1, color: "#c7c7cf", phase: 0.25 },
  ],
};

/** 以 (cx, cy) 为圆心的整圆 SMIL 路径，sweep=1 保证绕行方向一致连贯。 */
const circlePath = (cx: number, cy: number, r: number) =>
  `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} Z`;

export default function CoreChainHero() {
  const [mode, setMode] = useState<Mode>("desktop");
  const [reduced, setReduced] = useState(false);
  const [active, setActive] = useState<number | "core" | null>(null);
  const [scale, setScale] = useState(1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mobileMq = window.matchMedia("(max-width: 720px)");
    const tabletMq = window.matchMedia("(min-width: 721px) and (max-width: 1180px)");
    const reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setMode(mobileMq.matches ? "mobile" : tabletMq.matches ? "tablet" : "desktop");
      setReduced(reducedMq.matches);
    };
    apply();
    mobileMq.addEventListener("change", apply);
    tabletMq.addEventListener("change", apply);
    reducedMq.addEventListener("change", apply);
    return () => {
      mobileMq.removeEventListener("change", apply);
      tabletMq.removeEventListener("change", apply);
      reducedMq.removeEventListener("change", apply);
    };
  }, []);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => {
      const stageW = STAGE[mode].w;
      setScale(Math.min(1, box.clientWidth / stageW));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [mode]);

  const stage = STAGE[mode];
  const stageBoxStyle = {
    width: `${stage.w * scale}px`,
    height: `${stage.h * scale}px`,
  } as CSSProperties;
  const stageStyle = {
    width: `${stage.w}px`,
    height: `${stage.h}px`,
    transform: `scale(${scale})`,
  } as CSSProperties;

  return (
    <div className={styles.chainPanel} data-core-chain="" data-reduced={reduced || undefined}>
      <header className={styles.chainHead}>
        <p className={styles.chainTitle}>核心链路</p>
      </header>

      <div className={styles.chainScaleBox} ref={boxRef}>
        <div className={styles.chainStageBox} style={stageBoxStyle}>
          <div
            className={styles.chainStage}
            style={stageStyle}
            data-mode={mode}
            data-focusing={active !== null || undefined}
            onMouseLeave={() => setActive(null)}
          >
            {/* 背景同心环（静态装饰） */}
            <div className={`${styles.chainRing} ${styles.chainRing1}`} aria-hidden="true" />
            <div className={`${styles.chainRing} ${styles.chainRing2}`} aria-hidden="true" />
            <div className={`${styles.chainRing} ${styles.chainRing3}`} aria-hidden="true" />

            {/* 连线（静态虚线）与环形轨道光点 */}
            <svg
              key={mode}
              className={styles.chainLinks}
              viewBox={`0 0 ${stage.w} ${stage.h}`}
              fill="none"
              aria-hidden="true"
            >
              {MODULES.map((mod, i) => {
                const p = mod[mode];
                return (
                  <g
                    key={mod.key}
                    className={styles.chainLink}
                    style={{ color: mod.color }}
                    data-active={active === i || undefined}
                    data-dim={active === null || active === "core" || active === i ? undefined : true}
                  >
                    <line
                      className={styles.chainLinkBase}
                      x1={stage.cx}
                      y1={stage.cy}
                      x2={p.x}
                      y2={p.y}
                      style={mod.dotted ? { strokeDasharray: "2 6" } : undefined}
                    />
                    <line
                      className={styles.chainLinkDash}
                      x1={stage.cx}
                      y1={stage.cy}
                      x2={p.x}
                      y2={p.y}
                      stroke={mod.color}
                      style={{
                        strokeDasharray: mod.dotted ? "2 8" : "8 20",
                      }}
                    />
                  </g>
                );
              })}

              {/* 环形轨道光点（恰好 3 个）：沿同心圆顺时针绕行，常亮连贯。 */}
              {!reduced
                ? ORBIT_DOTS[mode].map((dot, dotIndex) => {
                    const orbit = ORBITS[mode][dot.orbit];
                    return (
                      <g key={`${mode}-orbit-dot-${dotIndex}`}>
                        <circle className={styles.chainParticleHalo} r="4" fill={dot.color} />
                        <circle className={styles.chainParticleCore} r="1.8" fill={dot.color} />
                        <animateMotion
                          dur={`${orbit.dur}s`}
                          begin={`${-dot.phase * orbit.dur}s`}
                          repeatCount="indefinite"
                          path={circlePath(stage.cx, stage.cy, orbit.r)}
                        />
                      </g>
                    );
                  })
                : null}
            </svg>

            {/* 中心核心：同样可 hover，显示 Heyispace OS 整体说明。
                自身激活时 data-active="core" 只强化中心本身（图标提亮 +
                外圈增强），不把六个模块一起退暗——中心承托全部放射连线，
                压暗整图反而看不清它连了谁。 */}
            <div
              className={styles.chainCore}
              data-active={active === "core" ? "core" : undefined}
              onMouseEnter={() => setActive("core")}
              style={{ left: stage.cx, top: stage.cy }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 2.5 21 7.5 12 12.5 3 7.5Z" />
                <path d="M3 12.5 12 17.5 21 12.5" />
                <path d="M3 17 12 22 21 17" />
              </svg>
              <div className={styles.chainTip}>
                <p className={styles.chainTipHead}>
                  <span className={styles.chainTipIdx}>CORE</span>
                  <span className={styles.chainTipName}>Heyispace OS</span>
                </p>
                <p className={styles.chainTipBody}>
                  以空间为核心工作上下文，连接地图、设备、策略、运行数据、权限与
                  Agent，形成统一的智能空间管理与分析工作台。
                </p>
              </div>
            </div>

            {/* 六个功能模块 */}
            {MODULES.map((mod, i) => {
              const pos = mod[mode];
              return (
                <div
                  key={mod.key}
                  className={`${styles.chainNode} ${mod.dotted ? styles.chainNodeDotted : ""}`}
                  data-active={active === i || undefined}
                  data-tip-below={mod.key === "space" || undefined}
                  data-dim={active === null || active === "core" || active === i ? undefined : true}
                  style={
                    {
                      left: pos.x,
                      top: pos.y,
                      "--chain-c": mod.color,
                      "--chain-delay": `${0.5 + i * 0.12}s`,
                    } as CSSProperties
                  }
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                >
                  <svg
                    className={styles.chainNodeIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    style={{ color: mod.color }}
                  >
                    {mod.icon}
                  </svg>
                  <p className={styles.chainLabel}>
                    <span className={styles.chainLabelIdx}>{mod.idx}</span>
                    <span className={styles.chainLabelText}>{mod.name}</span>
                  </p>
                  <div className={styles.chainTip}>
                    <p className={styles.chainTipHead}>
                      <span className={styles.chainTipIdx}>{mod.idx}</span>
                      <span className={styles.chainTipName}>{mod.name}</span>
                    </p>
                    <p className={styles.chainTipBody}>{mod.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
