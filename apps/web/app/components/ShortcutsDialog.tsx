import { useEffect, useState } from "react";
import {
  SHORTCUT_DEFS,
  captureGesture,
  getGesture,
  resetGestures,
  setGesture,
  subscribeShortcuts,
} from "../lib/shortcuts";

/** 단축키 편집 모달(원본 ShowPreferencesDialog의 단축키 탭). 변경은 즉시 저장된다. */
export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const [capturingId, setCapturingId] = useState<string | null>(null);
  const [, force] = useState(0);

  // 단축키 변경 시 다시 그린다.
  useEffect(() => subscribeShortcuts(() => force((n) => n + 1)), []);

  // 캡처 모드: 캡처 단계(capture phase)에서 키를 가로채 전역 단축키보다 먼저 처리한다.
  useEffect(() => {
    if (!capturingId) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      const k = e.key;
      if (k === "Control" || k === "Alt" || k === "Shift" || k === "Meta") return; // 수정자 대기
      if (k === "Escape") {
        setCapturingId(null);
        return;
      }
      if (k === "Delete" || k === "Backspace") {
        setGesture(capturingId, ""); // 없음
        setCapturingId(null);
        return;
      }
      const g = captureGesture(e);
      if (g) setGesture(capturingId, g);
      setCapturingId(null);
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [capturingId]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[420px] max-w-[92vw] rounded-lg border border-line bg-surface p-4 shadow-xl">
        <div className="mb-1 text-sm font-semibold text-ink">단축키</div>
        <p className="mb-3 text-xs text-ink-muted">
          항목을 클릭한 뒤 새 키 조합을 누르세요. (Esc=취소, Delete/Backspace=없음). Ctrl은 macOS의 Cmd도 함께 인식합니다.
        </p>
        <div className="flex flex-col gap-1">
          {SHORTCUT_DEFS.map((def) => {
            const g = getGesture(def.id);
            const capturing = capturingId === def.id;
            return (
              <div key={def.id} className="flex items-center justify-between gap-2">
                <span className="text-xs text-ink">{def.label}</span>
                <button
                  type="button"
                  onClick={() => setCapturingId(def.id)}
                  className={`min-w-[140px] rounded border px-2 py-1 text-center text-xs ${
                    capturing
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-line bg-raised text-ink hover:bg-line"
                  }`}
                >
                  {capturing ? "[ 키 입력… ]" : g || "(없음)"}
                </button>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setCapturingId(null);
              resetGestures();
            }}
            className="rounded px-2 py-1 text-xs text-ink-muted hover:bg-raised"
          >
            기본값 복원
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-accent px-3 py-1 text-xs font-medium text-white hover:opacity-90"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
