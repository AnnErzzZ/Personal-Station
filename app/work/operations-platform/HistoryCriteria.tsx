import NucleoIcon from "./NucleoIcon";
import c from "./history-criteria.module.css";

const criteria = [
  { id: "continuous", title: "连续异常", text: "按设备连续异常的天数统计，工单清单显示关联设备中的最长值；每天生成新单不会重置。" },
  { id: "recurrence", title: "异常次数", text: "同一次持续异常只计一次；恢复后再次发生，增加一次异常记录。" },
  { id: "room", title: "房间历史", text: "按房间汇总各类历史工单，与单台设备的异常次数分别统计。" },
] as const;

export default function HistoryCriteria() {
  return <div className={c.grid} aria-label="异常记录口径" data-history-criteria>
    {criteria.map(({ id, title, text }) => <article className={c.card} key={id} data-history-criterion={id}>
      <div className={c.artwork} aria-hidden="true">
        {id === "room" ? <div className={c.roomDiagram}>
          <svg viewBox="0 0 360 200" className={c.connections}><path d="M112 100H150Q184 100 184 65V54Q184 38 200 38H226M150 100H226M150 100Q184 100 184 135V146Q184 162 200 162H226" /></svg>
          <div className={c.roomNode}><NucleoIcon name="office" size={30} /></div>
          {["first", "second", "third"].map(position => <div key={position} className={`${c.record} ${c[position]}`}><i /><span /><span /></div>)}
        </div> : <svg viewBox="0 0 360 200" className={c.timeline}>
          <path d="M62 105H298" className={c.connections} />
          {id === "continuous" ? <>
            <rect x="109" y="35" width="142" height="40" rx="8" className={c.panel} />
            <text x="180" y="61" textAnchor="middle" className={c.label}>连续累计</text>
            {[62, 180, 298].map(x => <circle key={x} cx={x} cy="105" r="5" className={c.abnormal} />)}
            <circle cx="298" cy="105" r="15" className={c.halo} />
            <text x="62" y="150" textAnchor="middle" className={c.label}>发生</text>
            <text x="298" y="150" textAnchor="middle" className={c.label}>未恢复</text>
          </> : <>
            <circle cx="62" cy="105" r="5" className={c.abnormal} />
            <circle cx="180" cy="105" r="5" className={c.recovered} />
            <circle cx="298" cy="105" r="5" className={c.abnormal} />
            <path d="M62 70V48H298V70" className={c.historyTrail} />
            <text x="62" y="150" textAnchor="middle" className={c.label}>异常</text>
            <text x="180" y="150" textAnchor="middle" className={c.label}>恢复</text>
            <text x="298" y="150" textAnchor="middle" className={c.label}>复发</text>
          </>}
        </svg>}
      </div>
      <div className={c.copy}><h3>{title}</h3><p>{text}</p></div>
    </article>)}
  </div>;
}
