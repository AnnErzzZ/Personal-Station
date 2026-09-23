import type { ReactNode } from "react";

type RubberSegmentItem = string | {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
};

export default function RubberSegment(props: {
  items: readonly RubberSegmentItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string, index: number) => void;
  trackColor?: string;
  thumbColor?: string;
  textColor?: string;
  activeTextColor?: string;
  size?: "sm" | "md" | "lg";
  radius?: number;
  inset?: number;
  equalSlots?: boolean;
  stretch?: number;
  squash?: number;
  speed?: number;
  glide?: number;
  draggable?: boolean;
  disabled?: boolean;
  className?: string;
  panelId?: string;
  tabIdPrefix?: string;
  itemDataAttribute?: `data-${string}`;
  "aria-label"?: string;
}): ReactNode;
