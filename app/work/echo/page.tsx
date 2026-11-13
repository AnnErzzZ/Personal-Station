import type { Metadata } from "next";
import CaseNav from "../CaseNav";
import EchoCase from "./EchoCase";
export const metadata: Metadata = { title: "回声 · 语音房社交设计 | Zirong Wu", description: "回声语音社交 App 的交互、视觉与原型设计探索。" };
export default function Page() { return <><CaseNav projectLabel="回声" darkSectionSelector="[data-echo-case]" /><EchoCase /></>; }
