import type { HTMLAttributes, ReactNode } from "react";

import styles from "./bento-grid.module.css";

const cx = (...values: Array<string | false | undefined>) =>
  values.filter(Boolean).join(" ");

/**
 * Bento Grid（通用组件，CSS Module 自带样式，不依赖 Tailwind / shadcn）。
 *
 * 2026-09-22 为 heyispace-os 08 章地图编辑器五步移植 Aceternity UI
 * bento-grid 的结构：3 列网格 + 统一行高 + header 上 / 内容下 +
 * hover 抬升；颜色 / 圆角 / 阴影走案例页 `--cs-*` token（带回退值），
 * 由章节根级联进来。纯服务端组件，无交互状态。
 */

type BentoGridProps = HTMLAttributes<HTMLDivElement> & {
  [key: `data-${string}`]: string | undefined;
};

export function BentoGrid({ className, children, ...rest }: BentoGridProps) {
  return (
    <div className={cx(styles.bentoGrid, className)} {...rest}>
      {children}
    </div>
  );
}

type BentoGridItemProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  [key: `data-${string}`]: string | undefined;
  title?: ReactNode;
  description?: ReactNode;
  header?: ReactNode;
  icon?: ReactNode;
  /** 桌面端跨两列（≤720 单列时自动失效）。 */
  wide?: boolean;
};

export function BentoGridItem({
  className,
  title,
  description,
  header,
  icon,
  wide = false,
  ...rest
}: BentoGridItemProps) {
  return (
    <div
      className={cx(styles.bentoItem, wide && styles.bentoItemWide, className)}
      {...rest}
    >
      {header ? <div className={styles.bentoHeader}>{header}</div> : null}
      <div className={styles.bentoBody}>
        {icon ? <div className={styles.bentoIcon}>{icon}</div> : null}
        {title ? <h3 className={styles.bentoTitle}>{title}</h3> : null}
        {description ? (
          <div className={styles.bentoDescription}>{description}</div>
        ) : null}
      </div>
    </div>
  );
}
