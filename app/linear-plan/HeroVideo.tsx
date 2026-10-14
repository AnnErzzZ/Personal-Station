"use client";

import { useEffect, useRef, useState } from "react";
import { siteAsset } from "@/lib/site-asset";
import styles from "./page.module.css";

export default function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => {
      const video = ref.current;
      if (!video) return;
      if (preference.matches) video.pause();
      else void video.play().catch(() => {});
    };
    syncMotion();
    preference.addEventListener("change", syncMotion);
    return () => preference.removeEventListener("change", syncMotion);
  }, []);

  return (
    <video
      ref={ref}
      className={styles.video}
      data-loaded={loaded || undefined}
      src={siteAsset("/linear-plan/planning-monitoring.mp4")}
      poster={siteAsset("/linear-plan/planning-monitoring-poster.jpg")}
      autoPlay
      muted
      playsInline
      loop
      preload="auto"
      disablePictureInPicture
      disableRemotePlayback
      onLoadedMetadata={(event) => { event.currentTarget.currentTime = 10; }}
      onLoadedData={() => setLoaded(true)}
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}
