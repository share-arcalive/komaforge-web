import { createStore } from "zustand/vanilla";
import {
  cloneProject,
  createProject,
  serializeProject,
  parseProject,
  type ComicProjectData,
} from "@repo/core";
import { EMPTY_SELECTION, type Selection } from "./types";

const MAX_HISTORY = 80;

export interface EditorState {
  project: ComicProjectData;
  pageIndex: number;
  selection: Selection;
  /** project가 제자리 변경될 때마다 증가 — 구독자(엔진/React)의 갱신 트리거. */
  rev: number;
  past: string[];
  future: string[];

  /** 제자리 변경 후 호출 — 리렌더 트리거. */
  bump: () => void;
  /** 변경 직전 체크포인트 (undo 스냅샷 적재, 직전과 같으면 생략). */
  checkpoint: () => void;
  /** mutator로 project를 제자리 수정. checkpoint=true면 먼저 스냅샷. */
  apply: (mutator: (project: ComicProjectData) => void, checkpoint?: boolean) => void;
  select: (selection: Selection) => void;
  /** 페이지 이동. selection을 주면 그 선택으로(스트립에서 페이지 클릭), 없으면 선택 해제. */
  setPageIndex: (index: number, selection?: Selection) => void;
  /** 프로젝트 교체(로드/새 문서) — 히스토리 초기화. */
  setProject: (project: ComicProjectData, pageIndex?: number) => void;
  undo: () => void;
  redo: () => void;
}

export const editorStore = createStore<EditorState>()((set, get) => ({
  project: createProject(),
  pageIndex: 0,
  selection: EMPTY_SELECTION,
  rev: 0,
  past: [],
  future: [],

  bump: () => set((s) => ({ rev: s.rev + 1 })),

  checkpoint: () => {
    const s = get();
    const snapshot = serializeProject(s.project);
    if (s.past[s.past.length - 1] === snapshot) return;
    const past = [...s.past, snapshot];
    if (past.length > MAX_HISTORY) past.shift();
    set({ past, future: [] });
  },

  apply: (mutator, checkpoint = false) => {
    if (checkpoint) get().checkpoint();
    mutator(get().project);
    set((s) => ({ rev: s.rev + 1 }));
  },

  select: (selection) => set({ selection }),

  setPageIndex: (index, selection) => {
    const s = get();
    const clamped = Math.min(Math.max(index, 0), Math.max(0, s.project.Pages.length - 1));
    if (clamped === s.pageIndex && selection === undefined) return;
    set({ pageIndex: clamped, selection: selection ?? EMPTY_SELECTION, rev: s.rev + 1 });
  },

  setProject: (project, pageIndex) =>
    set((s) => ({
      project,
      pageIndex: Math.min(
        Math.max(pageIndex ?? project.CurrentPageIndex, 0),
        Math.max(0, project.Pages.length - 1),
      ),
      selection: EMPTY_SELECTION,
      past: [],
      future: [],
      rev: s.rev + 1,
    })),

  undo: () => {
    const s = get();
    if (s.past.length === 0) return;
    const past = [...s.past];
    const snapshot = past.pop()!;
    const future = [...s.future, serializeProject(s.project)];
    const project = parseProject(snapshot);
    set({
      project,
      past,
      future,
      pageIndex: Math.min(s.pageIndex, Math.max(0, project.Pages.length - 1)),
      selection: EMPTY_SELECTION,
      rev: s.rev + 1,
    });
  },

  redo: () => {
    const s = get();
    if (s.future.length === 0) return;
    const future = [...s.future];
    const snapshot = future.pop()!;
    const past = [...s.past, serializeProject(s.project)];
    const project = parseProject(snapshot);
    set({
      project,
      past,
      future,
      pageIndex: Math.min(s.pageIndex, Math.max(0, project.Pages.length - 1)),
      selection: EMPTY_SELECTION,
      rev: s.rev + 1,
    });
  },
}));

export type EditorStore = typeof editorStore;

/** project 깊은 복제 헬퍼 재노출(클립보드 등). */
export { cloneProject };
