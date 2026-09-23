export const STORY_SECTION_KEYS = ["hero", "about", "work", "contact"] as const;

export type StorySectionKey = (typeof STORY_SECTION_KEYS)[number];

export type SectionMotionPhase =
  | "hidden"
  | "entering"
  | "entered"
  | "exiting";

export const SECTION_ENTER_MS: Record<StorySectionKey, number> = {
  hero: 1140,
  about: 940,
  work: 720,
  contact: 1000,
};

export const SECTION_EXIT_MS = 220;

export type MotionScheduler = {
  setTimeout(callback: () => void, delay: number): number;
  clearTimeout(token: number): void;
};

type SectionRecord = {
  phase: SectionMotionPhase;
  generation: number;
  timer: number | null;
};

type StoryUiMotionOptions = {
  scheduler: MotionScheduler;
  reducedMotion?: boolean;
  onPhaseChange: (
    section: StorySectionKey,
    phase: SectionMotionPhase,
  ) => void;
};

export function createStoryUiMotionController({
  scheduler,
  reducedMotion = false,
  onPhaseChange,
}: StoryUiMotionOptions) {
  const records = Object.fromEntries(
    STORY_SECTION_KEYS.map((section) => [
      section,
      { phase: "hidden", generation: 0, timer: null },
    ]),
  ) as Record<StorySectionKey, SectionRecord>;

  let disposed = false;

  const cancelTimer = (record: SectionRecord) => {
    if (record.timer === null) return;
    scheduler.clearTimeout(record.timer);
    record.timer = null;
  };

  const setPhase = (
    section: StorySectionKey,
    phase: SectionMotionPhase,
  ) => {
    const record = records[section];
    if (record.phase === phase) return;
    record.phase = phase;
    if (!disposed) onPhaseChange(section, phase);
  };

  const scheduleCompletion = (
    section: StorySectionKey,
    generation: number,
    delay: number,
    phase: SectionMotionPhase,
  ) => {
    const record = records[section];
    record.timer = scheduler.setTimeout(() => {
      if (disposed || record.generation !== generation) return;
      record.timer = null;
      setPhase(section, phase);
    }, delay);
  };

  return {
    enter(section: StorySectionKey) {
      if (disposed) return;
      const record = records[section];
      if (record.phase === "entering" || record.phase === "entered") return;

      cancelTimer(record);
      record.generation += 1;

      if (record.phase === "exiting" || reducedMotion) {
        setPhase(section, "entered");
        return;
      }

      setPhase(section, "entering");
      scheduleCompletion(
        section,
        record.generation,
        SECTION_ENTER_MS[section],
        "entered",
      );
    },

    exit(section: StorySectionKey) {
      if (disposed) return;
      const record = records[section];
      if (record.phase === "hidden" || record.phase === "exiting") return;

      cancelTimer(record);
      record.generation += 1;

      if (reducedMotion) {
        setPhase(section, "hidden");
        return;
      }

      setPhase(section, "exiting");
      scheduleCompletion(
        section,
        record.generation,
        SECTION_EXIT_MS,
        "hidden",
      );
    },

    hide(section: StorySectionKey) {
      if (disposed) return;
      const record = records[section];
      if (record.phase === "hidden" && record.timer === null) return;
      cancelTimer(record);
      record.generation += 1;
      setPhase(section, "hidden");
    },

    phaseOf(section: StorySectionKey) {
      return records[section].phase;
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      for (const section of STORY_SECTION_KEYS) {
        const record = records[section];
        cancelTimer(record);
        record.generation += 1;
      }
    },
  };
}
