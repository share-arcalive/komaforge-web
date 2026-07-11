import type { ComicProjectData } from "@repo/core";
import type { AssetRecord } from "./assets";

/** `.koma` 번들(프로젝트 + 자산)의 단일 정의 — 웹 persistence와 headless 세션이 공유한다. */
export const BUNDLE_KIND = "komaforge-web" as const;

/** 현재 번들 포맷 버전.
 *  v1: 초기. v2: 세로 스트립(StripWidth) 도입 — additive라 데이터 변형은 없다. */
export const BUNDLE_VERSION = 2;

export interface Bundle {
  kind: typeof BUNDLE_KIND;
  version: number;
  project: ComicProjectData;
  assets: Record<string, AssetRecord>;
}

export function isBundle(raw: unknown): raw is Bundle {
  return (
    typeof raw === "object" &&
    raw !== null &&
    (raw as Bundle).kind === BUNDLE_KIND &&
    typeof (raw as Bundle).project === "object"
  );
}

/** 구버전 번들을 현재 버전으로. v1→v2는 no-op(스키마 additive) — 향후 버전 분기 지점.
 *  미래 버전(알 수 없는)도 그대로 시도한다(파괴적 거부보다 관용 로드). */
export function migrateBundle(bundle: Bundle): Bundle {
  // version 1: StripWidth 없음 → zod 기본값(0=레거시)으로 로드되므로 변형 불필요.
  return bundle;
}
