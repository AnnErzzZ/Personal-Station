import type { Metadata } from 'next';
import CaseNav from '../CaseNav';
import ErpCaseStudy from './ErpCaseStudy';
export const metadata: Metadata = { title: '合一智控 ERP · 作品集', description: '面向设备采购、销售与库存的业务流程与交互设计。平台原型，示例数据。' };
export default function Page(){return <><CaseNav projectLabel="合一智控 ERP"/><ErpCaseStudy/></>}
