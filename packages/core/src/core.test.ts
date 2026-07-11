import { describe, expect, it } from "vitest";
import { createCut, createProject, createStripProject } from "./factory";
import { applyLayout, layoutSlots, parsePattern } from "./layout";
import { clampStripWidth, defaultCutHeight, STRIP_MAX_WIDTH, STRIP_MIN_WIDTH } from "./schema";
import { parseProject, serializeProject } from "./serialize";

describe("layout", () => {
  it("parses panel patterns (1..6 only)", () => {
    expect(parsePattern("1,2,1")).toEqual([1, 2, 1]);
    expect(parsePattern(" 2 , 0, 7, 3 ")).toEqual([2, 3]);
  });

  it("creates the right number of slots inside the page", () => {
    const slots = layoutSlots([1, 2, 1], 832, 1216, 24, 14);
    expect(slots).toHaveLength(4);
    // 모든 슬롯은 여백 안쪽에 있어야 한다.
    for (const s of slots) {
      expect(s.X).toBeGreaterThanOrEqual(24);
      expect(s.X + s.Width).toBeLessThanOrEqual(832 - 24 + 0.001);
    }
  });

  it("applies a layout and renumbers panels", () => {
    const project = createProject();
    const page = project.Pages[0]!;
    applyLayout(page, "1,2,1", 24, 14);
    expect(page.Panels).toHaveLength(4);
    expect(page.Panels.map((p) => p.Number)).toEqual([1, 2, 3, 4]);
  });
});

describe("serialize", () => {
  it("round-trips a project through .kfjson", () => {
    const project = createProject();
    applyLayout(project.Pages[0]!, "2,2", 24, 14);
    const json = serializeProject(project);
    const back = parseProject(json);
    expect(back.Pages[0]!.Panels).toHaveLength(4);
    expect(back.Pages[0]!.PageWidth).toBe(832);
  });

  it("fills defaults for legacy/sparse json and computes tail mids", () => {
    const sparse = {
      Pages: [
        {
          Panels: [
            {
              Number: 1,
              X: 10,
              Y: 10,
              Width: 100,
              Height: 100,
              Bubbles: [{ Text: "hi", Tails: [{ StartX: 0, StartY: 0, X: 100, Y: 100 }] }],
            },
          ],
        },
      ],
    };
    const project = parseProject(sparse);
    const tail = project.Pages[0]!.Panels[0]!.Bubbles[0]!.Tails[0]!;
    expect(tail.MidX).toBe(50);
    expect(tail.MidY).toBe(50);
    // 누락된 페이지 크기 기본값
    expect(project.Pages[0]!.PageWidth).toBe(832);
  });
});

describe("strip (세로 스트립/페이지 모드)", () => {
  it("clamps strip width to [690, 1500]", () => {
    expect(clampStripWidth(100)).toBe(STRIP_MIN_WIDTH);
    expect(clampStripWidth(9999)).toBe(STRIP_MAX_WIDTH);
    expect(clampStripWidth(800.6)).toBe(801);
    expect(clampStripWidth(Number.NaN)).toBeGreaterThanOrEqual(STRIP_MIN_WIDTH);
  });

  it("creates a strip project with N cuts sharing the strip width", () => {
    const project = createStripProject(800, 4);
    expect(project.StripWidth).toBe(800);
    expect(project.Pages).toHaveLength(4);
    for (const cut of project.Pages) {
      expect(cut.PageWidth).toBe(800);
      expect(cut.PageHeight).toBe(defaultCutHeight(800));
    }
    expect(project.Pages[0]!.Name).toBe("페이지 1");
  });

  it("createCut honors explicit height and clamps width", () => {
    const cut = createCut(100, 640);
    expect(cut.PageWidth).toBe(STRIP_MIN_WIDTH);
    expect(cut.PageHeight).toBe(640);
  });

  it("normalize syncs every cut width to StripWidth and clamps it", () => {
    const project = createStripProject(800, 2);
    project.Pages[1]!.PageWidth = 500; // 불변식 위반 유도
    const back = parseProject(serializeProject(project));
    expect(back.Pages[1]!.PageWidth).toBe(800);

    const wide = parseProject({ StripWidth: 5000, Pages: [{}] });
    expect(wide.StripWidth).toBe(STRIP_MAX_WIDTH);
    expect(wide.Pages[0]!.PageWidth).toBe(STRIP_MAX_WIDTH);
  });

  it("leaves legacy documents (StripWidth 0/absent) untouched", () => {
    const legacy = parseProject({ Pages: [{ PageWidth: 832 }, { PageWidth: 400 }] });
    expect(legacy.StripWidth).toBe(0);
    expect(legacy.Pages[0]!.PageWidth).toBe(832);
    expect(legacy.Pages[1]!.PageWidth).toBe(400);
  });

  it("round-trips StripWidth through .kfjson", () => {
    const back = parseProject(serializeProject(createStripProject(1200, 8)));
    expect(back.StripWidth).toBe(1200);
    expect(back.Pages).toHaveLength(8);
  });
});
