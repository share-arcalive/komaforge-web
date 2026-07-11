import { useStore } from "zustand";
import { editorStore, type EditorState } from "./store";

/** 셀렉터 기반 구독. 원시값(rev/pageIndex)을 고르고 project는 getState로 읽는 패턴 권장. */
export function useEditor<T>(selector: (state: EditorState) => T): T {
  return useStore(editorStore, selector);
}

export function useRev(): number {
  return useStore(editorStore, (s) => s.rev);
}

export function usePageIndex(): number {
  return useStore(editorStore, (s) => s.pageIndex);
}

export function useSelection() {
  return useStore(editorStore, (s) => s.selection);
}

export function useHistoryFlags() {
  // 원시값을 개별 구독한다(객체를 반환하면 zustand v5에서 매 렌더 새 참조 → 무한 루프).
  const canUndo = useStore(editorStore, (s) => s.past.length > 0);
  const canRedo = useStore(editorStore, (s) => s.future.length > 0);
  return { canUndo, canRedo };
}
