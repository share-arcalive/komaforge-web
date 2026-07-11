import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Copy, FilePlus2, Trash2 } from "lucide-react";
import type { IDockviewPanelProps } from "dockview";
import {
  activateCut,
  addCut,
  addDefaultVnTemplate,
  addVnTemplateFromCurrentPage,
  duplicateCut,
  editorStore,
  generateVnPages,
  moveCut,
  removeCut,
  removeVnTemplate,
  setStripWidth,
  setTitle,
  setVnEnabled,
  usePageIndex,
  useRev,
} from "@repo/editor";
import { STRIP_MAX_WIDTH, STRIP_MIN_WIDTH } from "@repo/core";
import { useEditorHandle } from "../lib/editorHandle";
import { Btn, Check, Field, IconBtn, ListRow, Section, Slider, TextInput } from "../components/ui";

const checkpoint = () => editorStore.getState().checkpoint();

/** 스트립 너비 입력 — 커밋 지연형. 키 입력마다 커밋하면 690 클램프가 타이핑을 덮어써
 *  ("1200"의 "1" 입력 → 690으로 튕김) 입력이 불가능해지므로 blur/Enter에서만 커밋한다. */
function StripWidthInput({ value }: { value: number }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]); // 슬라이더 등 외부 변경 동기화
  const commit = () => {
    const n = Number.parseFloat(text);
    if (Number.isFinite(n)) setStripWidth(n, false); // 체크포인트는 onFocus에서 1회
    else setText(String(value));
  };
  return (
    <input
      type="number"
      value={text}
      min={STRIP_MIN_WIDTH}
      max={STRIP_MAX_WIDTH}
      onFocus={checkpoint}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      className="h-7 w-16 rounded border border-line bg-raised px-1.5 py-0.5 text-xs text-ink"
    />
  );
}

/** dockview 페이지 패널 — 작품(제목·스트립 너비)·페이지 목록(내비게이션)·비주얼 노벨. */
export function PagesPanel(_props: IDockviewPanelProps) {
  return (
    <div className="h-full w-full overflow-y-auto bg-bg p-2">
      <Cuts />
    </div>
  );
}

