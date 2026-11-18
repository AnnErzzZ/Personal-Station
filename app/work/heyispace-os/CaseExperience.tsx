/* eslint-disable @next/next/no-img-element */
'use client';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import styles from './current.module.css';
export default function CaseExperience({ children, chapters }: {
    children: ReactNode;
    chapters: {
        id: string;
        title: string;
    }[];
}) {
    const root = useRef<HTMLDivElement>(null), dialog = useRef<HTMLDialogElement>(null), opener = useRef<HTMLElement | null>(null);
    const [zoom, setZoom] = useState(false);
    const [image, setImage] = useState({ src: '', label: '' });
    const [active, setActive] = useState('01');
    const [paused, setPaused] = useState(false);
    useEffect(() => {
        const el = root.current;
        if (!el)
            return;
        const sections = [...el.querySelectorAll<HTMLElement>('[data-chapter]')];
        const reduce = matchMedia('(prefers-reduced-motion: reduce)');
        const observer = new IntersectionObserver(entries => { for (const entry of entries) {
            const target = entry.target as HTMLElement;
            target.dataset.inview = String(entry.isIntersecting);
            target.querySelector<HTMLElement>("[data-function-structure]")?.setAttribute("data-active",String(entry.isIntersecting));
            if (entry.isIntersecting) {
                target.dataset.seen = 'true';
            }
        }
            const readingLine = window.innerHeight * .1;
            const current = sections.find(section => section.getBoundingClientRect().bottom > readingLine) ?? sections.at(-1);
            if (current)
                setActive(current.dataset.chapter!);
        }, { rootMargin: '-10% 0px -30% 0px', threshold: 0 });
        sections.forEach(s => observer.observe(s));
        const visibility = () => { el.dataset.hidden = String(document.hidden);el.querySelector<HTMLElement>("[data-function-structure]")?.setAttribute("data-motion-paused",String(document.hidden)); };
        document.addEventListener('visibilitychange', visibility);
        const click = (event: MouseEvent) => {
            const preview = (event.target as HTMLElement).closest<HTMLElement>('[data-preview]');
            if (!preview)
                return;
            opener.current = preview;
            setZoom(false);
            setImage({ src: preview.dataset.preview!, label: preview.dataset.previewLabel! });
            dialog.current?.showModal();
        };
        const sync = () => { el.dataset.reduced = String(reduce.matches); };
        sync();
        reduce.addEventListener('change', sync);
        el.addEventListener('click', click);
        return () => { observer.disconnect(); el.removeEventListener('click', click); reduce.removeEventListener('change', sync); document.removeEventListener('visibilitychange', visibility); };
    }, []);
    const close = () => { dialog.current?.close(); opener.current?.focus(); };
    return <div ref={root} className={styles.experience} data-paused={paused}><nav className={styles.readerNav} aria-label="案例章节"><details><summary>{active} / 14　章节目录</summary><div>{chapters.map(c => <a key={c.id} href={`#chapter-${c.id}`} aria-current={active === c.id ? 'location' : undefined} onClick={e => e.currentTarget.closest('details')?.removeAttribute('open')}>{c.id}　{c.title}</a>)}</div></details><button onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? '播放微动画' : '暂停微动画'}</button></nav>{children}<dialog ref={dialog} className={styles.dialog} onClick={e => { if (e.target === e.currentTarget)
        close(); }} onClose={() => opener.current?.focus()}><div className={styles.dialogBar}><p>{image.label}</p><button onClick={() => setZoom(!zoom)} aria-pressed={zoom}>{zoom ? '适应窗口' : '原始尺寸'}</button><button onClick={close} aria-label="关闭放大预览">关闭 ×</button></div>{image.src ? <img src={image.src} alt={image.label} style={zoom ? { width: 'auto', maxWidth: 'none' } : undefined} width="1600" height="1200"/> : null}</dialog></div>;
}
