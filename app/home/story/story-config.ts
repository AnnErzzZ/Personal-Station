/**
 * 首页滚动叙事（Scrollytelling）的全部参数 —— 调节奏只改这个文件。
 *
 * 素材：
 *   Hero 视频 public/videos/home-hero-interactive.mp4（1280×720 / 10.03s；鼠标视线跟随）
 *   主视频 public/videos/home-main-timeline.mp4（1280×720 / 12.29s；
 *          原 timeline-render.mp4 已重编码为 scroll-scrub 版（GOP 0.5s / crf 18 /
 *          faststart，关键帧 0/4/8/12s 构图与原片 1:1）；原文件备份于
 *          .workbuddy/backup-video/。背景：长 GOP(~10s) 导致 scroll scrub 时
 *          seek 5→10s 区间耗时 60-138ms，28ms 节流下大部分 seek 未完成即被打断、
 *          视频停滞+大跳变 = 抽帧感；重编码后全段 seek ≤7ms。见 artifacts/tmp/
 *   静态帧 public/story/{resume,work,ending}-frame.jpg（**16:9 全幅帧**，
 *          与主视频同一套渲染的高分辨率版本：履历 1920×1080 / 作品 1920×1080 /
 *          结尾 1672×941，背景已白平衡到视频帧背景 rgb(250,249,252)）
 *
 * 官方关键帧（逐帧核对过，见 artifacts/timeline-frames/）：
 *   0.0s 正脸 / 4.0s 履历介绍 / 8.0s 作品工作（扶手椅+电脑）/ 12.0s 结尾坠落
 *   成片 12.31s，最后 0.31s 不进正式时间轴 —— 12.0s 就是结束状态。
 *
 * 接管规则：履历 / 作品 / 结尾三处都是「视频精确停在关键帧 → 静态帧 110ms 淡入」。
 * 静态帧与视频**同为 16:9、同源同构图**，在同一个 .stageBox 里写同一套几何
 * （inset 0 / 100% / object-fit: fill），所以恒等对齐就等于满帧，没有任何
 * 位移或缩放参数 —— 静态帧不存在「自己的人物定位」，人物位置就写在画面里。
 * 素材的 ink 边界即关键帧的 ink 边界（实测 work l 0.5583 / resume l 0.4604，
 * 与旧 public/story/*.jpg 逐位一致），换素材后可用
 *   python artifacts/tmp/frame-ink-bbox.py
 * 复核，别怀疑「对齐是不是掉了」。
 */

import { siteAsset } from "@/lib/site-asset";

export const HERO_VIDEO_SRC = siteAsset("/videos/home-hero-interactive.mp4");
export const HERO_VIDEO_POSTER = siteAsset("/videos/home-hero-poster.jpg");
export const MAIN_VIDEO_SRC = siteAsset("/videos/home-main-timeline.mp4");
export const MAIN_VIDEO_POSTER = siteAsset("/videos/home-main-poster.jpg");

/** Hero 交互参数（自 hero-video-config.ts 并入，引擎已合并进 StoryScrolly）。 */
export const POSE_TIME = {
  center: 0.8,
  left: 2.4,
  up: 4.1,
  right: 5.6,
  down: 7.7,
} as const;
export type HeroPoseName = keyof typeof POSE_TIME;

export const CENTER_DEAD_ZONE = 0.18;
export const DEAD_ZONE_BLEND = 0.16;
export const CONTINUOUS_ANGLE = true;
export const SWITCH_HYSTERESIS_DEG = 8;

/**
 * 桌面端（hover: hover + pointer: fine）的 Hero 播放形态，两者互斥：
 * - "interactive"：pause 后鼠标位置驱动 currentTime，视线跟随；
 * - "loop"：autoplay + loop 常速循环（与移动端一致）。
 * autoplay 与 seek 会抢 currentTime，不能共存。
 */
export const HERO_DESKTOP_MODE: "interactive" | "loop" = "interactive";

