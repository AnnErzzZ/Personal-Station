"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { siteAsset } from "@/lib/site-asset";
import styles from "./ContactLanyardOverlay.module.css";

const Lanyard = dynamic(() => import("./Lanyard"), { ssr: false });

export default function ContactLanyardOverlay({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [phase, setPhase] = useState<"waiting" | "entering" | "open" | "exiting">("waiting");
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const copyMessageTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const phaseRef = useRef(phase);
  const sceneReady = useRef(false);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const finishClose = useCallback(() => {
    phaseRef.current = "waiting";
    setPhase("waiting");
    setCopyMessage(null);
    onClose();
  }, [onClose]);

  const requestClose = useCallback(() => {
    if (phaseRef.current === "exiting") return;
    if (phaseRef.current === "waiting") {
      finishClose();
      return;
    }
    phaseRef.current = "exiting";
    setPhase("exiting");
  }, [finishClose]);

  const handleReady = useCallback(() => {
    sceneReady.current = true;
    if (!isOpen || phaseRef.current !== "waiting") return;
    phaseRef.current = "entering";
    setPhase("entering");
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && sceneReady.current) handleReady();
  }, [isOpen, handleReady]);

  const copyContact = useCallback(async (kind: "email" | "phone") => {
    const value = kind === "email" ? "2462362144@qq.com" : "13694246950";
    let copied = false;
    if (window.isSecureContext && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        copied = true;
      } catch { /* Use the selection fallback below. */ }
    }
    if (!copied) {
      const previousFocus = document.activeElement as HTMLElement | null;
      const input = document.createElement("textarea");
      input.value = value;
      input.readOnly = true;
      input.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
      document.body.appendChild(input);
      input.select();
      copied = document.execCommand("copy");
      input.remove();
      previousFocus?.focus({ preventScroll: true });
    }
    setCopyMessage(copied ? `${kind === "email" ? "邮箱" : "手机号"}已复制` : `复制失败：${value}`);
    clearTimeout(copyMessageTimer.current);
    copyMessageTimer.current = setTimeout(() => setCopyMessage(null), 2200);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY < 0) requestClose();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("wheel", onWheel, { capture: true, passive: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("wheel", onWheel, true);
      clearTimeout(copyMessageTimer.current);
    };
  }, [isOpen, requestClose]);

  const keepFocusInside = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button, a[href]"));
    const first = controls[0];
    const last = controls.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div className={styles.overlay} data-visible={isOpen} role={isOpen ? "dialog" : undefined} aria-modal={isOpen ? "true" : undefined} aria-hidden={!isOpen} aria-label={isOpen ? "伍子荣的联系方式吊牌" : undefined} onKeyDown={keepFocusInside}>
      <div
        className={styles.stage}
        data-phase={phase}
        onAnimationEnd={event => {
          if (event.target !== event.currentTarget) return;
          if (phase === "entering") setPhase("open");
          if (phase === "exiting") finishClose();
        }}
      >
        <Lanyard
          phase={phase}
          position={[0, 0, 18]}
          mobilePosition={[0, 0, 20]}
          gravity={[0, -40, 0]}
          frontImage={siteAsset("/lanyard/contact-front.svg")}
          backImage={siteAsset("/lanyard/contact-back.svg")}
          lanyardWidth={0.25}
          onPointerMissed={requestClose}
          onRequestClose={requestClose}
          onCopyContact={copyContact}
          onReady={handleReady}
        />
      </div>
      <div className={styles.copyStatus} role="status" aria-live="polite">{copyMessage}</div>
    </div>,
    document.body,
  );
}
