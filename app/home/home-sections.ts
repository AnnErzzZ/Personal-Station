export const HOME_SECTIONS = [
  {
    id: "top",
    title: "ZIRONG WU",
    // 粒子转场采样用：Hero 大标题是多行堆叠，粒子按这里的显式换行逐行采样，
    // 与 #hero-name 的 DOM 断行保持一致（title 仍是短标签，供页码指示器显示）。
    dustTitle: "MAKING\nCOMPLEX\nCLEAR.",
    selector: "#hero-name",
    tone: "#ffffff",
  },
  { id: "about", title: "ABOUT", selector: "#about-title", tone: "#f5f5f2" },
  { id: "work", title: "SELECTED WORK", selector: "#work-title", tone: "#eceff1" },
  { id: "contact", title: "CONTACT", selector: "#contact-title", tone: "#111113" },
] as const;

export type HomeSectionIndex = 0 | 1 | 2 | 3;
export type TransitionPhase =
  | "idle"
  | "exiting"
  | "morphing"
  | "preparing"
  | "entering";

export type HomeTransition = {
  from: HomeSectionIndex;
  to: HomeSectionIndex;
  progress: number;
  running: boolean;
  sequence: number;
};