export const HERO_SEEK_TAU_MS = 110;
export const HERO_MAX_SEEK_STEP = 0.45;
export const HERO_SEEK_INTERVAL_MS = 34;
export const HERO_SEEK_STALE_MS = 120;
export const HERO_SEEK_SNAP = 0.02;
export const HERO_DURATION_FALLBACK = 10.08;

/**
 * Hero 视频的「正面端点」：0.8s（center 姿态）与 9.6s（结尾恢复正面段）。
 * 首帧 0s 也是正面，但从任意姿态出发它都不是最近端点，列出无意义。
 * 交接时取距当前播放位置最近的端点，避免让用户看大段倒放。
 */
export const HERO_FRONT_TIMES = [POSE_TIME.center, 9.6] as const;
/** 判定「已到正面」的误差（秒）。 */
export const HERO_FRONT_EPS = 0.03;

/**
 * 正式 Section 对齐点（2026-09-20 起）。旧的 0.166 / 0.996 / 3.818 / 5.768 全部作废，
 * 围绕旧主视频建立的补偿参数也一并删掉。
 * ending 固定 12.0s，不用成片的 12.31s。
 */
export const KEYFRAMES = {
  hero: 0.0,
  resume: 4.0,
  work: 8.0,
  ending: 12.0,
} as const;

export type PoseName = keyof typeof KEYFRAMES;

/** 三个 Section 各自铺静态图（履历 / 作品 / 结尾），hero 由首屏交互视频负责。 */
export const STATIC_POSES = ["resume", "work", "ending"] as const;
export type StaticPose = (typeof STATIC_POSES)[number];

/**
 * 【2026-09-20 晚第二轮：抠图模型整体退役】这里曾有 POSE_LAYOUT 与
 * WORK_OPEN_LAYOUT 两组参数，用来把三张 **1254×1254 RGBA 透明抠图** 按
 * 「视口百分比 + 中心点」摆到画面里，并在文件夹展开时把 work 抠图收到右下角。
 *
 * 那一版的问题是根上的：把三张 PNG 当成「人物素材」而不是「画面」，
 * 于是整张 1254² 画布被当人物缩放、塞进视口一角，人物全挤在右下。
 * 现状改为 **全幅 16:9 帧模型**（素材 public/story/*-frame.jpg）：
 *   - 静态帧与主视频同处 .stageBox、共用同一套几何（inset 0 / 100% / object-fit），
 *     接管只切 opacity，没有任何位移 / 缩放参数；
 *   - 人物在画面里的位置由 PNG 自己决定，代码不再负责「摆人物」；
 *   - 文件夹展开态只压暗整屏，不再给 work 帧派第二套坐标。
 * 因此两组参数连同 --cutout-* / --work-open-h 变量一并删除。
 * 教训记在这：静态帧的参数**只该有对齐全不变量**，不该有构图参数。
 */

/** 对齐参数形状（scale + translate%，origin = 中心）。仅 HERO_ALIGN 与
 *  已废弃的 STATIC_ALIGNMENT 用这个形状。 */
export type PoseAlign = { scale: number; x: number; y: number };

/**
 * 静态帧 ↔ 主视频关键帧的对齐补偿（scale + translate%，origin = 中心）。
 *
 * 【必须渲染侧应用】素材事实：三张 public/story/*-frame.jpg 相对视频关键帧
 * 存在系统性的 ~1.9% 取景缩放差（静态帧画面比视频帧「紧」约 2%，位移≈0）。
 * 满帧铺放时两层内容错位 ~2%（1440 盒上人物边缘差 6–8px）= 用户看到的
 * 「切换瞬间微小位移」。本组参数就是把这 ~2% 补回来，让静态帧内容与视频帧
 * 逐位重合 —— 它是对齐全不变量补偿，不是构图参数。
 *
 * 历史（防再犯）：
 * - 2026-09-20 凌晨 align_poses.py 对旧素材解出 scale≈1.020（25.4/22.9/37.0 → 8.5/8.9/15.2）。
 * - 2026-09-20 晚换 *-frame.jpg 时，基于「新素材与主视频同一套渲染、恒等即重合」的
 *   前提删掉了渲染侧应用 —— 该前提不成立：2026-09-21 用户报告切换位移，
 *   `python artifacts/tmp/align_poses_v3.py` 对现用素材重解，三张一致仍是
 *   scale≈1.019（恒等残差 25.2/22.7/36.7 → 解后 8.4/9.2/14.3），与旧解几乎逐位一致。
 *   「同一套渲染」消不掉取景差，渲染侧零参数 = 把素材固有差直接暴露给切换瞬间。
 * - 换素材后必须重解算（align_poses_v3.py 改 POSES 路径），不要手调。
 */