function Cuts() {
  useRev();
  const pageIndex = usePageIndex();
  const handle = useEditorHandle();
  const project = editorStore.getState().project;

  // 목록 클릭: 페이지 활성+선택하고 캔버스를 그 페이지 시작 지점으로 즉시 스크롤.
  const goCut = (i: number) => {
    activateCut(i);
    handle?.scrollToCut(i);
  };

  // 스트립 너비: 스트립 문서면 StripWidth, 레거시 문서면 첫 페이지 너비에서 유도해 표시.
  const stripWidth =
    project.StripWidth > 0 ? project.StripWidth : (project.Pages[0]?.PageWidth ?? 800);

  return (
    <>
      <Section title="작품">
        <Field label="제목">
          <TextInput value={project.Title} onChange={setTitle} className="w-full" />
        </Field>
        <Field label={`가로 너비 ${stripWidth}px (${STRIP_MIN_WIDTH}–${STRIP_MAX_WIDTH}) — 모든 페이지 공통`}>
          <div className="flex items-center gap-2">
            {/* Slider 계약: 체크포인트는 pointerdown 1회, 틱마다 checkpoint=false (undo 홍수 방지) */}
            <Slider
              min={STRIP_MIN_WIDTH}
              max={STRIP_MAX_WIDTH}
              step={10}
              value={stripWidth}
              onChange={(v) => setStripWidth(v, false)}
            />
            <StripWidthInput value={stripWidth} />
          </div>
        </Field>
        <span className="px-1 text-[11px] text-ink-faint">
          세로 스트립의 가로 폭입니다(내보내기 픽셀 기준). 캔버스는 패널에 맞춰 자동
          축소되므로 화면에선 비율 변화로 보입니다. 콘텐츠 크기는 유지되니 필요하면 페이지의
          칸을 다시 구성하세요.
        </span>
      </Section>

      <Section title={`페이지 (${project.Pages.length})`}>
        <div className="flex flex-col gap-0.5">
          {project.Pages.map((pg, i) => (
            <ListRow key={i} active={i === pageIndex} onClick={() => goCut(i)}>
              <span className="text-ink-faint">{String(i + 1).padStart(2, "0")}</span>{" "}
              {pg.Name || `페이지 ${i + 1}`}
              <span className="float-right text-[10px] text-ink-faint">세로 {pg.PageHeight}px</span>
            </ListRow>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <IconBtn
            icon={<FilePlus2 size={14} />}
            title="현재 페이지 아래에 새 페이지 추가"
            onClick={() => addCut(pageIndex)}
          />
          <IconBtn
            icon={<Copy size={14} />}
            title="현재 페이지 복제"
            onClick={() => duplicateCut(pageIndex)}
          />
          <IconBtn
            icon={<ChevronUp size={14} />}
            title="위로"
            onClick={() => moveCut(pageIndex, -1)}
            disabled={pageIndex <= 0}
          />
          <IconBtn
            icon={<ChevronDown size={14} />}
            title="아래로"
            onClick={() => moveCut(pageIndex, 1)}
            disabled={pageIndex >= project.Pages.length - 1}
          />
          <div className="flex-1" />
          <IconBtn
            icon={<Trash2 size={14} />}
            title="페이지 삭제"
            danger
            onClick={() => removeCut(pageIndex)}
            disabled={project.Pages.length <= 1}
          />
        </div>
        <span className="px-1 text-[11px] text-ink-faint">
          페이지를 클릭하면 캔버스가 그 페이지로 이동하고, 속성 패널에 페이지 액션(이름·높이·칸 구성)이 열립니다.
        </span>
      </Section>

      <VisualNovel />
    </>
  );
}

/** 비주얼 노벨: 모드 토글 + 템플릿 목록 + 스크립트→페이지 생성(원본 VisualNovel.cs). */
function VisualNovel() {
  useRev();
  const project = editorStore.getState().project;
  const [script, setScript] = useState("");
  const [tplIdx, setTplIdx] = useState(0);
  const enabled = project.FlowText.Enabled;
  const templates = project.VnTemplates;
  const safeTpl = Math.min(tplIdx, Math.max(0, templates.length - 1));

  const onGenerate = () => {
    const res = generateVnPages(script, safeTpl);
    if (!res.ok) {
      alert(res.error);
      return;
    }
    alert(`스크립트 ${res.count}줄로 ${res.count}개 페이지를 생성했습니다.`);
  };

  return (
    <Section title="비주얼 노벨" defaultOpen={enabled}>
      <Check label="비주얼 노벨 모드 (스크립트→페이지)" checked={enabled} onChange={setVnEnabled} />
      {enabled && (
        <>
          <div className="mt-1 flex items-center gap-1">
            <Btn onClick={addVnTemplateFromCurrentPage}>현재 페이지를 템플릿으로</Btn>
            <Btn onClick={addDefaultVnTemplate}>기본 템플릿</Btn>
          </div>
          <div className="mt-1 flex flex-col gap-0.5">
            <span className="px-1 text-[11px] text-ink-faint">템플릿 {templates.length}개 (‘이름’·‘서술’ 말풍선 필요)</span>
            {templates.map((t, i) => (
              <div key={i} className="flex items-center gap-1">
                <ListRow active={i === safeTpl} onClick={() => setTplIdx(i)}>
                  {t.Name || `템플릿 ${i + 1}`}
                </ListRow>
                <IconBtn
                  icon={<Trash2 size={14} />}
                  title="템플릿 삭제"
                  danger
                  onClick={() => removeVnTemplate(i)}
                />
              </div>
            ))}
            {templates.length === 0 && (
              <span className="px-1 py-1 text-[11px] text-ink-faint">
                ‘기본 템플릿’ 또는 ‘현재 페이지를 템플릿으로’를 눌러 템플릿을 만드세요.
              </span>
            )}
          </div>
          <Field label="스크립트 (한 줄 = 한 페이지, '이름: 대사')">
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={5}
              className="w-full rounded border border-line bg-raised p-1.5 text-xs text-ink"
              placeholder={"영희: 안녕!\n철수: 오랜만이야.\n둘은 마주 보았다."}
            />
          </Field>
          <Btn onClick={onGenerate} disabled={templates.length === 0}>
            페이지 생성
          </Btn>
        </>
      )}
    </Section>
  );
}
