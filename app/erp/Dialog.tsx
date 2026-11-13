'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { IconX } from '@tabler/icons-react';
import s from './erp.module.css';

export default function Dialog({ title, children, onClose, wide = false, busy = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className={`${s.dialog} ${wide ? s.wideDialog : ''}`} aria-labelledby="erp-dialog-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} onClick={event => {
    // Child buttons also bubble keyboard-generated clicks with coordinates (0, 0).
    // Only a pointer click targeting the dialog backdrop may dismiss it.
    if (event.target !== event.currentTarget || event.detail === 0) return;
    const box = event.currentTarget.getBoundingClientRect();
    if (!busy && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) onClose();
  }}>
    <header className={s.dialogHead}><h2 id="erp-dialog-title">{title}</h2><button className={s.iconButton} type="button" aria-label="关闭对话框" onClick={onClose} disabled={busy}><IconX size={20} /></button></header>
    {children}
  </dialog>;
}
