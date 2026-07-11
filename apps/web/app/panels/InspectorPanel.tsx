import type { IDockviewPanelProps } from "dockview";
import { Inspector } from "../components/Inspector";

/** dockview 속성 패널 — 선택 대상(칸/이미지/말풍선)의 인스펙터(자체 헤더+스크롤 관리). */
export function InspectorPanel(_props: IDockviewPanelProps) {
  return (
    <div className="h-full w-full bg-bg">
      <Inspector />
    </div>
  );
}
