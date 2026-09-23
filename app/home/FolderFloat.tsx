"use client";

import Matter from "matter-js";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";

import styles from "./FolderFloat.module.css";

const { Bodies, Body, Composite, Engine } = Matter;

export type FolderFloatItem =
  | string
  | {
      label: string;
      value: string;
      content?: ReactNode;
    };

export type FolderFloatTrigger = "hover" | "click";

export type FolderFloatProps = {
  items?: FolderFloatItem[];
  label?: string;
  sublabel?: string;
  trigger?: FolderFloatTrigger;
  open?: boolean;
  /** Keep the click-trigger preview visible while a parent shared-layout transition begins. */
  preview?: boolean;
  defaultOpen?: boolean;
  closeOnSelect?: boolean;
  physics?: boolean;
  drift?: number;
  variant?: "pills" | "projects";
  onSelect?: (value: string, index: number) => void;
  onOpenChange?: (open: boolean) => void;
  folderColor?: string;
  frontColor?: string;
  paperColor?: string;
  itemColor?: string;
  itemTextColor?: string;
  labelColor?: string;
  width?: number;
  height?: number;
  radius?: number;
  spread?: number;
  lift?: number;
  tilt?: number;
  flapAngle?: number;
  restAngle?: number;
  /** trigger="click" 时鼠标悬停的「半开」角度：介于 rest 与 flap 之间，示意里面有卡片。 */
  peekAngle?: number;
  openDuration?: number;
  stagger?: number;
  bounce?: number;
  className?: string;
};

type Entry = { label: string; value: string; content?: ReactNode };
type Size = { w: number; h: number };
type Zone = { left: number; right: number; top: number; bottom: number };
type Drag = {
  i: number;
  id: number;
  dx: number;
  dy: number;
  sx: number;
  sy: number;
  moved: boolean;
};
type World = {
  engine: Matter.Engine | null;
  bodies: Matter.Body[];
  sizes: Size[];
  raf: number;
  last: number;
  t0: number;
  drag: Drag | null;
  zone: Zone | null;
  live: boolean;
};
type Latest = {
  onSelect?: FolderFloatProps["onSelect"];
  onOpenChange?: FolderFloatProps["onOpenChange"];
  drift: number;
  reduce: boolean;
};

const DEFAULT_ITEMS: FolderFloatItem[] = [
  "Try a warmer palette",
  "Tighten the spacing",
  "Logo feels small",
  "Love the new hero",
];
const PAD = 28;
const CHAR = 6.8;
const GAP = 12;
const ROW = 52;
const DRAG_MIN = 4;
const ZONE_PAD = 8;

const jitter = (index: number) => {
  const x = Math.sin(index * 12.9898 + 4.1414) * 43758.5453;
  return x - Math.floor(x);
};

const layout = (
  list: Entry[],
  spread: number,
  lift: number,
  tilt: number,
  sizes: (Size | null)[],
) => {
  const rows: { items: { i: number; pw: number }[]; width: number }[] = [];
  let row: { i: number; pw: number }[] = [];
  let width = 0;

  list.forEach((item, index) => {
    const pillWidth = sizes[index]?.w ?? PAD + item.label.length * CHAR;
    if (row.length && width + GAP + pillWidth > spread * 2) {
      rows.push({ items: row, width });
      row = [];
      width = 0;
    }
    row.push({ i: index, pw: pillWidth });
    width += (row.length > 1 ? GAP : 0) + pillWidth;
  });
  if (row.length) rows.push({ items: row, width });

  const positions: { x: number; y: number; r: number }[] = [];
  rows.forEach((currentRow, rowIndex) => {
    let x = -currentRow.width / 2;
    const shift =
      (rowIndex % 2 ? 1 : -1) * Math.min(16, spread * 0.1);
    currentRow.items.forEach(({ i, pw }) => {
      const noise = jitter(i);
      positions[i] = {
        x: x + pw / 2 + shift + (noise - 0.5) * 6,
        y: -lift - rowIndex * ROW - noise * 6,
        r: tilt * (noise * 2 - 1),
      };
      x += pw + GAP;
    });
  });
  return positions;
};

