const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function siteAsset(path: string): string {
  if (!basePath || !path.startsWith("/") || path.startsWith("//")) {
    return path;
  }

  return path.startsWith(`${basePath}/`) ? path : `${basePath}${path}`;
}
