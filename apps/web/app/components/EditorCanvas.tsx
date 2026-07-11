import { useEffect, useRef } from "react";
import type { EditorHandle } from "@repo/editor/engine";

/** 클라이언트에서만 Pixi 엔진을 동적 import하여 마운트한다. */
export function EditorCanvas({ onReady }: { onReady: (handle: EditorHandle) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let handle: EditorHandle | undefined;
    let disposed = false;
    let ro: ResizeObserver | undefined;
    (async () => {
      const { createEditor } = await import("@repo/editor/engine");
      if (disposed || !ref.current) return;
      handle = await createEditor(ref.current);
      if (disposed) {
        handle.destroy();
        return;
      }
      // 패널/창 크기 변경 추종. 컨테이너는 absolute inset-0 이라 캔버스 자식이
      // 컨테이너 크기에 영향을 못 줘(피드백 차단), RO 가 실제 패널 크기만 보고 fit 한다.
      ro = new ResizeObserver(() => handle?.resize());
      ro.observe(ref.current);
      onReady(handle);
    })();
    return () => {
      disposed = true;
      ro?.disconnect();
      handle?.destroy();
    };
  }, [onReady]);

  // absolute inset-0: relative 부모(패널)의 확정 크기를 채우되, 캔버스(자식)가
  // 컨테이너 크기를 되먹이지 않게 한다(h-full 콘텐츠-collapse + RO 무한루프 방지).
  return <div ref={ref} className="absolute inset-0" />;
}
