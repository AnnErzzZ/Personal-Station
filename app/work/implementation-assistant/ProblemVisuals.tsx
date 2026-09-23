import styles from "./problem-visuals.module.css";

export type ProblemVisualKind =
  | "flow-break"
  | "repeat"
  | "cross-tool"
  | "guidance-gap";

type VisualFrameProps = {
  part: ProblemVisualKind;
  children: React.ReactNode;
};

/**
 * 四张问题卡片共用的静态画布。
 * 统一 240 × 96 构图坐标系；每个可动元素都带 data-part，方便下一轮分别做动画。
 */
function VisualFrame({ part, children }: VisualFrameProps) {
  return (
    <svg
      className={styles.visual}
      viewBox="0 0 240 96"
      data-visual={part}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 图标 SVG 的路径数据已内联；页面运行时不读取原始图标库文件。             */
/*   fill/ui-layout/18px_triangle-warning.svg   警告                    */
/*   fill/ui-layout/18px_circle-check.svg       正确                    */
/*   fill/arrows/18px_caret-right.svg           迁移箭头                */
/*   outline-duo/ui-layout/18px_circle-question.svg 判断点              */
/* 几何数据原样引用，只把原始 fill/stroke 的黑色换成 currentColor。       */
/* ------------------------------------------------------------------ */

const ICON_BOX = 18;

const TRIANGLE_WARNING_PATH =
  "M16.4364 12.5151L11.0101 3.11316C10.5902 2.39096 9.83872 1.96045 8.99982 1.96045C8.16092 1.96045 7.40952 2.39106 6.98952 3.11316C6.98902 3.11366 6.98902 3.11473 6.98852 3.11523L1.56272 12.5156C1.14332 13.2436 1.14332 14.1128 1.56372 14.8398C1.98362 15.5664 2.73562 16 3.57492 16H14.4245C15.2639 16 16.0158 15.5664 16.4357 14.8398C16.8561 14.1127 16.8563 13.2436 16.4364 12.5151ZM8.24992 6.75C8.24992 6.3359 8.58582 6 8.99992 6C9.41402 6 9.74992 6.3359 9.74992 6.75V9.75C9.74992 10.1641 9.41402 10.5 8.99992 10.5C8.58582 10.5 8.24992 10.1641 8.24992 9.75V6.75ZM8.99992 13.5C8.44792 13.5 7.99992 13.0498 7.99992 12.5C7.99992 11.9502 8.44792 11.5 8.99992 11.5C9.55192 11.5 9.99992 11.9502 9.99992 12.5C9.99992 13.0498 9.55192 13.5 8.99992 13.5Z";

const CIRCLE_CHECK_PATH =
  "M9,1C4.589,1,1,4.589,1,9s3.589,8,8,8,8-3.589,8-8S13.411,1,9,1Zm3.843,5.708l-4.25,5.5c-.136,.176-.343,.283-.565,.291-.01,0-.019,0-.028,0-.212,0-.415-.09-.558-.248l-2.25-2.5c-.277-.308-.252-.782,.056-1.06,.309-.276,.781-.252,1.06,.056l1.648,1.832,3.701-4.789c.253-.328,.725-.388,1.052-.135,.328,.253,.388,.724,.135,1.052Z";

const CARET_RIGHT_PATH =
  "M14.611,7.522L6.687,2.497c-.54-.342-1.223-.363-1.781-.055-.559,.308-.906,.895-.906,1.533V14.024c0,.638,.347,1.226,.906,1.533,.263,.145,.554,.217,.844,.217,.326,0,.652-.091,.938-.272l7.923-5.024c.509-.323,.812-.875,.812-1.478s-.304-1.155-.812-1.478Z";

const CIRCLE_QUESTION_RING_PATH =
  "M9 16.25C13.0041 16.25 16.25 13.0041 16.25 9C16.25 4.99594 13.0041 1.75 9 1.75C4.99594 1.75 1.75 4.99594 1.75 9C1.75 13.0041 4.99594 16.25 9 16.25Z";

const CIRCLE_QUESTION_HOOK_PATH =
  "M6.92499 6.61901C7.31299 5.56201 8.21899 5.12701 9.10499 5.12701C9.99999 5.12701 10.923 5.76501 10.923 6.93501C10.923 8.71901 9.10699 8.40301 8.82699 10";

const CIRCLE_QUESTION_DOT_PATH =
  "M8.79099 13.567C8.23899 13.567 7.79099 13.118 7.79099 12.567C7.79099 12.016 8.23899 11.567 8.79099 11.567C9.34299 11.567 9.79099 12.016 9.79099 12.567C9.79099 13.118 9.34299 13.567 8.79099 13.567Z";

type IconProps = {
  /** 图标中心坐标 */
  x: number;
  y: number;
  /** 图标边长（等比缩放） */
  size: number;
  part: string;
  glow?: string;
};

const iconTransform = ({ x, y, size }: Pick<IconProps, "x" | "y" | "size">) =>
  `translate(${x - size / 2} ${y - size / 2}) scale(${size / ICON_BOX})`;

function WarningIcon({ x, y, size, part, glow }: IconProps) {
  return (
    <g
      className={styles.iconWarning}
      data-icon-source="fill/ui-layout/18px_triangle-warning.svg"
      data-part={part}
      filter={glow ? `url(#${glow})` : undefined}
      transform={iconTransform({ x, y, size })}
    >
      <path d={TRIANGLE_WARNING_PATH} fill="currentColor" />
    </g>
  );
}

function CheckIcon({ x, y, size, part, glow }: IconProps) {
  return (
    <g
      className={styles.iconSuccess}
      data-icon-source="fill/ui-layout/18px_circle-check.svg"
      data-part={part}
      filter={glow ? `url(#${glow})` : undefined}
      transform={iconTransform({ x, y, size })}
    >
      <path d={CIRCLE_CHECK_PATH} fill="currentColor" />
    </g>
  );
}

function CaretRightIcon({
  x,
  y,
  size,
  part,
  direction = "right",
}: IconProps & { direction?: "left" | "right" }) {
  const transform = iconTransform({ x, y, size });

  return (
    <g
      className={direction === "left" ? styles.iconMuted : styles.iconAccent}
      data-icon-source="fill/arrows/18px_caret-right.svg"
      data-part={part}
      transform={
        direction === "left" ? `rotate(180 ${x} ${y}) ${transform}` : transform
      }
    >
      <path d={CARET_RIGHT_PATH} fill="currentColor" />
    </g>
  );
}

function QuestionIcon({ x, y, size, part }: IconProps) {
  return (
    <g
      className={styles.iconDecision}
      data-icon-source="outline-duo/ui-layout/18px_circle-question.svg"
      data-part={part}
      data-shape="circle"
      transform={iconTransform({ x, y, size })}
    >
      <path
        d={CIRCLE_QUESTION_RING_PATH}
        fill="currentColor"
        fillOpacity="0.3"
      />
      <path
        d={CIRCLE_QUESTION_RING_PATH}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d={CIRCLE_QUESTION_HOOK_PATH}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path d={CIRCLE_QUESTION_DOT_PATH} fill="currentColor" />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* 01 流程断点                                                          */
/* ------------------------------------------------------------------ */

const FLOW_Y = 50;

/**
 * 01 流程断点：一条横向流程线。
 * 左段两个浅色节点用白色实线连接，中间橙色节点是断点，
 * 橙色短虚线把断点接到警告图标上，右段两个灰色节点只用灰色虚线相连。
 */
export function FlowBreakVisual() {
  return (
    <VisualFrame part="flow-break">
      <path
        className={styles.flowRailDone}
        data-part="flow-rail-done"
        d={`M18 ${FLOW_Y}H101`}
      />
      <path
        className={styles.flowConnector}
        data-part="flow-connector-left"
        d={`M111 ${FLOW_Y}H122`}
      />
      <path
        className={styles.flowConnector}
        data-part="flow-connector-right"
        d={`M151 ${FLOW_Y}H166`}
      />
      <path
        className={styles.flowRailPending}
        data-part="flow-rail-pending"
        d={`M166 ${FLOW_Y}H222`}
      />

      <g data-part="flow-nodes">
        <g
          data-stage="completed"
          data-part="flow-node-1"
        >
          <circle className={styles.flowNodeDone} cx="18" cy={FLOW_Y} r="8" />
          <circle className={styles.flowNodeDoneDot} cx="18" cy={FLOW_Y} r="3" />
        </g>
        <g
          data-stage="completed"
          data-part="flow-node-2"
        >
          <circle className={styles.flowNodeDone} cx="60" cy={FLOW_Y} r="8" />
          <circle className={styles.flowNodeDoneDot} cx="60" cy={FLOW_Y} r="3" />
        </g>
        <g
          data-stage="pending"
          data-part="flow-node-pending-1"
        >
          <circle className={styles.flowNodePending} cx="181" cy={FLOW_Y} r="7.5" />
          <circle className={styles.flowNodePendingDot} cx="181" cy={FLOW_Y} r="2.8" />
        </g>
        <g
          data-stage="pending"
          data-part="flow-node-pending-2"
        >
          <circle className={styles.flowNodePending} cx="222" cy={FLOW_Y} r="7.5" />
          <circle className={styles.flowNodePendingDot} cx="222" cy={FLOW_Y} r="2.8" />
        </g>
      </g>

      <circle
        className={styles.flowNodeBreakMask}
        cx="102"
        cy={FLOW_Y}
        data-part="flow-node-break-mask"
        r="9"
      />
      <g
        data-stage="interruption"
        data-part="flow-node-break"
      >
        <circle className={styles.flowNodeBreakRing} cx="102" cy={FLOW_Y} r="10" />
        <circle className={styles.flowNodeBreak} cx="102" cy={FLOW_Y} r="5.5" />
      </g>

      <WarningIcon x={137} y={FLOW_Y} size={27} part="flow-warning" />
    </VisualFrame>
  );
}

/* ------------------------------------------------------------------ */
/* 02 大量重复操作                                                      */
/* ------------------------------------------------------------------ */

const REPEAT_ITEM = { width: 96, height: 21, radius: 6 } as const;
const REPEAT_ITEMS = [
  { id: 1, x: 10, y: 6, accent: true },
  { id: 2, x: 134, y: 6, accent: false },
  { id: 3, x: 10, y: 37.5, accent: false },
  { id: 4, x: 134, y: 37.5, accent: false },
  { id: 5, x: 10, y: 69, accent: false },
  { id: 6, x: 134, y: 69, accent: false },
] as const;

/**
 * 02 大量重复操作：同一任务项被复制成 2 × 3。
 * 每一项只保留一个圆点加两条短横线，只有第 3 项用橙色描边和橙色点标识。
 */
export function RepeatVisual() {
  return (
    <VisualFrame part="repeat">
      {REPEAT_ITEMS.map((item) => (
        <g
          className={item.accent ? styles.repeatItemAccent : undefined}
          data-part={`repeat-item-${item.id}`}
          data-role="repeat-item"
          data-state={item.accent ? "highlighted" : "muted"}
          key={item.id}
        >
          <rect
            className={styles.repeatBox}
            height={REPEAT_ITEM.height}
            rx={REPEAT_ITEM.radius}
            width={REPEAT_ITEM.width}
            x={item.x}
            y={item.y}
          />
          <circle
            className={styles.repeatDot}
            cx={item.x + 15}
            cy={item.y + 8}
            r="2.6"
          />
          <path
            className={styles.repeatLine}
            d={`M${item.x + 26} ${item.y + 8}H${item.x + 72}`}
          />
          <path
            className={styles.repeatLineSoft}
            d={`M${item.x + 26} ${item.y + 14.5}H${item.x + 54}`}
          />
        </g>
      ))}
    </VisualFrame>
  );
}

/* ------------------------------------------------------------------ */
/* 03 跨工具                                                            */
/* ------------------------------------------------------------------ */

/**
 * 03 跨工具：只有左右两个系统容器，中间一张任务卡。
 * 上方橙色实线路径表示正向流转，下方灰色虚线路径表示返回；任务卡独立在两者之间迁移。
 */
export function CrossToolVisual() {
  return (
    <VisualFrame part="cross-tool">
      <g data-part="tool-panel-a" data-role="tool-panel">
        <rect
          className={styles.panelBox}
          height="72"
          rx="11"
          width="68"
          x="4"
          y="12"
        />
        <rect
          className={styles.panelBlock}
          height="14"
          rx="3"
          width="14"
          x="15"
          y="26"
        />
        <rect
          className={styles.panelLine}
          height="5"
          rx="2.5"
          width="29"
          x="35"
          y="28"
        />
        <rect
          className={styles.panelLineSoft}
          height="5"
          rx="2.5"
          width="21"
          x="35"
          y="39"
        />
        <rect className={styles.panelLine} height="5" rx="2.5" width="38" x="15" y="60" />
        <rect className={styles.panelLineSoft} height="5" rx="2.5" width="25" x="15" y="70" />
      </g>

      <g data-part="tool-panel-b" data-role="tool-panel">
        <rect
          className={styles.panelBox}
          height="72"
          rx="11"
          width="68"
          x="168"
          y="12"
        />
        <rect
          className={styles.panelBlock}
          height="14"
          rx="3"
          width="14"
          x="179"
          y="26"
        />
        <rect
          className={styles.panelLine}
          height="5"
          rx="2.5"
          width="29"
          x="199"
          y="28"
        />
        <rect
          className={styles.panelLineSoft}
          height="5"
          rx="2.5"
          width="21"
          x="199"
          y="39"
        />
        <rect className={styles.panelLine} height="5" rx="2.5" width="38" x="179" y="60" />
        <rect className={styles.panelLineSoft} height="5" rx="2.5" width="25" x="179" y="70" />
      </g>

      <path
        className={styles.transferPath}
        data-part="forward-path"
        d="M78 26H158"
      />
      <CaretRightIcon x={161} y={26} size={9} part="forward-arrow" />

      <path
        className={styles.returnPath}
        data-part="return-path"
        d="M162 74H82"
      />
      <CaretRightIcon
        direction="left"
        x={79}
        y={74}
        size={9}
        part="return-arrow"
      />

      <g data-part="task-card" data-role="transferred-task">
        <rect
          className={styles.taskBox}
          height="30"
          rx="8"
          width="48"
          x="96"
          y="34"
        />
        <circle className={styles.taskDot} cx="106" cy="46" r="2.8" />
        <path className={styles.taskLine} d="M114 45H135" />
        <path className={styles.taskLineSoft} d="M114 53H130" />
      </g>
    </VisualFrame>
  );
}

/* ------------------------------------------------------------------ */
/* 04 缺少指引 / 防错                                                    */
/* ------------------------------------------------------------------ */

/**
 * 04 缺少指引 / 防错：白色起点接到圆形问号判断点。
 * 上方橙色错误路径以警告图标收尾，下方浅灰正确路径以绿色对勾收尾，
 * 另有一条很弱的灰色虚线表示用户先犹豫、差点走错。
 */
export function GuidanceGapVisual() {
  return (
    <VisualFrame part="guidance-gap">
      <path
        className={styles.hesitationPath}
        data-part="hesitation-path"
        d="M96 36C111 9 158 7 199 18"
      />
      <path
        className={styles.entryPath}
        data-part="entry-path"
        d="M18 50H79"
      />
      <path
        className={styles.wrongBranch}
        data-part="wrong-branch"
        d="M105 43C132 42 154 24 188 20"
      />
      <path
        className={styles.correctBranch}
        data-part="correct-branch"
        d="M105 57C134 61 153 77 188 78"
      />

      <circle
        className={styles.startNode}
        data-part="start-node"
        cx="18"
        cy="50"
        r="7"
      />
      <QuestionIcon x={92} y={50} size={28} part="decision-question" />

      <g data-part="wrong-arrow-direction" transform="rotate(-7 188 20)">
        <CaretRightIcon x={188} y={20} size={9} part="wrong-arrow" />
      </g>
      <g className={styles.correctArrow} data-part="correct-arrow-direction" transform="rotate(8 188 78)">
        <CaretRightIcon x={188} y={78} size={9} part="correct-arrow" />
      </g>

      <WarningIcon
        part="wrong-result"
        size={25}
        x={209}
        y={18}
      />
      <CheckIcon part="correct-result" size={25} x={209} y={79} />
    </VisualFrame>
  );
}

const visuals: Record<ProblemVisualKind, () => React.JSX.Element> = {
  "flow-break": FlowBreakVisual,
  repeat: RepeatVisual,
  "cross-tool": CrossToolVisual,
  "guidance-gap": GuidanceGapVisual,
};

export function ProblemVisual({ kind }: { kind: ProblemVisualKind }) {
  const Visual = visuals[kind];
  return <Visual />;
}