export const STATIC_ALIGNMENT: Record<StaticPose, PoseAlign> = {
  resume: { scale: 1.0189, x: 0.03, y: -0.05 },
  work: { scale: 1.0191, x: 0.03, y: -0.07 },
  ending: { scale: 1.0198, x: -0.02, y: 0.0 },
};

/**
 * 作品姿态的剪影地标（静态帧归一化坐标，左侧边界）—— 由
 * `node artifacts/tmp/work-safe-zone.mjs` 从 public/story/work.jpg 实测。
 * 新素材 public/story/work-frame.jpg 与之逐位一致（ink 左缘 0.5583 vs 0.5582），
 * 所以这组地标不用重解。
 *
 * 新素材（2026-09-20）里人物比旧片明显靠右：最近障碍的左缘落在
 * 视口中轴**右侧** 0.0592×舞台盒宽处（1440 → +95px、1920 → +114px），
 * 所以作品左栏还有很大余量，右侧边界沿用上一轮的 `calc(50% - 72px)` 就很宽松。
 *
 * 这两个地标是「作品 Section 左侧内容栏能铺多宽」的唯一依据，也是验收脚本里
 * 「卡片不侵入人物」断言的基准。换素材 / 换对齐参数后必须重新解算，不要手调。
 */
export const WORK_SILHOUETTE = {
  /** 笔记本 / 扶手椅最近处的左缘（卡片正对的障碍）。 */
  laptopX: 0.5598,
  /** 扶手椅整体最靠左的点（躯干下方，只在卡片底边以下出现）。 */
  chairX: 0.5582,
} as const;

/**
 * 履历姿态（4.0s）的剪影地标 —— 由 `python artifacts/tmp/resume-safe-zone.py`
 * 从 public/story/resume.jpg 实测：文字带（设计 y 92–700）内最靠左的障碍是
 * 柴犬伸出的手指尖，x = 883.5px（1920 设计坐标）= 0.4602 × 帧宽。
 *
 * 履历文字区（left 72 / width 824，见 story.module.css 的 .bio）的右缘 896
 * 允许压过它 —— Figma 稿就是这么画的，而且那一带实际有字形的行都够不到；
 * 真正的约束是「右列左缘 + 最长项目行」必须留在指尖左侧，
 * 这条由 verify-home-story.mjs 的「履历文字不压手」断言守住。
 * 换素材后必须重新解算，不要手调。
 */
export const RESUME_SILHOUETTE = { handX: 0.4602 } as const;

/** 静态图归一化坐标 → 视口 px（舞台盒 = 视频帧坐标系，盒按 cover 逻辑铺满视口）。 */
export function poseViewportPoint(
  rx: number,
  ry: number,
  align: PoseAlign,
  viewportWidth: number,
  viewportHeight: number,
) {
  const boxWidth = Math.max(viewportWidth, (viewportHeight * 16) / 9);
  const boxHeight = Math.max(viewportHeight, (viewportWidth * 9) / 16);
  return {
    x: viewportWidth / 2 + boxWidth * (align.scale * rx - align.scale / 2 + align.x / 100),
    y: viewportHeight / 2 + boxHeight * (align.scale * ry - align.scale / 2 + align.y / 100),
  };
}

