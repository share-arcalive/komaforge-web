import { useState } from "react";
import {
  FileArchive,
  FileJson,
  FilePlus2,
  Files,
  FolderOpen,
  ImageDown,
  Keyboard,
  LayoutTemplate,
  PanelRight,
  Redo2,
  Save,
  Undo2,
} from "lucide-react";
import { newProject, redo, undo, useHistoryFlags } from "@repo/editor";
import { exportAllPagesZip, exportPng, saveBundleToFile, saveKfjsonToFile } from "../lib/persistence";
import { useEditorHandle } from "../lib/editorHandle";
import { showPanel } from "../lib/workspace";

export function MenuBar({
  onOpen,
  onOpenShortcuts,
  onResetLayout,
}: {
  onOpen: () => void;
  onOpenShortcuts: () => void;
  onResetLayout: () => void;
}) {
  const { canUndo, canRedo } = useHistoryFlags();
  const handle = useEditorHandle();
  const [scale, setScale] = useState(1); // 내보내기 해상도 배수(1/2/3×)

  const onExport = async () => {
    if (handle) await exportPng(handle, scale);
  };
  const onExportZip = async () => {
    if (handle) await exportAllPagesZip(handle, scale);
  };

  return (
    <header className="flex h-11 shrink-0 items-center gap-0.5 border-b border-line bg-surface px-2">
      <span className="mr-2 px-1 text-sm font-semibold text-accent">KomaForge</span>
      <ToolButton icon={<FilePlus2 size={15} />} label="새 문서" onClick={() => newProject()} />
      <ToolButton icon={<FolderOpen size={15} />} label="불러오기" onClick={onOpen} />
      <Divider />
      <ToolButton icon={<Save size={15} />} label="저장" title="저장(.webtoon)" onClick={saveBundleToFile} />
      <ToolButton icon={<FileJson size={15} />} label=".kfjson" title=".kfjson 저장" onClick={saveKfjsonToFile} />
      <ToolButton
        icon={<ImageDown size={15} />}
        label="PNG"
        title="PNG 내보내기"
        onClick={onExport}
        disabled={!handle}
      />
      <ToolButton
        icon={<FileArchive size={15} />}
        label="ZIP"
        title="전 페이지 ZIP"
        onClick={onExportZip}
        disabled={!handle}
      />
      <select
        value={scale}
        onChange={(e) => setScale(Number(e.target.value))}
        title="내보내기 배수(해상도)"
        className="rounded-lg border border-line bg-raised px-1.5 py-1 text-xs text-ink"
      >
        <option value={1}>1×</option>
        <option value={2}>2×</option>
        <option value={3}>3×</option>
      </select>
      <Divider />
      <ToolButton icon={<Undo2 size={15} />} label="실행취소" onClick={() => undo()} disabled={!canUndo} />
      <ToolButton icon={<Redo2 size={15} />} label="다시실행" onClick={() => redo()} disabled={!canRedo} />
      <div className="flex-1" />
      <ToolButton
        icon={<Files size={15} />}
        label="페이지"
        title="페이지 패널 열기"
        onClick={() => showPanel("pages")}
      />
      <ToolButton
        icon={<PanelRight size={15} />}
        label="속성"
        title="속성 패널 열기"
        onClick={() => showPanel("inspector")}
      />
      <Divider />
      <ToolButton
        icon={<LayoutTemplate size={15} />}
        label="레이아웃 초기화"
        title="패널 배치를 기본값으로"
        onClick={onResetLayout}
      />
      <ToolButton icon={<Keyboard size={15} />} label="단축키" onClick={onOpenShortcuts} />
    </header>
  );
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-line" />;
}

function ToolButton({
  icon,
  label,
  onClick,
  disabled,
  title,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-raised hover:text-ink disabled:pointer-events-none disabled:opacity-40"
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}
