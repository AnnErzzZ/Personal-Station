import type { Metadata } from 'next';
import CurrentCase from './CurrentCase';
export const metadata: Metadata = { title: '合一空间 OS · 交互设计', description: '地图编辑器、多视图与 Agent：连接空间、设备和数据的工作台。' };
export default function Page() { return <CurrentCase />; }
