import { parseProject, serializeProject } from "@repo/core";
import {
  BUNDLE_KIND,
  BUNDLE_VERSION,
  editorStore,
  exportAssets,
  importAssets,
  isBundle,
  loadProject,
  migrateBundle,
  type Bundle,
} from "@repo/editor";
import type { EditorHandle } from "@repo/editor/engine";
import { idbGet, idbSet } from "./idb";
import { zipStore, type ZipEntry } from "./zip";
import { encodeAnimatedWebP } from "./webpAnim";

const AUTOSAVE_KEY = "autosave";

function buildBundle(): Bundle {
  return {
    kind: BUNDLE_KIND,
    version: BUNDLE_VERSION,
    project: editorStore.getState().project,
    assets: exportAssets(),
  };
}

function download(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** 프로젝트 + 자산을 하나의 번들 JSON으로 저장(데스크톱 .kfjson 상위호환). */
export function saveBundleToFile(): void {
  const bundle = buildBundle();
  const name = (bundle.project.Title || "komaforge").replace(/[^\w\-가-힣 ]+/g, "_").trim() || "komaforge";
  download(`${name}.koma.json`, JSON.stringify(bundle, null, 2), "application/json");
}

/** project만 .kfjson 으로 저장(이미지는 자산 참조 경로로만 — 데스크톱 호환 형식). */
export function saveKfjsonToFile(): void {
  const project = editorStore.getState().project;
  const name = (project.Title || "komaforge").replace(/[^\w\-가-힣 ]+/g, "_").trim() || "komaforge";
  download(`${name}.kfjson`, serializeProject(project), "application/json");
}

export async function loadFromFile(file: File): Promise<void> {
  const text = await file.text();
  const raw = JSON.parse(text);
  if (isBundle(raw)) {
    const bundle = migrateBundle(raw); // 버전을 읽어 구버전(v1) 번들을 마이그레이션
    importAssets(bundle.assets);
    loadProject(parseProject(bundle.project));
  } else {
    // 순수 .kfjson (자산 없음)
    loadProject(parseProject(raw));
  }
}

/* ---------- 자동 저장 ---------- */

let saveTimer: ReturnType<typeof setTimeout> | undefined;

export function startAutosave(): () => void {
  const unsub = editorStore.subscribe((s, prev) => {
    if (s.rev === prev.rev) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void idbSet(AUTOSAVE_KEY, buildBundle());
    }, 600);
  });
  return unsub;
}

/** 다음 실행 시 복원. 복원되면 true. */
export async function restoreAutosave(): Promise<boolean> {
  try {
    const raw = await idbGet<Bundle>(AUTOSAVE_KEY);
    if (!raw || !raw.project) return false;
    const bundle = migrateBundle(raw); // 구버전(v1) 자동저장도 버전을 읽어 마이그레이션
    importAssets(bundle.assets);
    loadProject(parseProject(bundle.project));
    return true;
  } catch (err) {
    // 파싱/마이그레이션 실패를 조용히 삼키면 사용자에겐 데이터 소실로 보인다.
    // 원본 blob은 IndexedDB에 그대로 남겨 두고(덮어쓰기 전까지) 원인을 콘솔에 남긴다.
    console.error("자동 저장 복원 실패 — IndexedDB의 원본은 보존됩니다:", err);
    return false;
  }
}

/* ---------- PNG 내보내기 ---------- */

