'use client';

import { useEffect, useRef } from 'react';
import { IconChevronDown, IconClipboardList, IconDatabase, IconPackage, IconTruckDelivery } from '@tabler/icons-react';
import { getNavigation, navigationGroups, type View } from './navigation';
import s from './erp.module.css';

const moduleIcons = { sales: IconClipboardList, purchase: IconTruckDelivery, inventory: IconPackage, master: IconDatabase };

export default function ErpNavigation({ view, pendingCount, onNavigate }: { view: View; pendingCount: number; onNavigate: (view: View) => void }) {
  const ref = useRef<HTMLElement>(null);
  const active = getNavigation(view);
  useEffect(() => {
    // Cross-module links reveal the destination even if its group was collapsed.
    const group = ref.current?.querySelector<HTMLDetailsElement>(`[data-module="${getNavigation(view).groupId}"]`);
    if (group) group.open = true;
  }, [view]);

  return <nav ref={ref} className={s.moduleNav} aria-label="ERP 主导航">
    {navigationGroups.map(group => {
      const Icon = moduleIcons[group.id];
      return <details key={group.id} className={s.navModule} data-module={group.id} open>
        <summary className={`${s.moduleTitle} ${active.groupId === group.id ? s.moduleActive : ''}`}><Icon size={18} stroke={1.7} /><span>{group.label}</span><IconChevronDown className={s.moduleChevron} size={14} aria-hidden="true" /></summary>
        <div className={s.moduleItems}>
          {group.items.map(item => <button type="button" key={item.id} data-view={item.id} className={`${s.navItem} ${view === item.id ? s.navActive : ''}`} aria-current={view === item.id ? 'page' : undefined} onClick={() => onNavigate(item.id)}>{item.label}{item.id === 'shipping' && pendingCount > 0 && <span className={s.navCount}>{pendingCount}</span>}</button>)}
        </div>
      </details>;
    })}
  </nav>;
}
