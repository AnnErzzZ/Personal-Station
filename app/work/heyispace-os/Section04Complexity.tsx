import type { CSSProperties } from "react";
import { Fragment } from "react";

import Image from "@/components/SiteImage";

import { Chapter, SectionHeader } from "./CaseSection";
import CoreChainHero from "./CoreChainHero";
import DotGrid from "./DotGrid";
import RevealOnView from "./RevealOnView";
import styles from "./sections.module.css";

/**
 * 04 / 12｜Product Complexity · 复杂度从哪里来（2026-09-21 新结构）。
 *
 * 本章不复用 03 的白色角色卡，切换成一块宽幅「System Relationship Map」：
 *   链路动画  04/14 CoreChainHero（深色面板）：中心枢纽 + 放射依赖，
 *           承担核心对象链路的空间呈现（2026-09-22 起为主呈现）；
 *   第一层  两条既有组织链路（空间上下文 / 设备侧组织），实线框与虚线框
 *           刻意区分两套模型，不画成一棵同质树；
 *   第二层  支撑层：用户 / 权限（横向约束带，不是主轴末端的节点）。
 *
 * 2026-09-22：静态关系图中的「核心对象链路」主轴与 Agent 卡已下线——
 * 链路信息由章首 CoreChainHero 动画面板统一承担，避免与图示重复。
 *
 * 2026-09-22：用户 / 权限卡底部的「05 系统与权限」能力簇区块（cluster）
 * 已下线——该能力组清单由章首 CoreChainHero 的模块与 hover 说明承担，
 * 卡片内不再重复罗列。
 *
 * 2026-09-22（第二轮）：用户 / 权限带改为「头部行（文字 + 真实界面配图）
 * + 四张约束卡」——可见范围 / 操作范围 / 能力入口 / 数据范围四个维度
 * 逐条展开原描述句；约束卡放在带内正文下方（2×2），配图为产品设置界面
 * 的真实截图（角色标签示例，非重绘）。
 *
 * 2026-09-22（第三轮）：第一层两条链路从横向 chips 流换成画板同款
 * 结构图卡（Ardot 12:109「空间上下文 · 设备拓扑 · 参考版式」实装）：
 *   左卡  空间上下文 = 主题色浅绿渐变舞台（角部点阵）+「空间档案」面板
 *         （HEYISPACE OS 头 + 骨架条）+ 底部悬浮胶囊行（项目··楼栋··
 *         楼层··区域，虚线分隔）；
 *   右卡  设备拓扑 = 同款渐变舞台 + 平滑曲线树（网络 → 分组×2 → 设备×4，
 *         SVG 贝塞尔连线 + 胶囊节点；≤720 重排为纵向层级流，不缩放整图）。
 *   两套模型的视觉区分从「实线 / 虚线框」改为「卡片形态不同」；图例中
 *   虚线条目同步下线。层级措辞仍只用「既有」，Caption 不变。
 *
 * 2026-09-22（第四轮）：章底「用户 / 权限 · 横向约束」图例与
 * 「Case Study 整理」来源 Caption 整体下线（用户 2026-09-22 决定，
 * 已记入 docs/cases/heyispace-os.md §I）；重绘来源的说明职责由
 * SoT 替换记录接管，页面不再重复展示。
 *
 * 2026-09-22（第五轮文案优化，仅改文字与文字层级，不动布局 / 卡片结构 /
 *   关系图 / 树结构）：两条链路说明句、权限带标签与说明、四张约束卡标题与
 *   说明全部替换为用户指定版本；约束带英文辅助标签 Access Boundary 删除；
 *   两条链路卡的英文辅助标签 SPATIAL CONTEXT / DEVICE TOPOLOGY 降为极弱
 *   辅助（11px / faint / 常规字重 / 大写字距，与中文标签不再同权重）；
 *   层级字号按本轮规范上抬（链路标签 18px、链路说明 15px、权限主标题 20px、
 *   权限说明 16px、约束卡标题 17px、约束卡正文 15px），中文字号全部 ≥14px。
 *
 * 2026-09-22（第六轮，仅布局参数）：权限带配图列 340 → 480（sizes 同步），
 *   四张约束卡随左列收窄（~430 → ~360/张）；卡位、列数、文案与结构不动。
 *
 * 2026-09-22（修复轮）：左卡恢复参考版式（Ardot 12:109 原稿）。第三轮实装
 *   时左卡被改成「小白卡悬浮 + 胶囊散落舞台底部」的散架形态，本轮按原稿
 *   修回一体结构：面板改为贴满舞台中部的带边框档案纸面（细边框、微绿白
 *   底、无投影），头行下加分隔线，三条骨架条等宽；胶囊行改回单条白色
 *   圆角工具条、内嵌面板底部并比面板左右各宽出一点，压住第三条骨架条
 *   下半段；胶囊由「白底描边投影」改回「浅灰填充无描边」。仅动左卡视觉
 *   结构与样式，文案、data-* 钩子、右卡与权限带不动。
 *
 * 2026-09-22（第七轮，点阵与权限带外观）：三处 DotGrid 点阵改浅灰
 *   （#c4c8d0，hover 高亮 #9aa0ab），mask 从左上角向右下径向淡出——
 *   右上绿色渐变底下不再落点；权限带去掉虚线描边，改为与上方两张
 *   结构卡同款 1px 细描边 + 白底 + 同款投影，并加一圈 14px 白色内描边
 *   （对齐结构卡「边框 → 白边 → 舞台」的层次，见 .mapAccess::after）。
 *
 * 2026-09-22（第九轮，仅换配图素材）：权限带右侧配图换成新版
 *   原始权限截图与项目内配图同画布 1968×1488、getbbox 一致
 *   （179,35,1968,1267），裁边后仍是 1801×1256，故 next/image 的
 *   width/height/sizes 不变；画面内容换成「设置」浮层级联：前景菜单为
 *   区域管理员（橙），底层菜单为超级管理员（紫），指向身份与角色的
 *   覆盖关系。新图浮层上边缘不在截图内（浮层为无边界白块），按 Anner
 *   2026-09-22 确认「原样整图替换」处理，不做二次裁切或补边。
 *
 * 事实边界（docs/cases/heyispace-os.md §0 / §A / §G）：
 * - 「项目 → 楼栋 → 楼层 → 区域 → 网络 → 分组 → 设备」是既有业务层级，
 *   不是我的设计；原页面归属声明 <p data-model-note> 已按需求于
 *   2026-09-22 下线，「既有」措辞由 05 章正文与注释承载。
 * - 空间侧与设备侧分属不同模型，图中不合并。
 * - Agent 只读取与分析已有数据；状态标「Demo / 内部验证」
 *   （该边界说明现由 CoreChainHero 承载）。
 * - 重绘来源标注（「Case Study 整理，并非产品原始页面」）已于
 *   2026-09-22 按用户决定从页面下线，出处记录见 SoT §I。
 */

