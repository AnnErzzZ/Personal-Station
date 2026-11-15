import type { Metadata } from "next";
import Link from "next/link";
import Image from "@/components/SiteImage";
import { siteAsset } from "@/lib/site-asset";
import CaseNav from "../CaseNav";
import VideoMaterials from "./VideoMaterials";
import styles from "./case.module.css";

export const metadata: Metadata = {
  title: "产品视觉与 AI 辅助制作 | Zirong Wu",
  description: "华力充电设备安装演示，展示产品外观、场地布线与充电操作画面，以及 AI 标识修订和可复用制作方法。",
};

const assets = "/cases/product-visual-ai/";

const methodSteps = [
  {
    id: "reference", number: "01", title: "参考",
    description: "说明每份资料负责确定什么。",
    details: [["实拍参考", "比例与位置"], ["正面稿", "设备与图案"], ["斜视参考", "视角与构图"]],
  },
  {
    id: "constraints", number: "02", title: "约束",
    description: "写清必须保留与允许调整的内容。",
    details: [["必须保留", "产品结构、原有文字"], ["允许调整", "标识比例、左右留白"], ["未知信息", "不补造结构与参数"]],
  },
  {
    id: "review", number: "03", title: "验收",
    description: "检查整图与局部，将采用状态绑定到具体版本。",
    details: [["整图", "构图与完整性"], ["局部", "字形与细节"], ["版本", "确认状态与范围"]],
  },
];

