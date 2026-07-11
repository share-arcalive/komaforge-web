import { makeId } from "@repo/core";

/**
 * 이미지 자산 레지스트리.
 * 데스크톱은 파일 경로로 이미지를 참조하지만 브라우저엔 파일시스템이 없으므로
 * 바이트를 dataURL로 메모리에 보관하고 PanelImage.Path 를 `asset:<id>` 로 재해석한다.
 * (영속화는 web 레이어가 exportAssets/importAssets 로 IndexedDB에 저장)
 */
export interface AssetRecord {
  id: string;
  dataUrl: string;
  width: number;
  height: number;
  /** 미디어 종류. 구버전 영속 자산엔 없으므로 미지정=이미지로 취급. */
  kind?: "image" | "video";
}

// 원본 IsVideoExtension 과 동일한 확장자 목록(+ MIME video/*).
const VIDEO_EXTS = /\.(mp4|webm|mov|avi|mkv|m4v)$/i;
export function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/") || VIDEO_EXTS.test(file.name);
}

const ASSET_PREFIX = "asset:";
const registry = new Map<string, AssetRecord>();

export function assetRef(id: string): string {
  return `${ASSET_PREFIX}${id}`;
}

export function assetIdFromPath(path: string): string | undefined {
  return path.startsWith(ASSET_PREFIX) ? path.slice(ASSET_PREFIX.length) : undefined;
}

export function putAsset(record: AssetRecord): void {
  registry.set(record.id, record);
}

export function getAsset(id: string | undefined): AssetRecord | undefined {
  return id ? registry.get(id) : undefined;
}

export function getAssetByPath(path: string): AssetRecord | undefined {
  return getAsset(assetIdFromPath(path));
}

export function exportAssets(): Record<string, AssetRecord> {
  return Object.fromEntries(registry);
}

export function importAssets(map: Record<string, AssetRecord> | undefined | null): void {
  if (!map) return;
  for (const [id, rec] of Object.entries(map)) registry.set(id, rec);
}

/** 레지스트리 전체 비우기 — 새 문서 시작 시 호출해 이전 문서 자산이 이후 저장 번들에
 *  고아 dataURL로 누적되는 것을 막는다. (파일 로드는 병합 유지 — 같은 세션 .kfjson 왕복 지원) */
export function clearAssets(): void {
  registry.clear();
  alphaMaps.clear();
  alphaPending.clear();
}

/** File → 자산 등록(브라우저 전용; dataURL + 자연 크기 측정). 동영상은 <video> 로 측정. */
export async function fileToAsset(file: File): Promise<AssetRecord> {
  const dataUrl = await readAsDataUrl(file);
  const video = isVideoFile(file);
  const { width, height } = video ? await measureVideo(dataUrl) : await measureImage(dataUrl);
  const record: AssetRecord = { id: makeId(), dataUrl, width, height, kind: video ? "video" : "image" };
  putAsset(record);
  return record;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

function measureImage(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("image decode failed"));
    img.src = dataUrl;
  });
}

// 동영상 자연 크기(원본 NaturalVideoWidth/Height 대응) — 메타데이터만 로드해 측정.
function measureVideo(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () => resolve({ width: v.videoWidth || 1, height: v.videoHeight || 1 });
    v.onerror = () => reject(new Error("video metadata load failed"));
    v.src = dataUrl;
  });
}

/**
 * 픽셀 알파 히트테스트용 알파 맵.
 * 데스크톱 GetAlphaBitmap/GetPixelAlpha 대응: 자산을 1회 오프스크린 캔버스로 디코드해
 * 자연 픽셀 알파 채널만 Uint8Array(폭×높이)로 캐시한다. 자산은 dataURL(동일 출처)이라
 * 캔버스가 오염되지 않는다. 동영상/디코드 실패 등 맵이 없으면 사각형(불투명) 취급.
 */
interface AlphaMap {
  w: number;
  h: number;
  alpha: Uint8Array;
}

const alphaMaps = new Map<string, AlphaMap>();
const alphaPending = new Set<string>();

/** 알파 맵을 직접 주입(테스트, 그리고 Phase 4 애니/동영상 프레임 교체용). */
export function putAlphaMap(id: string, w: number, h: number, alpha: Uint8Array): void {
  alphaMaps.set(id, { w, h, alpha });
}

