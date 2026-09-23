import { cloneElement, isValidElement, type CSSProperties } from "react";
import type { Metadata } from "next";
import Image from "@/components/SiteImage";

import ContinuousTaskChain, {
  State01Evidence,
  State02Evidence,
  State03Evidence,
} from "./ContinuousTaskChain";
import DesignSpecShowcase from "./DesignSpecShowcase";
import EntranceSequence from "./EntranceSequence";
import OutcomeTransition from "./OutcomeTransition";
import GuidedNextStep from "./GuidedNextStep";
import KnowledgeBase from "./KnowledgeBase";
import ProblemMotionScope from "./ProblemMotionScope";
import VerifiedOutcome from "./VerifiedOutcome";
import { ProblemVisual } from "./ProblemVisuals";

import CaseNav from "../CaseNav";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "合一实施助手",
  description:
    "合一实施助手产品重构 Case Study：把智能空间现场交付任务转化为连续、可执行的产品指引。",
};

const assetBase =
  "/cases/implementation-assistant/figma/first-three-pages";

const projectCards = [
  {
    title: "合一实施助手",
    icon: "project-icon-01.svg",
    description:
      "面向智能空间交付人员的微信小程序，用于完成空间搭建、设备组网、升级、绑定、同步与异常处理。",
  },
  {
    title: "从完整任务重组产品",
    icon: "project-icon-02.svg",
    description:
      "重新梳理实施顺序、前置条件和异常路径，把依赖个人经验的操作转化为产品可以提醒、检查和阻断的流程规则。",
  },
  {
    title: "产品设计与UX/UI",
    icon: "project-icon-03.svg",
    description:
      "我主导问题梳理、产品结构、交互与界面设计，并持续跟进设计评审、研发走查、测试和验收。",
  },
] as const;

const problemSteps = [
  {
    title: "需求出现",
    description:
      "业务端在实际交付中遇到新的单点问题，需要补充相应的操作能力。",
  },
  {
    title: "增加功能",
    description:
      "产品通过新增菜单、页面或独立工具解决当前问题，但没有同步调整整体任务流程。",
  },
  {
    title: "入口分散",
    description:
      "同一项交付任务被拆散到多个位置，员工需要在不同页面和工具之间反复切换。",
  },
  {
    title: "依赖经验",
    description:
      "系统没有提供清晰的步骤引导，用户只能自行记忆操作顺序、完成状态和检查条件。",
  },
  {
    title: "问题后置",
    description:
      "某个步骤一旦遗漏，通常无法在操作过程中及时发现，直到最终验收或设备异常时才暴露。",
  },
] as const;

const problemLabels = ["流程断点", "大量重复操作", "跨工具", "缺少指引/防错"];

const problemVisuals = [
  "flow-break",
  "repeat",
  "cross-tool",
  "guidance-gap",
] as const;

const legacyFlow = [
  {
    title: "建立层级",
    description: "依次创建建筑、楼层、区域、网络和分组。",
  },
  {
    title: "定位设备",
    description: "逐个对比设备的 MAC 地址确认目标。",
  },
  {
    title: "BlueFi 升级固件",
    description: "低版本设备需要先在 BlueFi 完成升级，再返回原工具。",
  },
  {
    title: "网关配 Wi-Fi",
    description: "在菜单里通过蓝牙连接网关，手动输入 Wi-Fi 名称和密码。",
  },
  {
    title: "重新连接并组网",
    description: "重新进入“组网”菜单，连接同一网关并加入局域网。",
  },
  {
    title: "逐台核对设备版本",
    description: "所有设备配置好后，需要人工确认版本与升级结果。",
  },
  {
    title: "建立设备控制关系",
    description: "需要逐一绑定控制器与传感器；漏绑时没有明确提示。",
  },
  {
    title: "同步至网关",
    description: "把已完成的配置同步到网关；未同步的问题通常到后续环节才暴露。",
  },
  {
    title: "配置策略",
    description: "运行策略需在另一款小程序中设置，任务链再次切断。",
  },
] as const;

type SectionHeaderProps = {
  index: string;
  title: string;
  children?: React.ReactNode;
  className?: string;
};

