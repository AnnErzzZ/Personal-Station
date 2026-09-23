"use client";

import Image from "@/components/SiteImage";
import type { CSSProperties, KeyboardEvent } from "react";
import { useRef, useState } from "react";

import {
  ANSWER_IMAGE,
  ANSWER_PARTS,
  getNextAnswerPartId,
  type AnswerPartId,
} from "./answer-structure";
import { focusInset, focusInsetVars } from "./focus-inset";
import styles from "./sections.module.css";

const cx = (...values: Array<string | false | undefined>) =>
  values.filter(Boolean).join(" ");

/** 10 章高亮框不加内缩：focus 坐标已含外扩留白（不贴边、不压邻段），遮罩 = 框 = focus。 */
const ANSWER_INSET = { x: 0, y: 0 } as const;

/**
 * 10 / 12 的主舞台：左侧六段结构索引，右侧同一份完整真实回答。
 * Hover 临时点亮对应区域，Click 锁定；切换只动遮罩和 Focus 框，
 * 底图本身不缩放、不模糊、不换图。
 */
export default function AnswerStructureStage() {
  const [lockedId, setLockedId] = useState<AnswerPartId>("conclusion");
  const [previewId, setPreviewId] = useState<AnswerPartId | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeId = previewId ?? lockedId;

  const scrollFocusIntoView = (id: AnswerPartId) => {
    const viewport = viewportRef.current;
    const part = ANSWER_PARTS.find((item) => item.id === id);
    if (!viewport || !part || viewport.scrollWidth <= viewport.clientWidth) return;

    const focusCenter = (part.focus.y + part.focus.height / 2) / ANSWER_IMAGE.height;
    viewport.scrollTo({
      top: (viewport.scrollHeight - viewport.clientHeight) * focusCenter,
      behavior: "smooth",
    });
  };

  const lock = (id: AnswerPartId) => {
    setLockedId(id);
    setPreviewId(null);
    scrollFocusIntoView(id);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const nextId = getNextAnswerPartId(lockedId, event.key);
    if (nextId === lockedId) return;

    event.preventDefault();
    lock(nextId);
    const nextIndex = ANSWER_PARTS.findIndex((part) => part.id === nextId);
    itemRefs.current[nextIndex]?.focus();
  };

  const activePart = ANSWER_PARTS.find((part) => part.id === activeId)!;
  const { x, y, width, height } = activePart.focus;
  // focus 坐标已是「内容列宽 + 内容 bbox 外扩留白」的最终高亮矩形：遮罩与
  // 木框都按它画，无内缩（交付宽度 678 仅作 focusInset 的占位参数）。
  const inset = focusInset(activePart.focus, { ...ANSWER_IMAGE, deliveredWidth: 678 }, ANSWER_INSET.x, ANSWER_INSET.y);

  return (
    <div className={styles.answerLayout} data-answer-stage-root="">
      <ol
        className={styles.answerIndex}
        aria-label="Agent 回答的六段结构"
        data-answer-index=""
        onPointerLeave={() => setPreviewId(null)}
      >
        {ANSWER_PARTS.map((part, index) => {
          const active = part.id === activeId;
          const locked = part.id === lockedId;
          return (
            <li
              className={cx(styles.answerIndexItem, active && styles.answerIndexItemActive)}
              key={part.id}
            >
              <button
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                type="button"
                className={styles.answerIndexButton}
                aria-controls="answer-structure-panel"
                aria-pressed={locked}
                data-answer-part={part.id}
                onClick={() => lock(part.id)}
                onFocus={() => setPreviewId(part.id)}
                onBlur={() => setPreviewId(null)}
                onPointerEnter={() => setPreviewId(part.id)}
                onKeyDown={handleKeyDown}
              >
                <span className={styles.answerIndexHead}>
                  <span className={styles.answerIndexNo}>{part.index}</span>
                  <span className={styles.answerIndexName} data-part-name="">{part.name}</span>
                </span>
                <span className={styles.answerIndexBody}>{part.body}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <figure className={styles.answerFigure}>
        <div className={styles.answerViewport} ref={viewportRef} data-answer-viewport="">
          <div
            className={styles.answerCanvas}
            id="answer-structure-panel"
            role="region"
            aria-label={`Agent 回答当前关注区域：${activePart.name}`}
            data-answer-focus={activeId}
            data-frame-inset={`${inset.negX} / ${inset.negY}`}
            style={
              {
                "--answer-focus-x": `${(x / ANSWER_IMAGE.width) * 100}%`,
                "--answer-focus-y": `${(y / ANSWER_IMAGE.height) * 100}%`,
                "--answer-focus-width": `${(width / ANSWER_IMAGE.width) * 100}%`,
                "--answer-focus-height": `${(height / ANSWER_IMAGE.height) * 100}%`,
                ...focusInsetVars("answer", inset),
              } as CSSProperties
            }
          >
            <Image
              className={styles.answerImage}
              src={ANSWER_IMAGE.src}
              alt={ANSWER_IMAGE.alt}
              width={ANSWER_IMAGE.width}
              height={ANSWER_IMAGE.height}
              sizes="(max-width: 720px) 920px, (max-width: 1180px) calc(100vw - 96px), 640px"
              quality={100}
              unoptimized
              data-answer-image=""
            />
            {/* 遮罩 = 高亮框的超大扩散 box-shadow（洞随框圆角），无独立遮罩层。 */}
            <span className={styles.answerFocus} aria-hidden="true" data-answer-focus-box="" />
          </div>
        </div>
      </figure>
    </div>
  );
}
