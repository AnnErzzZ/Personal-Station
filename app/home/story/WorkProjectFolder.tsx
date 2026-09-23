"use client";

import Image from "@/components/SiteImage";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import home from "../../home.module.css";
import FolderFloat, { type FolderFloatItem } from "../FolderFloat";
import styles from "./work-project-folder.module.css";

export type WorkProject = {
  title: string;
  positioning: string;
  summary: string;
  meta: string[];
  href: string;
  cover: string;
  coverAlt: string;
};

type WorkProjectFolderProps = {
  projects: WorkProject[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const WORK_COVER_RATIO = { width: 1672, height: 941 };

/** 展开态卡片的**预算**高度 = 封面（按卡宽等比）+ 文案区。
 *
 *  为什么不直接量卡片：卡片弹出动画会把封面从压缩态拉回满比例，动画中途
 *  `offsetHeight` 读到的是中间值（差 3–25px），而 ResizeObserver 的写回又会
 *  反过来影响布局 —— 闭环会停在第一次读到的那个错值上，永不修正。
 *  竖向预算宁可「按构造式算、比实测略小」，也不能按中间帧算大：算大会把
 *  文件夹顶出视口，算小只是多留一条缝。
 *
 *  封面高 = 卡宽 × 941/1672 是确定值（aspect-ratio 钉死）；文案区实测
 *  146px（1920，卡宽 518）/ 165px（卡宽 ≤432）—— 它由标题行数、正文两行、
 *  标签行与上下 padding 决定，不随卡宽等比。此处 168 覆盖两档。
 *
 *  ⚠ 2026-09-21：本常量现在**只剩一个用途** —— 首帧（卡片还没量到高）时
 *  给 `.openGroup` 一个兜底格高。它**不再参与 fit 的反解**：卡高已改成
 *  内容驱动（CSS 的 `max(--wxc-h, --wxc-tight)`），fit 直接用卡片的
 *  `offsetHeight` 实测值算（见 measure() 里的 cardRoom / effectiveCardHeight），
 *  任何构造式估算都会偏。 */
const CARD_COPY_HEIGHT = 168;

/** fit 的下限：卡片再矮也不缩过这里，否则卡上的字看不清。 */
const WORK_FIT_MIN = 0.55;

/** 卡片宽：优先还原关闭态的比例（视口宽 27vw，上限 518），
 *  但展开态还受**视口高**约束 —— 这是关闭态没有的：卡高 = 宽 × 0.563 + 文案区，
 *  1600×900 这种「宽而矮」的窗口按 27vw 会给到 432px，卡高 411px 直接放不下
 *  （实测 1600×900 比 1440×900 更挤）。
 *
 *  所以展开态取「27vw」与「按可用高度反解出的宽度」中的较小值：先尽量还原
 *  关闭态的观感，实在放不下再收窄 —— 收窄同时降封面高，是唯一的正当手段。
 *  下限 300 是「再小就不像作品卡了」的观感底线，不是几何下限（几何由反解负责）。 */
const CARD_WIDTH_MIN = 300;
const CARD_WIDTH_MAX = 518;
const CARD_WIDTH_VW = 0.3;
/** 卡片底 → 文件夹顶的间距（`--wx-group-gap`；folder 自带 14px 的 tab，
 *  视觉间距由两者相加）。FolderFloat 的 lift={30} 与这里**必须同一个数**：
 *  卡片位移写死 `-100% - 30px`（见 work-project-folder.module.css），
 *  改一处就要改另一处。 */
const GROUP_GAP = 36;
/** 文件夹本体高度（与下面传给 FolderFloat 的 height={319} 同源）。
 *  宽度不用常量：卡片行宽由 --wx-card-w 反解，文件夹固定 440 居中。 */
const FOLDER_HEIGHT = 319;
const FOLDER_TAB = 14;
/** 顶部导航（PillNav：视口顶 +10 起、高 40）下沿，以及它到标题的净空。
 *  净空必须够大：标题第一行是 11px 的小字 eyebrow，紧贴导航下沿会被
 *  PillNav 的胶囊压掉一半（1440×900 实测 y=48 就撞上了）。 */
const NAV_BOTTOM = 50;
const NAV_CLEARANCE = 26;
/** 极矮视口的最小呼吸。视口再矮也先压这里、再压卡片 —— 提示语是
 *  「怎么退出去」的说明书，被裁掉比卡片小一点更糟。 */
const MIN_FLOAT_TOTAL = 12;
const MIN_HINT_GAP = 8;
/** 反解宽度时留的安全边。
 *
 *  标题段与提示段的高度是**实测**的，而它们的行盒在首帧量到与字体渲染完成后
 *  会差 1–3px（`offsetHeight` 取整也会丢小数）。反解出来的宽度只要差 1px，
 *  整组就会把提示语的底边顶出视口一线 —— 与其追亚像素时序，不如留 8px 余量：
 *  它只是让卡片窄 14px，观感上看不出来。 */
const WIDTH_SAFETY = 8;
const FOLDER_TRAVEL_MS = 620;
const FOLDER_OPEN_DELAY_MS = 220;
const OPEN_CHROME_DELAY_MS = 500;
const CLOSE_RETURN_DELAY_MS = 180;
const FOLDER_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
/** 卡内「文案区预算」的安全边。CSS 的高度公式是
 *  `封面高 + 预算 × scale + 这一项`，用来吸掉 offsetHeight 的取整与
 *  断行测量的 ±1px 误差。给 6 是实测出来的最小可用值：
 *  4 时 1440×900 上 meta 下缘离卡片底只剩 0 px（贴边）。 */
const CARD_COPY_SAFETY = 6;

type FolderPhase = "closed" | "opening" | "expanded" | "closing";

/** 展开态卡片：等高 + 放大字级的实现分两半 ——
 *
 *  高度与字号全在 CSS（work-project-folder.module.css 里那一整套
 *  `[data-projects-open="true"]` 作用域），这里只补一件 CSS 做不到的事：
 *  **量出「这张卡的文案区需要多高」**，写进 `--wxc-copy`。
 *
 *  为什么非量不可：两张卡的正文长度不同，而卡片高度是同一个
 *  `clamp(460px, 52vh, 560px)`，本来会被 `overflow: hidden` 从**下缘**
 *  裁掉一截 —— 而标签与右下箭头恰好在下缘。CSS 算不出「文字换几行」
 *  （取决于断行），所以只能由引擎自己量。
 *
 *  ⚠ 测量**不能放在这个组件的 useLayoutEffect 里**（试过，是空操作）：
 *  卡片在 FolderFloat 内部、closed 态就在 DOM 里，挂载时量到的是
 *  「关闭态布局」（基础字号 + 基础 padding），此时 `--wxc-copy` 记下的是
 *  无关值；展开时组件并不会重新 mount，effect 不再跑。
 *  真正的测量由父组件在 `layoutOpen` 变为 true 后调用
 *  `measureCards()`（见那边），这里只负责把 data-* 钩子挂上去。
 */
function ProjectCard({ project }: { project: WorkProject }) {
  return (
    <article
      className={`${home.workCard} ${styles.projectCard}`}
      data-work-card=""
    >
      <Link
        className={`${home.workCardLink} ${styles.projectCardLink}`}
        href={project.href}
        onClick={(event) => event.stopPropagation()}
      >
        <figure className={`${home.workVisual} ${styles.projectCardVisual}`}>
          <Image
            className={home.workVisualImage}
            src={project.cover}
            alt={project.coverAlt}
            width={WORK_COVER_RATIO.width}
            height={WORK_COVER_RATIO.height}
            sizes="(max-width: 720px) 34vw, (max-width: 1600px) 27vw, 520px"
          />
        </figure>
        <div className={home.workCopy} data-work-copy="">
          <h3 className={home.workTitle} data-work-title="">
            {project.title}
          </h3>
          <div className={home.workBody} data-work-body="">
            <p className={home.workPositioning} data-work-positioning="">
              {project.positioning}
            </p>
            <p className={home.workSummary} data-work-summary="">
              {project.summary}
            </p>
          </div>
          <div className={home.workFooter} data-work-footer="">
            <ul className={home.workMeta} data-work-meta="">
              {project.meta.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
            <span className={home.workArrow} data-work-arrow="" aria-hidden="true">
              <span className={home.workArrowBox} data-work-arrow-box="">
                <span className={home.workArrowGlyph} data-work-arrow-glyph="" />
                <span className={home.workArrowGlyph} data-work-arrow-glyph="" />
              </span>
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

export default function WorkProjectFolder({
  projects,
  open,
  onOpenChange,
}: WorkProjectFolderProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const shellMotionRef = useRef<HTMLDivElement>(null);
  const firstRectRef = useRef<DOMRect | null>(null);
  const flipAnimationRef = useRef<Animation | null>(null);
  const timersRef = useRef<Set<number>>(new Set());
  const [phase, setPhase] = useState<FolderPhase>(open ? "expanded" : "closed");
  const phaseRef = useRef<FolderPhase>(open ? "expanded" : "closed");
  const [layoutOpen, setLayoutOpen] = useState(open);
  const [contentsOpen, setContentsOpen] = useState(open);

  const setVisualPhase = useCallback((next: FolderPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const clearTimers = useCallback(() => {
    for (const timer of timersRef.current) window.clearTimeout(timer);
    timersRef.current.clear();
  }, []);

  const later = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer);
      callback();
    }, delay);
    timersRef.current.add(timer);
  }, []);

  const readFolderRect = useCallback(
    () =>
      shellMotionRef.current
        ?.querySelector<HTMLElement>('[data-variant="projects"]')
        ?.getBoundingClientRect() ?? null,
    [],
  );

  /**
   * 展开态整体定位：把 flex 列在「顶部导航下沿 → 视口底」之间居中。
   *
   * 为什么必须由 JS 写这些量：卡片在 FolderFloat 里绝对定位在 0×0 锚点上，
   * 宽度要用百分比基准 —— 而它的基准链（.openGroup → .shell → .items）全是
   * 零尺寸锚点，CSS 的百分比在这里没有可解析的对象。旧版把宽度写成
   * clamp(340px, 27vw, 520px)、位置靠 40svh 的固定下沉量，两者互不知情，
   * 于是 1920×1080 下文件夹底被推出视口 39px。
   *
   * 高度**不量卡片**（构造式算，见 CARD_COPY_HEIGHT 的注释）；量的是标题与
   * 提示两段的高度，这两段是文字的、不会因为我们的写入而改变，读它们是安全的。
   *
   * 留白分三块，从上往下：标题 ← 呼吸 → 卡片 ← 间距 → 文件夹 ← 呼吸 → 提示。
   * 装不下时按「标题下呼吸 → 提示上呼吸 → 缩卡片」的顺序依次让步。
   */
  const measure = useCallback(() => {
    const stage = stageRef.current;
    const layer = layerRef.current;
    if (!stage || !layer) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const head = stage.querySelector<HTMLElement>("[data-work-open-head]");
    const hint = stage.querySelector<HTMLElement>("[data-work-open-hint]");
    const headHeight = head?.offsetHeight ?? 0;
    const hintHeight = hint?.offsetHeight ?? 0;

    // 顶部起点：导航下沿 + 净空
    const top = NAV_BOTTOM + NAV_CLEARANCE;
    const available = vh - top;
    // 标题下的呼吸：视口高的 3%，最少 20
    const headGap = Math.max(20, Math.round(vh * 0.03));
    // 卡组 = 卡片 + 卡片↔文件夹间距 + 文件夹总高。文件夹（FOLDER_HEIGHT +
    // FOLDER_TAB）是固定项 —— 缩它会牵动前盖、纸、口的角度，得不偿失。
    const fixedGroup = GROUP_GAP + FOLDER_HEIGHT + FOLDER_TAB;

    // ---- 卡片宽：**只由视口比例定**，装不下交给 fit 缩 --------------------
    // 不要用「可用高度反解宽度」把卡宽压下来 —— 那会让矮视口的卡片被压成
    // 300px 的小卡（1600×900 实测：反解 288 → clamp 到下限 300），
    // 而 300 宽的卡 + 文件夹只占视口宽的 40%，观感是「一屏里塞了两张小卡」。
    // 正确做法是把卡宽固定成观感尺寸（视口 27%，clamp 到 [300, 518]），
    // 竖向装不下的部分由 fit 统一缩放整张卡 —— 缩放是等比、观感一致，
    // 而「压宽度」会同时改封面比例和文案换行，越矮越不像一张卡。
    const coverRatio = WORK_COVER_RATIO.height / WORK_COVER_RATIO.width;
    const cardWidth = Math.max(
      CARD_WIDTH_MIN,
      Math.min(CARD_WIDTH_MAX, vw * CARD_WIDTH_VW),
    );
    // 预算高（构造式）。它只用来反解 fit 与给 .openGroup 兜底留位；
    // 真正写进 --wx-card-h 的是**实测值**（见下）。
    const cardHeight = cardWidth * coverRatio + CARD_COPY_HEIGHT;

    // ---- 用**实测卡高**换掉构造式预算 --------------------------------------
    // 预算高（cardWidth × 封面比例 + CARD_COPY_HEIGHT）只能在「卡宽定死」时
    // 准确；两张卡的文案长短不同，实测差近 20px（1920：438 / 457），
    // 与预算 459.5 也有偏差。预算值偏大 → 整组在视口里偏低、
    // 提示语被挤出屏（实测 1600×900 差 −6、1024×768 差 −14）。
    //
    // 读 offsetHeight 是安全的、**不会闭环**：
    //   · offsetHeight 不受 transform 影响（scale 是绘制期），拿到的是自然高；
    //   · 展开态卡片的封面已钉成 flex: 0 0 auto（见本模块 CSS），不会再被压缩；
    //   · 它**不参与卡高的写入**（卡高由 CSS 的 max(--wxc-h, --wxc-tight) 定），
    //     这里只读它来算 fit / 格高 / 居中量，三者都是单向写入。
    // 取两张卡的**较大值**：两卡底边对齐（位移用 -100%），高的那张决定
    // 整组占位，矮的那张必然装得下。
    //
    // ⚠⚠ 必须量 **`[data-work-card]`（<article>）**，不能量
    // `[data-work-project-card]`（FolderFloat 的 `.item` 包装盒）——
    // 后者带 `height: 34px` 的基础声明、又是绝对定位盒，量出来的是
    // 包装盒的分配高（实测 150，而真实卡是 489），会让 fit 直接失准
    // （fit = 279 ÷ 150 = 1.86 → 夹成 1.0 → 一张都不缩 → 卡片顶出视口上缘）。
    // offsetHeight 不受 transform 影响，拿到的正是「未缩放的布局高」。
    const cardEls = stage.querySelectorAll<HTMLElement>("[data-work-card]");
    let measuredCardHeight = 0;
    for (const el of cardEls) {
      measuredCardHeight = Math.max(measuredCardHeight, el.offsetHeight);
    }
    // 实测拿不到（首帧、卡片还没弹出）就退回预算值。
    const effectiveCardHeight = measuredCardHeight > 0 ? measuredCardHeight : cardHeight;

    // ---- fit：竖向装不下就等比缩卡片 --------------------------------------
    // fit = 「卡片能用的高度 ÷ 卡片需要的高度」。分母是**实测卡高**。
    //
    // ⚠⚠ 2026-09-21 修正：分母从**构造式预算高**换成**实测卡高**。
    // 早先是按「视口高 : 卡高 = 5.6 : 1」的定比反解
    // （`(available / 0.916) / (vh / (5.6 × 0.916))`），那条式子的前提是
    // 卡高恒等于 clamp(460, 52vh, 560)。但卡高现在是**内容驱动**的
    // （CSS 的 max(--wxc-h, --wxc-tight) 装不下时会把它抬起来，
    // 1600×900 实测 489 ≠ 468），定比反解随即失效 —— 实测那条式子给出
    // fit = 5.13 → 被 min(1) 夹成 1.0，于是一张都不缩，文件夹底 1074.8、
    // 提示语 1108 双双掉出 900 视口。
    // 用实测卡高做分母，口径就与 CSS 的实际渲染高一致了。
    //
    // ⚠ fixedHeight 的构成**与 r3 备份逐项一致**（把 `breathe` 整块计入、
    // 而不是拆成 headGapUsed + hintGapUsed）：多算的那 22px 是有意的余量，
    // 让 fit 略微偏小、宁可底部多留一条缝，也不把提示语顶出视口。
    // 不要"优化"成逐项相加 —— 试过，卡片会顶出视口**上缘**
    // （1600×900 实测 top = −36.3）。
    const breathe = headGap + 22;
    const floatTotal = Math.max(MIN_FLOAT_TOTAL, breathe);
    // 呼吸的分配：优先给「标题下呼吸」，剩下的给「文件夹 → 提示」。
    const headGapUsed = Math.min(headGap, floatTotal);
    // 提示语是**绝对定位**挂在文件夹下沿的（见 CSS），不占纵向预算，
    // 这里只留「文件夹 → 提示」的固定间距。
    const hintGapUsed = MIN_HINT_GAP;

    const fixedHeight =
      headHeight + fixedGroup + breathe + hintHeight + WIDTH_SAFETY;
    const cardRoom = Math.max(0, available - fixedHeight);
    const fit = Math.max(WORK_FIT_MIN, Math.min(1, cardRoom / effectiveCardHeight));

    layer.style.setProperty("--wx-top", `${top}px`);
    layer.style.setProperty("--wx-gap-head", `${headGapUsed.toFixed(1)}px`);
    layer.style.setProperty("--wx-group-gap", `${GROUP_GAP}px`);
    layer.style.setProperty("--wx-card-w", `${cardWidth.toFixed(1)}px`);
    layer.style.setProperty("--wx-card-h", `${effectiveCardHeight.toFixed(1)}px`);
    layer.style.setProperty("--wx-folder-h", `${FOLDER_HEIGHT + FOLDER_TAB}px`);
    layer.style.setProperty("--wx-hint-gap", `${hintGapUsed.toFixed(1)}px`);
    layer.style.setProperty("--wx-card-fit", `${fit.toFixed(4)}`);
    // ---- 卡内字号档（--wxc-scale）：**纯数**，必须由 JS 给 ----------------
    // 见 work-project-folder.module.css 里 --wxc-scale 的长注释：CSS 变量一旦
    // 在表达式里碰到任何长度单位，`calc(<长度> * var(--wxc-scale))` 会整条作废
    // （实测标题静默停在 17px 的基础规则上）。而「卡宽 ÷ 510」里卡宽是 px，
    // 浏览器不会把它约简成纯数 —— 所以在 CSS 里**算不出来**，只能在这儿算完
    // 再把结果（无单位）写下去。下限 0.86 与 CSS clamp 同源，改一处要改另一处。
    const cardScale = Math.max(0.86, Math.min(1, (vw - 470) / 510 + 0.86));
    layer.style.setProperty("--wxc-scale", cardScale.toFixed(4));

    // ---- 居中：按整组的**真实占用**算 --------------------------------------
    // .openGroup 的高度里卡高乘了 fit（见 CSS），所以它的盒子 = 视觉高，
    // 这里必须用同一口径，否则两边各算一次、整组被推歪。
    // 卡片的绝对定位位移用 `-100% × fit`（卡片自身高），与这里同源。
    //
    // ⚠ 必须把「提示语间距 + 提示语自身」也算进来 —— 提示语虽然绝对定位、
    // 不参与 .expandedContent 的 flex 布局，但它**确实占视口空间**，
    // 是「文件夹下面还得留出来的那一段」。漏算它，center 就会把这段预留
    // 当成多余余量、把整组推下去（实测 1600×900 提示语底出屏 −5、
    // 1024×768 −13）。
    const groupVisualHeight =
      effectiveCardHeight * fit + GROUP_GAP + FOLDER_HEIGHT + FOLDER_TAB;
    const usedHeight =
      headHeight + headGapUsed + groupVisualHeight + hintGapUsed + hintHeight;
    const center = Math.max(0, (available - usedHeight) / 2);
    layer.style.setProperty("--wx-center", `${center.toFixed(1)}px`);
    // 提交阶段探针用：预算明细（口径 = 视觉高）
    layer.dataset.wxBudget = JSON.stringify({
      vh,
      available,
      headHeight,
      headGapUsed,
      cardBudget: Number(cardHeight.toFixed(1)),
      cardMeasured: measuredCardHeight,
      cardEffective: Number(effectiveCardHeight.toFixed(1)),
      cardVisual: Number((effectiveCardHeight * fit).toFixed(1)),
      fit: Number(fit.toFixed(3)),
      groupVisualHeight: Number(groupVisualHeight.toFixed(1)),
      usedHeight: Number(usedHeight.toFixed(1)),
      center: Number(center.toFixed(1)),
    });
  }, []);

  const beginOpen = useCallback(
    (notifyParent: boolean) => {
      if (phaseRef.current === "opening" || phaseRef.current === "expanded") return;
      clearTimers();
      firstRectRef.current = readFolderRect();
      setVisualPhase("opening");
      setContentsOpen(false);
      setLayoutOpen(true);
      if (notifyParent) onOpenChange(true);

      later(() => setContentsOpen(true), FOLDER_OPEN_DELAY_MS);
      later(() => setVisualPhase("expanded"), OPEN_CHROME_DELAY_MS);
    },
    [clearTimers, later, onOpenChange, readFolderRect, setVisualPhase],
  );

  const beginClose = useCallback(
    (notifyParent: boolean) => {
      if (phaseRef.current === "closed" || phaseRef.current === "closing") return;
      clearTimers();
      setVisualPhase("closing");
      setContentsOpen(false);

      later(() => {
        firstRectRef.current = readFolderRect();
        setLayoutOpen(false);
      }, CLOSE_RETURN_DELAY_MS);

      later(() => {
        setVisualPhase("closed");
        if (notifyParent) onOpenChange(false);
      }, CLOSE_RETURN_DELAY_MS + FOLDER_TRAVEL_MS);
    },
    [clearTimers, later, onOpenChange, readFolderRect, setVisualPhase],
  );

  const requestOpenChange = useCallback(
    (next: boolean) => {
      if (next) beginOpen(true);
      else beginClose(true);
    },
    [beginClose, beginOpen],
  );

  useEffect(() => {
    if (open) {
      if (phaseRef.current === "closed") beginOpen(false);
    } else if (
      phaseRef.current === "opening" ||
      phaseRef.current === "expanded"
    ) {
      // notifyParent=true：父组件的滚动引擎以 projectsOpenRef 划定「文件夹
      // 窗口」（滚动自动关闭 / work 层退场守卫都读它）。这条路径的 open=false
      // 来自父组件的滚动自动关闭（直接 setProjectsOpen，未经过
      // handleProjectsOpenChange），必须让收起完成事件回流出去了父组件才知道
      // 窗口结束 —— 否则收起动画（800ms）还没播完 ref 就落 false，
      // work 层的退场守卫全部失效、收起被 220ms 的 exit 腰斩
      // （实测探针 probe-folder-ghost.mjs 场景 B）。
      beginClose(true);
    }
  }, [beginClose, beginOpen, open]);

  useEffect(() => {
    if (phase === "closed") return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestOpenChange(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [phase, requestOpenChange]);

  useEffect(
    () => () => {
      clearTimers();
      flipAnimationRef.current?.cancel();
    },
    [clearTimers],
  );

  useLayoutEffect(() => {
    const first = firstRectRef.current;
    const motion = shellMotionRef.current;
    if (!first || !motion) return;

    if (layoutOpen) measure();
    const last = readFolderRect();
    firstRectRef.current = null;
    if (!last) return;

    flipAnimationRef.current?.cancel();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const firstCenterX = first.left + first.width / 2;
    const firstCenterY = first.top + first.height / 2;
    const lastCenterX = last.left + last.width / 2;
    const lastCenterY = last.top + last.height / 2;
    const deltaX = firstCenterX - lastCenterX;
    const deltaY = firstCenterY - lastCenterY;
    const scaleX = last.width > 0 ? first.width / last.width : 1;
    const scaleY = last.height > 0 ? first.height / last.height : 1;

    const animation = motion.animate(
      [
        {
          transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scaleX}, ${scaleY})`,
        },
        { transform: "translate3d(0, 0, 0) scale(1, 1)" },
      ],
      {
        duration: FOLDER_TRAVEL_MS,
        easing: FOLDER_EASE,
        fill: "both",
      },
    );
    flipAnimationRef.current = animation;
    animation.addEventListener(
      "finish",
      () => {
        if (flipAnimationRef.current !== animation) return;
        flipAnimationRef.current = null;
        animation.cancel();
      },
      { once: true },
    );
  }, [layoutOpen, measure, readFolderRect]);

  /** ---- 卡内文案区的实测（--wxc-copy）-------------------------------------
   *
   *  为什么由父组件做、而不是卡片组件自己的 useLayoutEffect：
   *  卡片在 FolderFloat 内部，**closed 态就已经在 DOM 里**了。卡片自己挂载时
   *  量到的是「关闭态布局」（基础字号 17px + 基础 padding 18/18/16），不是展开态；
   *  而展开时卡片不会重新 mount，它自己的 effect 不会再跑 ——
   *  结果是把关闭态的尺寸写进 `--wxc-copy`，长的那张卡照样被裁（实测踩过）。
   *  所以测量必须挂在「展开」这个事件上，由这里统一跑。
   *
   *  ⚠ 只在**展开态**量 —— 关闭态读到的盒尺寸本来就不是我们要的那一套。 */
  const measureCards = useCallback(() => {
    const stage = stageRef.current;
    const layer = layerRef.current;
    if (!stage || !layer) return;
    if (layer.dataset.projectsOpen !== "true") return;

    for (const card of stage.querySelectorAll<HTMLElement>("[data-work-card]")) {
      // ⚠ 用 data-* 钩子，不要用 `[class*="workCard"]` 这类模糊类名匹配 ——
      // 链接的哈希类是 `...__workCardLink`，它**也**包含 "workCard"，
      // querySelector 会先命中它，取到的就不是文案区（实测让整段变成空操作）。
      const copy = card.querySelector<HTMLElement>("[data-work-copy]");
      if (!copy) continue;

      // ⚠⚠ 这里量的是**内容的自然高**，而不是 `copy.offsetHeight`。
      // 两者不等价，而且用错了会形成一个**正反馈闭环**（实测把卡片撑到
      // 3140px 才停）：`.workCopy` 是 `flex: 1`，它的高度是「卡片分给它
      // 多少」，而 `height: max(--wxc-h, --wxc-tight)` 又用 `--wxc-copy`
      // 反过来算卡片要多高 —— 量 offsetHeight 等于把上一步的输出当成输入，
      // 每帧再加一次安全边，于是一路膨胀。
      //
      // 正确读数 = 文案区自身 padding + 各子块的**内在**高（含子块自身的
      // 上下 margin）+ 块间 flex gap。这几个都不依赖卡片分了多少高度给它：
      //   · 标题 / 正文 / 页脚都不吃 flex 余量（页脚的 margin-top: auto 只在
      //     还有余量时才把页脚往下推，改的是 offsetTop 而不是 offsetHeight）；
      //   · padding / margin / gap 都是展开态的 calc(… * --wxc-scale)，
      //     读到的已经是换算后的值，**不要再乘 scale**。
      //   · ⚠ margin 必须算 —— `.workBody` 的上下 margin 在 offsetHeight
      //     之外（基础 14px，展开态被压到 2px），漏掉它会少算 4px。
      const copyStyle = getComputedStyle(copy);
      const padY =
        parseFloat(copyStyle.paddingTop) + parseFloat(copyStyle.paddingBottom);
      const gap = parseFloat(copyStyle.rowGap) || 0;

      const parts = [...copy.children] as HTMLElement[];
      let contentHeight = padY;
      parts.forEach((part, index) => {
        const partStyle = getComputedStyle(part);
        const marginY =
          (parseFloat(partStyle.marginTop) || 0) +
          (parseFloat(partStyle.marginBottom) || 0);
        contentHeight += part.offsetHeight + marginY;
        if (index > 0) contentHeight += gap;
      });

      card.style.setProperty(
        "--wxc-copy",
        `${(contentHeight + CARD_COPY_SAFETY).toFixed(1)}px`,
      );
    }
  }, []);

  /** ---- 整体重测（measure + measureCards）---------------------------------
   *
   *  ⚠ 这里**不再**有 applyCardHeightFit：「装不下就切到 H」那套已经退役。
   *  现在 CSS 侧是一条 `height: max(--wxc-h, --wxc-tight)`（见模块 CSS 的
   *  「最终高度」注释）—— `--wxc-tight` 就是内容下限，取 max 的语义保证
   *  永远不裁内容。旧做法（clamp 上界 + JS 探到溢出再写 --wxc-h-fit: 1）
   *  有两个毛病：① clamp 的上界会把 tight 压回 h，写了 fit 也还是溢出
   *  （实测 scrollH 476 > clientH 466）；② 「写变量 → 重测 → 再写」是闭环，
   *  容易抖。改成纯 CSS 的 floor 后，两边都不成问题。 */
  useEffect(() => {
    if (!layoutOpen) return undefined;
    measure();
    // 卡内文案实测：本帧量一次（拿展开态布局），下一帧复量（字体落地后
    // 行盒会动 1–3px）。分帧是必要的 —— 写完 --wxc-copy 的同一帧里
    // 卡片的新高还没落地，量到的仍是旧布局。
    measureCards();
    const cardRaf = window.requestAnimationFrame(measureCards);

    const stage = stageRef.current;
    if (!stage) return undefined;

    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        measure();
        measureCards();
      });
    };

    const observer = new ResizeObserver(schedule);
    // 只观察**舞台**（它承载标题与提示的实测高）与窗口 —— 不观察卡片：
    // 卡片的写入量与读取量同源，观察它会形成闭环（改动→重测→再改）。
    observer.observe(stage);
    window.addEventListener("resize", schedule);
    void document.fonts?.ready.then(schedule);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.cancelAnimationFrame(cardRaf);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [layoutOpen, measure, measureCards]);

  const items: FolderFloatItem[] = useMemo(
    () =>
      projects.map((project) => ({
        label: project.title,
        value: project.href,
        content: <ProjectCard project={project} />,
      })),
    [projects],
  );

  const sub = `${String(projects.length).padStart(2, "0")} projects`;

  return (
    <div
      ref={layerRef}
      className={styles.layer}
      data-projects-open={layoutOpen ? "true" : "false"}
      data-folder-phase={phase}
      data-work-folder=""
    >
      <button
        type="button"
        className={styles.overlay}
        aria-label="关闭项目文件夹"
        aria-hidden={!layoutOpen}
        tabIndex={-1}
        data-work-project-overlay=""
        onClick={() => requestOpenChange(false)}
      />

      {/* ------------------------------------------------------------------
          展开态：**一个** flex 列承载全部内容。
          顺序即视觉顺序 —— 顶部标题 / 卡片行（含文件夹）/ 底部提示。
          卡片与文件夹的垂直关系是布局关系（row-gap），不再是两条互相
          不知情的 transform。
          ------------------------------------------------------------------ */}
      <div
        ref={stageRef}
        className={styles.expandedContent}
        aria-hidden={phase === "closed"}
        data-work-expanded=""
      >
        <header className={styles.openHead} data-work-open-head="">
          <p className={styles.openEyebrow}>
            <span className={styles.openIndex}>02</span>
            <span className={styles.openLabel}>WORK / 作品</span>
          </p>
          <h2 className={styles.openTitle} data-work-open-title="">
            SELECTED WORK
          </h2>
        </header>

        {/* 卡片与文件夹同属这一个 cell：FolderFloat 的 0×0 锚点钉在 shell 上，
            卡片绝对定位在它上面 —— shell 由这个 cell 给出确定的定位基准
            （旧版跨层百分数依赖的正是这条链，见 FolderFloat.module.css 的 .items）。 */}
        <div className={styles.openGroup} data-work-open-group="">
          <div className={styles.shell}>
            <div
              ref={shellMotionRef}
              className={styles.shellMotion}
              onClick={(event) => event.stopPropagation()}
            >
              <FolderFloat
                items={items}
                label="Selected Work"
                sublabel={sub}
                trigger="click"
                open={contentsOpen}
                preview={phase === "opening" && !contentsOpen}
                defaultOpen={false}
                closeOnSelect={false}
                physics={false}
                variant="projects"
                folderColor="#292c32"
                frontColor="#3b3f47"
                paperColor="#f3f4f6"
                labelColor="#fafafc"
                width={440}
                height={319}
                radius={24}
                lift={30}
                flapAngle={34}
                restAngle={14}
                openDuration={560}
                stagger={100}
                bounce={0.18}
                onOpenChange={requestOpenChange}
              />
              {/* 关闭态提示语：贴着文件夹正下方，随文件夹一起进出（FLIP
                  动画带着它走）；打开后卡片接管画面，提示让位淡出
                  （`.layer[data-projects-open="true"] .hint { opacity: 0 }`）。
                  定位方式见模块 CSS 的 .hint 注释 —— 必须 absolute 贴底，
                  流内布局会撑高 shell 盒子、让 62% 锁点上的文件夹随字体
                  加载漂移。 */}
              <p className={styles.hint} data-work-folder-hint="">
                点击文件夹查看完整项目
              </p>
            </div>
          </div>

          {/* 提示语挂在 .openGroup 里、绝对定位贴文件夹下沿 —— 不占纵向预算，
              整组居中就只按「标题 + 卡片 + 文件夹」算。 */}
          <p className={styles.openHint} data-work-open-hint="">
            点击空白处或按 ESC 收起
          </p>
        </div>
      </div>

      <button
        type="button"
        className={styles.openClose}
        aria-label="收起文件夹"
        tabIndex={phase === "expanded" ? 0 : -1}
        aria-hidden={phase !== "expanded"}
        data-work-open-close=""
        onClick={() => requestOpenChange(false)}
      >
        <span className={styles.openCloseLabel}>收起文件夹</span>
        <span
          className={styles.openCloseGlyph}
          data-work-close-glyph=""
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
