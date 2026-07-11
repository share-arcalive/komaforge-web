import { useCallback, useEffect } from "react";
import { Plus } from "lucide-react";
import type { IDockviewPanelProps } from "dockview";
import type { EditorHandle } from "@repo/editor/engine";
import { addCut, editorStore } from "@repo/editor";
import { EditorCanvas } from "../components/EditorCanvas";
import { setEditorHandle } from "../lib/editorHandle";
import { restoreAutosave } from "../lib/persistence";

/** dockview 캔버스 패널 — Pixi 에디터를 마운트하고 핸들을 전역에 등록한다. */
export function CanvasPanel(_props: IDockviewPanelProps) {
  const onReady = useCallback(async (handle: EditorHandle) => {
    setEditorHandle(handle);
    await restoreAutosave();
  }, []);

  // 패널 언마운트 시 핸들 참조 해제(엔진 destroy는 EditorCanvas 클린업이 처리).
  useEffect(() => () => setEditorHandle(null), []);

  return (
    <div className="relative h-full w-full">
      <EditorCanvas onReady={onReady} />
      {/* 세로 페이지 추가 — 스트립 맨 끝에 새 페이지를 붙인다. */}
      <button
        type="button"
        onClick={() => addCut(editorStore.getState().project.Pages.length - 1)}
        title="스트립 맨 아래에 새 페이지 추가"
        className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-line bg-surface/90 px-3 py-1.5 text-xs font-medium text-ink-muted shadow-lg backdrop-blur transition-colors hover:border-primary hover:text-ink"
      >
        <Plus size={14} /> 페이지 추가
      </button>
    </div>
  );
}
