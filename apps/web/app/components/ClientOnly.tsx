import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** SSR 중엔 fallback, 하이드레이션 이후 children() 렌더 — Pixi/WebGL 클라이언트 경계. */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: () => React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const isHydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return <>{isHydrated ? children() : fallback}</>;
}
