/**
 * Hero 柴犬视频的交互参数 —— 全部集中在这里，调手感只改这个文件。
 *
 * 视频时间轴（已用抽帧核对）：
 *   0–1s   正面        → center: 0.8
 *   1.5–3s 向画面左侧看 → left:   2.4
 *   3.5–4.6s 抬头      → up:     4.1
 *   5.0–6.5s 向右看    → right:  5.6
 *   7.0–8.5s 低头      → down:   7.7
 *   9.2s+  恢复正面
 */

import { siteAsset } from "@/lib/site-asset";

export const VIDEO_SRC = siteAsset("/videos/home-hero-interactive.mp4");
export const VIDEO_POSTER = siteAsset("/videos/home-hero-poster.jpg");

/** 五个关键姿态在时间轴上的位置（秒）。 */
export const POSE_TIME = {
  center: 0.8,
  left: 2.4,
  up: 4.1,
  right: 5.6,
  down: 7.7,
} as const;

export type PoseName = keyof typeof POSE_TIME;

/** 中心死区半径（归一化坐标，页面中心为原点，0.5 = 半个视口）。 */
export const CENTER_DEAD_ZONE = 0.18;

/** 死区外圈到该半径之间，目标姿态从「正面」线性过渡到「方向姿态」，
 *  避免跨越死区边界时目标在 0.8s 和 2~7s 之间反复跳。 */
export const DEAD_ZONE_BLEND = 0.16;

/** true  = 鼠标角度 → 时间轴连续映射（左↗上↘右↙下之间插值），边界天然平滑；
 *  false = 五状态 + 迟滞的基础版。稳定优先，出问题可一键回退。 */
export const CONTINUOUS_ANGLE = true;

/**
 * 桌面端（hover: hover + pointer: fine）的播放形态。两者互斥，只能选一个：
 *
 * - "interactive"：加载后 pause()，鼠标位置驱动 currentTime，柴犬视线跟随鼠标。
 * - "loop"：与移动端一致，autoplay + muted + loop 常速循环播放。
 *
 * 为什么不共存：autoplay 和 seek 会同时抢 currentTime，画面会在"自己播"和"被拖"之间打架。
 * 移动端与 prefers-reduced-motion 不受此项影响，仍分别走 loop / static。
 */
export const DESKTOP_MODE: "interactive" | "loop" = "interactive";

/** 五状态模式的切换迟滞（度）：新方向的角度距离要比当前方向小这么多才切换。 */
export const SWITCH_HYSTERESIS_DEG = 8;

/** 指数趋近时间常数（毫秒）。约 3×tau 达到 95%，110ms ≈ 330ms 完成一次转头，
 *  落在 250–600ms 的目标区间内。 */
export const SEEK_TAU_MS = 110;

/** 单次 currentTime 写入的最大时间轴跨度（秒），防止远距离目标首帧瞬移。 */
export const MAX_SEEK_STEP = 0.45;

/** currentTime 写入节流（毫秒），≈30fps，别盲写 120 次/秒。 */
export const SEEK_INTERVAL_MS = 34;

/** 上一次 seek 超过这么久还没完成就允许覆盖（避免慢解码器把动作卡死）。 */
export const SEEK_STALE_MS = 120;

/** 距目标小于该值（秒）视为到位：吸附一次并停止写入。 */
export const SEEK_SNAP = 0.02;

/** 视频总时长兜底值（loadedmetadata 之前用不到 seek，仅作类型兜底）。 */
export const VIDEO_DURATION_FALLBACK = 10.08;
