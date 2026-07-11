import { beforeEach, describe, expect, it } from "vitest";
import {
  createBubble,
  createImage,
  createPanel,
  createProject,
  STRIP_MAX_WIDTH,
} from "@repo/core";
import { editorStore } from "./store";
import { assetRef } from "./assets";
import {
  activateCut,
  addCut,
  addDefaultVnTemplate,
  addPage,
  copySelection,
  cutSelection,
  deleteSelection,
  generateVnPages,
  hasClipboard,
  moveCut,
  newStripProject,
  pasteClipboard,
  removeCut,
  reorderSelected,
  setCutHeight,
  setStripWidth,
  setVnEnabled,
  toggleSelectedLock,
} from "./commands";

// 칸(이미지 1·말풍선 1)을 가진 프로젝트를 만들어 스토어에 적재한다.
function setup() {
  const project = createProject();
  const page = project.Pages[0]!;
  const panel = createPanel(1, 10, 10, 200, 200);
  const image = createImage(assetRef("a1"));
  image.TranslateX = 5;
  image.TranslateY = 5;
  image.Scale = 1;
  image.ScaleY = 1;
  const bubble = createBubble(20, 20);
  panel.Images.push(image);
  panel.Bubbles.push(bubble);
  page.Panels.push(panel);
  editorStore.getState().setProject(project, 0);
  return { panel, image, bubble };
}

const page = () => editorStore.getState().project.Pages[0]!;

describe("clipboard", () => {
  beforeEach(() => setup());

  it("칸 복사→붙여넣기: 칸이 늘고 새 ID·24px 오프셋·내부 오브젝트도 새 ID", () => {
    const { panel } = setup();
    editorStore.getState().select({ kind: "panel", id: panel.Id });
    copySelection();
    expect(hasClipboard()).toBe(true);
    pasteClipboard();

    const panels = page().Panels;
    expect(panels.length).toBe(2);
    const pasted = panels[1]!;
    expect(pasted.Id).not.toBe(panel.Id);
    expect(pasted.X).toBe(34); // 10 + 24 (같은 위치 충돌)
    expect(pasted.Y).toBe(34);
    expect(pasted.Images.length).toBe(1);
    expect(pasted.Images[0]!.Id).not.toBe(panel.Images[0]!.Id);
    expect(pasted.Bubbles[0]!.Id).not.toBe(panel.Bubbles[0]!.Id);
    // 붙여넣은 칸이 선택된다.
    expect(editorStore.getState().selection).toMatchObject({ kind: "panel", id: pasted.Id });
  });

  it("이미지 복사→붙여넣기: 같은 칸에 오프셋 추가", () => {
    const { panel, image } = setup();
    editorStore.getState().select({ kind: "image", panelId: panel.Id, id: image.Id });
    copySelection();
    pasteClipboard();

    const imgs = page().Panels[0]!.Images;
    expect(imgs.length).toBe(2);
    expect(imgs[1]!.TranslateX).toBe(29); // 5 + 24
    expect(imgs[1]!.TranslateY).toBe(29);
    expect(imgs[1]!.Id).not.toBe(image.Id);
  });

  it("말풍선 잘라내기: 원본 제거 + 클립보드 보관 → 붙여넣기로 복원", () => {
    const { panel, bubble } = setup();
    editorStore.getState().select({ kind: "bubble", panelId: panel.Id, id: bubble.Id });
    cutSelection();
    expect(page().Panels[0]!.Bubbles.length).toBe(0);
    expect(hasClipboard()).toBe(true);

    // 붙여넣을 대상 칸을 선택(잘라낸 뒤 선택은 해제됨).
    editorStore.getState().select({ kind: "panel", id: panel.Id });
    pasteClipboard();
    const bubbles = page().Panels[0]!.Bubbles;
    expect(bubbles.length).toBe(1);
    expect(bubbles[0]!.X).toBe(20); // 충돌 없음 → 같은 위치
    expect(bubbles[0]!.Id).not.toBe(bubble.Id);
  });

  it("toggleSelectedLock: 선택 칸 잠금 토글", () => {
    const { panel } = setup();
    editorStore.getState().select({ kind: "panel", id: panel.Id });
    expect(page().Panels[0]!.IsLocked).toBe(false);
    toggleSelectedLock();
    expect(page().Panels[0]!.IsLocked).toBe(true);
    toggleSelectedLock();
    expect(page().Panels[0]!.IsLocked).toBe(false);
  });
});

