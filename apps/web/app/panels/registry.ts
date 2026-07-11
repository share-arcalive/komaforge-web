import type { FunctionComponent } from "react";
import type { IDockviewPanelProps } from "dockview";
import type { LucideIcon } from "lucide-react";
import { Files, HelpCircle, PanelRight, Square } from "lucide-react";
import { CanvasPanel } from "./CanvasPanel";
import { HelpPanel } from "./HelpPanel";
import { InspectorPanel } from "./InspectorPanel";
import { PagesPanel } from "./PagesPanel";

/** 패널 종류 ↔ 컴포넌트/메타 매핑의 단일 출처. */
export type PanelKind = "canvas" | "pages" | "inspector" | "help";

export const PANEL_COMPONENTS: Record<PanelKind, FunctionComponent<IDockviewPanelProps>> = {
  canvas: CanvasPanel,
  pages: PagesPanel,
  inspector: InspectorPanel,
  help: HelpPanel,
};

export interface PanelMeta {
  kind: PanelKind;
  title: string;
  icon: LucideIcon;
}

export const PANEL_META: Record<PanelKind, PanelMeta> = {
  canvas: { kind: "canvas", title: "캔버스", icon: Square },
  pages: { kind: "pages", title: "페이지", icon: Files },
  inspector: { kind: "inspector", title: "속성", icon: PanelRight },
  help: { kind: "help", title: "사용법", icon: HelpCircle },
};

/** 보기 메뉴에서 추가 가능한 도구 패널(캔버스 제외 — 캔버스는 항상 1개). */
export const ADDABLE_PANELS: PanelKind[] = ["pages", "inspector"];