/**
 * 자산 알파 맵을 비동기로 준비한다(이미 준비됐으면 즉시 반환).
 * 준비가 끝나면 onReady를 1회 호출(재렌더/재히트테스트 트리거용).
 */
export function ensureAlphaMap(id: string | undefined, onReady?: () => void): AlphaMap | null {
  if (!id) return null;
  const ready = alphaMaps.get(id);
  if (ready) return ready;
  if (alphaPending.has(id)) return null;
  const asset = registry.get(id);
  if (!asset || asset.kind === "video") return null; // 동영상은 알파 맵 없음(불투명 사각형 히트).
  alphaPending.add(id);
  const img = new Image();
  img.onload = () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = asset.width;
      canvas.height = asset.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const { data } = ctx.getImageData(0, 0, asset.width, asset.height);
        const alpha = new Uint8Array(asset.width * asset.height);
        for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3]!;
        alphaMaps.set(id, { w: asset.width, h: asset.height, alpha });
      }
    } catch {
      // 캔버스 오염/디코드 실패 → 맵 없음(불투명 취급).
    }
    alphaPending.delete(id);
    onReady?.();
  };
  img.onerror = () => alphaPending.delete(id);
  img.src = asset.dataUrl;
  return null;
}

/**
 * 자연 픽셀(px,py)의 알파(0..255). 맵이 아직 없으면 null(=불투명 취급).
 * 좌표는 맵 범위로 클램프한다(원본 Math.Clamp 대응).
 */
export function alphaAt(id: string | undefined, px: number, py: number): number | null {
  if (!id) return null;
  const m = alphaMaps.get(id);
  if (!m) return null;
  const x = Math.max(0, Math.min(m.w - 1, px | 0));
  const y = Math.max(0, Math.min(m.h - 1, py | 0));
  return m.alpha[y * m.w + x] ?? null;
}

/**
 * 애니메이션 프레임(GIF/WebP/APNG)을 WebCodecs ImageDecoder로 디코드한다(원본 TryDecodeAnimatedFrames).
 * 프레임 비트맵 + 프레임별 딜레이(ms)를 돌려준다. 정지(프레임 1)·미지원·실패면 null(정지 폴백).
 * Pixi 비의존 — 엔진이 비트맵을 텍스처로 감싸 ticker로 순환한다.
 */
export interface AnimatedFrames {
  bitmaps: ImageBitmap[];
  delays: number[];
}

export async function decodeAnimatedFrames(id: string | undefined): Promise<AnimatedFrames | null> {
  if (!id) return null;
  const asset = registry.get(id);
  if (!asset || asset.kind === "video") return null; // 동영상은 프레임 디코드 아님(엔진이 <video> 텍스처로 처리).
  // WebCodecs 타입은 lib.dom에 일부만 있어 any로 다룬다(별도 @types 의존 회피).
  const decoderCtor = (globalThis as { ImageDecoder?: unknown }).ImageDecoder;
  if (typeof decoderCtor !== "function") return null;

  let blob: Blob;
  try {
    blob = await (await fetch(asset.dataUrl)).blob();
  } catch {
    return null;
  }
  // 애니 가능한 포맷만 시도(정지 jpeg 등은 건너뜀). APNG도 MIME은 image/png.
  if (!/gif|webp|png|apng/i.test(blob.type)) return null;

  try {
    const data = await blob.arrayBuffer();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dec: any = new (decoderCtor as new (init: unknown) => unknown)({ data, type: blob.type });
    await dec.tracks.ready;
    const count: number = dec.tracks.selectedTrack?.frameCount ?? 1;
    if (count <= 1) {
      dec.close?.();
      return null;
    }
    const bitmaps: ImageBitmap[] = [];
    const delays: number[] = [];
    for (let i = 0; i < count; i++) {
      const { image } = await dec.decode({ frameIndex: i });
      // VideoFrame.duration 은 마이크로초. 원본처럼 0이면 100ms, 최소 20ms.
      const durMs = image.duration ? Math.round(image.duration / 1000) : 100;
      delays.push(Math.max(20, durMs));
      bitmaps.push(await createImageBitmap(image));
      image.close();
    }
    dec.close?.();
    return { bitmaps, delays };
  } catch {
    return null;
  }
}
