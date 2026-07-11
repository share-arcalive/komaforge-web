import { useState } from "react";
import { newStripProject } from "@repo/editor";
import {
  CUT_TEMPLATE_COUNTS,
  STRIP_DEFAULT_WIDTH,
  STRIP_MAX_WIDTH,
  STRIP_MIN_WIDTH,
  clampStripWidth,
} from "@repo/core";

/** 새 문서 시작 다이얼로그 — 페이지 수(4/8/12/16) 템플릿 + 스트립 너비 선택. */
export function NewDocDialog({ onClose }: { onClose: () => void }) {
  const [width, setWidth] = useState(STRIP_DEFAULT_WIDTH);

  const start = (cutCount: number) => {
    newStripProject(cutCount, clampStripWidth(width));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[420px] max-w-[92vw] rounded-lg border border-line bg-surface p-4 shadow-xl">
        <div className="mb-1 text-sm font-semibold text-ink">새 문서 시작</div>
        <p className="mb-3 text-xs text-ink-muted">
          페이지를 세로로 이어붙여 편집합니다. 시작할 페이지 수를 고르세요 — 나중에 언제든 페이지를
          추가/삭제할 수 있습니다.
        </p>

        <div className="mb-3 grid grid-cols-4 gap-2">
          {CUT_TEMPLATE_COUNTS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => start(n)}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-line bg-raised px-2 py-3 text-ink-muted transition-colors hover:border-primary hover:text-ink"
            >
              {/* 페이지 스택 미니 프리뷰 */}
              <span className="flex w-7 flex-col gap-[2px]">
                {Array.from({ length: Math.min(n, 6) }, (_, i) => (
                  <span key={i} className="h-[5px] w-full rounded-[1px] bg-current opacity-50" />
                ))}
                {n > 6 && <span className="text-center text-[8px] leading-none">⋮</span>}
              </span>
              <span className="text-xs font-semibold">{n}페이지</span>
            </button>
          ))}
        </div>

        <label className="mb-1 block text-xs text-ink-muted">
          스트립 너비 ({STRIP_MIN_WIDTH}–{STRIP_MAX_WIDTH}px)
        </label>
        <div className="mb-3 flex items-center gap-2">
          <input
            type="range"
            min={STRIP_MIN_WIDTH}
            max={STRIP_MAX_WIDTH}
            step={10}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="flex-1"
          />
          <input
            type="number"
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-20 rounded border border-line bg-raised px-1.5 py-1 text-xs text-ink"
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => start(1)}
            className="text-xs text-ink-faint underline-offset-2 hover:text-ink hover:underline"
          >
            빈 문서(페이지 1개)로 시작
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-muted hover:bg-raised"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
