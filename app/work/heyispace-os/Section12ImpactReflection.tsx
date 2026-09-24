"use client";

import type { CSSProperties, ReactNode } from "react";

import SmoothAnchor from "@/components/SmoothAnchor";
import { Chapter, SectionHeader } from "./CaseSection";
import RevealOnView from "./RevealOnView";
import {
  MY_ROLE_ITEMS,
  REFLECTION_ITEMS,
  REFLECTION_SUMMARY,
} from "./impact-reflection";
import styles from "./sections.module.css";

/**
 * 12 / 12｜DESIGN REFLECTION · 从复杂能力，到清晰体验
 * （2026-09-23 按用户需求整章重设计，取代旧「设计方法与复盘」。）
 *
 * 最后一页不是功能总结，而是设计者对「这个复杂 B 端系统里我如何处理
 * 复杂度」的收束。叙事链：复杂在哪里 → 如何解决 → 留下什么设计方法。
 *
 * ── 页面结构（Reflection Card Layout，2026-09-23 晚二轮改版）────────
 * 章头（12 / 12 + 标题 + 一句核心总结：设计的价值不是减少功能……）
 * → 三张 Reflection 卡（用户提供的外部组件样式：圆角 16 卡 + 细描边 +
 *   半透明卡底 + 角落彩色光晕 + 圆形图标位；indigo / cyan / fuchsia
 *   三色对应三条反思）。光晕用 radial-gradient 实现，不用 filter:blur
 *   ——验收脚本守卫「终态无残留 filter」。编号 DINPro 保留在卡右上；
 *   每张卡末尾带「对应章节」胶囊锚点行，把三条反思分别接回 04/07/09
 *   （空间）、03/08/11（角色）、06/10（数据 / AI）。
 * → My Role：一条 hairline 终线上的四项能力域（Product Design /
 *   UX Architecture / Interaction Design / AI Response Structure），
 *   只做贡献收尾，不做技能熟练度声明，不写「独立完成」。
 *
 * 旧版四块（01 面对的复杂关系四卡 / 02 建立的方法四卡 / 03 旧三段反思 /
 * 04 四层贡献分组）+ editorial 竖轨形态已删，见 impact-reflection.ts 头注。
 *
 * ── 动画（保持克制）────────────────────────────────────────────────
 * 进入：Section Header → 三张 Reflection 卡依次出现（90ms 错落）→ My Role。
 * 只有 fade + 10px 上移；不引入路径动画、滚轮驱动与大幅移动。
 *
 * ── 事实边界（docs/cases/heyispace-os.md §B / §F / §G / §H）─────────
 * 全章零量化（无百分比 / 效率 / 客户数 / 项目数 / 业务收益）；三条反思
 * 正文只复述前文已确认事实；「所有人」为正常中文（禁词是检测状态口径
 * 「有人」，copy_lint 以 (?<!所)有人 排除）。
 */

/** 入场顺序：章头 → 反思 01 → 02 → 03 →（各自进入视口）My Role。 */
const REVEAL_STEP_MS = 90;

const revealDelay = (order: number) =>
  ({ "--reveal-delay": `${order * REVEAL_STEP_MS}ms` }) as CSSProperties;

/** 三张卡的点缀色：光晕 alpha（inline 渐变用）+ 图标描边色（浅底可读档）。 */
const REFLECTION_TINTS = [
  { orb: "rgba(99, 102, 241, 0.16)", icon: "#4f46e5" }, // indigo
  { orb: "rgba(34, 211, 238, 0.18)", icon: "#0e7490" }, // cyan
  { orb: "rgba(217, 70, 239, 0.14)", icon: "#a21caf" }, // fuchsia
] as const;

/** 三条反思的内容图标（lucide 线性图标 path，24 viewBox / stroke 2）。 */
const REFLECTION_ICONS: Record<string, ReactNode> = {
  "space-relations": (
    <>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </>
  ),
  "role-depth": (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  "data-judgment": (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
};

export default function Section12ImpactReflection() {
  return (
    <Chapter id="section-12-impact-reflection" className={styles.chapterImpact}>
      <RevealOnView className={styles.impactReveal}>
        <SectionHeader
          className={`${styles.impactHeader} ${styles.revealItem}`}
          index="12"
          total="12"
          title="设计复盘"
          intro={REFLECTION_SUMMARY}
        />
      </RevealOnView>

      {/* ── 三张 Reflection 卡：依次出现，各带对应章节胶囊锚点 ───────── */}
      <RevealOnView className={styles.impactReveal}>
        <ol className={styles.impactReflectionList} data-impact-reflections="">
          {REFLECTION_ITEMS.map((item, index) => {
            const tint = REFLECTION_TINTS[index % REFLECTION_TINTS.length];
            return (
              <li
                className={`${styles.impactReflection} ${styles.revealItem}`}
                data-impact-reflection={item.id}
                key={item.id}
                style={
                  {
                    ...revealDelay(1 + index),
                    "--reflection-icon": tint.icon,
                  } as CSSProperties
                }
              >
                <span
                  aria-hidden="true"
                  className={styles.impactReflectionGlow}
                  style={{
                    background: `radial-gradient(closest-side, ${tint.orb}, transparent 74%)`,
                  }}
                />
                <div className={styles.impactReflectionTop}>
                  <span
                    aria-hidden="true"
                    className={styles.impactReflectionIcon}
                  >
                    <svg
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {REFLECTION_ICONS[item.id]}
                    </svg>
                  </span>
                  <span
                    className={styles.impactReflectionIndex}
                    data-impact-reflection-index=""
                  >
                    {item.index}
                  </span>
                </div>
                <h3 className={styles.impactReflectionTitle}>{item.title}</h3>
                <p className={styles.impactReflectionBody}>{item.body}</p>
                <div
                  className={styles.impactReflectionRefs}
                  data-impact-refs=""
                >
                  <span
                    className={styles.impactReflectionRefsLabel}
                    data-impact-refs-label=""
                  >
                    对应章节
                  </span>
                  {item.refs.map((ref) => (
                    <SmoothAnchor
                      className={styles.impactReflectionRef}
                      data-impact-ref=""
                      href={ref.href}
                      key={ref.href}
                    >
                      <span
                        className={styles.impactReflectionRefIndex}
                        data-impact-ref-index=""
                      >
                        {ref.index}
                      </span>
                      <span data-impact-ref-label="">{ref.label}</span>
                    </SmoothAnchor>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      </RevealOnView>

      {/* ── My Role：设计贡献收尾（hairline 终线），不是简历技能列表 ──── */}
      <RevealOnView className={styles.impactReveal}>
        <footer
          className={`${styles.impactRole} ${styles.revealItem}`}
          data-impact-role=""
        >
          <span
            className={styles.impactRoleLabel}
            data-impact-role-label=""
          >
            My Role
          </span>
          <ul className={styles.impactRoleItems}>
            {MY_ROLE_ITEMS.map((item) => (
              <li data-impact-role-item={item.id} key={item.id}>
                {item.label}
              </li>
            ))}
          </ul>
        </footer>
      </RevealOnView>
    </Chapter>
  );
}