function SectionHeader({
  index,
  title,
  children,
  className,
}: SectionHeaderProps) {
  const supportingContent = isValidElement(children)
    ? cloneElement(
        children as React.ReactElement<Record<string, unknown>>,
        {
          "data-entrance-item": true,
          "data-entrance-step": "support",
          "data-entrance-variant": "fade",
        },
      )
    : children;

  return (
    <EntranceSequence
      as="header"
      className={`${styles.sectionHeader} ${className ?? ""}`}
      name={`section-${index}-header`}
    >
      <div
        className={styles.sectionMeta}
        data-entrance-item
        data-entrance-step="identity"
        data-entrance-variant="fade"
      >
        <span>Implementation Assistant</span>
        <span>{index}/07</span>
      </div>
      <h2
        data-entrance-item
        data-entrance-step="title"
        data-entrance-variant="fade"
      >
        {title}
      </h2>
      {supportingContent}
    </EntranceSequence>
  );
}

export default function ImplementationAssistantPage() {
  return (
    <main className={styles.casePage}>
      {/* 顶部导航：全站统一版式（app/work/CaseNav），与首页 SiteNav 同一套
          三栏契约。首屏是整屏深色 Hero（data-case-hero），滚过之前导航自动
          切深色配色，滚过之后回浅色。 */}
      <CaseNav
        projectLabel="合一实施助手"
        darkHeroSelector="[data-case-hero]"
      />

      <section
        className={styles.hero}
        aria-labelledby="case-title"
        data-case-hero=""
      >
        <EntranceSequence
          className={styles.heroMedia}
          name="hero-media"
          selfStep="primary"
          selfVariant="content"
        >
          <Image
            src={`${assetBase}/hero-hand-phone.png`}
            alt="手持手机展示合一实施助手业务分区界面"
            width={1920}
            height={1440}
            priority
            sizes="(max-width: 900px) 100vw, 1221px"
          />
        </EntranceSequence>

        <EntranceSequence
          className={styles.heroContent}
          name="hero-copy"
        >
          <div className={styles.heroCopy}>
            <h1
              data-entrance-item
              data-entrance-step="title"
              data-entrance-variant="fade"
              style={{ "--entrance-delay": "0ms" } as CSSProperties}
              id="case-title"
            >
              <span>合一实施助手</span>
              <span>产品重构</span>
            </h1>
            <div
              className={styles.heroDescription}
              data-entrance-item
              data-entrance-step="support"
              data-entrance-variant="fade"
            >
              <p>把交付经验转化为每一步可执行的产品指引。</p>
              <p>
                面向智能空间现场交付人员的微信小程序，把空间搭建、设备组网、
                配置、绑定、同步与异常处理接成连续任务。
              </p>
            </div>
          </div>

          <dl
            className={styles.heroMeta}
            data-entrance-item
            data-entrance-step="secondary"
            data-entrance-variant="fade"
          >
            <div>
              <span className={styles.metaIcon} aria-hidden="true">
                <Image
                  src={`${assetBase}/role-icon.svg`}
                  alt=""
                  width={18}
                  height={18}
                />
              </span>
              <div>
                <dt>角色</dt>
                <dd>产品设计/UX/UI</dd>
              </div>
            </div>
            <div>
              <span className={styles.metaIcon} aria-hidden="true">
                <Image
                  src={`${assetBase}/date-icon.svg`}
                  alt=""
                  width={18}
                  height={18}
                />
              </span>
              <div>
                <dt>周期</dt>
                <dd>2026.03-2026.05</dd>
              </div>
            </div>
          </dl>
        </EntranceSequence>
      </section>

      <section className={styles.backgroundSection}>
        <SectionHeader index="01" title="项目背景" />

        <EntranceSequence className={styles.projectCards} name="section-01-cards">
          {projectCards.map((card, index) => (
            <article
              className={styles.projectCard}
              data-entrance-item
              data-entrance-step={index === 0 ? "primary" : `stagger-${index}`}
              data-entrance-variant="content"
              data-entrance-repeat="project"
              key={card.title}
              style={
                {
                  "--entrance-delay": `${420 + index * 120}ms`,
                } as CSSProperties
              }
            >
              <span className={styles.projectCardIcon} aria-hidden="true">
                <Image
                  src={`${assetBase}/${card.icon}`}
                  alt=""
                  width={18}
                  height={18}
                />
              </span>
              <div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </div>
            </article>
          ))}
        </EntranceSequence>
      </section>

      <section className={styles.problemSection}>
        <Image
          className={styles.sectionDivider}
          src={`${assetBase}/section-divider.svg`}
          alt=""
          width={1320}
          height={1}
          aria-hidden="true"
        />

        <div className={styles.whyGroup}>
          <SectionHeader index="02" title="为什么要重构？">
            <p className={styles.sectionIntro}>
              <strong>
                旧工具不断新增单点能力，产品结构却没有围绕完整交付任务重新组织。
              </strong>
              固件升级、Wi-Fi 配置、蓝牙组网、重启和信息查看分散在不同菜单与工具中。熟练员工靠经验找入口，新员工则需要现场指导。
            </p>
          </SectionHeader>

          <EntranceSequence
            className={styles.problemPanel}
            name="section-02-evidence"
          >
            <ol
              className={styles.problemSteps}
              data-entrance-item
              data-entrance-step="primary"
              data-entrance-variant="content"
            >
              {problemSteps.map((step, index) => (
                <li key={step.title}>
                  <span className={styles.problemTrack} aria-hidden="true">
                    <Image
                      src={`${assetBase}/problem-step-dot.svg`}
                      alt=""
                      width={16}
                      height={16}
                    />
                    {index < problemSteps.length - 1 ? (
                      <Image
                        className={styles.problemLine}
                        src={`${assetBase}/problem-step-line.svg`}
                        alt=""
                        width={16}
                        height={32}
                      />
                    ) : null}
                  </span>
                  <span className={styles.problemText}>
                    <strong>{step.title}</strong>
                    <span>{step.description}</span>
                  </span>
                </li>
              ))}
            </ol>

            <ProblemMotionScope className={styles.problemLabelGrid}>
              {problemLabels.map((label, index) => (
                <div
                  data-entrance-item
                  data-entrance-step={index === 0 ? "secondary" : `stagger-${index}`}
                  data-entrance-variant="content"
                  data-motion-card={problemVisuals[index]}
                  key={label}
                  style={
                    {
                      "--entrance-delay": `${560 + index * 120}ms`,
                      "--motion-offset": "0ms",
                    } as CSSProperties
                  }
                >
                  <span className={styles.problemCardTitle}>{label}</span>
                  <ProblemVisual kind={problemVisuals[index]} />
                </div>
              ))}
            </ProblemMotionScope>
          </EntranceSequence>
        </div>

      </section>

      <GuidedNextStep
        outgoing={
          <div className={styles.legacyTransitionContent}>
            <SectionHeader
              className={styles.legacyHeader}
              index="03"
              title="旧流程有多绕？"
            >
              <p className={styles.sectionIntro}>
                <strong>
                  完成一个房间配置，用户要在多个菜单和工具之间来回切换，还要自己记住正确顺序和检查点。
                </strong>
                真正增加交付难度的是反复切换和依赖记忆。
              </p>
            </SectionHeader>

            <EntranceSequence
              as="ol"
              className={styles.legacyFlow}
              name="section-03-flow"
              selfStep="primary"
              selfVariant="content"
            >
              {legacyFlow.map((step, index) => (
                <li
                  className={
                    index % 2 === 0 ? styles.flowTop : styles.flowBottom
                  }
                  key={step.title}
                >
                  <div className={styles.flowCopy}>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                  <div className={styles.flowMarker} aria-hidden="true">
                    <span>{index + 1}</span>
                    {index < legacyFlow.length - 1 ? (
                      <Image
                        src={`${assetBase}/timeline-connector.svg`}
                        alt=""
                        width={116}
                        height={1}
                      />
                    ) : null}
                  </div>
                </li>
              ))}
            </EntranceSequence>
          </div>
        }
      />

      <ContinuousTaskChain
        stageSlots={[
          <State01Evidence key="state-01-evidence" />,
          <State02Evidence key="state-02-evidence" />,
          <State03Evidence key="state-03-evidence" />,
        ]}
      />

      <OutcomeTransition
        incoming={<VerifiedOutcome />}
        outgoing={<KnowledgeBase />}
      />
      <DesignSpecShowcase />
    </main>
  );
}
