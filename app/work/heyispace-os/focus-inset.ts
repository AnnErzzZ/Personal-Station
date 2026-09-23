/**
 * Focus 遮罩与木框的几何换算唯一事实（2026-09-23 语义反转版）。
 *
 * 当前语义：09 的 focus 紧贴运行统计卡片，10 的 focus 紧贴回答段落。
 * 两章的 focus 坐标都直接存最终高亮矩形，
 * 遮罩空洞与木框都按它画，调用 `focusInset(…, 0, 0)` 即可。
 *
 *   - 09 章「运行统计」：focus = 卡片完整 bbox（`running-data.ts`）；
 *   - 10 章「回答结构」：focus = 内容实测 bbox 外扩留白（x 统一 34/1107；
 *     y 外扩 min(25, 段间空隙的一半)），不贴边也不压邻段 ——
 *     见 `answer-structure.ts`，实测脚本 probe-10-content-bbox.py 与
 *     用户红框反推 probe-10-user-frame.py。
 *
 * 内缩机制保留但已归零（无引用方传非零值）：万一将来又要把框画在内容
 * *里面*（框比内容小），把 `cssInsetX/Y` 传成正的内缩量即可。届时注意
 * 两条推导仍然成立 ——
 *
 *   ① `left = mask.left + 2 * inset`：绝对定位的 `left` 指 margin box 外缘，
 *      负外边距会把 border box 往左拉；只写 `+inset` 会让框整体往右下偏一格。
 *   ② 负边距必须用百分比，且 margin 的纵向 % 按**容器宽**解析：
 *      `negY = insetY / image.width * 100`，否则移动端（canvas 定宽 920px）
 *      补不满缩进。
 *
 * 与交付尺寸的关系（重要）：next/image 在 deviceScaleFactor=1 且桌面 dpr=1
 * 时会把图下发成 s、s+1、s+2 三档候选（10 章声明 640 → 实际 678；09 章声明
 * 840 → 实际 830），所以「底图 px → CSS px」的精确比例只在浏览器里拿得到。
 * 这里用 `deliveredWidth` 参数显式传入该比例：真实页面上按实测的交付宽度算，
 * 视觉验收脚本按它自己的缩放口径算，两边都能把自己的期望值写准。
 */

import type { CSSProperties } from "react";

export type FocusRect = { x: number; y: number; width: number; height: number };

export type FocusInset = {
  x: string;
  y: string;
  width: string;
  height: string;
  /** 环宽（百分比）。四段遮罩 2026-09-23 已退役（遮罩改由高亮框超大
   *  box-shadow 承担，见 sections.module.css .answerFocus），此字段仅
   *  保留占位，页面样式不再消费。 */
  ringX: string;
  ringY: string;
  /** 视觉盒到布局盒的负外边距。 */
  negX: string;
  negY: string;
};

/** CSS Module 哈希化后没法按类名取样，改用 data 属性把内缩量暴露给验收脚本。 */
export function focusInsetVars(prefix: string, inset: FocusInset): CSSProperties {
  return {
    [`--${prefix}-frame-x`]: inset.x,
    [`--${prefix}-frame-y`]: inset.y,
    [`--${prefix}-frame-width`]: inset.width,
    [`--${prefix}-frame-height`]: inset.height,
    [`--${prefix}-frame-ring-x`]: inset.ringX,
    [`--${prefix}-frame-ring-y`]: inset.ringY,
    [`--${prefix}-frame-neg-x`]: inset.negX,
    [`--${prefix}-frame-neg-y`]: inset.negY,
  } as CSSProperties;
}

/**
 * 把底图坐标 + 内缩量换算成 CSS 变量。
 *
 * `cssInsetX/Y` 是页面上（CSS px）的目标内缩，`deliveredWidth` 是这张底图
 * 在该断点下的实际交付宽度（CSS px），用来把 CSS px 折回底图 px。
 *
 * ── 定位要加「两倍」内缩（关键，仅内缩方向非零时生效） ──────────────────
 * 可见框（用户看到的那圈线）要落在「遮罩矩形四周各内缩 inset」的位置：
 *
 *   遮罩矩形  ← 高亮范围由它决定，不动
 *   可见框    ← 遮罩矩形四周各内缩 inset，形成留白
 *
 * 浏览器里绝对定位的 `left` 定位的是 **margin box** 的左缘，而负外边距会把
 * border box 从那里再往左拉。而 `getBoundingClientRect()` 量到的正是 border box
 * （= 可见框）。所以：
 *
 *   border.left = left + marginLeft = left - inset
 *   要它等于 mask.left + inset  ⇒  left = mask.left + 2 * inset
 *
 * 只写 `mask.left + inset` 会少一格：左/上边缘退回遮罩边界（内缩变 0），
 * 右/下边缘却内缩了 2 * inset —— 框看起来被往右下推了一格。
 *
 * ── 负边距必须按百分比 ───────────────────────────────────────────────────
 * 若改用 px，在 920px 画布的移动端上 -16px 只等于 2.84% 的底图宽，补不满
 * 4.90% 的缩进（遮罩仍按底图百分比走），margin box 会比遮罩小一圈，
 * 木框往右下溢出、左侧留白被吃掉。百分比则「缩多少补多少」恒等 ——
 * 但注意两个方向的解析基准不同：横向 % 按容器宽、纵向 % 按容器高。
 * 所以纵向的 margin 要写成 `insetY / image.width * 100`（乘 image.width /
 * image.height 修正回与横向同一把尺），否则移动端补不满。
 */
export function focusInset(
  focus: FocusRect,
  image: { width: number; height: number; deliveredWidth: number },
  cssInsetX: number,
  cssInsetY: number,
): FocusInset {
  const perCss = image.width / image.deliveredWidth;
  const insetX = cssInsetX * perCss;
  const insetY = cssInsetY * perCss;
  const pctX = (insetX / image.width) * 100;
  const pctY = (insetY / image.height) * 100;
  return {
    /** left / top 的百分比基准：横向按容器宽、纵向按容器高。 */
    x: `${(focus.x / image.width) * 100 + pctX * 2}%`,
    y: `${(focus.y / image.height) * 100 + pctY * 2}%`,
    width: `${(focus.width / image.width) * 100 - pctX * 2}%`,
    height: `${(focus.height / image.height) * 100 - pctY * 2}%`,
    ringX: `${pctX}%`,
    ringY: `${pctY}%`,
    /** 负外边距：把可见框外扩回遮罩矩形，抵消掉内缩，布局占位不变。 */
    negX: `${pctX}%`,
    /**
     * 纵向负外边距写成「按图片宽度」的比例：margin 的百分比在纵向按**容器宽**
     * 解析，而内缩本身是按容器高算出来的，所以要乘 image.width / image.height
     * 把两把尺对齐 —— 否则移动端（canvas 被 width:920px 定死）补不满缩进。
     */
    negY: `${(insetY / image.width) * 100}%`,
  };
}
