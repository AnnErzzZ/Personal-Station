import { readdir } from "node:fs/promises";
import path from "node:path";

import type { DashboardImage } from "@/app/home/story/dashboard-gallery";

/** Read actual portfolio exports; filenames determine the gallery order. */
export async function getDashboardImages(): Promise<DashboardImage[]> {
  const directory = path.join(process.cwd(), "public", "dashboards");
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  return entries
    .filter((entry) => entry.isFile() && /\.(png|jpe?g|webp|avif)$/i.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN", { numeric: true }))
    .map((entry, index) => ({
      src: `/dashboards/${encodeURIComponent(entry.name)}`,
      alt: `数据大屏设计作品 ${index + 1}`,
    }));
}
