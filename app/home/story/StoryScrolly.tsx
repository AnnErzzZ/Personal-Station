"use client";

import Image from "@/components/SiteImage";
import { siteAsset } from "@/lib/site-asset";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import home from "../../home.module.css";
import {
  CENTER_DEAD_ZONE,
  CONTINUOUS_ANGLE,
  DEAD_ZONE_BLEND,
  ENDING_TIME_MAP,
  ENGINE_ROOT_MARGIN,
  FOLDER_CLOSE_AT,
  HERO_DESKTOP_MODE,
  HERO_DURATION_FALLBACK,
  HERO_FRONT_EPS,
  HERO_FRONT_TIMES,
  HERO_ALIGN,
  HERO_MAX_SEEK_STEP,
  HERO_SEEK_INTERVAL_MS,
  HERO_SEEK_SNAP,
  HERO_SEEK_STALE_MS,
  HERO_SEEK_TAU_MS,
  HERO_VIDEO_POSTER,
  HERO_VIDEO_SRC,
  IMAGE_TAIL_VH,
  KEYFRAMES,
  MAIN_VIDEO_POSTER,
  MAIN_VIDEO_SRC,
  POSE_TIME,
  RESUME_SCROLL,
  SEEK_INTERVAL_MS,
  SEEK_SNAP,
  SEEK_STALE_MS,
  SETTLE_EPS,
  STATIC_ALIGNMENT,
  STATIC_POSES,
  SWITCH_HYSTERESIS_DEG,
  ZONES,
  type HeroPoseName,
  type PoseAlign,
  type StaticPose,
  type TimeMapping,
} from "./story-config";
import GradientText from "../GradientText";
import {
  STORY_SECTION_KEYS,
  createStoryUiMotionController,
  type StorySectionKey,
} from "./story-ui-motion";
import styles from "./story.module.css";
import WorkProjectFolder from "./WorkProjectFolder";
import ContactLanyardOverlay from '../Lanyard/ContactLanyardOverlay';

let contactWarmPromise: Promise<void> | null = null;
function warmContactLanyard() {
  contactWarmPromise ??= import('../Lanyard/Lanyard')
    .then(({ preloadLanyardAssets }) => preloadLanyardAssets())
    .catch(() => { contactWarmPromise = null; });
  return contactWarmPromise;
}

type Pose = StaticPose;

type Segment = {
  kind: "hero" | "handoff" | "move" | "hold";
  t0: number;
  t1: number;
  vh: number;
  /**
   * move 段专属：自定义时间映射。给了就按它把滚动距离分配到各时间区间
   * （按动作密度加权），没给就走全局的 `lerp + smoothstep`。
   */
  mapping?: readonly TimeMapping[];
  /** hold 段专属：该段接管的静态图。 */
  image?: Pose;
  /** hold 段专属：对应 Section 的 DOM id（导航锚点 / hash）。 */
  sectionId?: string;
  /** hold 段专属：时间轴最后一段，静态图与文字保持到页尾，不设退场尾巴。 */
  last?: boolean;
};

/**
 * move 段的时间目标函数 —— 滚动位置（段内归一化 localP）→ 主视频时间。
 *
 * 有 `mapping` 时按映射表分段线性插值：每段的 vh 权重正比于该段视频里的动作量，
 * 于是「每滚 1vh 看到的动作量」在整段上大致恒定，不会出现「滚半天不动 → 一下子掉完」。
 * 没有 `mapping` 时退回全局的 `lerp + smoothstep`（两端慢、中间快）。
 *
 * 两种都是**纯位置函数**：同一个 localP 永远得到同一个时间，没有滞后或惯性；
 * 反向滚动天然共用同一条曲线。
 */
function moveTargetOf(seg: Segment, localP: number) {
  const map = seg.mapping;
  if (!map || map.length < 2) return lerp(seg.t0, seg.t1, smoothstep(0, 1, localP));
  const total = map.reduce((sum, stop, i) => (i === 0 ? 0 : sum + stop.vh), 0);
  if (total <= 0) return seg.t1;
  let acc = 0;
  for (let i = 1; i < map.length; i += 1) {
    const next = acc + map[i].vh / total;
    if (localP <= next) {
      const span = next - acc;
      return lerp(map[i - 1].t, map[i].t, span <= 0 ? 1 : (localP - acc) / span);
    }
    acc = next;
  }
  return map[map.length - 1].t;
}

/**
 * 滚动时间轴（段长见 ZONES，单位 vh）：
 * hold(hero) → handoff(回正面 + crossfade 接主视频 @0.0) → move(0→4)
 * → hold(resume, 铺履历静态图) → move(4→8) → hold(work, 铺作品静态图)
 * → move(8→12) → hold(ending, 铺坠落静态图)。
 * 三个 hold 内无论怎么滚，主视频 currentTime 都钉在关键帧上，静态图整段接管。
 *
 * resumeHold 是唯一运行时可变的段：按履历内容真实高度重算（见 buildTimeline
 * 的入参与 RESUME_SCROLL）。其余段长与段序在编译期固定。
 */
type Timeline = {
  segments: Segment[];
  /** 各段起点（vh）：segStart[i] 与 segments[i] 一一对应。 */
  segStart: number[];
  /** 三个 Section 图层的时间轴区间（vh）。 */
  textZones: {
    id: "about" | "work" | "contact";
    startVh: number;
    endVh: number;
    holdVh: number;
    last: boolean;
  }[];
  /** id → zone：JSX 直接按名字取段起点，不按下标取（段序一变就错位）。 */
  zone: Record<"about" | "work" | "contact", Timeline["textZones"][number]>;
  totalVh: number;
};

function buildTimeline(resumeHoldVh: number): Timeline {
  const segments: Segment[] = [
    { kind: "hero", t0: 0, t1: 0, vh: ZONES.heroHold },
    { kind: "handoff", t0: KEYFRAMES.hero, t1: KEYFRAMES.hero, vh: ZONES.heroHandoff },
    { kind: "move", t0: KEYFRAMES.hero, t1: KEYFRAMES.resume, vh: ZONES.resumeMove },
    {
      kind: "hold",
      t0: KEYFRAMES.resume,
      t1: KEYFRAMES.resume,
      vh: resumeHoldVh,
      image: "resume",
      sectionId: "about",
    },
    { kind: "move", t0: KEYFRAMES.resume, t1: KEYFRAMES.work, vh: ZONES.workMove },
    {
      kind: "hold",
      t0: KEYFRAMES.work,
      t1: KEYFRAMES.work,
      vh: ZONES.workHold,
      image: "work",
      sectionId: "work",
    },
    {
      kind: "move",
      t0: KEYFRAMES.work,
      t1: KEYFRAMES.ending,
      vh: ZONES.endingMove,
      /* 坠落段动作分布极不均匀，用按动作量加权的映射（见 story-config 的 ENDING_TIME_MAP）。 */
      mapping: ENDING_TIME_MAP,
    },
    {
      kind: "hold",
      t0: KEYFRAMES.ending,
      t1: KEYFRAMES.ending,
      vh: ZONES.endingHold,
      image: "ending",
      sectionId: "contact",
      last: true,
    },
  ];

  const segStart: number[] = [];
  let acc = 0;
  for (const seg of segments) {
    segStart.push(acc);
    acc += seg.vh;
  }
  const totalVh = acc;

  const holdIndexOf: Record<string, number> = {};
  segments.forEach((seg, index) => {
    if (seg.sectionId) holdIndexOf[seg.sectionId] = index;
  });

  const textZones = (["about", "work", "contact"] as const).map((id) => {
    const index = holdIndexOf[id];
    const holdVh = segments[index].vh;
    return {
      id,
      startVh: segStart[index],
      endVh: segStart[index] + holdVh,
      holdVh,
      last: Boolean(segments[index].last),
    };
  });

  const zone = Object.fromEntries(textZones.map((z) => [z.id, z])) as Timeline["zone"];
  return { segments, segStart, textZones, zone, totalVh };
}

/** SSR / 首帧默认时间轴（ZONES.resumeHold）。挂载后按内容实测值重建（applyTimeline）。 */
const INITIAL_TIMELINE = buildTimeline(ZONES.resumeHold);

const UI_EXIT_LEAD_VH = 8;

type StoryPhase =
  | "hero"
  | "heroBiographyTransition"
  | "biography"
  | "biographyWorkTransition"
  | "work"
  | "workEndingTransition"
  | "ending";

