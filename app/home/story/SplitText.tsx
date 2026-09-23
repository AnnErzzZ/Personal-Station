"use client";

/**
 * SplitText —— React Bits 的 `<SplitText />`（JavaScript + CSS 变体）。
 * 组件与 props 表来自 https://reactbits.dev ，依赖 gsap + @gsap/react。
 *
 * 上游行为原样保留（`scrub` 缺省即为原版）：GSAP 时间轴 + ScrollTrigger，
 * 进入视口后一次性播放，`delay` 是字与字之间的毫秒间隔，`onLetterAnimationComplete`
 * 在整段播完后回调。
 *
 * 本仓库在它之上加了一个 **`scrub` 模式**（首页换幕用这个），因为上游的默认形态
 * 与本项目的两条硬规则冲突：
 *   1. 上游 `from = { opacity: 0, y: 40 }` 是「从下方飞入」的位移；本站要求
 *      Section 只在**原地**淡入淡出，不做任何 translateY。
 *   2. 上游是定时器驱动的一次性动画（`once: true` + 1.25s 时长）；本站的文字
 *      必须在**滚动中跟手**，并且反向滚动要完全对称。
 *
 * scrub 模式的做法：**只拆字，不建时间轴、不碰 ScrollTrigger**。
 * 每个字挂上序号（`--split-i` / `--split-n`），透明度由祖先元素上的 `--split-p`
 * （0..1，该 Section 淡入窗口内的归一化进度）在 CSS 里逐字现算，见
 * `styles/globals.css` 的 `.split-char`。于是：
 *   · 跟手 —— 滚到哪就停在哪个透明度，没有定时器、没有延迟；
 *   · 双向对称 —— 同一组纯位置函数，反向滚回去逐字重演；
 *   · 原地 —— 每个字只改 opacity。
 * 进度由 `app/home/story/StoryScrolly.tsx` 的引擎逐帧写在文字层上。
 */

import { createElement, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText as GSAPSplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, GSAPSplitText, useGSAP);

type SplitTextProps = {
  /** 渲染的 HTML 标签。 */
  tag?: keyof React.JSX.IntrinsicElements;
  /** 要动画的文本。 */
  text: string;
  /** 额外的类名（会与 `split-parent` 一起挂在根节点上）。 */
  className?: string;
  /** 非 scrub 模式：字与字之间的动画间隔（ms）。 */
  delay?: number;
  /** 非 scrub 模式：每个字的动画时长（s）。 */
  duration?: number;
  /** 非 scrub 模式：GSAP 缓动。 */
  ease?: string;
  /** 拆分方式："chars" / "words" / "lines" / "words, chars"。 */
  splitType?: string;
  /** 非 scrub 模式：起始属性。 */
  from?: gsap.TweenVars;
  /** 非 scrub 模式：目标属性。 */
  to?: gsap.TweenVars;
  /** 非 scrub 模式：触发动画的 IntersectionObserver 阈值（0–1）。 */
  threshold?: number;
  /** 非 scrub 模式：ScrollTrigger 的 rootMargin。 */
  rootMargin?: string;
  /** 文本对齐。 */
  textAlign?: "left" | "center" | "right" | "justify" | "start" | "end";
  /** 非 scrub 模式：全部动画结束后的回调。 */
  onLetterAnimationComplete?: () => void;
  /**
   * 滚动驱动模式（本站首页用）：
   * 只拆字并给每个字编号，透明度由祖先的 `--split-p` 在 CSS 侧现算。
   */
  scrub?: boolean;
  /**
   * 根节点是否 `overflow: hidden`（上游默认 true，用来裁掉位移入场时露出的字）。
   * 没有位移的 scrub 模式传 false，免得某些字体的大写字形被裁到边。
   */
  clip?: boolean;
};

/** 挂在实例上的 GSAP SplitText 引用（换文本 / 换阶段前先 revert）。 */
type SplitHolder = HTMLElement & { _rbsplitInstance?: InstanceType<typeof GSAPSplitText> | null };

