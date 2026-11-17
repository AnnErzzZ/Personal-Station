import Link from 'next/link';
import CaseNav from '../CaseNav';
import CaseExperience from './CaseExperience';
import EditorialSections, { chapterTitles } from './EditorialSections';
import styles from './current.module.css';

export default function CurrentCase() {
  return <main className={styles.case}>
    <CaseNav projectLabel="HEYISPACE OS" />
    <a className={styles.skip} href="#chapter-02">跳至案例内容</a>
    <div className={styles.background} data-case-background aria-hidden="true" />
    <CaseExperience chapters={chapterTitles.map((title, i) => ({ id: String(i + 1).padStart(2, '0'), title }))}>
      <EditorialSections />
      <footer className={styles.footer}><Link href="/#work">返回作品</Link><a href="#chapter-01">返回顶部 ↑</a></footer>
    </CaseExperience>
  </main>;
}
