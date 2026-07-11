import { describe, expect, it } from "vitest";
import type { ComicPageData, ComicPanelData, PanelImageData, SpeechBubbleData } from "@repo/core";
import { assetRef, putAlphaMap, putAsset } from "../assets";
import type { Selection } from "../types";
import {
  activePanelAt,
  bubbleContains,
  collectSelectables,
  collectSelectablesPage,
  imageOpaqueAt,
  onPanelBorder,
  panelCorners,
  pointInPoly,
  selEq,
} from "./hittest";

/* ---------- 픽스처 ---------- */

function panel(over: Partial<ComicPanelData> = {}): ComicPanelData {
  return {
    Id: "p1",
    Number: 1,
    Name: "",
    X: 100,
    Y: 100,
    Width: 200,
    Height: 200,
    IsLocked: false,
    CornerMode: false,
    CornerOffsets: new Array(8).fill(0),
    Images: [],
    Bubbles: [],
    ...over,
  } as ComicPanelData;
}

function image(id: string, over: Partial<PanelImageData> = {}): PanelImageData {
  return {
    Id: id,
    Path: assetRef(id),
    Scale: 1,
    ScaleY: 0,
    TranslateX: 0,
    TranslateY: 0,
    IsCropped: false,
    IsLocked: false,
    ...over,
  } as PanelImageData;
}

function bubble(id: string, over: Partial<SpeechBubbleData> = {}): SpeechBubbleData {
  return { Id: id, X: 0, Y: 0, Width: 50, Height: 50, IsLocked: false, ...over } as SpeechBubbleData;
}

// 50×50 자산을 등록하고 알파 맵을 주입한다. opaque=false면 전부 투명(알파 0).
function registerAsset(id: string, opaque = true, w = 50, h = 50): void {
  putAsset({ id, dataUrl: "", width: w, height: h });
  putAlphaMap(id, w, h, new Uint8Array(w * h).fill(opaque ? 255 : 0));
}

const sel = (s: Selection) => `${s.kind}:${s.panelId ?? "-"}:${s.id ?? "-"}`;

/* ---------- 기본 기하 ---------- */

describe("pointInPoly", () => {
  const square = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];
  it("내부/외부", () => {
    expect(pointInPoly(square, 5, 5)).toBe(true);
    expect(pointInPoly(square, 15, 5)).toBe(false);
    expect(pointInPoly(square, -1, 5)).toBe(false);
  });
});

describe("panelCorners", () => {
  it("직사각형(CornerMode off)", () => {
    expect(panelCorners(panel())).toEqual([
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 200 },
      { x: 0, y: 200 },
    ]);
  });
  it("사변형(CornerOffsets 변위)", () => {
    const o = [10, 5, 0, 0, 0, 0, 0, 0]; // TL만 (10,5) 변위
    expect(panelCorners(panel({ CornerMode: true, CornerOffsets: o }))[0]).toEqual({ x: 10, y: 5 });
  });
});

describe("onPanelBorder", () => {
  const p = panel(); // 칸 로컬 0..200, 테두리 밴드 18, 바깥 여유 8
  it("테두리 밴드 안은 true, 중앙은 false", () => {
    expect(onPanelBorder(p, 5, 100)).toBe(true); // 왼쪽 밴드
    expect(onPanelBorder(p, 100, 100)).toBe(false); // 중앙
    expect(onPanelBorder(p, 195, 100)).toBe(true); // 오른쪽 밴드
  });
  it("바깥 8px 이내는 테두리, 그보다 밖은 아님", () => {
    expect(onPanelBorder(p, -5, 100)).toBe(true);
    expect(onPanelBorder(p, -12, 100)).toBe(false);
  });
});

describe("bubbleContains", () => {
  it("말풍선 바운딩 사각형(칸+말풍선 오프셋)", () => {
    const p = panel();
    const b = bubble("b1", { X: 10, Y: 10, Width: 40, Height: 40 }); // 페이지 110..150
    expect(bubbleContains(p, b, 120, 120)).toBe(true);
    expect(bubbleContains(p, b, 155, 120)).toBe(false);
  });
});

/* ---------- 픽셀 알파 ---------- */

