import type { Metadata } from 'next';
import ErpWorkspace from './ErpWorkspace';

export const metadata: Metadata = {
  title: { absolute: '序仓 ERP · 销售与库存' },
  description: '销售开单、整单出库与库存追溯，本地 ERP 最小工作区。',
  robots: { index: false, follow: false },
};

export default function ErpPage() { return <ErpWorkspace />; }
