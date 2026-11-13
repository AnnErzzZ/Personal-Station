import type { Metadata } from "next";
import CaseNav from "../CaseNav";
import OperationsCaseStudy from "./OperationsCaseStudy";

export const metadata: Metadata = {
  title: "合一运维平台 · 项目案例",
  description: "运维后台 UI 与交互设计案例：异常看板、工单列表、详情与表单的信息层级，以及筛选、状态反馈和审批交互。",
};

export default function OperationsPlatformPage() {
  return <main><CaseNav projectLabel="合一运维平台" darkHeroSelector="#overview" darkSectionSelector="[data-operations-dark]" /><OperationsCaseStudy /></main>;
}
