import { useEffect } from "react";
import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "mwm.theme";

/** <head>에 인라인으로 넣어 첫 페인트 전에 저장된 테마를 적용(FOUC 방지).
   기본은 다크(클래스 없음). 저장값이 'light'일 때만 html.light 추가. */
export const themeScript = `(function(){try{if(localStorage.getItem(${JSON.stringify(
  STORAGE_KEY,
)})==='light')document.documentElement.classList.add('light');}catch(e){}})();`;

function readStored(): Theme {
  if (typeof localStorage === "undefined") return "dark";
  try {
    return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function applyToDom(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("light", theme === "light");
}

// 모듈 단위 store (recentColors 패턴과 동일하게 useSyncExternalStore 구독).
let current: Theme = "dark";
const listeners = new Set<() => void>();
function emit(): void {
  for (const l of listeners) l();
}

export function setTheme(theme: Theme): void {
  current = theme;
  applyToDom(theme);
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // private mode 등 — 무시
    }
  }
  emit();
}

export function toggleTheme(): void {
  setTheme(current === "dark" ? "light" : "dark");
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
function getSnapshot(): Theme {
  return current;
}
function getServerSnapshot(): Theme {
  return "dark"; // 프리렌더는 항상 다크(클래스 없음)와 일치 → 하이드레이션 불일치 방지
}

export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void } {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // 마운트 시 저장값으로 모듈 상태/ DOM 동기화(인라인 스크립트와 일치 보정).
  useEffect(() => {
    const stored = readStored();
    if (stored !== current) {
      current = stored;
      applyToDom(stored);
      emit();
    } else {
      applyToDom(stored);
    }
  }, []);

  return { theme, setTheme, toggle: toggleTheme };
}