describe("strip/cut (세로 스트립 페이지 명령)", () => {
  it("newStripProject: 페이지 N개 + 전역 너비 + 첫 페이지 선택 상태", () => {
    newStripProject(8, 800);
    const s = editorStore.getState();
    expect(s.project.StripWidth).toBe(800);
    expect(s.project.Pages.length).toBe(8);
    expect(s.pageIndex).toBe(0);
  });

  it("setStripWidth: 클램프 + 모든 페이지 너비 동기화(콘텐츠 절대 크기 유지)", () => {
    newStripProject(4, 800);
    const panelW = 300;
    editorStore.getState().apply((p) => {
      p.Pages[0]!.Panels.push(createPanel(1, 10, 10, panelW, 200));
    });
    setStripWidth(99999);
    const p = editorStore.getState().project;
    expect(p.StripWidth).toBe(STRIP_MAX_WIDTH);
    for (const pg of p.Pages) expect(pg.PageWidth).toBe(STRIP_MAX_WIDTH);
    // 칸은 절대 크기 유지
    expect(p.Pages[0]!.Panels[0]!.Width).toBe(panelW);
  });

  it("activateCut: 페이지 활성 + 페이지 선택(선택 해제 아님)", () => {
    newStripProject(4);
    activateCut(2);
    const s = editorStore.getState();
    expect(s.pageIndex).toBe(2);
    expect(s.selection).toMatchObject({ kind: "cut", cutIndex: 2 });
  });

  it("addCut: 현재 페이지 뒤 삽입, 이웃 크기 계승, 새 페이지 선택", () => {
    newStripProject(4, 800);
    setCutHeight(1, 555);
    activateCut(1);
    addCut();
    const s = editorStore.getState();
    expect(s.project.Pages.length).toBe(5);
    expect(s.pageIndex).toBe(2);
    expect(s.selection).toMatchObject({ kind: "cut", cutIndex: 2 });
    expect(s.project.Pages[2]!.PageHeight).toBe(555); // 이웃(페이지2) 높이 계승
    expect(s.project.Pages[2]!.PageWidth).toBe(800);
  });

  it("removeCut/deleteSelection: 최소 1개 유지 + 이웃 페이지 선택", () => {
    newStripProject(4);
    activateCut(3);
    deleteSelection(); // kind:"cut" 선택 상태에서 삭제
    let s = editorStore.getState();
    expect(s.project.Pages.length).toBe(3);
    expect(s.selection).toMatchObject({ kind: "cut", cutIndex: 2 });

    removeCut(0);
    removeCut(0);
    removeCut(0); // 마지막 1개는 삭제되지 않음
    s = editorStore.getState();
    expect(s.project.Pages.length).toBe(1);
  });

  it("reorderSelected: 페이지 순서 이동 + 선택 추적", () => {
    newStripProject(4);
    const names = () => editorStore.getState().project.Pages.map((p) => p.Name);
    activateCut(1);
    reorderSelected(1);
    expect(names()).toEqual(["페이지 1", "페이지 3", "페이지 2", "페이지 4"]);
    expect(editorStore.getState().selection).toMatchObject({ kind: "cut", cutIndex: 2 });
    reorderSelected(1);
    expect(names()).toEqual(["페이지 1", "페이지 3", "페이지 4", "페이지 2"]);
    reorderSelected(1); // 끝 → no-op
    expect(names()).toEqual(["페이지 1", "페이지 3", "페이지 4", "페이지 2"]);
  });

  it("setCutHeight(checkpoint=false)는 히스토리를 쌓지 않는다", () => {
    newStripProject(2);
    const past = editorStore.getState().past.length;
    setCutHeight(0, 900, false);
    expect(editorStore.getState().past.length).toBe(past);
    expect(editorStore.getState().project.Pages[0]!.PageHeight).toBe(900);
    setCutHeight(0, 1000, true);
    expect(editorStore.getState().past.length).toBe(past + 1);
  });

  it("cutSelection(Ctrl+X)은 페이지 선택에서 페이지를 삭제하지 않는다", () => {
    newStripProject(4);
    activateCut(1);
    cutSelection(); // 페이지 선택 → 통째 삭제 사고 방지: no-op
    expect(editorStore.getState().project.Pages.length).toBe(4);
    expect(editorStore.getState().selection).toMatchObject({ kind: "cut", cutIndex: 1 });
  });

  it("setStripWidth(checkpoint=false)는 히스토리를 쌓지 않는다(슬라이더 드래그)", () => {
    newStripProject(2, 800);
    const past = editorStore.getState().past.length;
    setStripWidth(900, false);
    setStripWidth(1000, false);
    expect(editorStore.getState().past.length).toBe(past);
    expect(editorStore.getState().project.StripWidth).toBe(1000);
    setStripWidth(1100); // 기본 checkpoint=true
    expect(editorStore.getState().past.length).toBe(past + 1);
  });

  it("moveCut: 순서 이동 + 활성/선택이 이동한 페이지를 따라간다", () => {
    newStripProject(3);
    activateCut(2);
    moveCut(2, -1);
    const s = editorStore.getState();
    expect(s.project.Pages.map((p) => p.Name)).toEqual(["페이지 1", "페이지 3", "페이지 2"]);
    expect(s.pageIndex).toBe(1);
    expect(s.selection).toMatchObject({ kind: "cut", cutIndex: 1 });
  });

  it("addPage: 스트립 문서에선 전역 너비/이웃 높이를 계승(832 기본값 방지)", () => {
    newStripProject(2, 900);
    setCutHeight(1, 700);
    addPage();
    const pages = editorStore.getState().project.Pages;
    expect(pages).toHaveLength(3);
    expect(pages[2]!.PageWidth).toBe(900);
    expect(pages[2]!.PageHeight).toBe(700);
  });

  it("페이지 선택은 copy/lock 대상이 아니다(클립보드 보존, 안전 no-op)", () => {
    const { panel } = setup();
    editorStore.getState().select({ kind: "panel", id: panel.Id });
    copySelection(); // 클립보드 = 칸
    newStripProject(2);
    activateCut(0);
    copySelection(); // 페이지 선택 → 덮어쓰지 않아야 함
    toggleSelectedLock(); // throw 없이 무시
    expect(hasClipboard()).toBe(true);
    pasteClipboard(); // 여전히 칸이 붙여넣어진다
    expect(editorStore.getState().project.Pages[0]!.Panels.length).toBe(1);
  });
});

