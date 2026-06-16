import { beforeEach, describe, expect, it } from "vitest";
import { createBubble, createImage, createPanel, createProject } from "@repo/core";
import { editorStore } from "./store";
import { assetRef } from "./assets";
import {
  copySelection,
  cutSelection,
  hasClipboard,
  pasteClipboard,
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
