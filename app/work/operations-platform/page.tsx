import type { Metadata } from "next";
import CaseNav from "../CaseNav";
import OperationsCaseStudy from "./OperationsCaseStudy";

export const metadata: Metadata = {
  title: "合一运维平台 · 项目案例",
  description: "合一运维平台项目案例：项目健康度与异常追踪、工单领取与现场协作、处理后审批，以及可追溯到工单的人员贡献统计。",
};

export default function OperationsPlatformPage() {
  return <main><CaseNav projectLabel="合一运维平台" darkHeroSelector="#overview" darkSectionSelector="[data-operations-dark]" /><OperationsCaseStudy /></main>;
}