export default function Page() {
  return <>
    <CaseNav projectLabel="产品视觉与 AI" darkHeroSelector="[data-product-hero]" darkSectionSelector="[data-product-case]" />
    <main className={styles.case} data-product-case>
      <a className={styles.skip} href="#materials">跳到案例正文</a>
      <section className={styles.hero} aria-labelledby="case-title" data-product-hero>
        <div className={styles.heroCopy}>
          <p className={styles.projectName}>华力充电设备</p>
          <h1 id="case-title">产品视觉<br /><span>与 AI 辅助制作</span></h1>
          <p className={styles.lead}>安装演示、场景素材与一次标识修订。</p>
          <nav className={styles.sectionLinks} aria-label="案例章节">
            <a href="#materials">视频素材</a>
            <a href="#iteration">AI 修订</a>
            <a href="#workflow">方法</a>
          </nav>
        </div>
        <figure id="showcase" className={styles.heroMedia}>
          <video
            key="original-showcase-restored"
            className={styles.showcasePlayer}
            controls
            playsInline
            preload="none"
            poster={siteAsset(assets + "installation-video-poster.webp")}
            width={1906}
            height={1080}
            aria-label="充电桩安装演示视频，时长约1分40秒"
            aria-describedby="showcase-caption"
          >
            <source src={siteAsset(assets + "huali-installation-showcase.mp4")} type="video/mp4" />
            你的浏览器暂不支持播放，请<a href={siteAsset(assets + "huali-installation-showcase.mp4")}>打开视频</a>查看。
          </video>
          <figcaption id="showcase-caption"><span>充电桩安装演示</span><span>约 1 分 40 秒 · 原画面与原音轨</span></figcaption>
        </figure>
      </section>

      <section id="materials" className={styles.section} aria-labelledby="materials-title">
        <div className={styles.sectionInner}>
          <header className={styles.sectionHead}>
            <h2 id="materials-title">视频画面</h2>
            <p>取自上方视频的产品外观、场地布线与充电操作画面。</p>
          </header>
          <VideoMaterials />
        </div>
      </section>

      <section id="iteration" className={`${styles.section} ${styles.iteration}`} aria-labelledby="iteration-title">
        <div className={styles.sectionInner}>
          <header className={styles.sectionHead}>
            <h2 id="iteration-title">一次标识比例修订</h2>
            <p>首轮标识偏大。拆开视角，明确比例与边距，再回到完整设定图核对。</p>
          </header>
          <div className={styles.bentoGrid}>
            <figure className={`${styles.bentoTile} ${styles.iterationTile}`}>
              <p className={styles.stepLabel}>实拍参考</p>
              <a className={`${styles.iterationArtwork} ${styles.referencePhoto}`} href={siteAsset(assets + "reference-photo-workshop.jpg")} target="_blank" rel="noreferrer" aria-label="打开产品实拍参考（新窗口）">
                <Image src={assets + "reference-photo-workshop.jpg"} alt="华力充电桩车间实拍参考，斜视展示柜体外观、标识与两侧充电枪" width={1080} height={1757} sizes="240px" />
              </a>
              <figcaption>以实拍确定标识的比例与位置。</figcaption>
            </figure>
            <figure className={`${styles.bentoTile} ${styles.iterationTile}`}>
              <p className={styles.stepLabel}>首轮生成</p>
              <a className={styles.iterationArtwork} href={siteAsset(assets + "c01-full.webp")} target="_blank" rel="noreferrer" aria-label="打开首轮完整设定图（新窗口）">
                <Image src={assets + "c01-front.webp"} alt="首轮正面展示：标识位置改善，但相对面板偏大" width={375} height={550} sizes="265px" />
              </a>
              <figcaption>位置改善，但标识被放大。</figcaption>
            </figure>
            <figure className={`${styles.bentoTile} ${styles.iterationTile}`}>
              <p className={styles.stepLabel}>调整后</p>
              <a className={styles.iterationArtwork} href={siteAsset(assets + "f01-front.webp")} target="_blank" rel="noreferrer" aria-label="打开调整后正面图（新窗口）">
                <Image src={assets + "f01-front.webp"} alt="调整后正面展示：标识缩小，左右留白更接近" width={1036} height={1519} sizes="265px" />
              </a>
              <figcaption>限定缩放比例与左右留白。</figcaption>
            </figure>
            <figure className={`${styles.bentoTile} ${styles.resultTile} ${styles.resultImage}`}>
              <a href={siteAsset(assets + "m02-adopted.webp")} target="_blank" rel="noreferrer" aria-label="打开完整合并设定图（新窗口）">
                <Image src={assets + "m02-adopted.webp"} alt="完整四视图设定图，展示产品外观、充电流程与安全标识" width={2048} height={1024} sizes="(max-width: 1440px) 90vw, 1280px" />
              </a>
              <figcaption>
                <div className={styles.resultCaptionHeading}><span>完整设定图</span><span>合并稿 · 已获静态确认</span></div>
                <p className={styles.iterationScope}>此处的确认仅针对这张静态设定图。</p>
              </figcaption>
            </figure>
          </div>
          <details className={styles.disclosure} id="iteration-details">
            <summary>查看修改依据与提示词</summary>
            <div className={styles.detailBody}>
              <p>原修订记录中，首轮标识约占面板宽 68%，当时参考图投影约 41%；尺寸自检未过，整图像素尺寸也改变。以上为当时图像的近似量测，非实物尺寸。</p>
              <p>正面提示词节选：“整组 LOGO 宽高缩至当前 65%……整组宽占正面面板约 44%，两侧留白相等，原垂直中心保持。”生成后量测约 46%。</p>
              <p>斜视提示词明确由正面稿确定设备与图案，角度参考仅提供视角、百叶侧面结构和构图，再将两个完整视角合并。</p>
              <p>合并稿仍有流程小字差异，斜视标识约偏右 4px；静态确认不代表精确字形复原、工程或视频验收。“首轮”仅指本次标识修订。</p>
            </div>
          </details>
        </div>
      </section>

      <section id="workflow" className={`${styles.section} ${styles.workflow}`} aria-labelledby="workflow-title">
        <div className={styles.sectionInner}>
          <div className={styles.methodPanel}>
            <header className={styles.sectionHead}>
              <h2 id="workflow-title">可复用的方法</h2>
              <p>把这次修订整理成任务模板，先明确要求，再生成与核对。</p>
            </header>
            <div className={`${styles.bentoGrid} ${styles.methodGrid}`}>
              {methodSteps.map((step) => <article key={step.id} className={`${styles.bentoTile} ${styles.methodCard}`} aria-labelledby={`method-${step.id}-title`}>
                <p className={styles.methodIndex}>{step.number}</p>
                <h3 id={`method-${step.id}-title`}>{step.title}</h3>
                <p className={styles.methodIntro}>{step.description}</p>
                <dl className={styles.methodDetails}>
                  {step.details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
                </dl>
              </article>)}
            </div>
            <div className={styles.methodActions}>
              <p>六字段模板：目标、参考、保留、调整、规格、验收。</p>
              <a className={styles.download} href={siteAsset(assets + "task-template.txt")} download>
                下载完整任务模板
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 18v3h14v-3" /></svg>
              </a>
            </div>
          </div>
        </div>
      </section>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Link href="/#work">← 返回作品</Link>
          <a href="#case-title">回到顶部 ↑</a>
        </div>
      </footer>
    </main>
  </>;
}
