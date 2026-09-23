import NextImage, { type ImageProps } from "next/image";

import { siteAsset } from "@/lib/site-asset";

export default function SiteImage(props: ImageProps) {
  return (
    <NextImage
      {...props}
      src={typeof props.src === "string" ? siteAsset(props.src) : props.src}
    />
  );
}
