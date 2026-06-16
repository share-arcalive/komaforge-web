import { useCallback, useEffect } from "react";
import type { IDockviewPanelProps } from "dockview";
import type { EditorHandle } from "@repo/editor/engine";
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
    </div>
  );
}