describe("imageOpaqueAt", () => {
  it("투명 픽셀은 통과(false), 불투명은 잡힘(true)", () => {
    registerAsset("opaque", true);
    registerAsset("clear", false);
    const p = panel({ Images: [image("opaque"), image("clear")] });
    // 두 이미지 모두 (100..150) 박스. 동일 지점에서 알파만 다름.
    expect(imageOpaqueAt(p, p.Images[0]!, 120, 120)).toBe(true);
    expect(imageOpaqueAt(p, p.Images[1]!, 120, 120)).toBe(false);
  });

  it("박스 밖은 false", () => {
    registerAsset("a", true);
    const p = panel({ Images: [image("a")] });
    expect(imageOpaqueAt(p, p.Images[0]!, 160, 120)).toBe(false); // 50px 폭 박스(100..150) 바깥
  });

  it("크롭 이미지는 칸 사변형 밖이면 false", () => {
    registerAsset("c", true, 300, 300);
    // 사변형: TL을 (0,0)→(0,0) 그대로지만 BR을 안으로 당겨 (120,120)로 → 우하단이 잘림
    const o = [0, 0, 0, 0, -80, -80, 0, 0];
    const p = panel({ CornerMode: true, CornerOffsets: o, Images: [image("c", { IsCropped: true })] });
    expect(imageOpaqueAt(p, p.Images[0]!, 110, 110)).toBe(true); // 사변형 안
    expect(imageOpaqueAt(p, p.Images[0]!, 280, 280)).toBe(false); // 사변형 밖(잘린 영역)
  });

  it("알파 맵 없으면 불투명(사각형) 취급", () => {
    putAsset({ id: "noalpha", dataUrl: "", width: 50, height: 50 });
    const p = panel({ Images: [image("noalpha")] });
    expect(imageOpaqueAt(p, p.Images[0]!, 120, 120)).toBe(true);
  });
});

/* ---------- 후보 스택(z-순) + 순환 ---------- */

describe("collectSelectables", () => {
  it("말풍선 > 이미지 > 칸 몸체 순, 이미지는 배열 역순(위부터)", () => {
    registerAsset("img0", true);
    registerAsset("img1", true);
    const p = panel({
      Images: [image("img0"), image("img1")], // img1이 위
      Bubbles: [bubble("b0", { X: 0, Y: 0, Width: 60, Height: 60 })],
    });
    const stack = collectSelectables(p, 120, 120).map(sel);
    expect(stack).toEqual(["bubble:p1:b0", "image:p1:img1", "image:p1:img0", "panel:-:p1"]);
  });

  it("투명 이미지는 스택에서 빠진다(아래로 통과)", () => {
    registerAsset("clear", false);
    const p = panel({ Images: [image("clear")] });
    expect(collectSelectables(p, 120, 120).map(sel)).toEqual(["panel:-:p1"]);
  });

  it("테두리 클릭은 칸이 최상단", () => {
    registerAsset("img", true);
    const p = panel({ Images: [image("img")] });
    // (105,105) → 칸 로컬 (5,5): 테두리 밴드 + 이미지 불투명
    const stack = collectSelectables(p, 105, 105).map(sel);
    expect(stack[0]).toBe("panel:-:p1");
    expect(stack).toContain("image:p1:img");
  });

  it("잠긴 말풍선/이미지는 후보에서 제외", () => {
    registerAsset("img", true);
    const p = panel({
      Images: [image("img", { IsLocked: true })],
      Bubbles: [bubble("b", { IsLocked: true, Width: 60, Height: 60 })],
    });
    expect(collectSelectables(p, 120, 120).map(sel)).toEqual(["panel:-:p1"]);
  });

  it("같은 지점 반복 클릭 순환: 다음 후보로 한 단계씩, 마지막 다음은 처음", () => {
    registerAsset("img", true);
    const p = panel({
      Images: [image("img")],
      Bubbles: [bubble("b", { Width: 60, Height: 60 })],
    });
    const stack = collectSelectables(p, 120, 120);
    // 원본 _pendingCycle 인덱스 계산: (idx+1) % len
    const next = (cur: Selection) => {
      const idx = stack.findIndex((s) => selEq(s, cur));
      return idx < 0 ? stack[0]! : stack[(idx + 1) % stack.length]!;
    };
    expect(sel(stack[0]!)).toBe("bubble:p1:b");
    expect(sel(next(stack[0]!))).toBe("image:p1:img"); // 말풍선 → 이미지
    expect(sel(next(stack[1]!))).toBe("panel:-:p1"); // 이미지 → 칸
    expect(sel(next(stack[2]!))).toBe("bubble:p1:b"); // 칸 → 처음(말풍선)
  });
});

