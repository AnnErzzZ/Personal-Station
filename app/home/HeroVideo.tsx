"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  CENTER_DEAD_ZONE,
  CONTINUOUS_ANGLE,
  DEAD_ZONE_BLEND,
  DESKTOP_MODE,
  MAX_SEEK_STEP,
  POSE_TIME,
  SEEK_INTERVAL_MS,
  SEEK_SNAP,
  SEEK_STALE_MS,
  SEEK_TAU_MS,
  SWITCH_HYSTERESIS_DEG,
  VIDEO_DURATION_FALLBACK,
  VIDEO_POSTER,
  VIDEO_SRC,
  type PoseName,
} from "./hero-video-config";
import styles from "./hero-video.module.css";

type Direction = Exclude<PoseName, "center">;
type Mode = "interactive" | "loop" | "static";

/** 各方向姿态对应的角度（度）：0=右，90=上，±180=左，-90=下。 */
const POSE_ANGLE: Record<Direction, number> = {
  right: 0,
  up: 90,
  left: 180,
  down: -90,
};

const DIRECTIONS = Object.keys(POSE_ANGLE) as Direction[];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** 两个角度的最短环绕距离（度）。 */
function angularDistance(a: number, b: number) {
  const diff = Math.abs(((a - b) % 360) + 360) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/**
 * 鼠标角度 → 时间轴连续映射。
 * 视频姿态沿时间轴排布为 左(2.4)→上(4.1)→右(5.6)→下(7.7)，
 * 角度上相邻的两个姿态之间做线性插值，鼠标沿页面边缘绕圈时柴犬连续转头。
 * -180°/180° 都落在 left，映射天然闭合。
 */
function angleToPoseTime(angleDeg: number): number {
  if (angleDeg >= 90) return lerp(POSE_TIME.up, POSE_TIME.left, (angleDeg - 90) / 90);
  if (angleDeg >= 0) return lerp(POSE_TIME.right, POSE_TIME.up, angleDeg / 90);
  if (angleDeg >= -90) return lerp(POSE_TIME.down, POSE_TIME.right, (angleDeg + 90) / 90);
  return lerp(POSE_TIME.left, POSE_TIME.down, (angleDeg + 180) / 90);
}

/** 基础版：离哪个姿态角度最近就是哪个方向（迟滞在调用处处理）。 */
function nearestDirection(angleDeg: number): Direction {
  let best: Direction = "right";
  let bestDist = Infinity;
  for (const dir of DIRECTIONS) {
    const dist = angularDistance(angleDeg, POSE_ANGLE[dir]);
    if (dist < bestDist) {
      bestDist = dist;
      best = dir;
    }
  }
  return best;
}

/**
 * 首页 Hero 的柴犬视频。
 *
 * - 桌面端（hover: hover + pointer: fine）：默认暂停视频，鼠标位置驱动
 *   video.currentTime 平滑 scrub，柴犬视线跟随鼠标；
 * - 移动端：muted + loop + playsInline 普通循环播放；
 * - prefers-reduced-motion：停留在正面姿势，不做任何持续动画。
 *
 * 桌面端改为常速循环播放只需把 hero-video-config.ts 的 DESKTOP_MODE 改成 "loop"。
 *
 * 本组件不产生逐帧 React 渲染：指针/动画状态全部走 ref + rAF。
 * className 用于承接调用处的层级样式（如 home.module.css 的 heroAurora）。
 * 播放形态写在宿主节点的 data-mode 上（interactive | loop | static）。
 */
export default function HeroVideo({ className = "" }: { className?: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const modeRef = useRef<Mode>("static");
  const pointerRef = useRef({ x: 0, y: 0, has: false });
  const leavingRef = useRef(false);
  const directionRef = useRef<Direction>("left");

  // Hero 是否仍在视口内（自然滚动版，替代原分页系统的 activeSection）：
  // 交互 rAF / 指针监听 / 循环播放都以此门控，滚出首屏即停算。
  const [heroActive, setHeroActive] = useState(true);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const io = new IntersectionObserver(
      (entries) => setHeroActive(entries.some((entry) => entry.isIntersecting)),
      { threshold: 0.2 },
    );
    io.observe(stage);
    return () => io.disconnect();
  }, []);

  // 挂载：判定播放模式并初始化视频。
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fineHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let mode: Mode;
    if (reduced) mode = "static";
    else if (fineHover && DESKTOP_MODE === "interactive") mode = "interactive";
    else mode = "loop";
    modeRef.current = mode;
    // 播放形态自证：验收脚本与调试直接读 data-mode，不必反推媒体查询。
    if (stageRef.current) stageRef.current.dataset.mode = mode;
    // 声明式 autoPlay 只对 loop 成立：interactive / static 必须保持 false，
    // 否则浏览器会先自己播一段再被 pause，出现"先播 → 突然 seek 回正面"的跳动。
    video.autoplay = mode === "loop";

    const markReady = () => {
      if (stageRef.current) stageRef.current.dataset.ready = "true";
    };

    const onLoadedData = () => {
      if (mode === "loop") {
        void video.play().catch(() => {});
      } else {
        // interactive / static：不开 autoplay，停在正面姿势等鼠标接管。
        video.pause();
        video.currentTime = POSE_TIME.center;
      }
      markReady();
    };

    video.addEventListener("loadeddata", onLoadedData);
    // bfcache 恢复等场景下视频可能早就 ready。
    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) onLoadedData();

    if (mode === "loop") void video.play().catch(() => {});

    return () => video.removeEventListener("loadeddata", onLoadedData);
  }, []);

  // 桌面交互模式：Hero 处于激活 Section 时才跑 rAF 与指针监听。
  useEffect(() => {
    if (!heroActive) return;
    if (modeRef.current !== "interactive") return;
    const video = videoRef.current;
    if (!video) return;

    let raf = 0;
    let lastWrite = -Infinity;
    let settled = true;

    const tick = (now: number) => {
      raf = window.requestAnimationFrame(tick);
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

      // ---- 目标时间：指针 → 归一化坐标 → 死区/角度 → 时间轴位置 ----
      let target: number = POSE_TIME.center;
      const pointer = pointerRef.current;
      if (pointer.has && !leavingRef.current) {
        const nx = (pointer.x / window.innerWidth - 0.5) * 2;
        const ny = (pointer.y / window.innerHeight - 0.5) * 2;
        const radius = Math.hypot(nx, ny);
        if (radius >= CENTER_DEAD_ZONE) {
          // 屏幕坐标 y 向下为正；转成数学角度后上方为 +90°。
          const angle = (Math.atan2(-ny, nx) * 180) / Math.PI;
          if (CONTINUOUS_ANGLE) {
            const poseTime = angleToPoseTime(angle);
            const blend = smoothstep(
              CENTER_DEAD_ZONE,
              CENTER_DEAD_ZONE + DEAD_ZONE_BLEND,
              radius,
            );
            target = lerp(POSE_TIME.center, poseTime, blend);
          } else {
            const candidate = nearestDirection(angle);
            const currentDir = directionRef.current;
            if (candidate !== currentDir) {
              // 迟滞：新方向要比当前方向近 SWITCH_HYSTERESIS_DEG 以上才切换，
              // 避免 45° 分界线附近左右横跳。
              const candidateDist = angularDistance(angle, POSE_ANGLE[candidate]);
              const currentDist = angularDistance(angle, POSE_ANGLE[currentDir]);
              if (candidateDist + SWITCH_HYSTERESIS_DEG < currentDist) {
                directionRef.current = candidate;
              }
            }
            target = POSE_TIME[directionRef.current];
          }
        }
      }

      // ---- 平滑 seek：跟随真实播放位置的相对趋近 ----
      // 关键：以 video.currentTime（解码器真实位置）为基准逐步逼近目标，而不是维护一个
      // 跑在前面的"模型时间"。写得太密会不停取消未完成的 seek，净吞吐反而暴跌、最后停在
      // 错误姿势；这里要求上一帧 seek 已完成（或已陈旧）才写下一次。
      const sinceWrite = now - lastWrite;
      if (sinceWrite < SEEK_INTERVAL_MS) return;
      if (video.seeking && sinceWrite < SEEK_STALE_MS) return;

      const currentTime = video.currentTime;
      const diff = target - currentTime;

      if (Math.abs(diff) <= SEEK_SNAP) {
        if (!settled) {
          settled = true;
          video.currentTime = target;
          lastWrite = now;
        }
        return;
      }

      settled = false;
      // 指数趋近系数按"距上次写入的真实时长"算，避免 RAF 频率与写入频率不一致时变慢。
      const elapsed = Math.min(sinceWrite, 200);
      const ratio = 1 - Math.exp(-elapsed / SEEK_TAU_MS);
      const step = clamp(diff * ratio, -MAX_SEEK_STEP, MAX_SEEK_STEP);
      const duration =
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : VIDEO_DURATION_FALLBACK;
      video.currentTime = clamp(currentTime + step, 0, duration);
      lastWrite = now;
    };

    const onPointerMove = (event: PointerEvent) => {
      pointerRef.current = { x: event.clientX, y: event.clientY, has: true };
      leavingRef.current = false;
    };
    // 鼠标离开浏览器窗口 / 窗口失焦：目标回到正面（仍走平滑 seek，不瞬跳）。
    const onLeave = () => {
      leavingRef.current = true;
    };

    raf = window.requestAnimationFrame(tick);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    window.addEventListener("blur", onLeave);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, [heroActive]);

  // 移动端循环模式：Hero 不在激活 Section 时暂停，省电省 CPU。
  useEffect(() => {
    if (modeRef.current !== "loop") return;
    const video = videoRef.current;
    if (!video) return;
    if (heroActive) {
      if (video.paused) void video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [heroActive]);

  return (
    <div
      ref={stageRef}
      className={[styles.stage, className].filter(Boolean).join(" ")}
      data-ready="false"
      aria-hidden="true"
    >
      <video
        ref={videoRef}
        className={styles.video}
        src={VIDEO_SRC}
        poster={VIDEO_POSTER}
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        tabIndex={-1}
      />
    </div>
  );
}
