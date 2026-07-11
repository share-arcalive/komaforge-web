// 빌드 시 vite `define`이 주입하는 빌드 정보(버전·git SHA·날짜·원본 파리티 태그).
// 값은 apps/web/vite.config.ts 의 buildInfo()에서 온다.
export interface BuildInfo {
  version: string;
  sha: string;
  date: string;
  /** 파리티 반영이 완료된 원본(WPF KomaForge) 태그 — upstream/komaforge.pin.json의 pinnedTag. */
  upstream: string;
  /** 원본 태그의 커밋 SHA(7자리) — pinnedCommit. */
  upstreamCommit: string;
}

declare const __BUILD_INFO__: BuildInfo;

export const buildInfo: BuildInfo =
  typeof __BUILD_INFO__ !== "undefined"
    ? __BUILD_INFO__
    : { version: "0.0.0", sha: "dev", date: "", upstream: "", upstreamCommit: "" };