type ContextLane = {
  key: string;
  label: string;
  items: string[];
  /** 卡内一句话说明（14px，克制在 SoT 已确认的关系内）。 */
  desc: string;
};

const contextLanes: ContextLane[] = [
  {
    key: "spatial",
    label: "空间上下文",
    items: ["项目", "楼栋", "楼层", "区域"],
    desc: "空间为设备与策略提供上下文：先定位空间，再定位具体对象。",
  },
  {
    key: "device",
    label: "设备侧组织",
    items: ["网络", "分组", "设备"],
    desc: "设备按「网络 → 分组 → 设备」组织，与项目、楼栋、楼层等空间结构保持独立。",
  },
];

/** 设备拓扑树节点（百分比 x = 胶囊中心；top 单位 px，舞台定高 264）。 */
const deviceTreeNodes = [
  { text: "网络", x: 50, top: 16 },
  { text: "分组", x: 28, top: 104 },
  { text: "分组", x: 72, top: 104 },
  { text: "设备", x: 21, top: 192 },
  { text: "设备", x: 35, top: 192 },
  { text: "设备", x: 65, top: 192 },
  { text: "设备", x: 79, top: 192 },
] as const;

/**
 * 用户 / 权限的四个约束维度：逐条展开权限边界的描述句。
 * 事实口径限于 SoT 已确认范围（§A 系统对象：用户、组织、角色、权限；
 * §J「12 章角色与权限」原文：「角色权限、导航 / 功能权限、项目功能授权、
 * 房间与数据范围、查看 / 编辑能力区分」），不新增产品事实。
 * 04 数据范围的写法：SoT 原句用了「房间」，同时把「房间与数据范围」列为
 * 待补齐素材（§J P0-b-4 状态为缺口）；但 §A 业务对象清单、§F 状态总表与
 * §G 均确认「空间 / 房间管理」属 Shipped 真实能力，故按「项目与空间」
 * 归并表述，不把范围写死在未确认的房间粒度上。
 */
type AccessConstraint = {
  num: string;
  title: string;
  desc: string;
};

const accessConstraints: AccessConstraint[] = [
  {
    num: "01",
    title: "可见范围",
    desc: "根据角色限定可见的空间与业务内容。",
  },
  {
    num: "02",
    title: "操作权限",
    // 悬尾修复：原 21 字在 390 断成 19+2，缩至 17 字单行；措辞避开
    // 旧标题「操作范围」（verify 负向断言禁残留）。
    desc: "区分查看与编辑，限定可执行的动作。",
  },
  {
    num: "03",
    title: "功能入口",
    desc: "按角色开放功能入口，只呈现所需能力。",
  },
  {
    num: "04",
    title: "数据范围",
    desc: "将数据权限限定到具体项目与空间，控制用户可查看的数据边界。",
  },
];