/**
 * Hero 视频与主视频的取景校准（crossfade 交接用）。
 *
 * Hero 交互视频与主视频是两次独立渲染，相机取景有差：主体水平差 ~9px、
 * 纵向被拉伸 ~2.3%（2026-09-20 换主视频后，交接 crossfade 出现明显重影）。
 * 参数由 `python artifacts/tmp/fit_hero_align.py` 拟合解出：hero@0.8s（交接时
 * Hero 吸附的正面端点）↔ 主视频@0.0s，
 * 扫过主视频 0–1.3s 确认 0.0 已是最佳交接帧，错位只能靠本补偿消。
 * 拟合后主体区域平均帧差 15.8 → 6.9，残余位移 ≤2px。
 *
 * 模型与 STATIC_ALIGNMENT 相同：先 scale(中心) 后 translate(% of 元素尺寸)，
 * 写在 heroVideo 元素上。Hero 层没有被静态图/其他校准引用，动它最安全
 * （主视频绝不能动 —— 三张静态图是按主视频帧解算的）。
 * 换任一素材后必须重新解算，不要手调。
 */
export const HERO_ALIGN: PoseAlign = { scale: 1.027, x: -0.67, y: 0.62 };

/**
 * 滚动时间轴（单位 = vh 的滚动距离）。顺序严格为：
 * hold(hero) → handoff(hero→主视频) → move(hero→resume) → hold(resume)
 * → move(resume→work) → hold(work) → move(work→ending) → hold(ending)
 * hold 区间内无论怎么滚，video.currentTime 都钉在关键帧上；
 * handoff 区间主视频钉在 0.166s，等 Hero 视频回到正面后 crossfade。
 */
export const ZONES = {
  /** 首屏：柴犬鼠标交互 + Hero 文案（文案随滚动自然上移离场）。 */
  heroHold: 100,
  /** 交接：暂停跟随 → Hero 视频平滑回到最近正面端点 → 140ms crossfade 接主视频。 */
  heroHandoff: 55,
  resumeMove: 90,
  /**
   * Biography 段长（SSR / 首帧默认值）。
   * 运行时 StoryScrolly 会按履历内容的**真实高度**重算：
   *   resumeHold = introHoldVh + (travelPx / vh × RESUME_SCROLL.factor) + endHoldVh
   * 内容越长这段越长（见 RESUME_SCROLL），容器总高 / SiteProgress 节点 /
   * 导航锚点全部跟随运行时值（data-scroll-start-vh / data-resume-hold-vh）。
   */
  resumeHold: 150,
  workMove: 90,
  /* 文件夹浏览仍使用同一张 8s 静态关键帧。额外 40vh 给展开阅读与末尾自动收起留缓冲。 */
  workHold: 210,
  /**
   * 8.0 → 12.0：这一段是「椅子下坠 → 失去支撑 → 惊恐 → 人物与物品展开成坠落构图」，
   * 动作层次最多。两轮放宽：90 → 117vh（第一轮，+30%），117 → 150vh（第二轮，
   * 用户反馈坠落爆发帧仍然「像闪烁一样掠过」）。ENDING_TIME_MAP 按动作量随段长
   * 重解（见下），爆发段 9→10s 的距离从 50 → 68vh。
   * 只动这一个值——其余段长（含两侧的 workHold / endingHold）保持不变，
   * 所以作品卡的阅读区和结尾的 CTA 停留区时长没有任何变化。
   * 反向滚动（12 → 8）走的是同一段，节奏自动一致。
   */
  endingMove: 150,
  endingHold: 140,
} as const;

/* ------------------------------------------------------------------ 全站 Section 配置
 * 顶部导航与底部 Site Progress（全站阅读进度条）共用的唯一事实。
 * index / label / labelZh = 进度条左侧章节信息与右侧页码；
 * navLabel = 顶部导航入口文案（hero 不进导航，留空）。
 * startVh = 该 Section「可读阶段」（hold 段）在整条时间轴上的起点，按 ZONES
 * 段序累加（与 StoryScrolly 的 SEG_START 同源同值）；SiteProgress 的节点位置
 * = startVh / SITE_TOTAL_VH，映射真实滚动区间，不做等分。
 * 段序一变（ZONES 增删段）必须同步这里的累加。 */
