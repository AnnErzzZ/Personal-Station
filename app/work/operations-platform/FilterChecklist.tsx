import OriginalControl from "./OriginalControl";
import s from "./page.module.css";

export default function FilterChecklist({ label, options, values, onChange }: {
  label: string; options: string[]; values: string[]; onChange: (values: string[]) => void;
}) {
  return <div className={s.multiFilter}><span>{label}</span><OriginalControl options={{ kind: "multi", label, options: options.map((value) => ({ label: value, value })), value: values, placeholder: "全部" }} onChange={(value) => onChange(value as string[])} /></div>;
}
