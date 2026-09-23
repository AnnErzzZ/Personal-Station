"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { siteAsset } from "@/lib/site-asset";
import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useRef,
  useState,
} from "react";

import styles from "./pill-nav.module.css";

gsap.registerPlugin(useGSAP);

export type PillNavItem = {
  label: string;
  href: string;
  ariaLabel?: string;
};

type PillNavProps = {
  logo?: string;
  logoAlt?: string;
  items: readonly PillNavItem[];
  activeHref?: string;
  className?: string;
  ease?: string;
  baseColor?: string;
  pillColor?: string;
  hoveredPillTextColor?: string;
  pillTextColor?: string;
  onNavigate?: (
    item: PillNavItem,
    event: ReactMouseEvent<HTMLAnchorElement>,
  ) => void;
  onMobileMenuClick?: () => void;
  initialLoadAnimation?: boolean;
};

type PillNavCssVars = CSSProperties & {
  "--base": string;
  "--pill-bg": string;
  "--hover-text": string;
  "--pill-text": string;
};

export default function PillNav({
  logo,
  logoAlt = "Logo",
  items,
  activeHref,
  className = "",
  ease = "power3.out",
  baseColor = "#111113",
  pillColor = "#ffffff",
  hoveredPillTextColor = "#ffffff",
  pillTextColor,
  onNavigate,
  onMobileMenuClick,
  initialLoadAnimation = true,
}: PillNavProps) {
  const resolvedPillTextColor = pillTextColor ?? baseColor;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const circleRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const timelineRefs = useRef<Array<gsap.core.Timeline | null>>([]);
  const activeTweenRefs = useRef<Array<gsap.core.Tween | null>>([]);
  const logoImageRef = useRef<HTMLImageElement>(null);
  const logoTweenRef = useRef<gsap.core.Tween | null>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const navItemsRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLAnchorElement>(null);
  const reducedMotionRef = useRef(false);

  useGSAP(
    (_context, contextSafe) => {
      let mounted = true;
      reducedMotionRef.current = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      const layout = () => {
        if (!mounted) return;
        circleRefs.current.forEach((circle, index) => {
          if (!circle?.parentElement) return;

          const pill = circle.parentElement;
          const { width, height } = pill.getBoundingClientRect();
          const radius = ((width * width) / 4 + height * height) / (2 * height);
          const diameter = Math.ceil(2 * radius) + 2;
          const delta =
            Math.ceil(
              radius -
                Math.sqrt(Math.max(0, radius * radius - (width * width) / 4)),
            ) + 1;
          const originY = diameter - delta;
          const label = pill.querySelector<HTMLElement>("[data-pill-label]");
          const hoverLabel = pill.querySelector<HTMLElement>(
            "[data-pill-label-hover]",
          );

          circle.style.width = `${diameter}px`;
          circle.style.height = `${diameter}px`;
          circle.style.bottom = `-${delta}px`;

          gsap.set(circle, {
            xPercent: -50,
            scale: 0,
            transformOrigin: `50% ${originY}px`,
          });
          if (label) gsap.set(label, { y: 0 });
          if (hoverLabel) gsap.set(hoverLabel, { y: height + 12, opacity: 0 });

          timelineRefs.current[index]?.kill();
          timelineRefs.current[index] = null;
          if (reducedMotionRef.current) return;

          const timeline = gsap.timeline({ paused: true });
          timeline.to(
            circle,
            {
              scale: 1.2,
              xPercent: -50,
              duration: 2,
              ease,
              overwrite: "auto",
            },
            0,
          );
          if (label) {
            timeline.to(
              label,
              { y: -(height + 8), duration: 2, ease, overwrite: "auto" },
              0,
            );
          }
          if (hoverLabel) {
            gsap.set(hoverLabel, { y: Math.ceil(height + 100), opacity: 0 });
            timeline.to(
              hoverLabel,
              { y: 0, opacity: 1, duration: 2, ease, overwrite: "auto" },
              0,
            );
          }
          timelineRefs.current[index] = timeline;
        });
      };

      const safeLayout = contextSafe ? contextSafe(layout) : layout;
      layout();
      window.addEventListener("resize", safeLayout);
      document.fonts?.ready.then(safeLayout).catch(() => undefined);

      const menu = mobileMenuRef.current;
      if (menu) gsap.set(menu, { visibility: "hidden", opacity: 0, y: 10 });

      if (initialLoadAnimation && !reducedMotionRef.current) {
        if (logoRef.current) {
          gsap.fromTo(
            logoRef.current,
            { scale: 0 },
            { scale: 1, duration: 0.6, ease },
          );
        }
        if (navItemsRef.current) {
          gsap.fromTo(
            navItemsRef.current,
            { width: 0, overflow: "hidden" },
            { width: "auto", duration: 0.6, ease, clearProps: "overflow" },
          );
        }
      }

      return () => {
        mounted = false;
        window.removeEventListener("resize", safeLayout);
        timelineRefs.current.forEach((timeline) => timeline?.kill());
        activeTweenRefs.current.forEach((tween) => tween?.kill());
        logoTweenRef.current?.kill();
      };
    },
    {
      dependencies: [ease, initialLoadAnimation, items],
      revertOnUpdate: true,
      scope: containerRef,
    },
  );

  const animateMobileMenu = useCallback(
    (open: boolean) => {
      const hamburger = hamburgerRef.current;
      const menu = mobileMenuRef.current;
      const duration = reducedMotionRef.current ? 0 : open ? 0.3 : 0.2;

      if (hamburger) {
        const lines = hamburger.querySelectorAll<HTMLElement>(
          "[data-hamburger-line]",
        );
        gsap.to(lines[0], {
          rotation: open ? 45 : 0,
          y: open ? 3 : 0,
          duration,
          ease,
          overwrite: "auto",
        });
        gsap.to(lines[1], {
          rotation: open ? -45 : 0,
          y: open ? -3 : 0,
          duration,
          ease,
          overwrite: "auto",
        });
      }

      if (!menu) return;
      if (open) {
        gsap.set(menu, { visibility: "visible" });
        gsap.fromTo(
          menu,
          { opacity: 0, y: 10 },
          {
            opacity: 1,
            y: 0,
            duration,
            ease,
            overwrite: "auto",
          },
        );
      } else {
        gsap.to(menu, {
          opacity: 0,
          y: 10,
          duration,
          ease,
          overwrite: "auto",
          onComplete: () => gsap.set(menu, { visibility: "hidden" }),
        });
      }
    },
    [ease],
  );

  const handleEnter = (index: number) => {
    if (reducedMotionRef.current) return;
    const timeline = timelineRefs.current[index];
    if (!timeline) return;
    activeTweenRefs.current[index]?.kill();
    activeTweenRefs.current[index] = timeline.tweenTo(timeline.duration(), {
      duration: 0.3,
      ease,
      overwrite: "auto",
    });
  };

  const handleLeave = (index: number) => {
    if (reducedMotionRef.current) return;
    const timeline = timelineRefs.current[index];
    if (!timeline) return;
    activeTweenRefs.current[index]?.kill();
    activeTweenRefs.current[index] = timeline.tweenTo(0, {
      duration: 0.2,
      ease,
      overwrite: "auto",
    });
  };

  const handleLogoEnter = () => {
    const image = logoImageRef.current;
    if (!image || reducedMotionRef.current) return;
    logoTweenRef.current?.kill();
    gsap.set(image, { rotate: 0 });
    logoTweenRef.current = gsap.to(image, {
      rotate: 360,
      duration: 0.2,
      ease,
      overwrite: "auto",
    });
  };

  const toggleMobileMenu = () => {
    const nextOpen = !isMobileMenuOpen;
    setIsMobileMenuOpen(nextOpen);
    animateMobileMenu(nextOpen);
    onMobileMenuClick?.();
  };

  const handleMobileNavigate = (
    item: PillNavItem,
    event: ReactMouseEvent<HTMLAnchorElement>,
  ) => {
    setIsMobileMenuOpen(false);
    animateMobileMenu(false);
    onNavigate?.(item, event);
  };

  const cssVars: PillNavCssVars = {
    "--base": baseColor,
    "--pill-bg": pillColor,
    "--hover-text": hoveredPillTextColor,
    "--pill-text": resolvedPillTextColor,
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <nav
        className={`${styles.nav} ${className}`.trim()}
        aria-label="首页导航"
        style={cssVars}
        data-pill-nav=""
      >
        {logo ? (
          <a
            className={styles.logo}
            href={items[0]?.href ?? "#top"}
            aria-label="返回首页"
            onMouseEnter={handleLogoEnter}
            ref={logoRef}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 组件允许任意来源的可选品牌图。 */}
            <img src={logo ? siteAsset(logo) : undefined} alt={logoAlt} ref={logoImageRef} />
          </a>
        ) : null}

        <div className={`${styles.navItems} ${styles.desktopOnly}`} ref={navItemsRef}>
          <ul className={styles.list}>
            {items.map((item, index) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className={`${styles.pill}${
                    activeHref === item.href ? ` ${styles.active}` : ""
                  }`}
                  aria-label={item.ariaLabel ?? item.label}
                  aria-current={activeHref === item.href ? "page" : undefined}
                  onClick={(event) => onNavigate?.(item, event)}
                  onMouseEnter={() => handleEnter(index)}
                  onMouseLeave={() => handleLeave(index)}
                  data-pill-link=""
                >
                  <span
                    className={styles.hoverCircle}
                    aria-hidden="true"
                    ref={(element) => {
                      circleRefs.current[index] = element;
                    }}
                  />
                  <span className={styles.labelStack}>
                    <span className={styles.label} data-pill-label="">
                      {item.label}
                    </span>
                    <span
                      className={styles.hoverLabel}
                      aria-hidden="true"
                      data-pill-label-hover=""
                    >
                      {item.label}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <button
          className={`${styles.mobileMenuButton} ${styles.mobileOnly}`}
          type="button"
          onClick={toggleMobileMenu}
          aria-label={isMobileMenuOpen ? "关闭导航菜单" : "打开导航菜单"}
          aria-controls="home-pill-mobile-menu"
          aria-expanded={isMobileMenuOpen}
          ref={hamburgerRef}
          data-pill-menu-button=""
        >
          <span className={styles.hamburgerLine} data-hamburger-line="" />
          <span className={styles.hamburgerLine} data-hamburger-line="" />
        </button>
      </nav>

      <div
        id="home-pill-mobile-menu"
        className={`${styles.mobileMenuPopover} ${styles.mobileOnly}`}
        ref={mobileMenuRef}
        style={cssVars}
        aria-hidden={!isMobileMenuOpen}
        data-pill-mobile-menu=""
      >
        <ul className={styles.mobileMenuList}>
          {items.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className={`${styles.mobileMenuLink}${
                  activeHref === item.href ? ` ${styles.active}` : ""
                }`}
                aria-current={activeHref === item.href ? "page" : undefined}
                onClick={(event) => handleMobileNavigate(item, event)}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
