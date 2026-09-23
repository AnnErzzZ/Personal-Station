import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind 类名合并（Aceternity 组件依赖的标准 cn 工具）。
 * clsx 负责条件拼接，tailwind-merge 负责同组工具类去冲突。
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
