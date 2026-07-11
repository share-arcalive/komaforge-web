import { useState } from "react";
import {
  FileArchive,
  FileJson,
  FilePlus2,
  FileText,
  Files,
  Film,
  FolderOpen,
  GalleryVerticalEnd,
  HelpCircle,
  ImageDown,
  Keyboard,
  LayoutTemplate,
  PanelRight,
  Redo2,
  Save,
  Undo2,
} from "lucide-react";
import { redo, undo, useHistoryFlags } from "@repo/editor";
import { ThemeToggle } from "@repo/ui";
import { NewDocDialog } from "./NewDocDialog";
import {
  exportAllPagesZip,
  exportAnimatedWebP,
  exportPng,
  exportScript,
  exportStripPng,
  saveBundleToFile,
  saveKfjsonToFile,
} from "../lib/persistence";
import { useEditorHandle } from "../lib/editorHandle";
import { showPanel } from "../lib/workspace";
import { buildInfo } from "../lib/buildInfo";

/** 공개 소스 저장소(배포 페이지의 GitHub 링크 대상). */
const REPO_URL = "https://github.com/share-arcalive/komaforge-web";
/** 원본(WPF KomaForge) 저장소 — 파리티 기준 커밋 링크에 사용. */
const UPSTREAM_URL = "https://github.com/unknowndevdot/KomaForge";

/** GitHub 마크(lucide-react는 브랜드 아이콘을 제공하지 않아 인라인 SVG). */
function GithubIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export function MenuBar({
  onOpen,
  onOpenShortcuts,
  onOpenHelp,
  onResetLayout,
}: {
  onOpen: () => void;
  onOpenShortcuts: () => void;
  onOpenHelp: () => void;
  onResetLayout: () => void;
}) {
  const { canUndo, canRedo } = useHistoryFlags();
  const handle = useEditorHandle();
  const [scale, setScale] = useState(1); // 내보내기 해상도 배수(1/2/3×)
  const [capturing, setCapturing] = useState(false); // 움직이는 WebP 캡처 중
  const [showNewDoc, setShowNewDoc] = useState(false); // 새 문서(페이지 템플릿) 다이얼로그

  const onExport = async () => {
    if (handle) await exportPng(handle, scale);
  };
  const onExportStrip = async () => {
    if (!handle) return;
    const ok = await exportStripPng(handle, scale);
    if (!ok) alert("스트립이 너무 큽니다(GPU 한계 초과). 내보내기 배수를 낮춰 다시 시도하세요.");
  };
  const onExportZip = async () => {
    if (handle) await exportAllPagesZip(handle, scale);
  };
  const onExportWebp = async () => {
    if (!handle || capturing) return;
    setCapturing(true);
    try {
      const n = await exportAnimatedWebP(handle, scale);
      if (n === 0) alert("내보낼 내용이 없습니다.");
    } finally {
      setCapturing(false);
    }
  };

  return (
    <header className="flex h-11 shrink-0 items-center gap-0.5 border-b border-line bg-surface px-2">
      <span className="px-1 text-sm font-semibold text-primary">KomaForge</span>
      <span
        className="select-none px-1 text-[10px] leading-none text-ink-faint"
        title={`버전 ${buildInfo.version} · 빌드 ${buildInfo.sha} · ${buildInfo.date}`}
      >
        v{buildInfo.version}
        <span className="opacity-70"> · {buildInfo.sha}</span>
      </span>
      {buildInfo.upstream && (
        <a
          href={
            buildInfo.upstreamCommit
              ? `${UPSTREAM_URL}/commit/${buildInfo.upstreamCommit}`
              : UPSTREAM_URL
          }
          target="_blank"
          rel="noreferrer"
          className="mr-2 select-none px-1 text-[10px] leading-none text-ink-faint hover:text-primary hover:underline"
          title={`원본(WPF) KomaForge ${buildInfo.upstream}까지 파리티 반영됨 — 커밋 ${buildInfo.upstreamCommit} 보기`}
        >
          원본 {buildInfo.upstream}
          {buildInfo.upstreamCommit && <span className="opacity-70">@{buildInfo.upstreamCommit}</span>}
        </a>
      )}
      {showNewDoc && <NewDocDialog onClose={() => setShowNewDoc(false)} />}
      <ToolButton
        icon={<FilePlus2 size={15} />}
        label="새 문서"
        title="새 문서 시작 (4/8/12/16페이지 템플릿)"
        onClick={() => setShowNewDoc(true)}
      />
      <ToolButton icon={<FolderOpen size={15} />} label="불러오기" onClick={onOpen} />
      <Divider />
      <ToolButton icon={<Save size={15} />} label="저장" title="저장(.koma)" onClick={saveBundleToFile} />
      <ToolButton icon={<FileJson size={15} />} label=".kfjson" title=".kfjson 저장" onClick={saveKfjsonToFile} />
      <ToolButton
        icon={<ImageDown size={15} />}
        label="PNG"
        title="현재 페이지 PNG 내보내기"
        onClick={onExport}
        disabled={!handle}
      />
      <ToolButton
        icon={<GalleryVerticalEnd size={15} />}
        label="스트립 PNG"
        title="전 페이지를 이어붙인 스트립 전체를 한 장의 PNG로 (경계 걸친 말풍선 포함)"
        onClick={onExportStrip}
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
      <ToolButton
        icon={<Film size={15} />}
        label={capturing ? "캡처중…" : "WebP"}
        title="움직이는 WebP 내보내기(현재 페이지 애니/동영상)"
        onClick={onExportWebp}
        disabled={!handle || capturing}
      />
      <ToolButton
        icon={<FileText size={15} />}
        label="대본"
        title="대본(.txt) 내보내기 — 페이지별 말풍선 대사"
        onClick={() => exportScript()}
      />
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
      <ToolButton icon={<HelpCircle size={15} />} label="사용법" title="사용법·도움말" onClick={onOpenHelp} />
      <a
        href={REPO_URL}
        target="_blank"
        rel="noreferrer"
        title="GitHub 저장소 (share-arcalive/komaforge-web)"
        className="flex h-8 w-8 items-center justify-center rounded text-ink-muted hover:bg-raised hover:text-ink"
      >
        <GithubIcon size={15} />
      </a>
      <ThemeToggle />
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
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 ${
        active ? "bg-raised text-primary ring-1 ring-primary/40" : "text-ink-muted hover:bg-raised hover:text-ink"
      }`}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}
