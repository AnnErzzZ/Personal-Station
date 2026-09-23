import Image from "@/components/SiteImage";

import EntranceSequence from "./EntranceSequence";
import styles from "./knowledge-base.module.css";

const ASSET_BASE = "/cases/implementation-assistant/06-knowledge-base";

export default function KnowledgeBase() {
  return (
    <section className={styles.section} aria-labelledby="knowledge-base-title">
      <div className={styles.stage}>
        <EntranceSequence
          className={styles.header}
          name="section-06-header"
        >
          <div
            className={styles.meta}
            data-entrance-item
            data-entrance-step="identity"
            data-entrance-variant="fade"
          >
            <span>Implementation Assistant</span>
            <span>06/08</span>
          </div>
          <h2
            className={styles.title}
            data-entrance-item
            data-entrance-step="title"
            data-entrance-variant="opacity"
            id="knowledge-base-title"
          >
            新实施人员不必只靠口传
          </h2>
          <p
            className={styles.body}
            data-entrance-item
            data-entrance-step="support"
            data-entrance-variant="opacity"
          >
            产品上线后，界面只能解决“正在操作时怎么做”，但设备配置、异常判断和现场交付里仍然有大量需要被解释的细节。
            <br className={styles.bodyBreak} />
            我把产品流程、配置方法、常见问题和处理方式整理成图文知识资料，用于实施交接与培训；新实施人员遇到不确定的设备或现象时，按章节就能找到对应说明，不需要先问同事。
          </p>
        </EntranceSequence>

        <EntranceSequence
          as="figure"
          className={styles.article}
          name="section-06-article"
          selfStep="primary"
          selfVariant="content"
        >
          <Image
            alt="实施助手图文使用手册中「添加网关」章节：从进入配网页面到常见问题的分步说明"
            className={styles.articleImage}
            height={1409}
            sizes="864px"
            src={`${ASSET_BASE}/feishu-help-doc.png`}
            unoptimized
            width={1726}
          />
        </EntranceSequence>
      </div>
    </section>
  );
}