export type SiteSection = {
  id: string;
  index: string;
  label: string;
  labelZh: string;
  navLabel?: string;
  startVh: number;
};

export const SITE_TOTAL_VH =
  ZONES.heroHold +
  ZONES.heroHandoff +
  ZONES.resumeMove +
  ZONES.resumeHold +
  ZONES.workMove +
  ZONES.workHold +
  ZONES.endingMove +
  ZONES.endingHold;

export const SITE_SECTIONS: readonly SiteSection[] = [
  {
    id: "hero",
    index: "01",
    label: "HERO",
    labelZh: "首屏",
    startVh: 0,
  },
  {
    id: "about",
    index: "02",
    label: "BIOGRAPHY",
    labelZh: "个人履历",
    navLabel: "关于",
    startVh: ZONES.heroHold + ZONES.heroHandoff + ZONES.resumeMove,
  },
  {
    id: "work",
    index: "03",
    label: "WORK",
    labelZh: "作品",
    navLabel: "作品",
    startVh:
      ZONES.heroHold +
      ZONES.heroHandoff +
      ZONES.resumeMove +
      ZONES.resumeHold +
      ZONES.workMove,
  },
  {
    id: "contact",
    index: "04",
    label: "POSSIBILITY",
    labelZh: "无限可能",
    navLabel: "联系",
    startVh: SITE_TOTAL_VH - ZONES.endingHold,
  },
] as const;

/**
 * 不要把 0–12s 线性绑到整页 scroll progress：正式 Section 必须有明显的 HOLD 区间，
 * hold 内无论怎么滚，video.currentTime 与整段视觉状态都不动。
 * 前三段 move 都是 4s 跨度 / 90vh；只有 8→12 放宽到 150vh（90→117→150 两轮，见上）。
 */

/**
 * move 段的自定义时间映射：把滚动距离按「动作密度」分配给视频时间。
 * `vh` 是相对权重（引擎按总和归一化，所以不必等于 ZONES 里那一段的段长）；
 * 第一个元素的 vh 恒为 0，是段的起点。
 */
export type TimeMapping = { t: number; vh: number };

/**
 * 8.0 → 12.0 的时间映射 —— 目前唯一使用自定义映射的 move 段。
 *
 * 为什么要自定义：这段片的动作分布极不均匀。逐 0.5s 量前景变化像素（`>28` 的占比）：
 *
 *   8.0–9.0s    0.12% / 0.05%   人物还坐着，完全不动
 *   9.0–9.5s   31.1%            椅子下坠
 *   9.5–10.0s  40.8%            失去支撑 + 惊恐（峰值）
 *   10.0–10.5s 28.0%
 *   10.5–11.0s 20.1%
 *   11.0–11.5s 14.3%
 *   11.5–12.0s  2.9%            已安定
 *
 * 默认的 `lerp + smoothstep` 两端慢、中间快，刚好把最慢的区间对上最静止的画面：
 * 那条 1 秒死区吃掉 38vh（占整段 33%），而最激烈的 9–10s 只拿到 20vh。
 * 体感就是「滚半天没反应，然后一下子掉完」——用户反馈的「初始过渡太快」即指此。
 *
 * 这里按动作量加权：死区与收尾各留一个下限，避免「一滚就动」和「突然定住」。
 * 权重按动作量重解过两次（2026-09-20 中午 117vh / 傍晚 150vh）——解法：
 *   段长去掉死区下限 16 与收尾下限 7，剩余按 9.0–11.5s 的动作量占比分配
 *   （动作量 [31.1, 40.8, 28.0, 20.1, 14.3]，和 134.3 → 127vh 分到 [29, 39, 26, 19, 14]）。
 * 它仍然是**纯位置函数**——滚到哪映射到哪，停下就停住，没有惯性拖尾；
 * 反向走同一条映射，节奏自动一致。
 *
 * 换片 / 改段长后必须重新按动作量解一遍，别手调。
 */
