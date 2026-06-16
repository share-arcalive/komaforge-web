/**
 * 최근 사용한 색(최신순·최대 12). 원본 MainWindow.ColorPicker.cs의 _recentColors 포팅.
 * localStorage에 저장되어 다음 실행에도 유지되며, 모든 색 입력이 공유한다.
 * SSR 안전: localStorage 접근은 클라이언트에서만(지연 로드).
 */

const STORAGE_KEY = "mwm.recentColors";
const MAX = 12;

let recents: string[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function ensureLoaded(): void {
  if (loaded) return;
  loaded = true;
  if (typeof localStorage === "undefined") return;
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (Array.isArray(v)) recents = v.filter((x) => typeof x === "string");
  } catch {
    recents = [];
  }
}

function persist(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recents));
  } catch {
    /* 무시 */
  }
}

function notify(): void {
  for (const fn of listeners) fn();
}

function normalize(hex: string): string | null {
  const h = hex.trim();
  return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(h) ? h.toUpperCase() : null;
}

export function getRecentColors(): string[] {
  ensureLoaded();
  return recents;
}

/** 색을 최근색 맨 앞에 추가(중복 제거·최대 12). */
export function addRecentColor(hex: string): void {
  ensureLoaded();
  const h = normalize(hex);
  if (!h) return;
  const next = [h, ...recents.filter((c) => c.toUpperCase() !== h)].slice(0, MAX);
  // 변화 없으면(이미 맨 앞) 알림 생략.
  if (next.length === recents.length && next.every((c, i) => c === recents[i])) return;
  recents = next;
  persist();
  notify();
}

export function removeRecentColor(hex: string): void {
  ensureLoaded();
  const h = hex.toUpperCase();
  const next = recents.filter((c) => c.toUpperCase() !== h);
  if (next.length === recents.length) return;
  recents = next;
  persist();
  notify();
}

export function subscribeRecentColors(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