/** 入场顺序（断点触发 + 轻微 stagger）：链路 → 说明 → 权限 → 约束卡。 */
const REVEAL_STEP_MS = 70;

const revealDelay = (order: number) =>
  ({ "--reveal-delay": `${order * REVEAL_STEP_MS}ms` }) as CSSProperties;

export default function Section04Complexity() {
  return (
    <Chapter id="section-04-complexity" className={styles.chapterComplexity}>
      <RevealOnView className={styles.complexityReveal}>
        <SectionHeader
          index="04"
          total="12"
          title="系统复杂度"
          intro="复杂度来自对象之间的关系：一个空间背后，同时存在空间上下文、设备组织、策略与数据等多套对象关系，它们互相依赖，又不属于同一种模型。"
        />
      </RevealOnView>

      {/* 04/14 · 核心链路动画总览（深色面板）：模块清单与下方关系图同源，
          氛围性呈现「中心枢纽 + 放射依赖」，能力细节仍以静态关系图为准。 */}
      <RevealOnView className={styles.complexityReveal}>
        <CoreChainHero />
      </RevealOnView>

      <RevealOnView className={styles.complexityReveal}>
        <div className={styles.complexityMap} data-section04-map="">
          {/* 第一层：两条既有组织链路，画板结构图卡实装。
              左卡档案面板式（空间档案纸面 + 底部悬浮胶囊工具条），
              右卡曲线树——卡片形态本身区分两套模型，不再依赖实线 / 虚线框。 */}
          <div className={styles.mapContextRow} data-context-row="">
            {contextLanes.map((lane, laneIndex) => (
              <section
                className={`${styles.mapLane} ${styles.revealItem}`}
                data-lane={lane.key}
                key={lane.key}
                style={revealDelay(laneIndex)}
              >
                <div className={styles.mapCard}>
                  <div
                    className={styles.mapCardStage}
                    data-map-stage={lane.key}
                  >
                    {lane.key === "spatial" ? (
                      <>
                        {/* React Bits DotGrid 交互点阵：仅作背景层（浅灰点），
                            mask 让点阵从左上角向右下淡出（右上绿色渐变
                            底下不落点，文字与内容区基本无点）。 */}
                        <DotGrid
                          className={styles.stageDots}
                          dotSize={3}
                          gap={16}
                          baseColor="#c4c8d0"
                          activeColor="#9aa0ab"
                          proximity={100}
                          shockRadius={120}
                          shockStrength={4}
                          resistance={700}
                          returnDuration={1.2}
                        />
                        <div className={styles.ctxPanel} data-ctx-panel="">
                          <div className={styles.ctxPanelHead}>
                            <span className={styles.ctxPanelBrand}>
                              HEYISPACE OS
                            </span>
                            <span className={styles.ctxPanelName}>
                              空间档案
                            </span>
                          </div>
                          <span
                            aria-hidden="true"
                            className={styles.ctxSkeleton}
                          />
                          <span
                            aria-hidden="true"
                            className={styles.ctxSkeleton}
                          />
                          <span
                            aria-hidden="true"
                            className={styles.ctxSkeleton}
                          />
                          {/* 悬浮胶囊工具条：内嵌面板底部（参考版式 12:109
                              的「档案纸面 + 压底工具条」一体结构），比面板
                               左右各宽出一点，压住第三条骨架条的下半段。 */}
                          <div
                            className={styles.ctxPillRow}
                            data-ctx-pills=""
                          >
                            {lane.items.map((item, itemIndex) => (
                              <Fragment key={item}>
                                {itemIndex > 0 ? (
                                  <span
                                    aria-hidden="true"
                                    className={styles.ctxDash}
                                  />
                                ) : null}
                                <span
                                  className={styles.ctxChip}
                                  data-ctx-chip=""
                                >
                                  {item}
                                </span>
                              </Fragment>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <DotGrid
                          className={styles.stageDots}
                          dotSize={3}
                          gap={16}
                          baseColor="#c4c8d0"
                          activeColor="#9aa0ab"
                          proximity={100}
                          shockRadius={120}
                          shockStrength={4}
                          resistance={700}
                          returnDuration={1.2}
                        />
                        <svg
                          aria-hidden="true"
                          className={styles.treeLinks}
                          viewBox="0 0 100 264"
                          preserveAspectRatio="none"
                          data-tree-links=""
                        >
                          {/* 网络 → 分组 ×2；分组 → 设备 ×2（平滑贝塞尔，
                              非 90° 折线；x 按百分比单位对齐胶囊中心）。 */}
                          <path
                            d="M50 50 C50 82 28 76 28 104"
                            vectorEffect="non-scaling-stroke"
                          />
                          <path
                            d="M50 50 C50 82 72 76 72 104"
                            vectorEffect="non-scaling-stroke"
                          />
                          <path
                            d="M28 138 C28 166 21 162 21 192"
                            vectorEffect="non-scaling-stroke"
                          />
                          <path
                            d="M28 138 C28 166 35 162 35 192"
                            vectorEffect="non-scaling-stroke"
                          />
                          <path
                            d="M72 138 C72 166 65 162 65 192"
                            vectorEffect="non-scaling-stroke"
                          />
                          <path
                            d="M72 138 C72 166 79 162 79 192"
                            vectorEffect="non-scaling-stroke"
                          />
                        </svg>
                        <ul
                          className={styles.treeNodes}
                          data-tree-nodes=""
                        >
                          {deviceTreeNodes.map((node) => (
                            <li
                              className={styles.treeNode}
                              key={`${node.text}-${node.x}`}
                              style={{
                                left: `calc(${node.x}% - 30px)`,
                                top: `${node.top}px`,
                              }}
                            >
                              <span
                                className={styles.treeChip}
                                data-tree-chip=""
                              >
                                {node.text}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                  <header className={styles.mapLaneHead}>
                    <span className={styles.mapLaneLabel}>{lane.label}</span>
                  </header>
                  <p className={styles.mapLaneDesc}>{lane.desc}</p>
                </div>
              </section>
            ))}
          </div>

          {/* 第二层：支撑层 —— 用户 / 权限横向约束。头部行（文字 + 真实
              界面配图），四个约束维度卡片放在正文下方、配图左侧。
              核心对象链路已由章首 CoreChainHero 动画面板承担
              （2026-09-22 下线静态主轴）。 */}
          <div className={styles.mapSupportRow}>
            <section
              className={`${styles.mapAccess} ${styles.revealItem}`}
              data-support="access"
              style={revealDelay(2)}
            >
              {/* DotGrid 点阵背景（浅灰）：径向 mask 从左上角向右下淡出，
                  与上方两张结构卡的点阵语言一致。 */}
              <DotGrid
                className={styles.stageDots}
                dotSize={3}
                gap={16}
                baseColor="#c4c8d0"
                activeColor="#9aa0ab"
                proximity={100}
                shockRadius={120}
                shockStrength={4}
                resistance={700}
                returnDuration={1.2}
              />
              <div className={styles.mapAccessIntro}>
                {/* 2026-09-22（第五轮文案优化）：标签「横向约束」→「权限边界」。
                    2026-09-23（降噪轮）：英文辅助标签 Access Boundary 删除——
                    与中文标题完全同义，标题行只保留「用户与权限」。 */}
                <header className={styles.mapAccessHead}>
                  <h3 className={styles.mapAccessName}>用户与权限</h3>
                </header>
                <p className={styles.mapAccessDesc}>
                  通过角色与数据授权，决定用户能看到什么、能进入哪些功能与操作。
                </p>
                <ul
                  className={`${styles.mapConstraintGrid} ${styles.revealItem}`}
                  data-access-cards=""
                  style={revealDelay(3)}
                >
                  {accessConstraints.map((constraint) => (
                    <li
                      className={styles.mapConstraintCard}
                      key={constraint.num}
                    >
                      <h4 className={styles.mapConstraintTitle}>
                        {/* 2026-09-22（第八轮）：序号由独立行并入标题行
                            （「01 可见范围」），压掉卡内首行占位以降卡高。 */}
                        <span
                          aria-hidden="true"
                          className={styles.mapConstraintNum}
                        >
                          {constraint.num}
                        </span>
                        <span className={styles.mapConstraintTitleText}>
                          {constraint.title}
                        </span>
                      </h4>
                      <p className={styles.mapConstraintDesc}>
                        {constraint.desc}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
              {/* 配图素材随本轮更换（2026-09-22 第九轮），结构与尺寸不变。 */}
              <figure className={styles.mapAccessFigure}>
                <Image
                  className={styles.mapAccessImage}
                  src="/cases/heyispace-os/04-complexity/access-boundary.png"
                  alt="产品设置界面中的用户与角色示例：同一账号在设置菜单里带有区域管理员、超级管理员等角色标签"
                  width={1801}
                  height={1256}
                  sizes="(max-width: 720px) 88vw, 480px"
                />
              </figure>
            </section>
          </div>
        </div>
      </RevealOnView>
    </Chapter>
  );
}
