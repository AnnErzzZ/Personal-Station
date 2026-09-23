"use client";
/**
 * MacbookScroll — 来源：Aceternity UI（https://ui.aceternity.com/components/macbook-scroll），
 * 2026-09-23 引入，用于 Heyispace OS 案例页首屏：滚动打开 MacBook，屏幕展示
 * 产品主截图，动画结束后衔接 02 项目背景。
 *
 * 相对原版的适配（其余逐字保留）：
 *   1. motion.h2 → motion.div：本站把整块 Hero 文案（含 h1）作为 title 插槽
 *      传入，h2 > h1 是非法标题嵌套，外层改语义中性容器；
 *   2. 屏幕 h-96 → h-[20rem]：32rem × 20rem = 16:10，与产品截图
 *      heyispace-agent-analysis.png（4320×2700）同比例，object-cover 不再裁边；
 *   3. md:py-80 → md:pt-20 md:pb-80：顶部留白收紧，首屏文案位置贴近原设计；
   *   4. scale-[0.35] sm:scale-50 → scale-[0.6] sm:scale-75：移动端 0.35 倍的
   *      MacBook 只有 ~180px 宽，看不清屏幕内容，上调到可读档；
   *      并加 origin-top：默认绕中心缩放会把 200vh 块顶部的文案整体
   *      压出 ~340px 死白（首屏导航与文案之间全空），锚定顶部后
   *      移动端首屏紧凑；桌面 scale-100 无行为差异；
 *   5. min-h-[200vh] → 移动端 170vh / sm 190vh / md 200vh：origin-top
 *      之后移动端内容只占块的上半，200vh 行程会让屏幕离场到项目
 *      背景进场之间出现一大段空档，按内容实际高度收短行程；
 *   6. 根节点与屏幕加 data-ho-macbook-scroll / data-ho-macbook-screen，
 *      供 verify-heyispace-hero.mjs 定位断言。
 *
 * 2026-09-23 晚二次调整（Anner：换 agent.png + 放大 mac + 键盘沉底 60%）：
 *   7. 屏幕 h-[20rem] → h-[22.756rem]：新主图 agent.png 为 2880×2048
 *      （45:32，1.40625），16:10 会裁掉底部内容，屏幕比例改与图一致，
 *      object-cover 不再裁边；fold 初始 scaleY 相应 0.6 → 0.53
 *      （0.53 × 22.756rem ≈ 12rem，合盖仍与外壳齐平）；
 *   8. Lid + Base 包进 data-ho-macbook-stage wrapper：origin-top 整体
 *      scale 放大（移动 1.1 / sm 1.14 / md 1.18）+ translateY 下沉
 *      （CSS individual transform 固定 translate→rotate→scale 次序，
 *      净效果 = 绕顶边放大后再整体下移 T×s），首屏键盘被视口底部
 *      遮住约 60%；文案在 wrapper 外，不随 mac 放大；
 *   9. Base area 加 data-ho-macbook-base，供验收脚本量化遮挡比例。
 *   10. 2026-09-23 晚五次迭代（Anner：主图到背景页后停止过渡 + 屏幕留边距）：
 *      translate 桌面钳制 [0,0.4]→[0,624]（p≥0.4 冻结，屏幕贴背景节顶静止，
 *      与三卡同屏；移动端保持 v×1900）；主图改 86% 居中露出深灰 bezel
 *      （比例 45:32 不变、零裁切）。
 * Tailwind 工具类由 app/work/heyispace-os/macbook-scroll.tailwind.css 定向生成
 * （scoped，无 preflight，dark 变体已禁用），cn 来自 @/lib/utils。
 */
import React, { useRef } from "react";
import { MotionValue, motion, useScroll, useTransform } from "motion/react";
import { cn } from "@/lib/utils";
import {
  IconBrightnessDown,
  IconBrightnessUp,
  IconCaretRightFilled,
  IconCaretUpFilled,
  IconChevronUp,
  IconMicrophone,
  IconMoon,
  IconPlayerSkipForward,
  IconPlayerTrackNext,
  IconPlayerTrackPrev,
  IconTable,
  IconVolume,
  IconVolume2,
  IconVolume3,
} from "@tabler/icons-react";
import { IconSearch } from "@tabler/icons-react";
import { IconWorld } from "@tabler/icons-react";
import { IconCommand } from "@tabler/icons-react";
import { IconCaretLeftFilled } from "@tabler/icons-react";
import { IconCaretDownFilled } from "@tabler/icons-react";


