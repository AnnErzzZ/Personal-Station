import OriginalControl from "./OriginalControl";
import s from "./page.module.css";

export const PERSONNEL = [
  { id: "YW-017", name: "林工程师", team: "深圳运维组", phone: "138****0017" },
  { id: "YW-023", name: "陈工程师", team: "深圳运维组", phone: "138****0023" },
  { id: "YW-031", name: "周工程师", team: "杭州运维组", phone: "138****0031" },
  { id: "YW-046", name: "赵工程师", team: "广州运维组", phone: "138****0046" },
];
export type Personnel = (typeof PERSONNEL)[number];

export default function PersonnelPicker({ person, onSelect, disabled, unclaimed, label = "处理人员", placeholder, hint }: {
  person: Personnel | null; onSelect: (person: Personnel) => void; disabled: boolean; unclaimed: boolean;
  label?: string; placeholder?: string; hint?: string;
}) {
  return <div className={s.personPicker} data-person-picker>
    <span>{label}</span>
    <OriginalControl options={{ kind: "person", label, value: unclaimed ? "" : person?.name ?? "", selectedName: unclaimed ? "" : person?.name ?? "", options: PERSONNEL, disabled,
      placeholder: placeholder ?? (unclaimed ? "请先领取工单" : "搜索姓名、手机号或工号") }} onChange={(id) => { const selected = PERSONNEL.find((item) => item.id === id); if (selected) onSelect(selected); }} />
    {hint !== "" && <small className={s.personHint}>{hint ?? (person && !unclaimed ? `工号 ${person.id}` : "尚未选择人员")}</small>}
  </div>;
}
