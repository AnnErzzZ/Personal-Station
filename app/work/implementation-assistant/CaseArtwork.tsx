import { readFileSync } from "node:fs";
import path from "node:path";
import { figmaAssets } from "./figma-source";
import styles from "./case-study.module.css";
import motionStyles from "./case-artwork.module.css";
// Roles follow the original SVG anatomy; no paths or existing positioning matrices change.
const motionParts: Record<string, Record<number, string>> = {
  "flow-break": { 1: "signal", 4: "source-ring", 5: "source-dot", 6: "warning-ring", 7: "warning-dot", 9: "break-mark" },
  repeat: { 2: "status", 3: "row", 4: "status", 5: "row", 6: "status", 7: "row" },
  "cross-tool": { 3: "row", 4: "row", 8: "row", 9: "row", 10: "transfer" },
  "guidance-gap": { 0: "signal", 1: "branch", 2: "branch", 3: "question", 6: "warning-ring", 8: "warning-dot", 9: "warning-dot" },
  "task-list": { 1: "row-panel", 2: "status", 3: "row", 4: "row-panel", 5: "status", 6: "row", 7: "row-panel", 8: "status", 9: "row" },
  checklist: { 2: "scan-lines", 3: "status", 4: "status", 5: "status", 6: "icon", 7: "check" },
  manual: { 2: "scan-lines", 3: "status", 5: "scan-lines", 6: "icon", 7: "icon", 8: "icon", 9: "icon", 10: "icon" },
  wireframe: { 1: "status", 2: "status", 3: "status", 7: "navigation", 10: "row-panel", 11: "status", 13: "signal", 15: "scan-lines" },
};
export function CaseArtwork({ part, asset, kind, className = "" }: { part: string; asset: string; kind: string; className?: string; }) {
  const file = figmaAssets[part]?.[asset];
  if (!file || !/^[\da-f]+\.svg$/.test(file)) throw new Error(`Missing Figma artwork ${part}/${asset}`);
  const source = readFileSync(path.join(process.cwd(), "public/cases/implementation-assistant/figma/current", file), "utf8");
  let index = 0;
  const counts: Record<string, number> = {};
  let svg = source.replace(/id="([^"]+)"/g, (_, id: string) => `id="${kind}-${id}" data-source-id="${id}"`).replace(/url\(#([^)]+)\)/g, (_, id: string) => `url(#${kind}-${id})`).replace(/<path\b/g, () => {
    const role = motionParts[kind]?.[index++];
    if (!role) return "<path";
    const step = counts[role] ?? 0; counts[role] = step + 1;
    return `<path data-motion-part="${role}" style="--step:${step}"`;
  });
  if (kind === "cross-tool") {
    svg = svg.replace(/(<path id="cross-tool-Vector"[\s\S]*?)(?=<path\b[^>]*id="cross-tool-Vector_6")/, '<g data-motion-part="back-panel">$1</g>')
      .replace(/(<path id="cross-tool-Vector_6"[\s\S]*?)(?=<path\b[^>]*id="cross-tool-Vector_11")/, '<g data-motion-part="front-panel">$1</g>');
  }
  // This outer group keeps the task-list's existing -5 degree placement intact.
  if (kind === "task-list") svg = svg.replace(/(<svg\b[^>]*>)/, '$1<g data-motion-part="task-panel">').replace('</svg>', '</g></svg>');
  return <div className={`${styles.animatedArt} ${motionStyles.root} ${className}`} data-illustration={kind} data-motion="paused" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}
