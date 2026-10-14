import { siteAsset } from "@/lib/site-asset";

export type NucleoIconName = "arrow-right" | "arrow-up-right" | "bell" | "chart-bar" | "check" | "chevron-right" | "clipboard-list" | "download" | "filter" | "gear" | "grid-layout" | "office" | "paperclip" | "refresh" | "shield-check" | "users" | "wifi-off";

const sprite = siteAsset("/work/operations-platform/icons/nucleo.svg?sort=fill");

export default function NucleoIcon({ name, size = 18, className }: { name: NucleoIconName; size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 18 18" className={className} aria-hidden="true" focusable="false" data-nucleo-icon={name} style={{ flexShrink: 0 }}><use href={`${sprite}#${name}`} /></svg>;
}

export function SortIndicator({ direction }: { direction: "none" | "ascending" | "descending" }) {
  return <svg width="14" height="14" viewBox="0 0 18 18" aria-hidden="true" focusable="false" data-nucleo-sort={direction} style={{ flexShrink: 0 }}>
    <use href={`${sprite}#sort-up`} style={{ color: direction === "ascending" ? "var(--accent)" : "#7a8494" }} />
    <use href={`${sprite}#sort-down`} style={{ color: direction === "descending" ? "var(--accent)" : "#7a8494" }} />
  </svg>;
}