const SplitText = ({
  text,
  className = "",
  delay = 50,
  duration = 1.25,
  ease = "power3.out",
  splitType = "chars",
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = "-100px",
  textAlign = "center",
  tag = "p",
  onLetterAnimationComplete,
  scrub = false,
  clip = true,
}: SplitTextProps) => {
  const ref = useRef<HTMLElement>(null);
  const animationCompletedRef = useRef(false);
  const onCompleteRef = useRef(onLetterAnimationComplete);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Keep callback ref updated
  useEffect(() => {
    onCompleteRef.current = onLetterAnimationComplete;
  }, [onLetterAnimationComplete]);

  useEffect(() => {
    let cancelled = false;
    const markLoaded = () => {
      if (!cancelled) setFontsLoaded(true);
    };
    if (document.fonts.status === "loaded") {
      // 置位放到微任务里：不在 effect 的同步体里 setState（避免级联渲染），
      // 顺带让文档字体晚一步就绪的常见情况也走同一条路径。
      void Promise.resolve().then(markLoaded);
    } else {
      void document.fonts.ready.then(markLoaded);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  useGSAP(
    () => {
      if (!ref.current || !text || !fontsLoaded) return;
      // Prevent re-animation if already completed
      if (animationCompletedRef.current) return;
      const el = ref.current as SplitHolder;

      if (el._rbsplitInstance) {
        try {
          el._rbsplitInstance.revert();
        } catch {
          /* noop */
        }
        el._rbsplitInstance = null;
      }

      // ---- scrub：只拆字 + 编号，进度来自滚动（见文件头的说明） ----
      if (scrub) {
        const splitInstance = new GSAPSplitText(el, {
          type: splitType,
          smartWrap: true,
          autoSplit: false,
          linesClass: "split-line",
          wordsClass: "split-word",
          charsClass: "split-char",
          reduceWhiteSpace: false,
          onSplit: (self) => {
            self.chars.forEach((char: Element, index: number) => {
              (char as HTMLElement).style.setProperty("--split-i", String(index));
            });
            // 分母：整行字数。CSS 用 i / n 把窗口按序号摊开。
            el.style.setProperty("--split-n", String(Math.max(1, self.chars.length)));
          },
        });
        el._rbsplitInstance = splitInstance;

        return () => {
          try {
            splitInstance.revert();
          } catch {
            /* noop */
          }
          el._rbsplitInstance = null;
        };
      }

      const startPct = (1 - threshold) * 100;
      const marginMatch = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin);
      const marginValue = marginMatch ? parseFloat(marginMatch[1]) : 0;
      const marginUnit = marginMatch ? marginMatch[2] || "px" : "px";
      const sign =
        marginValue === 0
          ? ""
          : marginValue < 0
            ? `-=${Math.abs(marginValue)}${marginUnit}`
            : `+=${marginValue}${marginUnit}`;
      const start = `top ${startPct}%${sign}`;

      let targets: Element[] | undefined;
      const assignTargets = (self: InstanceType<typeof GSAPSplitText>) => {
        if (splitType.includes("chars") && self.chars.length) targets = self.chars;
        if (!targets && splitType.includes("words") && self.words.length) targets = self.words;
        if (!targets && splitType.includes("lines") && self.lines.length) targets = self.lines;
        if (!targets) targets = self.chars || self.words || self.lines;
      };

      const splitInstance = new GSAPSplitText(el, {
        type: splitType,
        smartWrap: true,
        autoSplit: splitType === "lines",
        linesClass: "split-line",
        wordsClass: "split-word",
        charsClass: "split-char",
        reduceWhiteSpace: false,
        onSplit: (self) => {
          assignTargets(self);
          const tween = gsap.fromTo(
            targets!,
            { ...from },
            {
              ...to,
              duration,
              ease,
              stagger: delay / 1000,
              scrollTrigger: {
                trigger: el,
                start,
                once: true,
                fastScrollEnd: true,
                anticipatePin: 0.4,
              },
              onComplete: () => {
                animationCompletedRef.current = true;
                onCompleteRef.current?.();
              },
              willChange: "transform, opacity",
              force3D: true,
            },
          );
          return tween;
        },
      });

      el._rbsplitInstance = splitInstance;

      return () => {
        ScrollTrigger.getAll().forEach((st) => {
          if (st.trigger === el) st.kill();
        });
        try {
          splitInstance.revert();
        } catch {
          /* noop */
        }
        el._rbsplitInstance = null;
      };
    },
    {
      dependencies: [
        text,
        delay,
        duration,
        ease,
        splitType,
        JSON.stringify(from),
        JSON.stringify(to),
        threshold,
        rootMargin,
        fontsLoaded,
        scrub,
      ],
      scope: ref,
    },
  );

  const style: React.CSSProperties = {
    textAlign,
    overflow: clip ? "hidden" : "visible",
    display: "inline-block",
    whiteSpace: "normal",
    wordWrap: "break-word",
    willChange: "transform, opacity",
  };
  const classes = `split-parent ${className}`;
  const Tag = (tag || "p") as React.ElementType<{
    ref?: React.Ref<HTMLElement>;
    style?: React.CSSProperties;
    className?: string;
    children?: React.ReactNode;
  }>;

  // React consumes this ref; createElement does not read ref.current during render.
  // eslint-disable-next-line react-hooks/refs
  return createElement(Tag, { ref, style, className: classes }, text);
};

export default SplitText;
