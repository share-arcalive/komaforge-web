/**
 * 사용자 단축키(설정 저장). 원본 MainWindow.Shortcuts.cs 포팅의 웹 버전.
 * - 기본 제스처 + localStorage 오버라이드(다음 실행에도 유지).
 * - 텍스트 입력 중에는 충돌 단축키(수정자 없음, Ctrl+C/V/X/Z/Y/A)를 양보한다.
 * - "Ctrl" 제스처는 Windows의 Ctrl, macOS의 Cmd(metaKey) 둘 다 매칭한다.
 * SSR 안전: localStorage 접근은 전부 지연(클라이언트에서만).
 */

export interface ShortcutDef {
  id: string;
  label: string;
  gesture: string; // 기본 제스처(canonical "Ctrl+Shift+Z" 형식)
}

// 편집 가능한 명령 단축키(원본 ShortcutDefs와 동일 액션). reset/preferences는 웹에선 제외
// (Ctrl+R은 브라우저 새로고침이라 가로채지 않음).
export const SHORTCUT_DEFS: ShortcutDef[] = [
  { id: "open", label: "불러오기", gesture: "Ctrl+O" },
  { id: "save", label: "저장", gesture: "Ctrl+S" },
  { id: "undo", label: "실행취소", gesture: "Ctrl+Z" },
  { id: "redo", label: "다시실행", gesture: "Ctrl+Y" },
  { id: "cut", label: "잘라내기", gesture: "Ctrl+X" },
  { id: "copy", label: "복사", gesture: "Ctrl+C" },
  { id: "paste", label: "붙여넣기", gesture: "Ctrl+V" },
  { id: "delete", label: "삭제", gesture: "Delete" },
  { id: "lock", label: "잠금/해제", gesture: "L" },
];

interface Combo {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  key: string; // 단일문자는 대문자, 그 외 e.key 그대로("Delete"/"ArrowUp"/",")
}

const STORAGE_KEY = "mwm.shortcuts";
let overrides: Record<string, string> = {};
let loaded = false;
const listeners = new Set<() => void>();

function ensureLoaded(): void {
  if (loaded) return;
  loaded = true;
  if (typeof localStorage === "undefined") return;
  try {
    overrides = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") ?? {};
  } catch {
    overrides = {};
  }
}

function persist(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    /* 무시(프라이빗 모드 등) */
  }
}

function notify(): void {
  for (const fn of listeners) fn();
}

/** 현재 제스처(오버라이드 우선, 빈 문자열="없음"). */
export function getGesture(id: string): string {
  ensureLoaded();
  if (id in overrides) return overrides[id]!;
  return SHORTCUT_DEFS.find((d) => d.id === id)?.gesture ?? "";
}

/** 제스처 설정(같은 제스처를 가진 다른 액션은 비워 중복 방지 — 원본 동작). */
export function setGesture(id: string, gesture: string): void {
  ensureLoaded();
  if (gesture) {
    for (const d of SHORTCUT_DEFS) {
      if (d.id !== id && getGesture(d.id) === gesture) overrides[d.id] = "";
    }
  }
  overrides[id] = gesture;
  persist();
  notify();
}

/** 모든 단축키를 기본값으로 복원. */
export function resetGestures(): void {
  ensureLoaded();
  overrides = {};
  persist();
  notify();
}

export function subscribeShortcuts(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function isModifierKey(k: string): boolean {
  return k === "Control" || k === "Alt" || k === "Shift" || k === "Meta";
}

function eventKey(e: KeyboardEvent): string {
  return e.key.length === 1 ? e.key.toUpperCase() : e.key;
}

function formatCombo(c: Combo): string {
  const parts: string[] = [];
  if (c.ctrl) parts.push("Ctrl");
  if (c.alt) parts.push("Alt");
  if (c.shift) parts.push("Shift");
  parts.push(c.key);
  return parts.join("+");
}

function parseGesture(g: string): Combo | null {
  if (!g) return null;
  let ctrl = false,
    alt = false,
    shift = false,
    key = "";
  for (const raw of g.split("+").map((s) => s.trim()).filter(Boolean)) {
    const lo = raw.toLowerCase();
    if (lo === "ctrl" || lo === "control" || lo === "cmd" || lo === "meta") ctrl = true;
    else if (lo === "alt" || lo === "option") alt = true;
    else if (lo === "shift") shift = true;
    else key = raw.length === 1 ? raw.toUpperCase() : raw;
  }
  return key ? { ctrl, alt, shift, key } : null;
}

function matches(c: Combo, e: KeyboardEvent): boolean {
  const ctrl = e.ctrlKey || e.metaKey; // Cmd=Ctrl 취급(크로스 플랫폼)
  return c.ctrl === ctrl && c.alt === e.altKey && c.shift === e.shiftKey && c.key === eventKey(e);
}

// 텍스트 편집과 충돌하는 제스처(수정자 없음, 또는 Ctrl+C/V/X/Z/Y/A) — 입력칸에선 양보.
function conflictsWithText(c: Combo): boolean {
  if (!c.ctrl && !c.alt) return true;
  return c.ctrl && ["C", "V", "X", "Z", "Y", "A"].includes(c.key);
}

function inTextField(): boolean {
  const el = (typeof document !== "undefined" ? document.activeElement : null) as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

/** 캡처용(환경설정 리바인딩): 수정자만 눌렸으면 null, 아니면 canonical 제스처 문자열. */
export function captureGesture(e: KeyboardEvent): string | null {
  const k = eventKey(e);
  if (isModifierKey(k)) return null;
  return formatCombo({ ctrl: e.ctrlKey || e.metaKey, alt: e.altKey, shift: e.shiftKey, key: k });
}

export type ShortcutHandlers = Partial<Record<string, () => void>>;

/** 전역 keydown 핸들러 설치. 반환값으로 해제. */
export function installShortcuts(handlers: ShortcutHandlers): () => void {
  ensureLoaded();
  const onKeyDown = (e: KeyboardEvent) => {
    const k = eventKey(e);
    if (isModifierKey(k)) return;

    for (const def of SHORTCUT_DEFS) {
      const combo = parseGesture(getGesture(def.id));
      if (!combo || !matches(combo, e)) continue;
      if (inTextField() && conflictsWithText(combo)) return; // 텍스트 편집 양보
      const h = handlers[def.id];
      if (h) {
        e.preventDefault();
        h();
      }
      return;
    }

    // 맥 친화 폴백: Backspace(수정자 없음, 입력칸 밖)도 삭제로(맥 'delete' 키는 Backspace를 보냄).
    if (k === "Backspace" && !e.ctrlKey && !e.metaKey && !e.altKey && !inTextField()) {
      const h = handlers.delete;
      if (h) {
        e.preventDefault();
        h();
      }
    }
  };
  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}