export const MacbookScroll = ({
  src,
  showGradient,
  title,
  badge,
}: {
  src?: string;
  showGradient?: boolean;
  title?: string | React.ReactNode;
  badge?: React.ReactNode;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  /*
   * 响应式取值注意：motion v13 的 useTransform（含函数式）会把首次
   * 渲染时的 transformer 闭包快照下来，之后 React state 变化
   * （如本组件原先的 isMobile state）不会更新闭包——
   * "isMobile ? X : Y" 分支因此从不生效。绕法：transformer 内不捕获
   * React state，每帧现读 window.innerWidth（SSR 下无 window，回退
   * 桌面值）。
   *
   * fold 初值（scaleX 1.25 / scaleY 0.714）：合盖态屏幕视觉与外壳
   * 四边重合——探针实测外壳视觉 757.9×243.2 @top 497.1，旧值
   * 1.2/0.66 时屏幕窄 33px、顶低 16.6px，白屏四周黑缝不均（被指认
   * "界面主图没跟 mac 屏幕对齐"）。透视非线性，数值来自两点实测
   * 插值，勿按公式推。开盖终值 1.5 不变。
   */
  const scaleX = useTransform(
    scrollYProgress,
    [0, 0.3],
    [1.25, 1.44],
  );
  const scaleY = useTransform(
    scrollYProgress,
    [0, 0.3],
    [0.714, 1.44],
  );
  /*
   * translate：桌面钳制在 [0, 0.4] → [0, 636]（五次迭代，Anner：主图到达
   * 背景页后必须完全停止过渡，且与三卡同屏）。p≤0.4 斜率恒 1590（≈旧线性
   * v×1560，开盖节奏基本不变）；p≥0.4 输出恒为 636，屏幕 transform 冻结——
   * 冻结几何：屏幕底缘恰好贴 macStage 盒底（= 背景节顶边），冻结后屏幕与
   * 背景节相对位置恒定，作为一张完整主图静止贴在背景页顶部随页面正常滚动。
   * 开盖终值 1.5→1.44：主图视觉高 619 + 背景节标题三卡区 ~260 ≤ 900 视口，
   * 满足"完整主图与三卡同时展示在一屏"（1.5 时 644+260=904 溢出，卡底进不来）。
   * 移动端保持线性 v×1900：170vh 短行程 + 根 scale 0.6，屏幕仍需在
   * progress 0.94 前完全退出裁切线（零残留断言），几何与桌面不同不套用。
   */
  const translate = useTransform(scrollYProgress, (v) => {
    if (typeof window !== "undefined" && window.innerWidth < 768) return v * 1900;
    return Math.min(v / 0.4, 1) * 636;
  });
  const rotate = useTransform(scrollYProgress, [0.1, 0.12, 0.3], [-28, -28, 0]);
  /*
   * v13 注意：useTransform 的多区间重载会命中 accelerate 快速通道
   * （scroll-linked 加速渲染），对 opacity 这类非 transform 属性
   * 不回写内联样式（实测 style.opacity 恒为初值）。改用函数式
   * transformer 强制走普通 JS 路径，语义与原版 [0,0.3]→[0,100]、
   * [0,0.2]→[1,0] 的 clamp 插值完全一致。
   */
  const textTransform = useTransform(scrollYProgress, (v) =>
    Math.max(0, Math.min(1, v / 0.3)) * 100,
  );
  const textOpacity = useTransform(scrollYProgress, (v) =>
    1 - Math.max(0, Math.min(1, v / 0.2)),
  );

  return (
    <div
      ref={ref}
      data-ho-macbook-scroll="true"
      className="flex min-h-[170vh] shrink-0 origin-top scale-[0.6] transform flex-col items-center justify-start py-0 [perspective:800px] sm:min-h-[190vh] sm:scale-75 md:min-h-[200vh] md:scale-100 md:pb-80 md:pt-20"
    >
      <motion.div
        style={{
          translateY: textTransform,
          opacity: textOpacity,
        }}
        className="mb-20 text-center text-3xl font-bold text-neutral-800 dark:text-white"
      >
        {title || (
          <span>
            This Macbook is built with Tailwindcss. <br /> No kidding.
          </span>
        )}
      </motion.div>
      {/* Mac 整体（Lid + Base）放大并下沉，文案不参与 */}
      <div
        data-ho-macbook-stage="true"
        className="origin-top translate-y-[300px] scale-[1.1] sm:translate-y-[100px] sm:scale-[1.14] md:translate-y-[8px] md:scale-[1.18]"
      >
        {/* Lid */}
        <Lid
          src={src}
          scaleX={scaleX}
          scaleY={scaleY}
          rotate={rotate}
          translate={translate}
        />
        {/* Base area */}
        <div
          data-ho-macbook-base="true"
          className="relative -z-10 h-[22rem] w-[32rem] overflow-hidden rounded-2xl bg-gray-200 dark:bg-[#272729]"
        >
          {/* above keyboard bar */}
          <div className="relative h-10 w-full">
            <div className="absolute inset-x-0 mx-auto h-4 w-[80%] bg-[#050505]" />
          </div>
          <div className="relative flex">
            <div className="mx-auto h-full w-[10%] overflow-hidden">
              <SpeakerGrid />
            </div>
            <div className="mx-auto h-full w-[80%]">
              <Keypad />
            </div>
            <div className="mx-auto h-full w-[10%] overflow-hidden">
              <SpeakerGrid />
            </div>
          </div>
          <Trackpad />
          <div className="absolute inset-x-0 bottom-0 mx-auto h-2 w-20 rounded-tl-3xl rounded-tr-3xl bg-gradient-to-t from-[#272729] to-[#050505]" />
          {showGradient && (
            <div className="absolute inset-x-0 bottom-0 z-50 h-40 w-full bg-gradient-to-t from-white via-white to-transparent dark:from-black dark:via-black"></div>
          )}
          {badge && <div className="absolute bottom-4 left-4">{badge}</div>}
        </div>
      </div>
    </div>
  );
};

export const Lid = ({
  scaleX,
  scaleY,
  rotate,
  translate,
  src,
}: {
  scaleX: MotionValue<number>;
  scaleY: MotionValue<number>;
  rotate: MotionValue<number>;
  translate: MotionValue<number>;
  src?: string;
}) => {
  return (
    <div className="relative [perspective:800px]">
      <div
        style={{
          transform: "perspective(800px) rotateX(-25deg) translateZ(0px)",
          transformOrigin: "bottom",
          transformStyle: "preserve-3d",
        }}
        className="relative h-[12rem] w-[32rem] rounded-2xl bg-[#010101] p-2"
      >
        <div
          style={{
            boxShadow: "0px 2px 0px 2px #171717 inset",
          }}
          className="absolute inset-0 flex items-center justify-center rounded-lg bg-[#010101]"
        >
          <span className="text-white">
            <AceternityLogo />
          </span>
        </div>
      </div>
      <motion.div
        data-ho-macbook-screen="true"
        style={{
          scaleX: scaleX,
          scaleY: scaleY,
          rotateX: rotate,
          translateY: translate,
          transformStyle: "preserve-3d",
          transformOrigin: "top",
        }}
        className="absolute inset-x-0 top-[-16px] flex h-[22.756rem] w-[32rem] items-center justify-center overflow-hidden rounded-2xl bg-[#010101]"
      >
        <div className="absolute inset-0 rounded-lg bg-[#272729]" />
        {/*
         * 主图 86% 居中（五次迭代，Anner：图片铺满屏幕"看着特别假，
         * 上下左右都留有足够的屏幕边距"）——86% 时 img 比例
         * 440.3×313.1 恰好仍为 45:32，object-cover 零裁切，四周露出
         * 14% 深灰屏幕边框（bezel）。fold 视觉：左右 ~45px / 上下 ~18px
         * （scaleX 1.25 放大横向、scaleY 0.714 压缩纵向，透视观感同真机）。
         */}
        <img
          src={src as string}
          alt="Heyispace OS 产品界面截图"
          className="relative h-[86%] w-[86%] rounded-lg object-cover"
        />
      </motion.div>
    </div>
  );
};

export const Trackpad = () => {
  return (
    <div
      className="mx-auto my-1 h-32 w-[40%] rounded-xl"
      style={{
        boxShadow: "0px 0px 1px 1px #00000020 inset",
      }}
    ></div>
  );
};

export const Keypad = () => {
  return (
    <div className="mx-1 h-full [transform:translateZ(0)] rounded-md bg-[#050505] p-1 [will-change:transform]">
      {/* First Row */}
      <div className="mb-[2px] flex w-full shrink-0 gap-[2px]">
        <KBtn
          className="w-10 items-end justify-start pb-[2px] pl-[4px]"
          childrenClassName="items-start"
        >
          esc
        </KBtn>
        <KBtn>
          <IconBrightnessDown className="h-[6px] w-[6px]" />
          <span className="mt-1 inline-block">F1</span>
        </KBtn>
        <KBtn>
          <IconBrightnessUp className="h-[6px] w-[6px]" />
          <span className="mt-1 inline-block">F2</span>
        </KBtn>
        <KBtn>
          <IconTable className="h-[6px] w-[6px]" />
          <span className="mt-1 inline-block">F3</span>
        </KBtn>
        <KBtn>
          <IconSearch className="h-[6px] w-[6px]" />
          <span className="mt-1 inline-block">F4</span>
        </KBtn>
        <KBtn>
          <IconMicrophone className="h-[6px] w-[6px]" />
          <span className="mt-1 inline-block">F5</span>
        </KBtn>
        <KBtn>
          <IconMoon className="h-[6px] w-[6px]" />
          <span className="mt-1 inline-block">F6</span>
        </KBtn>
        <KBtn>
          <IconPlayerTrackPrev className="h-[6px] w-[6px]" />
          <span className="mt-1 inline-block">F7</span>
        </KBtn>
        <KBtn>
          <IconPlayerSkipForward className="h-[6px] w-[6px]" />
          <span className="mt-1 inline-block">F8</span>
        </KBtn>
        <KBtn>
          <IconPlayerTrackNext className="h-[6px] w-[6px]" />
          <span className="mt-1 inline-block">F8</span>
        </KBtn>
        <KBtn>
          <IconVolume3 className="h-[6px] w-[6px]" />
          <span className="mt-1 inline-block">F10</span>
        </KBtn>
        <KBtn>
          <IconVolume2 className="h-[6px] w-[6px]" />
          <span className="mt-1 inline-block">F11</span>
        </KBtn>
        <KBtn>
          <IconVolume className="h-[6px] w-[6px]" />
          <span className="mt-1 inline-block">F12</span>
        </KBtn>
        <KBtn>
          <div className="h-4 w-4 rounded-full bg-gradient-to-b from-neutral-900 from-20% via-black via-50% to-neutral-900 to-95% p-px">
            <div className="h-full w-full rounded-full bg-black" />
          </div>
        </KBtn>
      </div>

      {/* Second row */}
      <div className="mb-[2px] flex w-full shrink-0 gap-[2px]">
        <KBtn>
          <span className="block">~</span>
          <span className="mt-1 block">`</span>
        </KBtn>
        <KBtn>
          <span className="block">!</span>
          <span className="block">1</span>
        </KBtn>
        <KBtn>
          <span className="block">@</span>
          <span className="block">2</span>
        </KBtn>
        <KBtn>
          <span className="block">#</span>
          <span className="block">3</span>
        </KBtn>
        <KBtn>
          <span className="block">$</span>
          <span className="block">4</span>
        </KBtn>
        <KBtn>
          <span className="block">%</span>
          <span className="block">5</span>
        </KBtn>
        <KBtn>
          <span className="block">^</span>
          <span className="block">6</span>
        </KBtn>
        <KBtn>
          <span className="block">&</span>
          <span className="block">7</span>
        </KBtn>
        <KBtn>
          <span className="block">*</span>
          <span className="block">8</span>
        </KBtn>
        <KBtn>
          <span className="block">(</span>
          <span className="block">9</span>
        </KBtn>
        <KBtn>
          <span className="block">)</span>
          <span className="block">0</span>
        </KBtn>
        <KBtn>
          <span className="block">&mdash;</span>
          <span className="block">_</span>
        </KBtn>
        <KBtn>
          <span className="block">+</span>
          <span className="block"> = </span>
        </KBtn>
        <KBtn
          className="w-10 items-end justify-end pr-[4px] pb-[2px]"
          childrenClassName="items-end"
        >
          delete
        </KBtn>
      </div>

      {/* Third row */}
      <div className="mb-[2px] flex w-full shrink-0 gap-[2px]">
        <KBtn
          className="w-10 items-end justify-start pb-[2px] pl-[4px]"
          childrenClassName="items-start"
        >
          tab
        </KBtn>
        <KBtn>
          <span className="block">Q</span>
        </KBtn>
        <KBtn>
          <span className="block">W</span>
        </KBtn>
        <KBtn>
          <span className="block">E</span>
        </KBtn>
        <KBtn>
          <span className="block">R</span>
        </KBtn>
        <KBtn>
          <span className="block">T</span>
        </KBtn>
        <KBtn>
          <span className="block">Y</span>
        </KBtn>
        <KBtn>
          <span className="block">U</span>
        </KBtn>
        <KBtn>
          <span className="block">I</span>
        </KBtn>
        <KBtn>
          <span className="block">O</span>
        </KBtn>
        <KBtn>
          <span className="block">P</span>
        </KBtn>
        <KBtn>
          <span className="block">{`{`}</span>
          <span className="block">{`[`}</span>
        </KBtn>
        <KBtn>
          <span className="block">{`}`}</span>
          <span className="block">{`]`}</span>
        </KBtn>
        <KBtn>
          <span className="block">{`|`}</span>
          <span className="block">{`\\`}</span>
        </KBtn>
      </div>

      {/* Fourth Row */}
      <div className="mb-[2px] flex w-full shrink-0 gap-[2px]">
        <KBtn
          className="w-[2.8rem] items-end justify-start pb-[2px] pl-[4px]"
          childrenClassName="items-start"
        >
          caps lock
        </KBtn>
        <KBtn>
          <span className="block">A</span>
        </KBtn>
        <KBtn>
          <span className="block">S</span>
        </KBtn>
        <KBtn>
          <span className="block">D</span>
        </KBtn>
        <KBtn>
          <span className="block">F</span>
        </KBtn>
        <KBtn>
          <span className="block">G</span>
        </KBtn>
        <KBtn>
          <span className="block">H</span>
        </KBtn>
        <KBtn>
          <span className="block">J</span>
        </KBtn>
        <KBtn>
          <span className="block">K</span>
        </KBtn>
        <KBtn>
          <span className="block">L</span>
        </KBtn>
        <KBtn>
          <span className="block">{`:`}</span>
          <span className="block">{`;`}</span>
        </KBtn>
        <KBtn>
          <span className="block">{`"`}</span>
          <span className="block">{`'`}</span>
        </KBtn>
        <KBtn
          className="w-[2.85rem] items-end justify-end pr-[4px] pb-[2px]"
          childrenClassName="items-end"
        >
          return
        </KBtn>
      </div>

      {/* Fifth Row */}
      <div className="mb-[2px] flex w-full shrink-0 gap-[2px]">
        <KBtn
          className="w-[3.65rem] items-end justify-start pb-[2px] pl-[4px]"
          childrenClassName="items-start"
        >
          shift
        </KBtn>
        <KBtn>
          <span className="block">Z</span>
        </KBtn>
        <KBtn>
          <span className="block">X</span>
        </KBtn>
        <KBtn>
          <span className="block">C</span>
        </KBtn>
        <KBtn>
          <span className="block">V</span>
        </KBtn>
        <KBtn>
          <span className="block">B</span>
        </KBtn>
        <KBtn>
          <span className="block">N</span>
        </KBtn>
        <KBtn>
          <span className="block">M</span>
        </KBtn>
        <KBtn>
          <span className="block">{`<`}</span>
          <span className="block">{`,`}</span>
        </KBtn>
        <KBtn>
          <span className="block">{`>`}</span>
          <span className="block">{`.`}</span>
        </KBtn>
        <KBtn>
          <span className="block">{`?`}</span>
          <span className="block">{`/`}</span>
        </KBtn>
        <KBtn
          className="w-[3.65rem] items-end justify-end pr-[4px] pb-[2px]"
          childrenClassName="items-end"
        >
          shift
        </KBtn>
      </div>

      {/* sixth Row */}
      <div className="mb-[2px] flex w-full shrink-0 gap-[2px]">
        <KBtn className="" childrenClassName="h-full justify-between py-[4px]">
          <div className="flex w-full justify-end pr-1">
            <span className="block">fn</span>
          </div>
          <div className="flex w-full justify-start pl-1">
            <IconWorld className="h-[6px] w-[6px]" />
          </div>
        </KBtn>
        <KBtn className="" childrenClassName="h-full justify-between py-[4px]">
          <div className="flex w-full justify-end pr-1">
            <IconChevronUp className="h-[6px] w-[6px]" />
          </div>
          <div className="flex w-full justify-start pl-1">
            <span className="block">control</span>
          </div>
        </KBtn>
        <KBtn className="" childrenClassName="h-full justify-between py-[4px]">
          <div className="flex w-full justify-end pr-1">
            <OptionKey className="h-[6px] w-[6px]" />
          </div>
          <div className="flex w-full justify-start pl-1">
            <span className="block">option</span>
          </div>
        </KBtn>
        <KBtn
          className="w-8"
          childrenClassName="h-full justify-between py-[4px]"
        >
          <div className="flex w-full justify-end pr-1">
            <IconCommand className="h-[6px] w-[6px]" />
          </div>
          <div className="flex w-full justify-start pl-1">
            <span className="block">command</span>
          </div>
        </KBtn>
        <KBtn className="w-[8.2rem]"></KBtn>
        <KBtn
          className="w-8"
          childrenClassName="h-full justify-between py-[4px]"
        >
          <div className="flex w-full justify-start pl-1">
            <IconCommand className="h-[6px] w-[6px]" />
          </div>
          <div className="flex w-full justify-start pl-1">
            <span className="block">command</span>
          </div>
        </KBtn>
        <KBtn className="" childrenClassName="h-full justify-between py-[4px]">
          <div className="flex w-full justify-start pl-1">
            <OptionKey className="h-[6px] w-[6px]" />
          </div>
          <div className="flex w-full justify-start pl-1">
            <span className="block">option</span>
          </div>
        </KBtn>
        <div className="mt-[2px] flex h-6 w-[4.9rem] flex-col items-center justify-end rounded-[4px] p-[0.5px]">
          <KBtn className="h-3 w-6">
            <IconCaretUpFilled className="h-[6px] w-[6px]" />
          </KBtn>
          <div className="flex">
            <KBtn className="h-3 w-6">
              <IconCaretLeftFilled className="h-[6px] w-[6px]" />
            </KBtn>
            <KBtn className="h-3 w-6">
              <IconCaretDownFilled className="h-[6px] w-[6px]" />
            </KBtn>
            <KBtn className="h-3 w-6">
              <IconCaretRightFilled className="h-[6px] w-[6px]" />
            </KBtn>
          </div>
        </div>
      </div>
    </div>
  );
};

export const KBtn = ({
  className,
  children,
  childrenClassName,
  backlit = true,
}: {
  className?: string;
  children?: React.ReactNode;
  childrenClassName?: string;
  backlit?: boolean;
}) => {
  return (
    <div
      className={cn(
        "[transform:translateZ(0)] rounded-[4px] p-[0.5px] [will-change:transform]",
        backlit && "bg-white/[0.2] shadow-xl shadow-white",
      )}
    >
      <div
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-[3.5px] bg-[#0A090D]",
          className,
        )}
        style={{
          boxShadow:
            "0px -0.5px 2px 0 #0D0D0F inset, -0.5px 0px 2px 0 #0D0D0F inset",
        }}
      >
        <div
          className={cn(
            "flex w-full flex-col items-center justify-center text-[5px] text-neutral-200",
            childrenClassName,
            backlit && "text-white",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export const SpeakerGrid = () => {
  return (
    <div
      className="mt-2 flex h-40 gap-[2px] px-[0.5px]"
      style={{
        backgroundImage:
          "radial-gradient(circle, #08080A 0.5px, transparent 0.5px)",
        backgroundSize: "3px 3px",
      }}
    ></div>
  );
};

export const OptionKey = ({ className }: { className: string }) => {
  return (
    <svg
      fill="none"
      version="1.1"
      id="icon"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      className={className}
    >
      <rect
        stroke="currentColor"
        strokeWidth={2}
        x="18"
        y="5"
        width="10"
        height="2"
      />
      <polygon
        stroke="currentColor"
        strokeWidth={2}
        points="10.6,5 4,5 4,7 9.4,7 18.4,27 28,27 28,25 19.6,25 "
      />
      <rect
        id="_Transparent_Rectangle_"
        className="st0"
        width="32"
        height="32"
        stroke="none"
      />
    </svg>
  );
};

const AceternityLogo = () => {
  return (
    <svg
      width="66"
      height="65"
      viewBox="0 0 66 65"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-3 w-3 text-white"
    >
      <path
        d="M8 8.05571C8 8.05571 54.9009 18.1782 57.8687 30.062C60.8365 41.9458 9.05432 57.4696 9.05432 57.4696"
        stroke="currentColor"
        strokeWidth="15"
        strokeMiterlimit="3.86874"
        strokeLinecap="round"
      />
    </svg>
  );
};