export async function exportPng(handle: EditorHandle, scale = 1): Promise<void> {
  const dataUrl = await handle.exportCurrentPagePng(scale);
  if (!dataUrl) return;
  const project = editorStore.getState().project;
  const page = project.Pages[editorStore.getState().pageIndex];
  const base = (project.Title || "page").replace(/[^\w\-가-힣 ]+/g, "_").trim() || "page";
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${base}-${(page?.Name ?? "page")}.png`;
  a.click();
}

/** 스트립 전체(전 페이지 이어붙임)를 한 장의 PNG로 내보낸다. 경계에 걸친 말풍선도 잘리지 않는다.
 *  반환 false = GPU 텍스처 한계 초과(배수를 낮춰 재시도 안내). */
export async function exportStripPng(handle: EditorHandle, scale = 1): Promise<boolean> {
  const dataUrl = await handle.exportStripPng(scale);
  if (!dataUrl) return false;
  const project = editorStore.getState().project;
  const base = (project.Title || "komaforge").replace(/[^\w\-가-힣 ]+/g, "_").trim() || "komaforge";
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${base}-strip.png`;
  a.click();
  return true;
}

function sanitizeName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]+/g, "_").trim();
  return cleaned || "page";
}

/** 대본(.txt) 내보내기: 페이지마다 말풍선 텍스트를 순서대로(칸→말풍선) ': '로 이어 한 줄로.
 *  원본 ExportScriptTxt/PageScriptLine. 빈 말풍선 제외, 페이지마다 개행. */
export function exportScript(): void {
  const project = editorStore.getState().project;
  const lines = project.Pages.map((page) => {
    const texts: string[] = [];
    for (const panel of page.Panels) {
      for (const bubble of panel.Bubbles) {
        const t = (bubble.Text ?? "").replace(/[\r\n]+/g, " ").trim();
        if (t.length > 0) texts.push(t);
      }
    }
    return texts.join(": ");
  });
  const base = sanitizeName(project.Title || "script");
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${base}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// "data:image/png;base64,XXXX" → 바이트.
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** 현재 페이지를 fps·durationSec로 실시간 샘플링해 움직이는 WebP로 내보낸다(원본 RenderCurrentPageAnimation).
 *  애니/동영상이 있으면 그 움직임이 담긴다. 반환=캡처된 프레임 수(0이면 실패). */
export async function exportAnimatedWebP(
  handle: EditorHandle,
  scale = 1,
  fps = 12,
  durationSec = 2,
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  const res = await handle.captureAnimation({ scale, quality: 0.9, fps, durationSec }, onProgress);
  if (!res || res.frames.length === 0) return 0;
  const delays = res.frames.map(() => res.delayMs);
  const webp = encodeAnimatedWebP(res.frames, delays, res.width, res.height, 0);
  const project = editorStore.getState().project;
  const page = project.Pages[editorStore.getState().pageIndex];
  const base = (project.Title || "page").replace(/[^\w\-가-힣 ]+/g, "_").trim() || "page";
  const blob = new Blob([webp.slice().buffer], { type: "image/webp" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${base}-${page?.Name ?? "page"}.webp`;
  a.click();
  URL.revokeObjectURL(url);
  return res.frames.length;
}

/** 모든 페이지를 `001_이름.png` … 으로 렌더해 하나의 zip으로 내보낸다(원본 ExportPagesAsImages). */
export async function exportAllPagesZip(handle: EditorHandle, scale = 1): Promise<number> {
  const { project } = editorStore.getState();
  const pages = project.Pages;
  if (pages.length === 0) return 0;
  const entries: ZipEntry[] = [];
  for (let i = 0; i < pages.length; i++) {
    const dataUrl = await handle.exportPagePng(i, scale);
    if (!dataUrl) continue;
    const name = `${String(i + 1).padStart(3, "0")}_${sanitizeName(pages[i]!.Name)}.png`;
    entries.push({ name, data: dataUrlToBytes(dataUrl) });
  }
  if (entries.length === 0) return 0;
  const zip = zipStore(entries);
  const base = (project.Title || "komaforge").replace(/[^\w\-가-힣 ]+/g, "_").trim() || "komaforge";
  // Uint8Array → Blob(타입 명시). ArrayBuffer 슬라이스로 정확한 바이트 범위 전달.
  const blob = new Blob([zip.slice().buffer], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${base}-pages.zip`;
  a.click();
  URL.revokeObjectURL(url);
  return entries.length;
}
