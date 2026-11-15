import Image from "@/components/SiteImage";
import { siteAsset } from "@/lib/site-asset";
import styles from "./case.module.css";

const assets = "/cases/product-visual-ai/video-materials/";
const materials = [
  {
    file: "video-product-exterior.webp",
    label: "产品外观",
    time: "00:00",
    alt: "视频开场画面：充电桩安装在停车区域墙边的基座上",
    width: 1906,
    height: 1080,
    wide: true,
  },
  {
    file: "video-installation-site.webp",
    label: "安装场地",
    time: "00:10",
    alt: "视频10秒画面：安装前的停车区域，展示场地与墙体关系",
    width: 1906,
    height: 1080,
  },
  {
    file: "video-ground-cables.webp",
    label: "地面布线",
    time: "00:30",
    alt: "视频30秒画面：地面沟槽内的线缆近景",
    width: 1906,
    height: 1080,
  },
  {
    file: "video-cabinet-detail.webp",
    label: "柜内接线",
    time: "01:00",
    alt: "视频1分钟画面：柜内器件与线缆端子的接线演示特写",
    width: 1906,
    height: 1080,
  },
  {
    file: "video-charging-connector.webp",
    label: "充电枪特写",
    time: "01:30",
    alt: "视频1分30秒画面：充电枪接口与柜侧枪座特写",
    width: 1906,
    height: 1080,
  },
];

export default function VideoMaterials() {
  return <div className={styles.bentoGrid} aria-label="当前安装演示视频画面">
    {materials.map((item) => <figure key={item.file} className={`${styles.bentoTile} ${styles.materialTile} ${item.wide ? styles.materialWide : ""}`}>
      <a href={siteAsset(assets + item.file)} target="_blank" rel="noreferrer" aria-label={item.label + "，打开完整图（新窗口）"}>
        <Image src={assets + item.file} alt={item.alt} width={item.width} height={item.height} sizes={item.wide ? "(max-width: 1440px) 90vw, 1280px" : "(max-width: 700px) 90vw, (max-width: 1440px) 45vw, 628px"} />
      </a>
      <figcaption><span>{item.label}</span><span className={styles.materialTime}>{item.time}</span></figcaption>
    </figure>)}
  </div>;
}