export const ENDING_TIME_MAP: readonly TimeMapping[] = [
  { t: 8.0, vh: 0 },
  { t: 9.0, vh: 16 }, //  静坐：留一点「要开始了」的预备，但不让它变成一条死区
  { t: 9.5, vh: 29 }, //  椅子下坠（动作量 31.1%）
  { t: 10.0, vh: 39 }, // 失去支撑 + 惊恐（动作量 40.8%，峰值，分到最多距离）
  { t: 10.5, vh: 26 }, // 动作量 28.0%
  { t: 11.0, vh: 19 }, // 动作量 20.1%
  { t: 11.5, vh: 14 }, // 动作量 14.3%
  { t: 12.0, vh: 7 }, //  安定：只给收尾，避免尾部又拖出一条静止带
];

/**
 * Biography 履历滚动（2026-09-21）：页面滚动驱动履历列整体 translate3d，
 * 不再有内部 scroll container。段内三阶段：
 *
 *   |← introHoldVh →|← scrollLenVh →|← endHoldVh →|
 *     初始构图 HOLD     履历整列上移      结束 HOLD
 *     （对应整段        travel × factor   （最后一项完整可见后
 *       的 ~0.15）       （~0.67）           再离场，~0.18）
 *
 * scrollLenVh 由内容实测决定：travelPx = resumeContent 高 − viewport 高，
 * 换算成 vh 再乘 factor —— 内容越长 Section 越长，移动速度恒定不塞车速。
 * intro/end 用固定 vh 而不是比例：无论内容多少，「看一眼再走」的时间感一致。
 */
export const RESUME_SCROLL = {
  /** 履历滚动距离倍率：scrollLenVh = (travelPx / vh × 100) × factor。 */
  factor: 1.6,
  /** 进入 Biography、完整展示初始构图后，履历开始上移前的停留距离（vh）。 */
  introHoldVh: 30,
  /** 履历最后一项完整进入可视区后、Section 离场前的停留距离（vh）。 */
  endHoldVh: 42,
  /** resumeHold 的钳制区间（vh）：内容异常短/长时兜底。 */
  minHoldVh: 150,
  maxHoldVh: 440,
} as const;

/* ------------------------------------------------------------------ 换幕
 *
 * 四个 Section（Hero 文案 / 履历 / 作品 / 结尾）是**同一个 100svh sticky 舞台上的
 * 四个绝对图层**（inset: 0），进出场只切 opacity / visibility / pointer-events，
 * 任何滚动位置都不产生纵向位移 —— 上一幕原地淡出，下一幕在原地淡入，
 * 不再有「内容跟着文档流向上滚出视口」。
 *
 * 段长（ZONES）与关键帧（KEYFRAMES）一个都没动：hold 还是那几段 hold，
 * 视频还是 0 / 4 / 8 / 12 停帧，静态图还是那三张。换的只是「怎么上下场」。
 */

/** Work→Ending 交接前自动收回文件夹：hold 内进度超过它就触发（原值，未动）。 */
export const FOLDER_CLOSE_AT = 0.76;

/**
 * Work 文件夹**展开态**的内容几何（2026-09-20 晚重排）。
 *
 * 旧的展开态是「卡片单独居中 + 文件夹贴底」两套独立定位：壳靠
 * `translate(-50%, -50% + 40svh)` 沉下去，卡片挂在 FolderFloat 的 .items 上
 * 用 `translate(-100% - 30px)` 往上弹。两套算式互不知情，结果就是
 * **42svh 的固定下沉量在中高窗口里把文件夹底推出视口**（实测 1920×1080
 * folder 底 = 1119 > 1080，被裁 39px；1080 以下任何高度同理或更糟）。
 *
 * 现在改成「标题 / 卡片 / 文件夹 / 提示」四段一个 flex 列整体居中：
 * 垂直节奏由内容自身高度决定，不再有任何按视口高度猜出来的位移量；
 * 溢出时由 translateY 按可用空间比例上提（CSS，见 work-project-folder.module.css）。
 *
 * 卡片尺寸必须在这里定死：FolderFloat 的 .items 是 0×0 锚点，卡片绝对定位
 * 在它上面，父级没有可用尺寸可算 —— 所以宽度不能写 `27vw` 这类视口单位，
 * 否则 CARD_W 常量与实际渲染宽度会分叉（旧的 clamp(340px,27vw,520px)
 * 就是这么漂的）。改成 `clamp(340px, 0.27 × BOX_W, 520px)`，
 * 与布局同一把尺子。四段的总高见 work-project-folder.module.css 的推导注释。
 */
