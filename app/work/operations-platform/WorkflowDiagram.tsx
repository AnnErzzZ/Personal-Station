import { useId } from "react";
import {
  IconCircleCheck, IconClipboardList, IconRefresh, IconSettings,
  IconShieldCheck, IconUsers, IconGitBranch,
} from "@tabler/icons-react";
import s from "./workflow-diagram.module.css";

const ARROW_HEAD = "M1.8 1.2 Q.8 .7 .8 1.8 V8.2 Q.8 9.3 1.8 8.8 L6.4 5.8 Q7.6 5 6.4 4.2 Z";

export default function WorkflowDiagram() {
  const id = useId().replace(/:/g, "");
  return <div className={s.canvas} data-workflow-diagram>
    <div className={s.viewport}>
      <div className={s.diagram} role="group" aria-label="工单流转：自动生成或人工创建，领取或派发，处理与记录，提交结果；无需审批时完成归档，需要审批时由主管审批，通过后归档，退回时补充处理记录。">
        <svg className={s.lines} viewBox="0 0 1360 560" aria-hidden="true">
          <defs>
            {[["main", "#5478e5"], ["review", "#ae7a29"], ["return", "#8a96aa"], ["complete", "#3f917b"]].map(([name, color]) =>
              <marker key={name} id={`${id}-${name}`} markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" refX="7" refY="5" orient="auto"><path d={ARROW_HEAD} fill={color} stroke="none" /></marker>)}
          </defs>
          <g className={s.mainLines} fill="none" strokeWidth="1.6" markerEnd={`url(#${id}-main)`}>
            <path d="M162 118 H218 C276 118 260 211 318 211" />
            <path d="M162 334 H218 C276 334 260 241 318 241" />
            <path d="M402 226 H558" /><path d="M642 226 H798" /><path d="M882 226 H982" />
            <path d="M1066 226 H1194" />
          </g>
          <path className={s.reviewLine} d="M1024 334 V380" fill="none" strokeWidth="1.6" markerEnd={`url(#${id}-review)`} />
          <path className={s.completeLine} d="M1066 422 H1178 Q1236 422 1236 364 V334" fill="none" strokeWidth="1.6" markerEnd={`url(#${id}-complete)`} />
          <path className={s.returnLine} d="M982 422 H658 Q600 422 600 364 V334" fill="none" strokeWidth="1.6" markerEnd={`url(#${id}-return)`} />
        </svg>
        <div className={`${s.node} ${s.system}`}><div className={s.tile}><IconRefresh /></div><strong>系统自动生成</strong><small>合并当天同类异常</small></div>
        <div className={`${s.node} ${s.manual}`}><div className={s.tile}><IconClipboardList /></div><strong>人工创建</strong><small>填写问题详情</small></div>
        <div className={`${s.node} ${s.assignment}`}><div className={s.tile}><IconUsers /></div><strong>领取 / 派发</strong><small>确定工单负责人</small></div>
        <div className={`${s.node} ${s.processing}`}><div className={s.tile}><IconSettings /></div><strong>处理与记录</strong><small>需到场时指定现场人员</small></div>
        <div className={`${s.node} ${s.submit}`}><div className={s.tile}><IconClipboardList /></div><strong>提交处理结果</strong><small>判断是否需要审批</small></div>
        <div className={`${s.node} ${s.decision}`}><div className={s.tile}><IconGitBranch /></div><strong>需要审批？</strong><small>按工单类型判断</small></div>
        <span className={`${s.label} ${s.noReview}`}>无需审批</span>
        <span className={`${s.label} ${s.needsReview}`}>需要审批</span>
        <span className={`${s.label} ${s.approved}`}>审批通过</span>
        <span className={`${s.label} ${s.returned}`}>退回补充</span>
        <span className={s.criteria}>线下 / 人工 / 指标 / 多设备</span>
        <div className={`${s.node} ${s.review}`}><div className={s.tile}><IconShieldCheck /></div><strong>主管审批</strong><small>通过或退回补充</small></div>
        <div className={`${s.node} ${s.complete}`}><div className={s.tile}><IconCircleCheck /></div><strong>完成并归档</strong><small>保存处理记录与人员贡献</small></div>
      </div>
    </div>
    <ol className={s.mobile} aria-label="工单流转步骤">
      <li><span className={s.mobileTile}><IconClipboardList /></span><strong>自动生成 / 人工创建</strong><p>合并当天同类异常，或填写问题详情。</p><StepArrow /></li>
      <li><span className={s.mobileTile}><IconUsers /></span><strong>领取 / 派发</strong><p>工程师或主管自领，主管派单需指定负责人。</p><StepArrow /></li>
      <li><span className={s.mobileTile}><IconSettings /></span><strong>处理与记录</strong><p>需要到场时，另选现场处理人。</p><StepArrow /></li>
      <li><span className={s.mobileTile}><IconClipboardList /></span><strong>提交处理结果</strong><p>负责人跟进并提交处理结果。</p><StepArrow /></li>
      <li className={s.mobileReview}><span className={s.mobileTile}><IconGitBranch /></span><strong>判断是否需要审批</strong><p>常规单设备线上工单直接完成。</p><div><IconShieldCheck size={19} /><p>线下、人工、指标或多设备工单由主管审批，退回后继续处理。</p></div><StepArrow /></li>
      <li className={s.mobileComplete}><span className={s.mobileTile}><IconCircleCheck /></span><strong>完成并归档</strong><p>保存完成记录，计入人员贡献。</p></li>
    </ol>
  </div>;
}

function StepArrow() {
  return <svg className={s.mobileArrow} width="16" height="32" viewBox="0 0 16 32" aria-hidden="true"><path d="M8 0 V26" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d={ARROW_HEAD} transform="translate(13 23) rotate(90)" fill="currentColor" /></svg>;
}
