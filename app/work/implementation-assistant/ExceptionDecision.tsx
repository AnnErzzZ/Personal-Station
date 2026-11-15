import Image from '@/components/SiteImage';
import s from './exception-decision.module.css';

/**
 * Chapter 08 body only. The host owns the Chapter / Header and chapter height.
 * Evidence: docs/ASSET_MAP.md HC-06; product nodes 188:25134 / 25184 / 25427.
 * The list → matching device → auto-open detail relationship was user-confirmed
 * in docs/cases/implementation-assistant.md. These stills show different sample
 * objects and cannot verify that transition or automatic repair.
 * User confirmed on 2026-11-15: no central exception notice; operations learned
 * of issues after user complaints, then engineers diagnosed item by item with
 * the operations manual. No measured effect is inferred from that account.
 * Missing evidence: a specific review change / individual contribution and a
 * continuous interaction recording.
 * Rationale below is a portfolio retrospective, not a recovered review record.
 */
export default function ExceptionDecision() {
  return <div className={s.decision} data-exception-decision>
    <div className={s.reason}>
      <p className={s.kicker}>从被动排查，到任务内提醒</p>
      <div><p>原先没有统一的异常提醒。用户发现并投诉后，运维才介入，工程师再按手册逐项排查。</p>
        <p>因此先在配置过程中暴露问题，再把异常数量展开为设备与问题字段，给出继续处理的入口。</p></div>
    </div>

    <div className={s.evidence}>
      <div className={s.overview}>
        <article className={s.card} data-card="exception-summary">
          <header className={s.caption}><span>01 / 发现</span><h3>当前任务有没有问题？</h3>
            <p>分组内显示异常总数与查看入口，配置过程中就能发现待检查项。</p></header>
          <div className={`${s.crop} ${s.notice}`}>
            <Image unoptimized src="/cases/implementation-assistant/displays/Notice.png"
              alt="业务1区分组内显示：当前网络共发现6个设备异常，点击查看"
              width={1136} height={2016} sizes="(max-width: 760px) 100vw, 50vw" />
          </div>
        </article>
        <article className={s.card} data-card="exception-list">
          <header className={s.caption}><span>02 / 定位</span><h3>哪些设备，出了什么问题？</h3>
            <p>名称与异常标签放在同一行。例如“左窗户”掉线，“右窗户”未绑定雷达。</p></header>
          <div className={`${s.crop} ${s.list}`}>
            <Image unoptimized src="/cases/implementation-assistant/displays/Locate.png"
              alt="异常设备列表：条灯未绑定传感器，左窗户掉线，右窗户未绑定雷达"
              width={1136} height={2016} sizes="(max-width: 760px) 100vw, 50vw" />
          </div>
        </article>
      </div>

      <article className={s.detail}>
        <header className={s.caption}><span>03 / 继续处理</span><h3>到对应设备，核对具体字段</h3>
          <p>点击列表项，跳转到对应设备并自动打开详情。绑定对象与问题提示就近呈现，继续检查和配置。</p></header>
        <div className={s.phone}>
          <Image unoptimized src="/cases/implementation-assistant/displays/Handle.png"
            alt="设备详情原稿示例：推窗器的雷达绑定、传感器绑定与湿度温度提示，底部保留保存操作"
            width={1016} height={1776} sizes="(max-width: 760px) 80vw, 28vw" />
        </div>
      </article>
    </div>
    <p className={s.boundary}>三张原稿展示不同状态示例，非同一设备的连续录屏；列表到详情的页面关系已确认。详情用于继续处理，不代表系统自动修复。</p>
  </div>;
}
