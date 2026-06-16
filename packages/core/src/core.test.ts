import { describe, expect, it } from "vitest";
import { createProject } from "./factory";
import { applyLayout, layoutSlots, parsePattern } from "./layout";
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
