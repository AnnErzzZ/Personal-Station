import Image from "@/components/SiteImage";

import EntranceSequence from "./EntranceSequence";
import styles from "./design-spec-showcase.module.css";

const ASSET_BASE = "/cases/implementation-assistant/08-design-system";

const ACCENT_SWATCHES = [
  { name: "Accent", hex: "#5BB773", height: 218 },
  { name: "Info", hex: "#0090FF", height: 72 },
  { name: "Warning", hex: "#FFC53D", height: 73 },
  { name: "Error", hex: "#E5484D", height: 73 },
] as const;

const NEUTRAL_RAMP = [
  "#FCFCFD",
  "#F9F9FB",
  "#F0F0F3",
  "#E8E8EC",
  "#E0E1E6",
  "#D9D9E0",
  "#CDCED6",
  "#B9BBC6",
  "#8B8D98",
  "#80838D",
  "#60646C",
  "#1C2024",
] as const;

// PingFang SC 是这一屏展示的字体本身；四档字号按 Figma 标注，字体风格统一。
const TYPE_SPECIMENS = [
  { name: "Title 1", detail: "18 Medium", size: "title" },
  { name: "Title 2", detail: "16 Medium", size: "subtitle" },
  { name: "Body", detail: "14 Regular", size: "body" },
  { name: "Label", detail: "12 Regular", size: "label" },
] as const;

// 图标板图里只有图标；图标下方的名称按 Figma 图层名单独渲染。
export default function DesignSpecShowcase() {
  return (
    <section className={styles.section} aria-labelledby="design-spec-title">
      <EntranceSequence fillWidth name="section-08-spec" selfVariant="content">
        <div className={styles.stage}>
        <h2 className={styles.visuallyHidden} id="design-spec-title">
          设计规范
        </h2>

        <div
          className={styles.meta}
          data-entrance-item
          data-entrance-step="identity"
          data-entrance-variant="opacity"
        >
          <span>Implementation Assistant</span>
          <span>08/08</span>
        </div>

        <p
          className={styles.labelTypeface}
          data-entrance-item
          data-entrance-step="title"
          data-entrance-variant="opacity"
        >Typeface</p>
        <p
          className={styles.typefaceName}
          data-entrance-item
          data-entrance-step="title"
          data-entrance-variant="opacity"
        >PingFang SC</p>

        <div
          className={styles.typeSpecimens}
          data-entrance-item
          data-entrance-step="support"
          data-entrance-variant="opacity"
        >
          {TYPE_SPECIMENS.map((specimen) => (
            <div className={styles.typeSpecimen} key={specimen.name}>
              <span
                className={`${styles.specimenName} ${styles[`specimen-${specimen.size}`]}`}
              >
                {specimen.name}
              </span>
              <span className={styles.specimenDetail}>{specimen.detail}</span>
            </div>
          ))}
        </div>

        <p
          className={styles.labelColor}
          data-entrance-item
          data-entrance-step="primary"
          data-entrance-variant="opacity"
        >Color</p>

        <div
          className={styles.swatchColumn}
          data-entrance-item
          data-entrance-step="primary"
          data-entrance-variant="opacity"
        >
          {ACCENT_SWATCHES.map((swatch) => (
            <div
              className={styles.swatch}
              key={swatch.hex}
              style={{ background: swatch.hex, height: swatch.height }}
            >
              <span className={styles.swatchText}>
                <span className={styles.swatchName}>{swatch.name}</span>
                <span className={styles.swatchHex}>{swatch.hex}</span>
              </span>
            </div>
          ))}
        </div>

        <div
          className={styles.ramp}
          data-entrance-item
          data-entrance-step="primary"
          data-entrance-variant="opacity"
        >
          {NEUTRAL_RAMP.map((hex, index) => (
            <div
              className={
                index >= 8
                  ? `${styles.rampRow} ${styles.rampRowDark}`
                  : styles.rampRow
              }
              key={hex}
              style={{ background: hex }}
            >
              <span className={styles.rampLabel}>
                {String(index + 1).padStart(2, "0")} {hex}
              </span>
            </div>
          ))}
        </div>

        <p
          aria-hidden="true"
          className={styles.monogram}
          data-entrance-item
          data-entrance-step="support"
          data-entrance-variant="opacity"
        >
          Aa
        </p>

        <p
          className={styles.labelIcon}
          data-entrance-item
          data-entrance-step="secondary"
          data-entrance-variant="opacity"
        >Icon</p>

        <p
          className={styles.labelElements}
          data-entrance-item
          data-entrance-step="secondary"
          data-entrance-variant="opacity"
        >Design Specifications</p>

        <figure
          className={styles.board}
          data-entrance-item
          data-entrance-step="secondary"
          data-entrance-variant="opacity"
        >
          <Image
            alt="实施助手的设备图标与基础元素：网关、传感器、开关与空调面板等图标的线稿示例"
            className={styles.boardImage}
            height={554}
            sizes="677px"
            src={`${ASSET_BASE}/device-icon-board@2x.png`}
            unoptimized
            width={1354}
          />
          <span aria-hidden="true" className={styles.boardFade} />
        </figure>
      </div>
      </EntranceSequence>
    </section>
  );
}