/* ---------- 페이지 전역 후보(유연 합성) ---------- */

describe("collectSelectablesPage", () => {
  const mkPage = (panels: ComicPanelData[]): ComicPageData =>
    ({ PageWidth: 800, PageHeight: 1000, Panels: panels } as ComicPageData);

  it("칸 경계를 넘은 말풍선도 선택된다(소속 칸과 무관, 최상단)", () => {
    const a = panel({ Id: "a", X: 0, Y: 0, Width: 100, Height: 100, Bubbles: [bubble("b1", { X: 50, Y: 20, Width: 100, Height: 40 })] });
    const b = panel({ Id: "b", X: 100, Y: 0, Width: 100, Height: 100 });
    // (120,40): b 영역이지만 a의 말풍선(page 50..150)이 떠 있음 → 말풍선이 최상단.
    const stack = collectSelectablesPage(mkPage([a, b]), 120, 40).map(sel);
    expect(stack[0]).toBe("bubble:a:b1");
    expect(stack).toContain("panel:-:b");
  });

  it("칸 밖으로 나온(크롭 끈) 이미지는 칸 밖에서도 선택된다", () => {
    registerAsset("big", true, 200, 200);
    const a = panel({ Id: "a", X: 0, Y: 0, Width: 100, Height: 100, Images: [image("big", { IsCropped: false })] });
    // (150,150): 칸(100×100) 밖이지만 이미지(200×200) 안 → 이미지 선택.
    expect(collectSelectablesPage(mkPage([a]), 150, 150).map(sel)).toEqual(["image:a:big"]);
  });

  it("겹친 칸: 위 칸부터 모두 후보 → 반복 클릭으로 아래 칸까지 순환", () => {
    const a = panel({ Id: "a", X: 0, Y: 0, Width: 300, Height: 300 });
    const b = panel({ Id: "b", X: 100, Y: 100, Width: 300, Height: 300 });
    // (150,150): 두 칸 겹침 → [위 b, 아래 a].
    expect(collectSelectablesPage(mkPage([a, b]), 150, 150).map(sel)).toEqual(["panel:-:b", "panel:-:a"]);
  });

  it("빈 공간은 후보 없음", () => {
    const a = panel({ Id: "a", X: 0, Y: 0, Width: 100, Height: 100 });
    expect(collectSelectablesPage(mkPage([a]), 500, 500)).toEqual([]);
  });

  it("잠긴 칸의 내용물은 제외", () => {
    registerAsset("im", true);
    const a = panel({ Id: "a", X: 0, Y: 0, Width: 200, Height: 200, IsLocked: true, Images: [image("im")], Bubbles: [bubble("b", { Width: 60, Height: 60 })] });
    expect(collectSelectablesPage(mkPage([a]), 30, 30)).toEqual([]);
  });
});

/* ---------- 활성 칸 ---------- */

describe("activePanelAt", () => {
  const page = (panels: ComicPanelData[]): ComicPageData =>
    ({ PageWidth: 800, PageHeight: 1000, Panels: panels } as ComicPageData);

  it("점을 포함하는 최상단(나중 인덱스) 칸", () => {
    const a = panel({ Id: "a", X: 0, Y: 0, Width: 300, Height: 300 });
    const b = panel({ Id: "b", X: 100, Y: 100, Width: 300, Height: 300 });
    expect(activePanelAt(page([a, b]), 150, 150)?.Id).toBe("b"); // 겹친 영역 → 위(b)
    expect(activePanelAt(page([a, b]), 50, 50)?.Id).toBe("a");
    expect(activePanelAt(page([a, b]), 700, 700)).toBeUndefined();
  });
});

describe("selEq", () => {
  it("종류/panelId/id 모두 비교", () => {
    expect(selEq({ kind: "panel", id: "p" }, { kind: "panel", id: "p" })).toBe(true);
    expect(selEq({ kind: "bubble", panelId: "p", id: "b" }, { kind: "bubble", panelId: "p", id: "b" })).toBe(true);
    expect(selEq({ kind: "image", panelId: "p", id: "x" }, { kind: "image", panelId: "p", id: "y" })).toBe(false);
    expect(selEq({ kind: "none" }, { kind: "panel", id: "p" })).toBe(false);
  });
});
