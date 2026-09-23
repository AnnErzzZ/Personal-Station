import Image from "@/components/SiteImage";

import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";

import { Chapter, SectionHeader } from "./CaseSection";
import { MAP_EDITOR_STEPS } from "./map-editor-steps";
import styles from "./sections.module.css";

/**
 * 09 / 12｜Key Design 04 · FROM FLOOR PLAN TO DIGITAL SPACE
 *
 * 构图（2026-09-22 22 时二次改版，用户指定）：标题 + 一句 Intro →
 * 5 格 Bento Grid（通用组件 components/ui/bento-grid.tsx，Aceternity
 * bento-grid 结构移植，CSS Module 版式，无 Tailwind）。
 * 2026-09-23（降噪）：编辑机制短注带、Outcome 与贡献边界、章末 Caption
 * 一并删除，本章收束于 5 格 Bento Grid。
 *
 * 5 步主线不变：空间底图 → 空间结构 → 设备位置 → 检测范围 → 发布，
 * 表达「数字空间建模」而非软件操作教程；步骤名用户逐字定稿，
 * 步骤数据见 map-editor-steps.ts。
 *
 * 素材（2026-09-23 用户提供）：5 张真实编辑界面截图，编号一一对应。
 * 每格上半部为素材图（next/image fill + object-fit:contain），
 * 边缘用 CSS mask 做四边羽化过渡（16px 渐隐到透明），与卡片背景
 * 自然融合。04 检测范围跨两列宽格（素材信息量最大），其余单列。
 */
export default function Section08MapEditor() {
  return (
    <Chapter id="section-08-digital-space" className={styles.chapterMapEditor}>
      <SectionHeader
        className={styles.headerCentered}
        index="09"
        total="12"
        title="搭建数字空间"
        intro="把现实空间配置进系统，需要同时处理位置、范围、对象和关系。"
      />

      <BentoGrid className={styles.bentoWrap}>
        {MAP_EDITOR_STEPS.map((step) => (
          <BentoGridItem
            key={step.id}
            data-section08-step={step.id}
            wide={step.id === "zones" || step.id === "publish"}
            header={
              <div
                className={styles.bentoMedia}
                data-section08-media={step.id}
              >
                <Image
                  className={styles.bentoMediaImg}
                  src={step.image.src}
                  alt={step.image.alt}
                  fill
                  sizes={
                    step.id === "zones" || step.id === "publish"
                      ? "(max-width: 720px) calc(100vw - 40px), (max-width: 1320px) calc(50vw - 32px), 572px"
                      : "(max-width: 720px) calc(100vw - 40px), (max-width: 1320px) calc(33vw - 48px), 376px"
                  }
                  unoptimized
                />
              </div>
            }
            title={
              <>
                <span className={styles.bentoStepIndex}>{step.index}</span>
                {step.title}
              </>
            }
            description={
              <span className={styles.bentoStepBody}>{step.body}</span>
            }
          />
        ))}
      </BentoGrid>

    </Chapter>
  );
}
