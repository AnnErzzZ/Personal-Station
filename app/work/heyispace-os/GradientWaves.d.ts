import type { ReactElement } from "react";

export type GradientWavesDetail = "low" | "medium" | "high";

export interface GradientWavesProps {
  /** 远处雾色，波浪向它淡出。 */
  horizonColor?: string;
  /** 波体中段颜色。 */
  waveColor?: string;
  /** 最近波峰的高光颜色。 */
  crestColor?: string;
  speed?: number;
  amplitude?: number;
  waveScale?: number;
  waveRatio?: number;
  swell?: number;
  turbulence?: number;
  /** 相机俯仰角（弧度）。 */
  tilt?: number;
  zoom?: number;
  /** 地平线垂直偏移。 */
  height?: number;
  /** 波浪淡入雾色的距离。 */
  fogDepth?: number;
  /** Raymarch 档位。 */
  detail?: GradientWavesDetail;
  brightness?: number;
  opacity?: number;
  mouseInteraction?: boolean;
  parallaxStrength?: number;
  grain?: boolean;
  grainIntensity?: number;
  className?: string;
}

declare function GradientWaves(props: GradientWavesProps): ReactElement;

export default GradientWaves;
