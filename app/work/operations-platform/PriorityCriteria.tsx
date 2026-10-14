import s from "./page.module.css";

const GRADES = [
  ["战略项目", "优先关注的项目"],
  ["重要项目", "已缴运维费的项目至少属于这一等级"],
  ["一般项目", "未缴运维费或运维费已到期的项目"],
];
const BANDS = [
  ["紧急", "＜60", "red"], ["严重", "60～＜70", "amber"],
  ["异常", "70～＜80", "blue"], ["良好", "80～＜90", "green"], ["优秀", "≥90", "green"],
];

export default function PriorityCriteria() {
  return <div className={s.priorityCriteria}>
    <article className={s.gradeCriterion} aria-labelledby="project-grade-title">
      <div className={s.criterionVisual}><div className={s.criterionPanel}>
        <ol className={s.projectGradeList}>{GRADES.map(([name, description]) => <li key={name}><strong>{name}</strong><span>{description}</span></li>)}</ol>
      </div></div>
      <div className={s.criterionCopy}>
        <h3 id="project-grade-title">项目等级</h3>
        <p>区分项目的业务重要程度。</p>
      </div>
    </article>
    <article className={s.healthCriterion} aria-labelledby="project-health-title">
      <div className={s.criterionVisual}><div className={s.criterionPanel}>
      <div className={s.healthExample}><div><strong>58</strong><span>/ 100 分</span></div><p>南山总部 · 紧急<br /><small>100 − 设备异常 35 − 指标异常 7</small></p></div>
      <div className={s.healthScale} aria-label="健康度分为紧急、严重、异常、良好和优秀五档">{BANDS.map(([name, range, tone]) => <div key={name} data-tone={tone}><strong>{name}</strong><span>{range}<small>分</small></span></div>)}</div>
      </div></div>
      <div className={s.criterionCopy}>
        <h3 id="project-health-title">项目健康度</h3>
        <p>反映当前异常情况，分数越低，越需要关注。设备异常按异常设备数扣分；节能率、自动率等指标按数值与阈值扣分。合并工单后，扣分依据仍然保留。</p>
      </div>
    </article>
  </div>;
}