export default function FolderFloat({
  items = DEFAULT_ITEMS,
  label = "Design feedback",
  sublabel = "",
  trigger = "hover",
  open: controlledOpen,
  preview = false,
  defaultOpen = false,
  closeOnSelect = true,
  physics = true,
  drift = 0.5,
  variant = "pills",
  onSelect,
  onOpenChange,
  folderColor = "#3f3f46",
  frontColor = "#52525b",
  paperColor = "#f5f5f5",
  itemColor = "#f5f5f5",
  itemTextColor = "#18181b",
  labelColor = "#f5f5f5",
  width = 200,
  height = 148,
  radius = 14,
  spread = 180,
  lift = 26,
  tilt = 8,
  flapAngle = 34,
  restAngle = 16,
  peekAngle = 24,
  openDuration = 520,
  stagger = 45,
  bounce = 0.3,
  className = "",
}: FolderFloatProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [popped, setPopped] = useState(-1);
  const [peek, setPeek] = useState(false);
  const [live, setLive] = useState(false);
  const [sizes, setSizes] = useState<Size[]>([]);
  const open = controlledOpen ?? internalOpen;
  const anchorRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const world = useRef<World>({
    engine: null,
    bodies: [],
    sizes: [],
    raf: 0,
    last: 0,
    t0: 0,
    drag: null,
    zone: null,
    live: false,
  });
  const latest = useRef<Latest>({ drift, reduce: false });
  const popTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const liveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const list: Entry[] = useMemo(
    () =>
      items.map((item) =>
        typeof item === "string" ? { label: item, value: item } : item,
      ),
    [items],
  );
  const count = list.length;
  const sub = sublabel || `${count} ${count === 1 ? "note" : "notes"}`;
  const labelsKey = list.map((item) => item.label).join("|");
  const positions = useMemo(
    () => layout(list, spread, lift, tilt, sizes),
    [lift, list, sizes, spread, tilt],
  );

  useEffect(() => {
    latest.current = {
      ...latest.current,
      onSelect,
      onOpenChange,
      drift,
    };
  }, [drift, onOpenChange, onSelect]);

  useLayoutEffect(() => {
    const measure = () => {
      const next = itemRefs.current
        .slice(0, count)
        .map((element) =>
          element ? { w: element.offsetWidth, h: element.offsetHeight } : null,
        );
      if (next.some((size) => !size)) return;
      const sized = next as Size[];

      setSizes((previous) =>
        previous.length === sized.length &&
        previous.every(
          (size, index) =>
            size.w === sized[index].w && size.h === sized[index].h,
        )
          ? previous
          : sized,
      );
    };
    measure();
    void document.fonts?.ready.then(measure);
  }, [count, labelsKey]);

  const stopPhysics = useCallback(() => {
    const currentWorld = world.current;
    clearTimeout(liveTimer.current);
    cancelAnimationFrame(currentWorld.raf);
    currentWorld.raf = 0;
    if (currentWorld.engine) {
      currentWorld.bodies.forEach((body, index) => {
        const element = itemRefs.current[index];
        if (!element) return;
        element.style.setProperty("--x", `${body.position.x.toFixed(1)}px`);
        element.style.setProperty(
          "--y",
          `${(body.position.y - currentWorld.sizes[index].h / 2).toFixed(1)}px`,
        );
      });
      Composite.clear(currentWorld.engine.world, false, true);
      Engine.clear(currentWorld.engine);
      currentWorld.engine = null;
    }
    currentWorld.bodies = [];
    currentWorld.drag = null;
    currentWorld.live = false;
    setLive(false);
  }, []);

  const startPhysics = useCallback(() => {
    const currentWorld = world.current;
    if (currentWorld.engine || variant === "projects") return;
    const elements = itemRefs.current.slice(0, count);
    if (elements.some((element) => !element)) return;
    const engine = Engine.create({ gravity: { x: 0, y: 0 } });
    engine.enableSleeping = false;
    currentWorld.engine = engine;
    currentWorld.sizes = (elements as HTMLElement[]).map((element) => ({
      w: element.offsetWidth,
      h: element.offsetHeight,
    }));
    const ys = positions.map((position) => position.y);
    const zone = {
      left: -spread - ZONE_PAD,
      right: spread + ZONE_PAD,
      top: Math.min(...ys) - ZONE_PAD,
      bottom: -lift + Math.max(...currentWorld.sizes.map((size) => size.h)),
    };
    currentWorld.zone = zone;
    currentWorld.bodies = (elements as HTMLElement[]).map((element, index) => {
      const { w: bodyWidth, h: bodyHeight } = currentWorld.sizes[index];
      const body = Bodies.rectangle(
        positions[index].x,
        positions[index].y + bodyHeight / 2,
        bodyWidth,
        bodyHeight,
        {
          chamfer: { radius: Math.min(bodyHeight / 2 - 1, 16) },
          restitution: 0.55,
          friction: 0,
          frictionAir: 0.08,
          inertia: Infinity,
        },
      );
      body.plugin = { phase: jitter(index) * Math.PI * 2 };
      return body;
    });
    const wallThickness = 80;
    const walls = [
      Bodies.rectangle(
        (zone.left + zone.right) / 2,
        zone.top - wallThickness / 2,
        zone.right - zone.left + 2 * wallThickness,
        wallThickness,
        { isStatic: true },
      ),
      Bodies.rectangle(
        (zone.left + zone.right) / 2,
        zone.bottom + wallThickness / 2,
        zone.right - zone.left + 2 * wallThickness,
        wallThickness,
        { isStatic: true },
      ),
      Bodies.rectangle(
        zone.left - wallThickness / 2,
        (zone.top + zone.bottom) / 2,
        wallThickness,
        zone.bottom - zone.top + 2 * wallThickness,
        { isStatic: true },
      ),
      Bodies.rectangle(
        zone.right + wallThickness / 2,
        (zone.top + zone.bottom) / 2,
        wallThickness,
        zone.bottom - zone.top + 2 * wallThickness,
        { isStatic: true },
      ),
    ];
    Composite.add(engine.world, [...currentWorld.bodies, ...walls]);
    currentWorld.live = true;
    currentWorld.last = 0;
    currentWorld.t0 = 0;
    setLive(true);

    const tick = (now: number) => {
      const activeWorld = world.current;
      if (!activeWorld.engine) return;
      if (activeWorld.t0 === 0) activeWorld.t0 = now;
      const delta = activeWorld.last
        ? Math.min(32, now - activeWorld.last)
        : 16;
      activeWorld.last = now;
      const time = (now - activeWorld.t0) / 1000;
      const force = latest.current.drift * 0.00005 * Math.min(1, time / 2);
      activeWorld.bodies.forEach((body, index) => {
        if (activeWorld.drag?.i === index) return;
        const phase = (body.plugin as { phase: number }).phase;
        Body.applyForce(body, body.position, {
          x: Math.sin(time * 0.9 + phase) * force * body.mass,
          y: Math.cos(time * 1.3 + phase * 1.7) * force * body.mass,
        });
      });
      Engine.update(activeWorld.engine, delta);
      activeWorld.bodies.forEach((body, index) => {
        const element = itemRefs.current[index];
        if (!element) return;
        element.style.setProperty("--x", `${body.position.x.toFixed(1)}px`);
        element.style.setProperty(
          "--y",
          `${(body.position.y - activeWorld.sizes[index].h / 2).toFixed(1)}px`,
        );
      });
      activeWorld.raf = requestAnimationFrame(tick);
    };
    currentWorld.raf = requestAnimationFrame(tick);
  }, [count, lift, positions, spread, variant]);

  const set = useCallback(
    (next: boolean) => {
      if (!next) stopPhysics();
      if (controlledOpen === undefined) setInternalOpen(next);
      if (open !== next) latest.current.onOpenChange?.(next);
    },
    [controlledOpen, open, stopPhysics],
  );

  useEffect(() => {
    clearTimeout(liveTimer.current);
    if (!open || !physics || latest.current.reduce || variant === "projects") {
      stopPhysics();
      return undefined;
    }
    liveTimer.current = setTimeout(
      startPhysics,
      openDuration + (count - 1) * stagger + 80,
    );
    return () => clearTimeout(liveTimer.current);
  }, [
    count,
    open,
    openDuration,
    physics,
    stagger,
    startPhysics,
    stopPhysics,
    variant,
  ]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      latest.current.reduce = mediaQuery.matches;
    };
    sync();
    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  useEffect(
    () => () => {
      clearTimeout(popTimer.current);
      stopPhysics();
    },
    [stopPhysics],
  );

  const pick = (item: Entry, index: number) => {
    latest.current.onSelect?.(item.value, index);
    clearTimeout(popTimer.current);
    setPopped(index);
    popTimer.current = setTimeout(() => setPopped(-1), 320);
    if (closeOnSelect) set(false);
  };

  const pointerAt = (event: PointerEvent<HTMLElement>) => {
    const rect = anchorRef.current?.getBoundingClientRect();
    return rect
      ? { x: event.clientX - rect.left, y: event.clientY - rect.top }
      : { x: 0, y: 0 };
  };

  const down = (event: PointerEvent<HTMLElement>, index: number) => {
    const currentWorld = world.current;
    if (!currentWorld.live || event.button !== 0) return;
    const body = currentWorld.bodies[index];
    if (!body) return;
    const point = pointerAt(event);
    currentWorld.drag = {
      i: index,
      id: event.pointerId,
      dx: body.position.x - point.x,
      dy: body.position.y - point.y,
      sx: event.clientX,
      sy: event.clientY,
      moved: false,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {}
  };

  const move = (event: PointerEvent<HTMLElement>, index: number) => {
    const currentWorld = world.current;
    const drag = currentWorld.drag;
    if (!drag || drag.i !== index || drag.id !== event.pointerId) return;
    if (
      !drag.moved &&
      Math.hypot(event.clientX - drag.sx, event.clientY - drag.sy) >= DRAG_MIN
    ) {
      drag.moved = true;
      event.currentTarget.setAttribute("data-drag", "");
    }
    if (!drag.moved) return;
    const body = currentWorld.bodies[index];
    const { w: bodyWidth, h: bodyHeight } = currentWorld.sizes[index];
    const zone = currentWorld.zone as Zone;
    const point = pointerAt(event);
    const x = Math.min(
      zone.right - bodyWidth / 2,
      Math.max(zone.left + bodyWidth / 2, point.x + drag.dx),
    );
    const y = Math.min(
      zone.bottom - bodyHeight / 2,
      Math.max(zone.top + bodyHeight / 2, point.y + drag.dy),
    );
    Body.setVelocity(body, {
      x: (x - body.position.x) * 0.6,
      y: (y - body.position.y) * 0.6,
    });
    Body.setPosition(body, { x, y });
  };

  const up = (
    event: PointerEvent<HTMLElement>,
    index: number,
    item: Entry,
  ) => {
    const currentWorld = world.current;
    const drag = currentWorld.drag;
    if (!drag || drag.i !== index || drag.id !== event.pointerId) return;
    currentWorld.drag = null;
    event.currentTarget.removeAttribute("data-drag");
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {}
    if (!drag.moved && event.type === "pointerup") pick(item, index);
  };

  const hover = trigger === "hover";
  const peeking = (peek || preview) && !open;
  const rootStyle = {
    "--ff-w": `${width}px`,
    "--ff-h": `${height}px`,
    "--ff-r": `${radius}px`,
    "--ff-back": folderColor,
    "--ff-front": frontColor,
    "--ff-paper": paperColor,
    "--ff-item": itemColor,
    "--ff-item-ink": itemTextColor,
    "--ff-label": labelColor,
    "--ff-spread": `${spread}px`,
    "--ff-lift": `${lift}px`,
    "--ff-angle": `${flapAngle}deg`,
    "--ff-rest": `${restAngle}deg`,
    "--ff-peek": `${peekAngle}deg`,
    "--ff-open": `${openDuration}ms`,
    "--ff-close": `${Math.round(openDuration * 0.6)}ms`,
    "--ff-stagger": `${stagger}ms`,
    "--ff-n": count,
    "--ff-spring": `cubic-bezier(0.34, ${(1 + bounce * 1.9).toFixed(2)}, 0.64, 1)`,
  } as CSSProperties;

  return (
    <div
      className={`${styles.root}${className ? ` ${className}` : ""}`}
      data-open={open ? "" : undefined}
      data-peek={peeking ? "" : undefined}
      data-live={live ? "" : undefined}
      data-physics={physics ? "" : undefined}
      data-trigger={trigger}
      data-variant={variant}
      onPointerEnter={
        hover
          ? () => set(true)
          : () => {
              if (!open) setPeek(true);
            }
      }
      onPointerLeave={
        hover
          ? () => {
              if (!world.current.drag) set(false);
            }
          : () => setPeek(false)
      }
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          set(false);
        }
      }}
      style={rootStyle}
    >
      <div className={styles.cardsClip} data-folder-cards-clip="">
        <div ref={anchorRef} className={styles.items} data-folder-items="">
          {list.map((item, index) => {
            const position = positions[index] ?? { x: 0, y: 0, r: 0 };
            const itemStyle = {
              "--i": index,
              "--x": `${position.x.toFixed(1)}px`,
              "--y": `${position.y.toFixed(1)}px`,
              "--r": `${position.r.toFixed(2)}deg`,
            } as CSSProperties;

            if (item.content) {
              return (
                <div
                  key={`${item.value}-${index}`}
                  ref={(element) => {
                    itemRefs.current[index] = element;
                  }}
                  className={styles.item}
                  data-index={index}
                  data-work-project-card=""
                  aria-hidden={!open}
                  inert={!open}
                  style={itemStyle}
                >
                  <div className={styles.drift}>{item.content}</div>
                </div>
              );
            }

            return (
              <button
                key={`${item.value}-${index}`}
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                type="button"
                className={styles.item}
                tabIndex={open ? 0 : -1}
                aria-hidden={!open}
                data-index={index}
                data-pop={popped === index ? "" : undefined}
                style={itemStyle}
                onPointerDown={(event) => down(event, index)}
                onPointerMove={(event) => move(event, index)}
                onPointerUp={(event) => up(event, index, item)}
                onPointerCancel={(event) => up(event, index, item)}
                onClick={(event) => {
                  if (!world.current.live || event.detail === 0) pick(item, index);
                }}
              >
                <span className={styles.drift}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.folder}>
        <span className={styles.back} data-folder-back="" aria-hidden="true" />
        <span className={styles.paper} aria-hidden="true" />
        <span className={styles.front} data-folder-front="" aria-hidden="true">
          <span className={styles.label}>{label}</span>
          <span className={styles.sub}>{sub}</span>
        </span>
        <button
          type="button"
          className={styles.trigger}
          aria-expanded={open}
          aria-label={`${label}, ${sub}`}
          data-work-folder-trigger=""
          onClick={() => set(!open)}
        />
      </div>
    </div>
  );
}
