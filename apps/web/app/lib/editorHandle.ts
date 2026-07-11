import { useSyncExternalStore } from "react";
import type { EditorHandle } from "@repo/editor/engine";

/**
 * 엔진 핸들 전역 싱글톤. dockview 캔버스 패널이 엔진을 마운트하면 여기에 등록하고,
 * 툴바(내보내기 등)가 꺼내 쓴다. 캔버스 패널은 항상 1개라는 전제.
 */
let current: EditorHandle | null = null;
const subs = new Set<() => void>();

export function setEditorHandle(handle: EditorHandle | null): void {
  current = handle;
  subs.forEach((f) => f());
}

export function getEditorHandle(): EditorHandle | null {
  return current;
}

function subscribe(cb: () => void): () => void {
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
}

/** 핸들 준비 여부를 구독(내보내기 버튼 활성/비활성). 서버 스냅샷은 항상 null. */
export function useEditorHandle(): EditorHandle | null {
  return useSyncExternalStore(subscribe, getEditorHandle, () => null);
}
