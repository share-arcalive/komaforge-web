import { describe, expect, it } from "vitest";
import { isVideoFile } from "./assets";

// 최소 File 스텁(isVideoFile은 type/name만 읽음).
const f = (name: string, type = ""): File => ({ name, type }) as unknown as File;

describe("isVideoFile", () => {
  // 원본 IsVideoExtension 과 동일해야 함(.mp4/.webm/.mov/.avi/.mkv/.m4v).
  it("원본 확장자 목록을 동영상으로 인식", () => {
    for (const ext of ["mp4", "webm", "mov", "avi", "mkv", "m4v"]) {
      expect(isVideoFile(f(`clip.${ext}`))).toBe(true);
      expect(isVideoFile(f(`CLIP.${ext.toUpperCase()}`))).toBe(true); // 대문자도
    }
  });

  it("video/* MIME 은 확장자 없어도 동영상", () => {
    expect(isVideoFile(f("blob", "video/mp4"))).toBe(true);
    expect(isVideoFile(f("noext", "video/webm"))).toBe(true);
  });

  it("이미지/기타는 동영상 아님", () => {
    expect(isVideoFile(f("a.png", "image/png"))).toBe(false);
    expect(isVideoFile(f("a.gif", "image/gif"))).toBe(false);
    expect(isVideoFile(f("a.webp", "image/webp"))).toBe(false);
    expect(isVideoFile(f("a.jpg", "image/jpeg"))).toBe(false);
    // webp/png 는 애니 디코드 경로이지 동영상이 아니다(혼동 방지).
    expect(isVideoFile(f("anim.webp"))).toBe(false);
  });
});
