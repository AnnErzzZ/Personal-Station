import styles from "./AuroraBackground.module.css";

export type AuroraBackgroundProps = {
  /** 额外类名，用来在调用处控制位置与尺寸。 */
  className?: string;
  /** 是否使用右上角的径向遮罩，让极光只在角落附近出现。 */
  showRadialGradient?: boolean;
};

/**
 * Aceternity UI 的 Aurora Background。
 *
 * 原始版本是一个 `h-[100vh]` 的整屏容器（自带 bg-zinc-50 与居中布局）；
 * 本项目把它当 Hero 的背景层用，所以只保留极光本身：外层铺满父容器、
 * 不吃指针事件，内容仍由调用方自己排版。
 */
export const AuroraBackground = ({
  className,
  showRadialGradient = true,
}: AuroraBackgroundProps) => (
  <div
    aria-hidden="true"
    className={[styles.aurora, showRadialGradient ? styles.radial : "", className]
      .filter(Boolean)
      .join(" ")}
  >
    <div className={styles.layer} />
  </div>
);

export default AuroraBackground;