describe("visual novel (스크립트→페이지 생성)", () => {
  beforeEach(() => setup());

  const bubbleTexts = (pageIndex: number): string[] => {
    const p = editorStore.getState().project.Pages[pageIndex]!;
    return p.Panels.flatMap((pn) => pn.Bubbles.map((b) => b.Text));
  };

  it("기본 템플릿으로 '이름: 대사' 각 줄을 페이지로 생성", () => {
    setVnEnabled(true); // 기본 템플릿 자동 생성
    const before = editorStore.getState().project.Pages.length;
    const res = generateVnPages("영희: 안녕!\n철수: 오랜만이야.\n둘은 마주 보았다.", 0);
    expect(res).toMatchObject({ ok: true, count: 3 });
    const pages = editorStore.getState().project.Pages;
    expect(pages.length).toBe(before + 3);

    // 1줄: 이름=영희, 서술=안녕!
    expect(bubbleTexts(before)).toEqual(expect.arrayContaining(["영희", "안녕!"]));
    // 3줄: 이름 없음 → '이름' 말풍선 삭제, '서술'만 교체
    const last = bubbleTexts(before + 2);
    expect(last).toContain("둘은 마주 보았다.");
    expect(last).not.toContain("영희");
    expect(last.some((t) => t === "이름")).toBe(false); // 이름 말풍선 삭제됨
  });

  it("이름/서술 말풍선이 없는 템플릿이면 에러 반환(생성 안 함)", () => {
    setVnEnabled(true);
    // 빈(이름/서술 없는) 템플릿 추가 후 그걸로 생성 시도
    addDefaultVnTemplate();
    const emptyIdx = editorStore.getState().project.VnTemplates.length - 1;
    // 기본 템플릿 말풍선을 비워 마커 제거
    editorStore.getState().apply((p) => {
      p.VnTemplates[emptyIdx]!.Panels.forEach((pn) => (pn.Bubbles = []));
    });
    const before = editorStore.getState().project.Pages.length;
    const res = generateVnPages("영희: 안녕", emptyIdx);
    expect(res.ok).toBe(false);
    expect(editorStore.getState().project.Pages.length).toBe(before);
  });
});