export const WORK_EXPANDED_CONTENT = {
  /** 卡片宽（px），三档视口实测高度相同。改它必须同步 CSS 的 218.31 系数。 */
  cardWidth: 518,
  /** 卡片封面宽高比（与 WorkProjectFolder 的 WORK_COVER_RATIO 同源）。 */
  coverRatio: 941 / 1672,
  /** 卡片固定高度 = 封面高 + 文案区高（文案区随视口 196–223px，取 211 定值）。 */
  cardHeight: 502,
  /** 两卡之间的水平 gap。 */
  cardGap: 40,
  /** 文件夹宽（与 WorkProjectFolder 传给 FolderFloat 的 width 同源）。 */
  folderWidth: 440,
  /** 卡片底 → 文件夹顶的视觉间距（folder 的 tab 高 14px + 这段）。 */
  cardFolderGap: 36,
  /** 文件夹底 → 操作提示的间距。 */
  hintGap: 22,
  /** 展开态顶部 chrome 的顶距。 */
  topInset: 56,
  /** 顶部导航（PillNav，高约 40 + 视口顶 10）到 chrome 的最小净空。 */
  navClearance: 20,
  /** 内容整体在「导航下沿 → 视口底」之间垂直居中的偏置比例（0=正中，越大越靠上）。 */
  upwardBias: 0.5,
  /** 卡片实际渲染高在 502 上下浮动时，按可用空间吸收的比例（只吸收高度差的一半）。 */
  heightAbsorb: 0.5,
} as const;

/** 卡片实际高度预算（px）：布局用它算总高，CSS 用它算 flex 列的高度。 */
export function workExpandedMetrics(contentWidth: number) {
  const { cardWidth, coverRatio, cardHeight, cardGap, folderWidth } = WORK_EXPANDED_CONTENT;
  const card = Math.min(cardWidth, contentWidth * 0.27);
  return {
    cardWidth: card,
    /** 布局用的定性高度（文案区取定值）。 */
    cardHeight: card * coverRatio + cardHeight,
    /** 量真实 DOM 高度时必须减掉的文案区高度（封面高度是可确定算出的）。 */
    coverHeight: card * coverRatio,
    folderWidth: Math.min(folderWidth, contentWidth),
    gap: cardGap,
  };
}

/** 静态图接管：距 hold 结束还剩这段滚动距离时图开始退场（CSS 140ms 过渡补平滑）。 */
export const IMAGE_TAIL_VH = 16;

/** 视频真正落到关键帧 ±SETTLE_EPS 内才允许静态图接管（防止带着中间帧淡入）。 */
export const SETTLE_EPS = 0.035;

export const SEEK_INTERVAL_MS = 28;
export const SEEK_STALE_MS = 100;
export const SEEK_SNAP = 0.02;

/** Hero↔主视频 crossfade 时长（ms）：只遮盖两个素材的细微纹理差，不是可见动画。 */
export const CROSSFADE_MS = 140;

/** 静态图 opacity 过渡（ms）：遮盖视频帧与生图之间约 1–3% 的纹理差异，不是可见动画。 */
export const IMAGE_FADE_MS = 140;

/** 叙事容器距离视口多远以内时引擎保持运行（IntersectionObserver rootMargin）。 */
export const ENGINE_ROOT_MARGIN = "30% 0px 30% 0px";

/** 视频帧背景色（实测主视频四边均值 rgb(250,249,252)）。
 *  舞台兜底与静态图接管层都用它，杜绝「白底发亮」的画中画感。 */
export const STAGE_BG = "rgb(250, 249, 252)";
