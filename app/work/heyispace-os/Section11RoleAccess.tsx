"use client";

import Image from "@/components/SiteImage";
import type { CSSProperties } from "react";

import { Chapter, SectionHeader } from "./CaseSection";
import RevealOnView from "./RevealOnView";
import { ACCESS_CLOSING, ACCESS_DIMENSIONS } from "./role-access";
import styles from "./sections.module.css";

/**
 * 11 / 12｜KEY DESIGN 06 · CONTROL COMPLEXITY BY ROLE
 * 按角色配置权限，控制系统复杂度。
 *
 * 2026-09-23 章节重构（用户指令）：真实权限配置界面是本章唯一主视觉，
 * 其余内容全部围绕主界面收拢。阅读优先级：
 *
 *   P0  真实产品主界面（配置中心「权限管理」页截图，占内容区 ~90%）
 *   P1  章节核心命题（Section Header，一句说明）
 *   P2  权限结构说明（三项机制：01 功能入口 / 02 操作权限 / 03 数据范围）
 *
 * 旧结构（三维度说明 + 角色权限大表格 + 底部小截图）整体退役：
 * 大表格的 Role → Capability → Scope 三列与 hover / click / 键盘交互
 * 已删除；三项机制移到主界面下方做轻量注解。
 *
 * 动效保持很轻：RevealOnView 断点触发 → 章头 → 主界面 → 三项机制 →
 * Caption 依次淡入；主界面保持静态（截图中不含数据范围授权，
 * 三个维度无法全部准确对应到界面区域，按用户口径不强行做 Focus）。
 * 终态不残留 transform / filter / will-change（防半像素重采样发糊）。
 * 2026-09-23：主界面上方 14px 来源标签「配置中心 · 权限管理页」按用户
 * 指示删除，截图本身保留；轻量角色映射（三行两列）随后也按用户指示
 * 删除，章节收束为主界面 + 三项机制 + 一句 Caption。
 *
 * 事实边界（docs/cases/heyispace-os.md §0 / §A / §F / §G / §H / §J-4）：
 * - 三个角色来自 §0「03 章角色清单」，承接 03 章，不重复介绍角色；
 *   本章只回答「角色如何通过权限配置看到不同的系统」。
 * - 权限能力范围取自 §J-4 与 §F「说明不同用户的可见与操作范围」。
 * - 数据范围写「项目与空间」（与 04 章 §I 决定一致），不写死房间粒度。
 * - 不出现人数、项目数量、权限效率提升、安全收益；不新增组织架构、
 *   审批流程与复杂 RBAC 矩阵；不重绘假的权限管理后台。
 * - 配图为配置中心「权限管理」页的真实截图（2880 × 2048，
 *   11-role-access/permission-management.png），不是为本章新造的界面。
 *   发布前待办：截图右上角含账号名，按 §J-9 复核是否脱敏。
 */

const ACCESS_FIGURE = {
  src: "/cases/heyispace-os/11-role-access/permission-management.png",
  width: 2880,
  height: 2048,
  alt: "配置中心的权限管理页：左侧在系统预设与自定义角色中选择「管理员」，中间按权限分类切换，右侧为「空间地图」分类下逐项授权的功能开关列表",
} as const;

/** 入场顺序：章头 → 主界面 → 三项机制 → Caption。 */
const REVEAL_STEP_MS = 70;

const revealDelay = (order: number) =>
  ({ "--reveal-delay": `${order * REVEAL_STEP_MS}ms` }) as CSSProperties;

export default function Section11RoleAccess() {
  return (
    <Chapter id="section-11-role-access" className={styles.chapterRoleAccess}>
      {/* P1 章节核心命题：一句说明，不再写两行背景。 */}
      <RevealOnView className={styles.roleAccessReveal}>
        <SectionHeader
          className={`${styles.roleAccessHeader} ${styles.revealItem}`}
          index="11"
          total="12"
          title="按角色配置权限"
          intro="不同角色拥有不同的功能入口、操作权限和数据范围，由管理员统一配置。"
        />
      </RevealOnView>

      {/* P0 主舞台：真实权限配置界面，全章唯一主视觉。
          sizes 按显示宽 1040 下发（原图 2880 宽，DPR 2 仍高于显示密度）。 */}
      <RevealOnView className={styles.roleAccessReveal}>
        <figure
          className={`${styles.roleAccessStage} ${styles.revealItem}`}
          data-access-stage=""
          style={revealDelay(1)}
        >
          <Image
            className={styles.roleAccessImage}
            src={ACCESS_FIGURE.src}
            alt={ACCESS_FIGURE.alt}
            width={ACCESS_FIGURE.width}
            height={ACCESS_FIGURE.height}
            sizes="(max-width: 1180px) 92vw, 1040px"
            data-access-image=""
          />
        </figure>
      </RevealOnView>

      {/* P2 三项机制：围绕主界面的轻量注解，编号 + 标题 + 一句说明，
          不再展开第二层解释。 */}
      <RevealOnView className={styles.roleAccessReveal}>
        <div
          className={`${styles.roleAccessDimensions} ${styles.revealItem}`}
          data-access-dimensions=""
          style={revealDelay(2)}
        >
          {ACCESS_DIMENSIONS.map((dimension) => (
            <div
              className={styles.roleAccessDimension}
              data-access-dimension={dimension.id}
              key={dimension.id}
            >
              <p className={styles.roleAccessDimHead}>
                <span className={styles.roleAccessDimNum} data-access-dim-num="">
                  {dimension.index}
                </span>
                <span
                  className={styles.roleAccessDimName}
                  data-access-dim-name=""
                >
                  {dimension.name}
                </span>
              </p>
              <p className={styles.roleAccessDimLead} data-access-dim-lead="">
                {dimension.lead}
              </p>
            </div>
          ))}
        </div>
      </RevealOnView>

      {/* 低权重 Caption：一句话收束。 */}
      <RevealOnView className={styles.roleAccessReveal}>
        <p
          className={`${styles.roleAccessClosing} ${styles.revealItem}`}
          data-access-closing=""
          style={revealDelay(3)}
        >
          {ACCESS_CLOSING}
        </p>
      </RevealOnView>
    </Chapter>
  );
}