function storyPhaseOf(seg: Segment): StoryPhase {
  if (seg.kind === "hero") return "hero";
  if (seg.kind === "handoff") return "heroBiographyTransition";
  if (seg.kind === "hold") {
    if (seg.sectionId === "about") return "biography";
    if (seg.sectionId === "work") return "work";
    return "ending";
  }
  if (seg.t1 === KEYFRAMES.resume) return "heroBiographyTransition";
  if (seg.t1 === KEYFRAMES.work) return "biographyWorkTransition";
  return "workEndingTransition";
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// ------------------------------------------------------------------
// Hero 鼠标跟随：角度 → 时间轴映射（自 HeroVideo 引擎原样并入）
// ------------------------------------------------------------------

type HeroDirection = Exclude<HeroPoseName, "center">;
type HeroMode = "interactive" | "loop" | "static";

/** 各方向姿态对应的角度（度）：0=右，90=上，±180=左，-90=下。 */
const POSE_ANGLE: Record<HeroDirection, number> = {
  right: 0,
  up: 90,
  left: 180,
  down: -90,
};

const HERO_DIRECTIONS = Object.keys(POSE_ANGLE) as HeroDirection[];

/** 两个角度的最短环绕距离（度）。 */
function angularDistance(a: number, b: number) {
  const diff = Math.abs(((a - b) % 360) + 360) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/** 鼠标角度 → 时间轴连续映射（相邻姿态之间线性插值）。 */
function angleToPoseTime(angleDeg: number): number {
  if (angleDeg >= 90) return lerp(POSE_TIME.up, POSE_TIME.left, (angleDeg - 90) / 90);
  if (angleDeg >= 0) return lerp(POSE_TIME.right, POSE_TIME.up, angleDeg / 90);
  if (angleDeg >= -90) return lerp(POSE_TIME.down, POSE_TIME.right, (angleDeg + 90) / 90);
  return lerp(POSE_TIME.left, POSE_TIME.down, (angleDeg + 180) / 90);
}

/** 基础版：离哪个姿态角度最近就是哪个方向（迟滞在调用处处理）。 */
function nearestDirection(angleDeg: number): HeroDirection {
  let best: HeroDirection = "right";
  let bestDist = Infinity;
  for (const dir of HERO_DIRECTIONS) {
    const dist = angularDistance(angleDeg, POSE_ANGLE[dir]);
    if (dist < bestDist) {
      bestDist = dist;
      best = dir;
    }
  }
  return best;
}

/** 距当前播放位置最近的正面端点（0.8s center / 9.6s 结尾正面段）。 */
function nearestFrontTime(current: number): number {
  let best: number = HERO_FRONT_TIMES[0];
  let bestDist = Infinity;
  for (const front of HERO_FRONT_TIMES) {
    const dist = Math.abs(current - front);
    if (dist < bestDist) {
      bestDist = dist;
      best = front;
    }
  }
  return best;
}

// ------------------------------------------------------------------
// 真实项目数据（与案例页一致，不虚构）
// ------------------------------------------------------------------

type WorkCase = {
  title: string;
  positioning: string;
  summary: string;
  meta: string[];
  href: string;
  cover: string;
  coverAlt: string;
};


// 列表顺序就是数组顺序（卡片本身不含序号），与 docs/SITE_BRIEF.md 的内容优先级一致。
const workCases: WorkCase[] = [
  {
    title: "合一实施助手",
    positioning: "面向交付工程师的 IoT 项目实施工具",
    summary: "把空间层级、网关配网、设备批量添加与异常恢复，整理成现场可执行的连续任务。",
    meta: ["Product Design", "UX/UI", "Mobile", "IoT"],
    href: "/work/implementation-assistant",
    cover: "/cases/implementation-assistant/hero/implementation-assistant-project-cover.png",
    coverAlt: "合一实施助手项目封面，展示手持手机中的现场设备配置界面",
  },
  {
    title: "Heyispace OS",
    positioning: "智能空间综合管理平台",
    summary: "以空间为上下文组织设备、策略与运行数据，覆盖空间地图、多视图与 Agent 数据分析。",
    meta: ["Product Design", "UX/UI", "Web", "AIoT"],
    href: "/work/heyispace-os",
    cover: "/cases/heyispace-os/hero/heyispace-os-project-cover-v3.png",
    coverAlt: "Heyispace OS 项目封面，展示 Agent 分析界面的电脑样机",
  },
];

/* 履历左列的能力三项（文案以 Figma 1920×1080 稿 node 372-11174 为准，逐字一致）。 */
const capabilities = [
  {
    title: "Product Thinking",
    body: "从业务问题、用户场景到功能方案与产品结构。梳理角色、对象与依赖关系，把复杂规则变成可理解的系统。",
  },
  {
    title: "UX & Interface",
    body: "设计复杂 B 端系统、Web 平台、小程序与多端产品，处理状态、依赖和异常分支，并协同团队推进落地。",
  },
  {
    title: "Build with AI",
    body: "使用Codex、ChatGPT辅助需求拆解、方案整理、原型验证、页面开发协作与文档输出",
  },
];

/** 履历右列：工作经历与参与项目（纯文本，与案例页的项目数据无关）。 */
const careerProjects = [
  {
    title: "智能空间垂直对话 Agent",
    description:
      "面向智能空间数据查询与分析的对话产品，参与交互框架、Tool 输出规范、数据可视化及多端体验设计。",
  },
  {
    title: "合一实施助手小程序",
    description:
      "面向交付工程师的设备实施工具，参与设备入网、空间编排、配置同步、验收等核心流程的产品与 UX/UI 设计。",
  },
  {
    title: "HEYISPACE OS 智能空间管理平台",
    description:
      "面向空间管理与设备控制的 Web 平台，参与设备控制、策略配置、空间地图及运行数据等功能的持续设计与迭代。",
  },
  {
    title: "合一智控运维平台",
    description:
      "面向内部运维团队的管理平台，参与异常看板、工单、项目管理及权限等模块的需求梳理与产品设计。",
  },
  {
    title: "合一空间小程序",
    description:
      "面向空间使用者的移动端产品，参与设备控制、空间状态查看及相关场景功能的交互与界面设计。",
  },
  {
    title: "工时管理系统",
    description:
      "用于团队工时记录与统计的内部系统，参与业务流程梳理、信息结构及核心页面的产品与界面设计。",
  },
  {
    title: "智慧空间数据大屏",
    description:
      "用于展示空间运行、设备状态及关键指标的数据可视化项目，参与指标梳理、图表结构和大屏界面设计。",
  },
  {
    title: "智能开关硬件模具开发",
    description:
      "参与智能开关硬件产品的设计协作，从产品使用场景与交互需求出发，配合推进外观与模具方案落地。",
  },
];

const POSES: Pose[] = [...STATIC_POSES];

/** 三张静态帧：**16:9 全幅帧**，与主视频同一套渲染的高分辨率版本，
 *  人物构图已在画面里定好，代码不参与摆位（见 story-config 顶部说明）。 */
const POSE_SRC: Record<Pose, string> = {
  resume: siteAsset("/story/resume-frame.jpg"),
  work: siteAsset("/story/work-frame.jpg"),
  ending: siteAsset("/story/ending-frame.jpg"),
};

/** 图层 transform：HERO_ALIGN（hero 视频 ↔ 主视频取景校准）与
 *  STATIC_ALIGNMENT（静态帧 ↔ 主视频关键帧的对齐补偿）共用同一形状。
 *  STATIC_ALIGNMENT 补的是素材固有的 ~1.9% 取景差，渲染侧必须应用，
 *  否则静态帧接管瞬间内容错位 ~2%（用户可见的「切换位移」）。 */
function alignTransform(align: PoseAlign) {
  return `translate(${align.x}%, ${align.y}%) scale(${align.scale})`;
}

/**
 * 首页滚动叙事（单一连续容器）：
 * 一个 sticky 100svh 舞台上叠放 Hero 视频、主视频与三张静态图，
 * Hero 文案与三个 Section 的内容围绕同一个舞台展开。
 *
 * - 首屏：Hero 视频鼠标视线跟随（引擎自 HeroVideo 并入）；
 * - 下滚：暂停跟随 → Hero 视频平滑回到最近正面端点 → 140ms crossfade
 *   在原位置接管为主视频 → 主视频由滚动驱动 0.166 → 1.50 → 3.818 → 5.768；
 * - 上滚：完整倒放并在 0.166 交接回 Hero 视频重新启用跟随；
 * - 关键帧处静态图原位全尺寸接管，Section 文字与人物一起整屏钉住。
 *
 * 本组件不产生逐帧 React 渲染：滚动/动画状态全部走 ref + rAF。
 */
export default function StoryScrolly({ heroCopy }: { heroCopy?: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  /** 运行时时间轴（resumeHold 按内容实测重算后在这里更新，rAF 只读它）。 */
  const timelineRef = useRef<Timeline>(INITIAL_TIMELINE);
  /** 履历视口（固定窗口）与整列内容（translate3d 的载体）。 */
  const resumeViewportRef = useRef<HTMLDivElement>(null);
  const resumeContentRef = useRef<HTMLDivElement>(null);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactPrepared, setContactPrepared] = useState(false);
  const contactTriggerRef = useRef<HTMLAnchorElement>(null);
  const closeContact = useCallback(() => {
    setContactOpen(false);
    contactTriggerRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const trigger = contactTriggerRef.current;
    if (!trigger) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        void warmContactLanyard();
        setContactPrepared(true);
        observer.disconnect();
      }
    }, { rootMargin: "1000px" });
    observer.observe(trigger);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (typeof window.requestIdleCallback === 'function') {
      const idle = window.requestIdleCallback(() => {
        void warmContactLanyard();
        setContactPrepared(true);
      }, { timeout: 1000 });
      return () => window.cancelIdleCallback(idle);
    }
    const timer = setTimeout(() => {
      void warmContactLanyard();
      setContactPrepared(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);
  const projectsOpenRef = useRef(false);
  const projectsOpenAtScrollYRef = useRef<number | null>(null);
  /** 滚动自动关闭的防重入标记：true = 已请求关闭、收起动画还没播完。
   *  projectsOpenRef 在整个收起动画（800ms）内保持 true（由收起完成时的
   *  onOpenChange(false) 落 false），滚动引擎的 work 层退场守卫靠它识别
   *  「文件夹窗口仍在」；这里单独标记防止自动关闭块每帧重复触发。 */
  const folderCloseRequestedRef = useRef(false);

  const handleProjectsOpenChange = useCallback((next: boolean) => {
    projectsOpenRef.current = next;
    folderCloseRequestedRef.current = false;
    projectsOpenAtScrollYRef.current = next ? window.scrollY : null;
    setProjectsOpen(next);
  }, []);

  useEffect(() => {
    // projectsOpenRef 不在这里同步：滚动自动关闭后它必须保持 true 直到
    // 收起动画播完（onOpenChange(false) 才落 false），提前落 false 会让
    // work 层退场守卫失效、收起动画被 exit 腰斩（幽灵层 bug 的一半）。
    // open=true 的同步在 handleProjectsOpenChange 里已完成。
    if (!projectsOpen) projectsOpenAtScrollYRef.current = null;
  }, [projectsOpen]);

  useEffect(() => {
    const container = containerRef.current;
    const stage = stageRef.current;
    const heroVideo = heroVideoRef.current;
    const video = videoRef.current;
    if (!container || !stage || !heroVideo || !video) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fineHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    // 开发用对齐调试：URL 带 ?pose-align=<resume|work|ending>（或旧的 ?work-align）时，
    // 该静态图在接管状态下以 50% 不透明度叠在冻结于关键帧的视频上，
    // 可直接肉眼检查两层是否重合（见 story.module.css 的 [data-align-debug]）。
    {
      const params = new URLSearchParams(window.location.search);
      const requested = params.get("pose-align");
      const legacy = params.has("work-align") ? "work" : null;
      const target = requested ?? legacy;
      if (target && (STATIC_POSES as readonly string[]).includes(target)) {
        container.dataset.alignDebug = "true";
        container.dataset.alignPose = target;
      }
    }

    // ---- Hero 播放形态（与 HeroVideo 时代同一套判定）----
    let heroMode: HeroMode;
    if (reduced) heroMode = "static";
    else if (fineHover && HERO_DESKTOP_MODE === "interactive") heroMode = "interactive";
    else heroMode = "loop";

    const resolvePose = (pose: Pose) =>
      container.querySelector<HTMLDivElement>(`[data-pose="${pose}"]`);
    /** 图层壳（承载 visibility / pointer-events 的那一层）。 */
    const resolveLayer = (id: string) =>
      container.querySelector<HTMLElement>(`[data-layer="${id}"]`);

    // ---- 静态帧定位：满帧铺放（inset 0 / 100% / object-fit: fill，与主视频
    //      同一套几何）+ STATIC_ALIGNMENT 对齐补偿 transform（素材固有 ~1.9%
    //      取景差的唯一修正点，见 story-config 的说明）。接管只切 opacity，
    //      几何在两张图层间恒等成立，没有任何逐帧变化的定位参数。 ----

    // ---- 滚动位置 → 时间轴目标 ----
    const progressPx = () => -container.getBoundingClientRect().top;

    const segmentAt = (p: number) => {
      const vh = window.innerHeight;
      const { segments, segStart } = timelineRef.current;
      for (let i = 0; i < segments.length; i += 1) {
        const seg = segments[i];
        const startPx = (segStart[i] / 100) * vh;
        const lenPx = (seg.vh / 100) * vh;
        if (p < startPx + lenPx || i === segments.length - 1) {
          return { seg, localP: clamp((p - startPx) / lenPx, 0, 1) };
        }
      }
      const last = segments[segments.length - 1];
      return { seg: last, localP: 1 };
    };

    /** 当前滚动位置对应的主视频时间（hero / handoff 钉在 0.0）。 */
    const mainTargetAt = (p: number) => {
      const { seg, localP } = segmentAt(p);
      if (seg.kind === "hero" || seg.kind === "handoff") return KEYFRAMES.hero;
      if (seg.kind === "hold") return seg.t0;
      return moveTargetOf(seg, localP);
    };

    // ---- Biography 履历滚动：页面滚动驱动整列内容 translate3d ----
    // 三阶段（story-config 的 RESUME_SCROLL）：intro HOLD → 整列上移 → end HOLD。
    // travel 用未变换布局值实测（offsetHeight/clientHeight，不受 transform 影响，
    // 见 .resumeContent 的注释）；段长变了就重建时间轴并同步容器高度与锚点属性。
    const resumeViewport = resumeViewportRef.current;
    const resumeContent = resumeContentRef.current;
    let resumeTravel = 0;
    let lastResumeShift = Number.NaN;
    let timelinePublished = false;

    /** 读未变换布局值：内容高 − 视口内高 = 整列需要上移的净行程（px）。 */
    const measureResumeTravel = () => {
      if (!resumeViewport || !resumeContent) return 0;
      return Math.max(0, resumeContent.offsetHeight - resumeViewport.clientHeight);
    };

    /** 把时间轴写回运行时：ref、容器总高（= 100svh + totalVh vh）、导航锚点属性、
     *  验收脚本读的 data-resume-hold-vh。React 的 JSX 里是同一套初始值，
     *  重复渲染不会覆盖这里的运行时写入（属性值没变 React 不动 DOM）。 */
    const applyTimeline = (tl: Timeline) => {
      timelineRef.current = tl;
      container.style.height = `calc(100svh + ${tl.totalVh}vh)`;
      container.dataset.resumeHoldVh = String(
        Math.round(tl.zone.about.holdVh * 100) / 100,
      );
      for (const zone of tl.textZones) {
        resolveLayer(zone.id)?.setAttribute("data-scroll-start-vh", String(zone.startVh));
      }
    };

    const rebuildTimeline = () => {
      if (!resumeViewport || !resumeContent) return;
      const vh = window.innerHeight;
      if (vh <= 0) return;
      resumeTravel = measureResumeTravel();
      const scrollLenVh = ((resumeTravel / vh) * 100) * RESUME_SCROLL.factor;
      const holdVh = clamp(
        RESUME_SCROLL.introHoldVh + scrollLenVh + RESUME_SCROLL.endHoldVh,
        RESUME_SCROLL.minHoldVh,
        RESUME_SCROLL.maxHoldVh,
      );
      const prevHoldVh = timelineRef.current.zone.about.holdVh;
      const changed = Math.abs(holdVh - prevHoldVh) >= 0.5;
      // 首次测量必须无条件发布（包括「实测值与默认值相同」的情形）：运行时段长
      // 写在容器 data-resume-hold-vh 与各 Section 的 data-scroll-start-vh 上，
      // SiteProgress / 导航锚点 / 验收脚本都从这里读。只在变化时写的话，
      // 恰好命中默认段长的视口（如 1920×1080 钳到 minHold=150）会永远缺属性。
      if (!timelinePublished || changed) {
        timelinePublished = true;
        applyTimeline(changed ? buildTimeline(holdVh) : timelineRef.current);
      }
    };

    // 挂载即测一次（useEffect 在首帧后跑，速度足够快，用户还没滚到履历）；
    // 字体加载会改文本度量 → fonts.ready 后重测；内容/视口尺寸变化由
    // ResizeObserver 兜住（比窗口 resize 更早、更准）。
    rebuildTimeline();
    let rebuildRaf = 0;
    const scheduleRebuild = () => {
      if (rebuildRaf) return;
      rebuildRaf = window.requestAnimationFrame(() => {
        rebuildRaf = 0;
        rebuildTimeline();
      });
    };
    document.fonts?.ready.then(scheduleRebuild).catch(() => {});
    const resumeObserver = new ResizeObserver(scheduleRebuild);
    if (resumeViewport) resumeObserver.observe(resumeViewport);
    if (resumeContent) resumeObserver.observe(resumeContent);

    // ---- 引擎主体：rAF 内完成目标计算、双视频 seek、图层与文字状态 ----
    let raf = 0;
    let running = false;
    let mainLastWrite = -Infinity;
    let mainSettled = true;
    let mainLastTarget = NaN;
    let heroLastWrite = -Infinity;
    let heroSettled = false;
    let mainOpaque = false;
    /** 是否已离开过 hero 段：首载 hero 入场动画（视频延迟 640ms 淡入）保护，
     *  离开之前 heroVideoHold 恒为 false，不干预入场时间线。 */
    let hasLeftHero = false;
    let lastHeroVideoHold: boolean | null = null;
    /** mainOpaque 最近一次翻 true 的时刻（-1 = 当前未盖住）。
     *  hold 释放在 main 盖住之后再等 MAIN_COVER_HOLD_MS，见下方说明。 */
    let mainCoveredAt = -1;
    /**
     * hold 释延迟 = 主视频 opacity 过渡（story.module.css `.video`，140ms）走完
     * + 20ms 保险余量。必须在 main 完全不透明之后才放行 heroVideo 的退场淡出：
     * 两条过渡都是强 ease-out（cubic-bezier(.22,1,.36,1)）——同时起步的话，
     * hero 淡出在前 25% 时间就走掉八成量、main 淡入才爬到八成，交叉谷里
     * 两层短暂双双半透明，露出舞台底色（09-21 实测残余 1-2 帧可感闪白，
     * 探针量得 24ms 的 heroOp<0.7 && mainOp<0.7 空窗）。推迟释放后，
     * hero 的淡出全程发生在被盖住之后，理论上零透出。
     */
    const MAIN_COVER_HOLD_MS = 160;
    /** 主视频是否处于「抠图接管」的模糊底状态（避免逐帧写 filter）。 */
    let blurred = false;
    let lastHashId = "";
    const lastImageVisible = new Map<string, boolean>();
    let readyMarked = false;
    // ---- 履历辅助装饰（chromeAside）的对比度：右下 editorial 小字在窄视口
    //      会整个压进柴犬的深色衣裤 —— 落上去就反白（var(--dark-subtle)，
    //      与首屏 scrollHint 同一套约定），在白底上保持深灰。
    //      底部全站进度条的反白由 SiteProgress 自己判定（它的深色区随 Section 变）。
    //      深色衣裤右缘由 resume-safe-zone 实测：小字高度 ≈0.870 × 帧宽；
    //      几何只在 resize 时变，所以不进逐帧循环。 ----
    const chromeAside = container.querySelector<HTMLElement>("[class*=chromeAside]");
    let lastOnDark: boolean | null = null;
    const updateChromeContrast = () => {
      if (!chromeAside) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const box = Math.max(vw, vh * (16 / 9));
      const edgeOf = (ratio: number) => ratio * box - (box - vw) / 2;
      const onDark = chromeAside.getBoundingClientRect().left < edgeOf(0.8703) - 12;
      if (onDark !== lastOnDark) {
        lastOnDark = onDark;
        container.dataset.chromeOnDark = onDark ? "true" : "false";
      }
    };
    updateChromeContrast();
    window.addEventListener("resize", updateChromeContrast);
    // Hero 指针状态（自 HeroVideo 并入）
    const pointerRef = { x: 0, y: 0, has: false };
    let leaving = false;
    let heroDirection: HeroDirection = "left";

    const motion = createStoryUiMotionController({
      scheduler: {
        setTimeout: (callback, delay) => window.setTimeout(callback, delay),
        clearTimeout: (token) => window.clearTimeout(token),
      },
      reducedMotion: reduced,
      onPhaseChange(section, phase) {
        const state = phase === "hidden" ? "off" : phase === "entered" ? "on" : "fade";
        const layer = resolveLayer(section);
        if (layer) {
          layer.dataset.uiMotion = phase;
          layer.dataset.state = state;
        }
        if (section === "hero") container.dataset.heroUiMotion = phase;
        if (section === "work") {
          const folder = container.querySelector<HTMLElement>("[data-work-folder]");
          if (folder) {
            folder.dataset.sectionMotion = phase;
            folder.dataset.state = state;
          }
        }
      },
    });

    for (const section of STORY_SECTION_KEYS) {
      const layer = resolveLayer(section);
      if (layer) {
        layer.dataset.uiMotion = "hidden";
        layer.dataset.state = "off";
      }
    }
    const workFolder = container.querySelector<HTMLElement>("[data-work-folder]");
    if (workFolder) {
      workFolder.dataset.sectionMotion = "hidden";
      workFolder.dataset.state = "off";
    }
    container.dataset.storyPhase = "hero";
    container.dataset.storyDirection = "idle";
    motion.enter("hero");
    let previousP = progressPx();
    let lastStoryPhase: StoryPhase = "hero";
    let travelDirection: "forward" | "backward" = "forward";
    const transitionExit = (
      forwardSection: StorySectionKey,
      backwardSection: StorySectionKey,
    ) => {
      if (travelDirection === "backward") motion.exit(backwardSection);
      else motion.exit(forwardSection);
    };

    /**
     * 抠图接管：切 data-visible 的同时把主视频推成「模糊 + 暗化」的底。
     *
     * 为什么必须模糊：新素材是透明抠图，姿态与视频帧不是同一个动作，
     * 视频帧里那个坐姿人物会从抠图的透明区域里露出来 = 双影。
     * 糊掉 + 压暗后它就只是一层氛围底，抠图人物干净地浮在上面
     * （参考图 Portfolio-Bg 的视觉语言）。filter 走 transition，
     * 与抠图自己的 opacity 过渡时长一致（IMAGE_FADE_MS）。
     */
    const writeImage = (pose: string, visible: boolean) => {
      if (lastImageVisible.get(pose) === visible) return;
      lastImageVisible.set(pose, visible);
      const el = resolvePose(pose as Pose);
      if (el) el.dataset.visible = visible ? "true" : "false";

      // 任一抠图可见 → 视频就保持糊底。用「有没有人需要」而不是「谁需要」，
      // 因为同一时刻最多一个静态图层可见（各 Section 的 hold 段互不重叠）。
      let anyVisible = false;
      for (const p of POSES) {
        if (lastImageVisible.get(p)) {
          anyVisible = true;
          break;
        }
      }
      if (anyVisible !== blurred) {
        blurred = anyVisible;
        video.dataset.blurred = anyVisible ? "true" : "false";
      }
    };

    /** Hero↔主视频 crossfade：只在实际状态变化时写一次 style。 */
    const setMainOpacity = (opaque: boolean) => {
      if (mainOpaque === opaque) return;
      mainOpaque = opaque;
      video.style.opacity = opaque ? "1" : "0";
    };

    /** Hero 引擎的单步平滑 seek（与 HeroVideo 同一套纪律）。返回是否已到目标。 */
    const heroSeekStep = (target: number, now: number): boolean => {
      if (heroVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return false;
      const sinceWrite = now - heroLastWrite;
      const atTarget =
        Math.abs(heroVideo.currentTime - target) <= HERO_SEEK_SNAP && !heroVideo.seeking;
      if (sinceWrite < HERO_SEEK_INTERVAL_MS) return atTarget;
      if (heroVideo.seeking && sinceWrite < HERO_SEEK_STALE_MS) return false;

      const current = heroVideo.currentTime;
      const diff = target - current;
      if (Math.abs(diff) <= HERO_SEEK_SNAP) {
        if (!heroSettled) {
          heroSettled = true;
          heroVideo.currentTime = target;
          heroLastWrite = now;
        }
        return !heroVideo.seeking;
      }
      heroSettled = false;
      const elapsed = Math.min(sinceWrite, 200);
      const ratio = 1 - Math.exp(-elapsed / HERO_SEEK_TAU_MS);
      const step = clamp(diff * ratio, -HERO_MAX_SEEK_STEP, HERO_MAX_SEEK_STEP);
      const duration =
        Number.isFinite(heroVideo.duration) && heroVideo.duration > 0
          ? heroVideo.duration
          : HERO_DURATION_FALLBACK;
      heroVideo.currentTime = clamp(current + step, 0, duration);
      heroLastWrite = now;
      return false;
    };

    const tick = (now: number) => {
      raf = window.requestAnimationFrame(tick);
      const p = progressPx();
      const vh = window.innerHeight;
      const tl = timelineRef.current;
      const { seg, localP } = segmentAt(p);
      const pVh = (p / vh) * 100;
      const delta = p - previousP;
      const direction = delta > 0.5 ? "forward" : delta < -0.5 ? "backward" : "idle";
      previousP = p;
      if (direction !== "idle") travelDirection = direction;
      if (container.dataset.storyDirection !== direction) {
        container.dataset.storyDirection = direction;
      }
      const storyPhase = storyPhaseOf(seg);
      if (storyPhase !== lastStoryPhase) {
        lastStoryPhase = storyPhase;
        container.dataset.storyPhase = storyPhase;
      }

      // 文件夹展开时优先留在 Work 阅读区。进入末尾关闭缓冲或离开 Work 后，
      // 先让卡片收回；继续滚动仍由原时间轴接管，不阻断页面滚轮。
      // ⚠ 这里只请求关闭（setProjectsOpen），不动 projectsOpenRef —— 它要
      // 保持 true 到收起动画播完（WorkProjectFolder 回流 onOpenChange(false)
      // 才落 false），滚动引擎的 work 层退场守卫在整个收起期间都得认这个窗口；
      // 防重入由 folderCloseRequestedRef 负责。
      if (
        projectsOpenRef.current &&
        !folderCloseRequestedRef.current &&
        (seg.sectionId !== "work" ||
          (localP >= FOLDER_CLOSE_AT &&
            projectsOpenAtScrollYRef.current !== null &&
            Math.abs(window.scrollY - projectsOpenAtScrollYRef.current) >= 8))
      ) {
        folderCloseRequestedRef.current = true;
        projectsOpenAtScrollYRef.current = null;
        setProjectsOpen(false);
      }

      // 文件夹窗口结束后，只要不在 Work 段就兜底退场（幂等，hidden/exiting
      // 时是空操作）：上面与 transitionExit 处的两道守卫会在文件夹窗口内拦下
      // 滚动引擎的 work 退场，若没有这里，关闭完成后（比如用户已滚出 Work 段）
      // work 层会停在 entered 永不退场。走 exit 的 220ms 淡出而非瞬消。
      if (!projectsOpenRef.current && seg.sectionId !== "work") {
        motion.exit("work");
      }

      // ---- 静态图接管 / 退场（只在 hold 区间）----
      for (const pose of POSES) {
        const holdSeg = tl.segments.find((s) => s.image === pose) as
          | (Segment & { image: Pose })
          | undefined;
        if (!holdSeg) continue;
        const active =
          seg === holdSeg &&
          localP < (holdSeg.last ? 1.01 : 1 - IMAGE_TAIL_VH / holdSeg.vh) &&
          // 只有视频真的落到关键帧上、且这一帧已经渲染完成（没在 seek）才允许接管；
          // 反向滚动同样成立。带着中间帧淡入 = 切换瞬间的错位。
          (reduced ||
            (Math.abs(video.currentTime - holdSeg.t0) <= SETTLE_EPS && !video.seeking));
        writeImage(pose, active);
      }

      // UI motion is event-driven: scroll chooses the story phase, then CSS owns
      // the elapsed-time animation. No opacity, blur, scale, or title progress is
      // derived from pVh here.
      if (storyPhase === "heroBiographyTransition") {
        transitionExit("hero", "about");
      } else if (storyPhase === "biographyWorkTransition") {
        transitionExit("about", "work");
      } else if (storyPhase === "workEndingTransition") {
        // 文件夹窗口内不推 work 退场：收起动画（180 + 620ms）远长于 exit 的
        // 220ms，先 hidden 会把收起动画腰斩 —— 文件夹收到一半消失（实测探针
        // probe-folder-ghost.mjs 场景 B）。关闭完成后由上方兜底 exit 接管。
        // （backward 回滚时文件夹必已关闭 —— open 状态一离开 Work 段就被
        // 自动关闭 —— 所以这一道守卫不影响 backward 的 exit(contact)。）
        if (!projectsOpenRef.current) transitionExit("work", "contact");
      }

      let settledSection: StorySectionKey | null = null;
      if (storyPhase === "hero") {
        settledSection = "hero";
      } else if (
        seg.kind === "hold" &&
        seg.image &&
        lastImageVisible.get(seg.image)
      ) {
        settledSection = seg.sectionId as StorySectionKey;
      }

      if (settledSection) {
        const nearForwardEdge =
          !seg.last &&
          travelDirection === "forward" &&
          (1 - localP) * seg.vh <= UI_EXIT_LEAD_VH;
        const nearBackwardEdge =
          seg.kind !== "hero" &&
          travelDirection === "backward" &&
          localP * seg.vh <= UI_EXIT_LEAD_VH;
        if (nearForwardEdge || nearBackwardEdge) {
          // Work 层不吃这 8vh 提前离场：它是文件夹（可交互对象）的载体。
          // 边缘带内提前 exit 后，用户若停在带内，settled 判定每帧重新指向
          // work、exit 早退，没有任何路径把它恢复成 entered —— 展开态出现
          // 「chrome 可见（自身 visibility:visible 逃逸父级 hidden）、文件夹
          // 与卡片消失」的幽灵层，收起后则整个文件夹消失（用户实测两张截图，
          // 探针 probe-folder-ghost.mjs 场景 A 复现）。它的离场交给出段后的
          // transitionExit 与兜底 exit，时机只差 8vh。
          if (settledSection !== "work") motion.exit(settledSection);
        } else {
          for (const section of STORY_SECTION_KEYS) {
            if (section !== settledSection) motion.hide(section);
          }
          motion.enter(settledSection);
        }
      }

      // ---- Biography 履历滚动（三阶段，纯位置函数，反向天然可逆）----
      // 段内进度：introHold 段钉 0、scroll 段线性推进、endHold 段钉 1。
      // 移动只写 translate3d + 两个 mask 渐淡变量（px），不碰 layout 属性。
      if (resumeContent && resumeViewport) {
        const about = tl.zone.about;
        const scrollLenVh = Math.max(
          0.0001,
          about.holdVh - RESUME_SCROLL.introHoldVh - RESUME_SCROLL.endHoldVh,
        );
        // 履历位置 = 纯滚动位置函数（2026-09-21 去掉 phase 门控）。
        // 旧版在 about 非 entered（入场 940ms 内）时强制 resumeP=0（顶部），
        // entered 翻转后瞬间写成真实位置 —— 深层滚动位进入（项目页返回 /
        // 从 work 段回滚 / 快速滚动越过 introHold）就是一次可见大跳
        // （探针 probe-resume-jump 实测 Δ≈1796px）。位置计算不依赖入场状态：
        // 正向正常入场时 introHold 段 resumeP 本来就是 0，行为不变；
        // 深位进入则从入场第一帧起就停在正确位置，动画全程无跳变。
        const resumeP = clamp(
          (pVh - about.startVh - RESUME_SCROLL.introHoldVh) / scrollLenVh,
          0,
          1,
        );
        const traveled = resumeTravel * resumeP;
        if (
          Number.isNaN(lastResumeShift) ||
          Math.abs(traveled - lastResumeShift) >= 0.5
        ) {
          lastResumeShift = traveled;
          resumeContent.style.transform = `translate3d(0, ${(-traveled).toFixed(2)}px, 0)`;
          // 边缘渐淡跟着行程走：出发时年份标题完整（顶 fade 0），
          // 结束时最后一项完整（底 fade 0）；行程不足 36/48px 时线性抬起。
          const topFade = Math.min(1, traveled / 36) * 32;
          const bottomFade =
            resumeTravel <= 0
              ? 0
              : Math.min(1, (resumeTravel - traveled) / 48) * 44;
          resumeViewport.style.setProperty("--resume-fade-top", `${topFade.toFixed(1)}px`);
          resumeViewport.style.setProperty(
            "--resume-fade-bottom",
            `${bottomFade.toFixed(1)}px`,
          );
        }
      }

      // 四个图层都写过一遍状态之后，才把可见性交给 data-state 管
      // （在这之前 CSS 只放行首屏文案，见 story.module.css 的 .zone:not(.heroZone)）。
      if (!readyMarked) {
        readyMarked = true;
        container.dataset.storyReady = "true";
      }

      // ---- hash 跟随当前 Section（hold 段才记位）----
      if (seg.sectionId && seg.sectionId !== lastHashId) {
        lastHashId = seg.sectionId;
        window.history.replaceState(null, "", `#${seg.sectionId}`);
      } else if (!seg.sectionId && lastHashId && p <= 0) {
        lastHashId = "";
        window.history.replaceState(null, "", window.location.pathname);
      }

      // ---- Hero 视频引擎：跟随 / 交接 / 吸附 ----
      const heroReady = heroVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
      if (!reduced && heroReady && heroMode !== "static") {
        if (heroMode === "loop") {
          if (seg.kind === "hero") {
            if (heroVideo.paused) void heroVideo.play().catch(() => {});
          } else if (!heroVideo.paused) {
            heroVideo.pause();
          }
        }
        if (seg.kind === "hero") {
          if (mainOpaque) {
            // 从主叙事滚回首屏：主视频还盖在上面时先把 Hero 吸附到正面，
            // 渲染到位后再揭开，保证反向交接同样落在正面基准上。
            const front = nearestFrontTime(heroVideo.currentTime);
            if (Math.abs(heroVideo.currentTime - front) > HERO_FRONT_EPS) {
              heroVideo.currentTime = front;
            } else if (!heroVideo.seeking) {
              setMainOpacity(false);
            }
          } else if (heroMode === "interactive") {
            // 指针 → 归一化坐标 → 死区/角度 → 时间轴位置
            let target: number = POSE_TIME.center;
            if (pointerRef.has && !leaving) {
              const nx = (pointerRef.x / window.innerWidth - 0.5) * 2;
              const ny = (pointerRef.y / window.innerHeight - 0.5) * 2;
              const radius = Math.hypot(nx, ny);
              if (radius >= CENTER_DEAD_ZONE) {
                const angle = (Math.atan2(-ny, nx) * 180) / Math.PI;
                if (CONTINUOUS_ANGLE) {
                  const poseTime = angleToPoseTime(angle);
                  const blend = smoothstep(
                    CENTER_DEAD_ZONE,
                    CENTER_DEAD_ZONE + DEAD_ZONE_BLEND,
                    radius,
                  );
                  target = lerp(POSE_TIME.center, poseTime, blend);
                } else {
                  const candidate = nearestDirection(angle);
                  if (candidate !== heroDirection) {
                    const candidateDist = angularDistance(angle, POSE_ANGLE[candidate]);
                    const currentDist = angularDistance(angle, POSE_ANGLE[heroDirection]);
                    if (candidateDist + SWITCH_HYSTERESIS_DEG < currentDist) {
                      heroDirection = candidate;
                    }
                  }
                  target = POSE_TIME[heroDirection];
                }
              }
            }
            heroSeekStep(target, now);
          }
        } else {
          // 离开首屏：暂停跟随，平滑回到最近正面端点；到位后 crossfade 接主视频。
          if (heroMode === "loop" && !heroVideo.paused) heroVideo.pause();
          const front = nearestFrontTime(heroVideo.currentTime);
          if (seg.kind === "handoff") {
            if (heroSeekStep(front, now)) setMainOpacity(true);
          } else {
            // 已越过交接段（快速滚动）：在主视频覆盖下直接吸附到正面。
            if (Math.abs(heroVideo.currentTime - front) > HERO_FRONT_EPS) {
              heroVideo.currentTime = front;
            }
            setMainOpacity(true);
          }
        }
      }

      // ---- Hero 视频持屏：crossfade 白场消除（2026-09-21）----
      // 白场根因：handoff 一进入，hero 区退场 CSS（[data-hero-ui-motion="exiting"]）
      // 立刻把 heroVideo 淡出（500ms），而主视频要等 heroSeekStep 把 hero 从侧面
      // 姿态平滑 seek 到正面端点才点亮（最远 ~700ms）—— 中间没有任何一层盖住
      // 舞台，露出 .stage 兜底底色 rgb(250,249,252)（探针 probe-hero-flash 实测
      // 正向空窗 769ms）。修法：主视频尚未盖住舞台（mainOpaque=false）期间写
      // data-hero-video-hold 把 heroVideo 按在 opacity:1 / transition:none。
      // heroVideo 在 z-index 0，主视频（z-index 1）淡入盖住它之后再放行退场淡出
      // —— 被盖住的淡出不可见，「先后淡出」变成真 crossfade。反向回滚（主视频
      // 140ms 淡出揭 hero）同样靠它消掉 640ms 入场延迟造成的空窗（实测 722ms）。
      // 放在 hero 引擎块之后：mainOpaque 刚在本帧更新过，判定不滞后。
      if (seg.kind !== "hero") hasLeftHero = true;
      // 释放时机（v2）：mainOpaque 翻 true 后再等 MAIN_COVER_HOLD_MS（140ms
      // 过渡走完 + 20ms 余量）才放行 heroVideo 的退场淡出。若与主视频淡入同时
      // 起步，两条强 ease-out 曲线交叉谷里两层短暂双双半透明（残余 1-2 帧
      // 闪白）；推迟后 hero 的淡出全程发生在被完全盖住之后，理论零透出。
      if (mainOpaque) {
        if (mainCoveredAt < 0) mainCoveredAt = now;
      } else {
        mainCoveredAt = -1;
      }
      const heroCovered = mainOpaque && now - mainCoveredAt >= MAIN_COVER_HOLD_MS;
      const heroVideoHold = !heroCovered && (seg.kind !== "hero" || hasLeftHero);
      if (lastHeroVideoHold !== heroVideoHold) {
        lastHeroVideoHold = heroVideoHold;
        container.dataset.heroVideoHold = heroVideoHold ? "true" : "false";
      }

      // ---- 主视频平滑 seek：以真实位置为基准做相对趋近 ----
      if (reduced) return;
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      const sinceWrite = now - mainLastWrite;
      if (sinceWrite < SEEK_INTERVAL_MS) return;
      if (video.seeking && sinceWrite < SEEK_STALE_MS) return;
      const mainTarget =
        seg.kind === "hero" || seg.kind === "handoff"
          ? KEYFRAMES.hero
          : seg.kind === "hold"
            ? seg.t0
            : moveTargetOf(seg, localP);
      if (mainTarget !== mainLastTarget) {
        mainSettled = false;
        mainLastTarget = mainTarget;
      }

      const current = video.currentTime;
      const diff = mainTarget - current;
      if (Math.abs(diff) <= SEEK_SNAP) {
        if (!mainSettled) {
          mainSettled = true;
          video.currentTime = mainTarget;
          mainLastWrite = now;
        }
        return;
      }
      // 直接赋 target：scroll-scrub 版视频 seek ≤7ms，每个节流窗口内都能
      // 完成解码，不再需要指数趋近平滑。旧指数趋近(tau=80ms)在 seek 即时后
      // 反而造成稳态滞后——move 段 ct 落后 target 约 0.15s、到 hold 段才补跳，
      // 体感仍是「滚一段跳一下」。直接赋让 ct 紧跟滚动位置，反向天然对称。
      // SEEK_INTERVAL_MS 节流仍保留：避免每帧都触发 seek（35Hz 更新足够平滑）。
      const duration =
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : KEYFRAMES.ending + 0.3;
      video.currentTime = clamp(mainTarget, 0, duration);
      mainLastWrite = now;
    };

    const start = () => {
      if (running) return;
      running = true;
      mainLastWrite = -Infinity;
      heroLastWrite = -Infinity;
      raf = window.requestAnimationFrame(tick);
    };
    const stop = () => {
      if (!running) return;
      running = false;
      window.cancelAnimationFrame(raf);
    };

    // 容器离开视口（前后各留 30% 余量）就停引擎，滚回来自动恢复。
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) start();
        else stop();
      },
      { rootMargin: ENGINE_ROOT_MARGIN, threshold: 0 },
    );
    io.observe(container);

    // ---- 指针监听：跟随输入（引擎只在 hero 段消费）----
    const onPointerMove = (event: PointerEvent) => {
      pointerRef.x = event.clientX;
      pointerRef.y = event.clientY;
      pointerRef.has = true;
      leaving = false;
    };
    const onLeave = () => {
      leaving = true;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    window.addEventListener("blur", onLeave);

    // ---- 视频初始化：均不 autoplay（loop 形态除外）----
    const onHeroLoadedData = () => {
      if (heroMode === "loop") {
        void heroVideo.play().catch(() => {});
      } else {
        heroVideo.pause();
        heroVideo.currentTime = POSE_TIME.center;
      }
      if (stage) stage.dataset.ready = "true";
    };
    heroVideo.addEventListener("loadeddata", onHeroLoadedData);
    if (heroVideo.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) onHeroLoadedData();

    const onMainLoadedData = () => {
      video.pause();
      // 中途刷新 / 带锚点进入：跳过动画直接落到当前滚动位置的画面。
      video.currentTime = clamp(mainTargetAt(progressPx()), 0, KEYFRAMES.ending);
    };
    video.addEventListener("loadeddata", onMainLoadedData);
    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) onMainLoadedData();

    return () => {
      motion.dispose();
      stop();
      io.disconnect();
      resumeObserver.disconnect();
      if (rebuildRaf) window.cancelAnimationFrame(rebuildRaf);
      heroVideo.removeEventListener("loadeddata", onHeroLoadedData);
      video.removeEventListener("loadeddata", onMainLoadedData);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("blur", onLeave);
      window.removeEventListener("resize", updateChromeContrast);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={styles.container}
      data-story-container=""
      data-projects-open={projectsOpen ? "true" : "false"}
      style={
        {
          height: `calc(100svh + ${INITIAL_TIMELINE.totalVh}vh)`,
        } as React.CSSProperties
      }
    >
      {/* 视觉舞台：Hero 视频、主视频与三张静态帧永远叠放在同一个 16:9 盒内，
          几何坐标完全一致；所有交接只动 opacity，不卸载、不换 src、不位移。 */}
      <div ref={stageRef} className={styles.stage} data-ready="false" aria-hidden="true">
        <div className={styles.stageBox}>
          <video
            ref={heroVideoRef}
            className={styles.heroVideo}
            data-ui-group="hero-visual"
            src={HERO_VIDEO_SRC}
            poster={HERO_VIDEO_POSTER}
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            tabIndex={-1}
            /* 取景校准（HERO_ALIGN）：把 Hero 帧校到主视频的相机取景上，
               crossfade 交接才不会重影。模型与静态图 STATIC_ALIGNMENT 相同。 */
            style={{ transform: alignTransform(HERO_ALIGN) }}
          />
          <video
            ref={videoRef}
            className={styles.video}
            src={MAIN_VIDEO_SRC}
            poster={MAIN_VIDEO_POSTER}
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            tabIndex={-1}
          />
          {POSES.map((pose) => (
            <div
              key={pose}
              className={styles.poseLayer}
              data-pose={pose}
              data-visible="false"
            >
              {/* 静态帧画布 = 舞台盒：静态帧与主视频是同一个 16:9 坐标系里的两层，
                  画布只负责裁掉盒溢出视口的部分（overflow: hidden）。
                  帧本身 inset 0 / 100% / object-fit: fill，与视频同规格；
                  对齐全不变量补偿（STATIC_ALIGNMENT，素材 ~1.9% 取景差）
                  挂在 img 的 transform 上 —— 两层内容因此逐位重合，
                  接管只切 opacity。见 story.module.css 的 .pose。 */}
              <div className={styles.poseCanvas}>
                <Image
                  className={styles.pose}
                  src={POSE_SRC[pose]}
                  alt=""
                  aria-hidden="true"
                  width={1920}
                  height={1080}
                  sizes="100vw"
                  unoptimized
                  style={{ transform: alignTransform(STATIC_ALIGNMENT[pose]) }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 内容层：四个 Section 全部叠在同一个 sticky 舞台上完成换幕。
          滚动只推进状态（视频时间 / 透明度），不搬运画面 ——
          上一幕原地淡出、下一幕原地淡入，谁都不会跟着文档流向上滚走。 */}
      <div className={styles.content}>
        <div className={styles.overlay} data-story-overlay="">
          {/* 首屏：文案在原地淡出（淡出窗口 = heroHold + heroHandoff 的尾部），
              柴犬始终留在 sticky 舞台上演进。 */}
          <section
            id="top"
            className={`${home.hero} ${styles.zone} ${styles.heroZone}`}
            data-layer="hero"
            data-scroll-start-vh={0}
          >
            <div className={`${styles.zoneFade} ${styles.heroFade}`} data-fade="hero">
              {heroCopy}
            </div>
          </section>

          {/* ------------------------------------------------ 履历 Section */}
          <section
            id="about"
            className={styles.zone}
            data-layer="about"
            data-scroll-start-vh={INITIAL_TIMELINE.zone.about.startVh}
            aria-labelledby="about-title"
          >
            <div className={styles.zoneInner}>
              <div className={styles.zoneFade} data-fade="about">
                {/* 履历文字区（Figma 1920×1080 稿）：标题区钉在 zoneInner 顶部
                    （与作品 Section 同一套 storyHead 结构），下方左右两列——
                    左列 简介/能力/Tools，右列 2023-2026 工作经历与参与项目。
                    左缘 = 全站 page padding，宽度见 .bio 的注释（要给柴犬的手让位）。 */}
                <header className={styles.storyHead}>
                  <p className={styles.storyHeadEyebrow} data-ui-group="bio-label">
                    <span className={styles.storyHeadIndex}>01</span>
                    <span className={styles.storyHeadLabel}>
                      BIOGRAPHY / 个人履历
                    </span>
                    <span className={styles.storyHeadRule} aria-hidden="true" />
                  </p>
                  <h2
                    className={styles.storyHeadTitle}
                    id="about-title"
                    data-ui-group="bio-title"
                  >
                    ABOUT
                  </h2>
                </header>
                <div className={styles.bio} data-bio-copy="">
                  <div className={styles.bioLeft}>
                    <div className={styles.bioIntro} data-ui-group="bio-identity">
                      <h3 className={styles.bioHello}>你好，我是伍子荣</h3>
                      <p className={styles.bioIntroLine}>
                        是一名同时参与产品、UX/UI 与落地实现的产品设计师。
                      </p>
                    </div>
                    <div
                      className={styles.bioRule}
                      data-ui-group="bio-rule-identity"
                      aria-hidden="true"
                    />
                    <div className={styles.bioCaps}>
                      {capabilities.map((capability, index) => (
                        <article
                          className={styles.bioCap}
                          data-ui-group={`bio-cap-${index}`}
                          key={capability.title}
                        >
                          <h3 className={styles.bioCapTitle}>{capability.title}</h3>
                          <p className={styles.bioCapBody}>{capability.body}</p>
                        </article>
                      ))}
                    </div>
                    <div
                      className={styles.bioRule}
                      data-ui-group="bio-rule-capabilities"
                      aria-hidden="true"
                    />
                    <p className={styles.bioTools} data-ui-group="bio-tools">
                      <span className={styles.bioToolsLabel}>Tools</span>
                      <span className={styles.bioToolsList}>
                        Figma · Codex · After Effects · Photoshop · 即梦
                      </span>
                    </p>
                  </div>

                  {/* 右列 = 固定视口（.bioRight，overflow+渐淡 mask）里的一整列履历。
                      2023.12–2026.07 / 公司 / 工作说明 / 参与项目同属一个运动对象：
                      页面滚动推进 Biography hold 段时整列 translate3d 上移，
                      没有 scroll container —— 见 .resumeViewport / .resumeContent 注释。 */}
                  <div
                    ref={resumeViewportRef}
                    className={styles.bioRight}
                    data-bio-career=""
                    data-bio-viewport=""
                  >
                    <div
                      ref={resumeContentRef}
                      className={styles.resumeContent}
                      data-bio-resume-content=""
                    >
                      <p
                        className={styles.bioYears}
                        data-bio-years=""
                        data-ui-group="bio-years"
                      >
                        2023.12–2026.07
                      </p>
                      <p
                        className={styles.bioCompany}
                        data-bio-company=""
                        data-ui-group="bio-company"
                      >
                        合一智控科技有限公司 · 深圳 · 交互设计师&amp;产品助理
                      </p>
                      <p
                        className={styles.bioCareerBody}
                        data-bio-career-body=""
                        data-ui-group="bio-duties"
                      >
                        参与智能空间小程序、Web 平台及内部管理系统的规划与持续迭代，承担需求分析、流程梳理、功能方案、产品原型、UX/UI 设计及研发验收等工作。
                      </p>
                      <div
                        className={styles.bioRule}
                        data-ui-group="bio-rule-projects"
                        aria-hidden="true"
                      />
                      <div
                        className={styles.bioProjects}
                        data-ui-group="bio-projects"
                      >
                        <h3
                          className={styles.bioProjectsTitle}
                          data-bio-projects-heading=""
                        >
                          参与项目
                        </h3>
                        {/* 纯文本列表：无 bullet、无编号、无卡片、无图标。 */}
                        <ul className={styles.bioProjectList}>
                          {careerProjects.map((project) => (
                            <li data-bio-project="" key={project.title}>
                              <h4
                                className={styles.bioProjectTitle}
                                data-bio-project-title=""
                              >
                                {project.title}
                              </h4>
                              <p
                                className={styles.bioProjectDescription}
                                data-bio-project-description=""
                              >
                                {project.description}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ---------------------------------------------- 履历层辅助装饰
                右下角 editorial 小字。底部章节进度已升级为全站 SiteProgress
                （page.tsx 挂载的 fixed HUD，贯穿全部 Section），本层不再重复一根；
                只保留这组随本层进出的 editorial 小字。 */}
            <div
              className={styles.bioChrome}
              data-fade-extra="about"
              data-ui-group="bio-chrome"
              aria-hidden="true"
            >
              <div className={styles.chromeAside}>
                <p>Product Designer · UX / UI</p>
                <p>System Thinking · AI-Aided</p>
                <p>Scroll to explore</p>
                <span className={styles.chromeAsideRule} />
              </div>
            </div>
          </section>

          {/* ------------------------------------------------ 作品 Section */}
          <section
            id="work"
            className={`${styles.zone} ${styles.zoneWork}`}
            data-layer="work"
            data-scroll-start-vh={INITIAL_TIMELINE.zone.work.startVh}
            aria-labelledby="work-title"
          >
            <div className={styles.zoneInner}>
              <div className={styles.zoneFade} data-fade="work">
                <div className={`${styles.zoneCopy} ${styles.zoneCopyLeft}`}>
                  <header className={styles.storyHead} data-work-head-closed="">
                    <p className={styles.storyHeadEyebrow} data-ui-group="work-label">
                      <span className={styles.storyHeadIndex}>02</span>
                      <span className={styles.storyHeadLabel}>WORK / 作品</span>
                      <span className={styles.storyHeadRule} aria-hidden="true" />
                    </p>
                    <h2
                      className={`${styles.storyHeadTitle} ${styles.workHeadTitle}`}
                      id="work-title"
                      data-ui-group="work-title"
                    >
                      SELECTED WORK
                    </h2>
                  </header>
                </div>
              </div>
              {/* 文件夹层与上面的文字同一条透明度曲线（引擎一起写），
                  所以它是「原地淡入淡出」，不再凭空出现 / 被顶出视口。 */}
              <WorkProjectFolder
                projects={workCases}
                open={projectsOpen}
                onOpenChange={handleProjectsOpenChange}
              />
            </div>
          </section>

          {/* ------------------------------------------------ 结尾 Section */}
          <section
            id="contact"
            className={styles.zone}
            data-layer="contact"
            data-scroll-start-vh={INITIAL_TIMELINE.zone.contact.startVh}
            aria-labelledby="contact-title"
          >
            <div className={`${styles.zoneInner} ${styles.zoneInnerEnd}`}>
              {/* 淡入淡出载体空壳：引擎写 opacity/blur 的挂点（「结尾文字压视频停帧」
                  等换幕断言看的就是它的 opacity）。它不能包住文字层 —— filter ≠ none
                  的元素会成为 absolute 后代的 containing block，淡入中（blur 生效）与
                  完成（none）之间定位基准漂移一整个 zoneInner 的 padding，标题位置
                  每次进入尾页都不一样。 */}
              <div className={styles.zoneFade} data-fade="contact" />
              {/* 海报式收尾层：absolute 满铺（inset 0 / pointer-events none）。
                  data-fade-extra 挂同一条透明度曲线但引擎只写 opacity 不写 blur
                  —— 没有 filter，containing block 恒为 zoneInnerEnd，位置恒定。
                  关键帧、接管与视频 scrub 全不动；只有 CTA 与 Back to top 开命中。 */}
              <div className={styles.endingCopy} data-fade-extra="contact">
                  <header className={styles.endHead}>
                    <p className={styles.endLabel} data-ui-group="ending-label">
                      <span className={styles.endLabelIndex}>04</span>
                      <span>The Possibility</span>
                      <span className={styles.endLabelCn}>无限可能</span>
                    </p>
                    <h2
                      className={styles.endTitle}
                      id="contact-title"
                      data-ui-group="ending-title"
                    >
                      <GradientText
                        animationSpeed={11.5}
                        colors={["#ff6227", "#ffd472", "#e32727"]}
                        showBorder={false}
                      >
                        Beyond the ordinary.
                      </GradientText>
                    </h2>
                  </header>
                  <div className={styles.endManifesto}>
                    <p
                      className={styles.endManifestoTitle}
                      data-ui-group="ending-manifesto-title"
                    >
                      Let&apos;s build something meaningful.
                    </p>
                    <p
                      className={styles.endManifestoBody}
                      data-ui-group="ending-manifesto-body"
                    >
                      让想象挣脱边界，把不可用的想法变成下一件真正落地的作品。
                    </p>
                  </div>
                  <div className={styles.endSide}>
                    <p className={styles.endAside} data-ui-group="ending-aside">
                      <span>Zirong Wu</span>
                      <span>Product · Design · AI</span>
                      <span>持续探索，持续创作。</span>
                    </p>
                    <footer className={styles.endCtaRow}>
                      <a
                        className={`${styles.endAction} ${styles.endCta}`}
                        href="mailto:2462362144@qq.com"
                        ref={contactTriggerRef}
                        onPointerEnter={() => { void warmContactLanyard(); }}
                        onFocus={() => { void warmContactLanyard(); }}
                        onClick={(event) => {
                          event.preventDefault();
                          setContactPrepared(true);
                          setContactOpen(true);
                        }}
                        data-ui-group="ending-action-0"
                      >
                        <svg
                          className={styles.endIcon}
                          viewBox="0 0 16 16"
                          width="16"
                          height="16"
                          fill="none"
                          aria-hidden="true"
                        >
                          <rect
                            x="1.75"
                            y="2.25"
                            width="12.5"
                            height="9.5"
                            rx="4.5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M6.5 11.75L5.75 14L9.2 11.75"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle cx="5.1" cy="7" r="0.95" fill="currentColor" />
                          <circle cx="8" cy="7" r="0.95" fill="currentColor" />
                          <circle cx="10.9" cy="7" r="0.95" fill="currentColor" />
                        </svg>
                        聊一聊
                      </a>
                      <a
                        className={`${styles.endAction} ${styles.endCtaGhost}`}
                        href={siteAsset("/伍子荣简历.pdf")}
                        target="_blank"
                        rel="noreferrer"
                        data-ui-group="ending-action-1"
                      >
                        <svg
                          className={styles.endIcon}
                          viewBox="0 0 16 16"
                          width="16"
                          height="16"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M2.75 10.5V11.75C2.75 12.58 3.42 13.25 4.25 13.25H11.75C12.58 13.25 13.25 12.58 13.25 11.75V10.5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M8 2.75V9.25"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                          <path
                            d="M4.9 6.4L8 9.5L11.1 6.4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        简历
                      </a>
                      <button
                        type="button"
                        className={`${styles.endAction} ${styles.endTop}`}
                        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                        aria-label="回到顶部"
                        data-ui-group="ending-action-2"
                      >
                        <svg
                          className={styles.endIcon}
                          viewBox="0 0 16 16"
                          width="16"
                          height="16"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M3 3H13"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                          <path
                            d="M8 13.25V6.1"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                          <path
                            d="M4.9 8.1L8 5L11.1 8.1"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </footer>
                  </div>
                </div>
            </div>
          </section>
        </div>
      </div>
      {contactPrepared && <ContactLanyardOverlay isOpen={contactOpen} onClose={closeContact} />}
    </div>
  );
}
