import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, FilePlus2, Trash2 } from "lucide-react";
import type { IDockviewPanelProps } from "dockview";
import {
  addPage,
  applyLayoutCmd,
  currentPage,
  editorStore,
  gotoPage,
  movePage,
  removePage,
  renamePage,
  select,
  setAutoGutter,
  setAutoMargin,
  setBlackBackground,
  setPageBackgroundColor,
  setPageSize,
  setTitle,
  usePageIndex,
  useRev,
  useSelection,
} from "@repo/editor";
import { Btn, Check, ColorInput, Field, IconBtn, ListRow, NumberInput, Row, Section, TextInput } from "../components/ui";

/** dockview 페이지/구조 패널 — 작품·페이지·칸 구성·칸 목록(내비게이션). */
export function PagesPanel(_props: IDockviewPanelProps) {
  return (
    <div className="h-full w-full overflow-y-auto bg-bg p-2">
      <Pages />
    </div>
  );
}

function Pages() {
  useRev();
  const pageIndex = usePageIndex();
  const selection = useSelection();
  const project = editorStore.getState().project;
  const page = currentPage(project, pageIndex);
  const [pattern, setPattern] = useState("1,2,1");

  if (!page) return null;

  return (
    <>
      <Section title="작품">
        <Field label="제목">
          <TextInput value={project.Title} onChange={setTitle} className="w-full" />
        </Field>
      </Section>

      <Section title="페이지">
        <div className="flex flex-col gap-0.5">
          {project.Pages.map((pg, i) => (
            <ListRow key={i} active={i === pageIndex} onClick={() => gotoPage(i)}>
              <span className="text-ink-faint">{String(i + 1).padStart(2, "0")}</span>{" "}
              {pg.Name || `Page ${i + 1}`}
            </ListRow>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <IconBtn icon={<FilePlus2 size={14} />} title="페이지 추가" onClick={addPage} />
          <IconBtn
            icon={<Copy size={14} />}
            title="현재 페이지 복제"
            onClick={() => duplicatePage(pageIndex)}
          />
          <IconBtn
            icon={<ChevronUp size={14} />}
            title="위로"
            onClick={() => movePage(pageIndex, -1)}
            disabled={pageIndex <= 0}
          />
          <IconBtn
            icon={<ChevronDown size={14} />}
            title="아래로"
            onClick={() => movePage(pageIndex, 1)}
            disabled={pageIndex >= project.Pages.length - 1}
          />
          <div className="flex-1" />
          <IconBtn
            icon={<Trash2 size={14} />}
            title="페이지 삭제"
            danger
            onClick={() => removePage(pageIndex)}
            disabled={project.Pages.length <= 1}
          />
        </div>
        <Field label="이름">
          <TextInput value={page.Name} onChange={(v) => renamePage(pageIndex, v)} className="w-full" />
        </Field>
        <Row label="가로 / 세로">
          <NumberInput value={page.PageWidth} onChange={(v) => setPageSize(v, page.PageHeight)} />
          <NumberInput value={page.PageHeight} onChange={(v) => setPageSize(page.PageWidth, v)} />
        </Row>
        <Check label="검정 배경" checked={page.BlackBackground} onChange={setBlackBackground} />
        <Row label="배경색">
          <ColorInput
            value={page.BackgroundColor || (page.BlackBackground ? "#000000" : "#FFFFFF")}
            onChange={setPageBackgroundColor}
          />
          {page.BackgroundColor ? <Btn onClick={() => setPageBackgroundColor("")}>기본</Btn> : null}
        </Row>
      </Section>

      <Section title="칸 구성">
        <Field label="패턴 (예: 1,2,1)">
          <div className="flex gap-1">
            <TextInput value={pattern} onChange={setPattern} className="flex-1" />
            <Btn onClick={() => applyLayoutCmd(pattern)}>구성</Btn>
          </div>
        </Field>
        <Row label="여백 / 간격">
          <NumberInput value={project.AutoMargin} onChange={setAutoMargin} />
          <NumberInput value={project.AutoGutter} onChange={setAutoGutter} />
        </Row>
        <div className="mt-1 flex flex-col gap-0.5">
          <span className="px-1 text-[11px] text-ink-faint">칸 {page.Panels.length}개</span>
          {page.Panels.map((p) => {
            const sel =
              (selection.kind === "panel" && selection.id === p.Id) ||
              ((selection.kind === "image" || selection.kind === "bubble") &&
                selection.panelId === p.Id);
            return (
              <ListRow
                key={p.Id}
                active={sel}
                locked={p.IsLocked}
                onClick={() => select({ kind: "panel", id: p.Id })}
              >
                {p.Name || `${p.Number}번 칸`}
              </ListRow>
            );
          })}
          {page.Panels.length === 0 && (
            <span className="px-1 py-2 text-[11px] text-ink-faint">
              패턴을 입력하고 “구성”을 누르세요.
            </span>
          )}
        </div>
      </Section>
    </>
  );
}

/** 현재 페이지를 깊은 복제해 끝에 추가하고 그 페이지로 이동. */
function duplicatePage(index: number) {
  const store = editorStore.getState();
  if (!store.project.Pages[index]) return;
  store.apply((p) => {
    const src = p.Pages[index];
    if (!src) return;
    const clone = structuredClone(src);
    clone.Name = `${clone.Name || `Page ${index + 1}`} 사본`;
    p.Pages.push(clone);
  }, true);
  gotoPage(editorStore.getState().project.Pages.length - 1);
}
