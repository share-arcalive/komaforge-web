import {
  Application,
  Color,
  Container,
  Graphics,
  Point,
  Rectangle,
  Sprite,
  Text,
  Texture,
  VideoSource,
  CanvasTextMetrics,
  TextStyle,
  type FederatedPointerEvent,
  type Ticker,
} from "pixi.js";
import {
  autoFitFontSize,
  roundRectOutline,
  cloudExplosionOutline,
  flashOutline,
  concentrationLineEndpoints,
  effectLineEndpoints,
  clipSegmentToBox,
  tailOutline,
  combineBodyAndTails,
  unionAll,
  type Point as GeoPoint,
  type MultiPoly,
} from "@repo/geometry";
import type { BubbleTailData, ComicPageData, ComicPanelData, PanelImageData, SpeechBubbleData } from "@repo/core";
import { editorStore } from "../store";
import { assetIdFromPath, decodeAnimatedFrames, ensureAlphaMap, fileToAsset, getAsset, getAssetByPath, isVideoFile } from "../assets";
import { addImageFromAsset } from "../commands";
import { currentPage, findImage, findPanel, type Selection } from "../types";
import { activePanelAt, collectSelectablesPage, panelCorners, selEq } from "./hittest";

const FIT_PADDING = 0.94;
const HANDLE_SCREEN_PX = 9;
const MIN_BOX = 12;
const SNAP_PX = 6; // 스냅 임계(화면 px). Alt 누르면 스냅 해제.
const DRAG_DEADZONE_PX = 6; // 이동 드래그 데드존(화면 px). 이 안의 움직임은 클릭으로 간주(겹친 오브젝트 순환).

type Edge = "N" | "S" | "E" | "W" | "NE" | "NW" | "SE" | "SW";
const EDGES: Edge[] = ["NW", "N", "NE", "E", "SE", "S", "SW", "W"];

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface EditorHandle {
  destroy: () => void;
  /** 컨테이너(부모 패널) 현재 크기에 맞춰 렌더러를 리사이즈+재렌더. dockview 패널 리사이즈용
   *  (`resizeTo`는 창 리사이즈만 추종하므로 패널 크기 변경 시 직접 호출). 0 크기(숨김 탭)는 무시. */
  resize: () => void;
  exportCurrentPagePng: () => Promise<string | null>;
  /** 임의 페이지를 페이지 크기 PNG(dataURL)로 추출(다중 페이지 zip 내보내기용). */
  exportPagePng: (index: number) => Promise<string | null>;
}

export async function createEditor(container: HTMLElement): Promise<EditorHandle> {
  const app = new Application();
  await app.init({
    background: "#0e0e11",
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    // resizeTo(창 리사이즈만 추종) 대신 컨테이너 치수로 직접 init하고, 이후 resize()로 동기 리사이즈.
    // dockview 패널처럼 창과 무관하게 크기가 바뀌는 경우를 정확히 추종하기 위함.
    width: container.clientWidth || 800,
    height: container.clientHeight || 600,
  });
  container.appendChild(app.canvas);
  app.canvas.style.touchAction = "none";

  const viewport = new Container();
  const pageLayer = new Container();
  const overlay = new Container();
  viewport.addChild(pageLayer);
  viewport.addChild(overlay);
  app.stage.addChild(viewport);
  app.stage.eventMode = "static";

  let fit = 1;

  /* ---------- 텍스처 캐시(비동기 로드) ---------- */
  const textures = new Map<string, Texture>();
  const loading = new Set<string>();
  function ensureTexture(path: string): Texture | null {
    const id = assetIdFromPath(path);
    if (!id) return null;
    const cached = textures.get(id);
    if (cached) return cached;
    if (!loading.has(id)) {
      const asset = getAsset(id);
      if (asset) {
        loading.add(id);
        const img = new Image();
        img.onload = () => {
          textures.set(id, Texture.from(img));
          loading.delete(id);
          scheduleRender();
        };
        img.onerror = () => loading.delete(id);
        img.src = asset.dataUrl;
      }
    }
    return null;
  }

  /* ---------- 애니메이션 프레임(GIF/WebP/APNG) ---------- */
  // 원본 StartFrameAnimation: 프레임 텍스처를 딜레이만큼 누적해 순환(루프, 최소 20ms).
  interface AnimEntry {
    textures: Texture[];
    delays: number[];
    index: number;
    acc: number; // 현재 프레임에 머문 누적 ms
    sprites: Set<Sprite>; // 이 자산을 그리는 살아있는 스프라이트(renderScene마다 갱신)
  }
  const anim = new Map<string, AnimEntry>();
  const animStatic = new Set<string>(); // 정지로 판명된 자산(재디코드 방지)
  const animLoading = new Set<string>();

  // 애니면 엔트리 반환, 정지/디코드중이면 null(정지 텍스처 경로로 폴백).
  function ensureAnim(id: string | null): AnimEntry | null {
    if (!id || animStatic.has(id)) return null;
    const cached = anim.get(id);
    if (cached) return cached;
    if (animLoading.has(id)) return null;
    animLoading.add(id);
    decodeAnimatedFrames(id)
      .then((res) => {
        animLoading.delete(id);
        if (!res) {
          animStatic.add(id); // 정지/미지원 → 다시 시도하지 않음
          return;
        }
        anim.set(id, {
          textures: res.bitmaps.map((b) => Texture.from(b)),
          delays: res.delays,
          index: 0,
          acc: 0,
          sprites: new Set(),
        });
        scheduleRender(); // 프레임 준비됨 → 다시 그려 애니 스프라이트 등록
      })
      .catch(() => {
        animLoading.delete(id);
        animStatic.add(id);
      });
    return null;
  }

  // 기본 ticker에서 매 프레임 호출 — 딜레이를 누적해 프레임을 진행하고 스프라이트 텍스처를 교체한다.
  function tickAnimations(ticker: Ticker): void {
    const dms = ticker.deltaMS;
    for (const e of anim.values()) {
      if (e.textures.length <= 1 || e.sprites.size === 0) continue;
      e.acc += dms;
      let advanced = false;
      // 한 번의 큰 dms(탭 비활성 등)에도 무한 루프 안 되게 프레임 수만큼만 진행.
      for (let guard = 0; guard < e.textures.length; guard++) {
        const d = e.delays[e.index] ?? 100;
        if (e.acc < d) break;
        e.acc -= d;
        e.index = (e.index + 1) % e.textures.length;
        advanced = true;
      }
      if (advanced) {
        const tex = e.textures[e.index]!;
        for (const spr of e.sprites) spr.texture = tex;
      }
    }
  }
  app.ticker.add(tickAnimations);

  /* ---------- 동영상(HTMLVideoElement 텍스처) ---------- */
  // 원본 MediaKind.Video: MediaElement(음소거·루프·자동재생). 웹은 <video>를 Pixi VideoSource로 감싸
  // 같은 기본 ticker 경로에서 현재 프레임을 GPU로 갱신한다. 현재 페이지에 그려진 것만 재생/갱신.
  interface VideoEntry {
    el: HTMLVideoElement;
    texture: Texture;
    objectUrl: string | null; // dataURL→Blob URL(있으면 destroy에서 revoke)
    live: boolean; // 직전 renderScene에서 그려졌는지(=현재 페이지)
  }
  const video = new Map<string, VideoEntry>();
  const videoLoading = new Set<string>();

  // 동영상 자산이면 엔트리 반환, 준비 전/이미지면 null(placeholder 폴백).
  function ensureVideo(id: string | null): VideoEntry | null {
    if (!id) return null;
    const cached = video.get(id);
    if (cached) return cached;
    if (videoLoading.has(id)) return null;
    const asset = getAsset(id);
    if (!asset || asset.kind !== "video") return null;
    videoLoading.add(id);
    void (async () => {
      // dataURL을 Blob URL로 바꿔 <video> 탐색/재생 성능을 높인다(실패 시 dataURL 폴백).
      let src = asset.dataUrl;
      let objectUrl: string | null = null;
      try {
        const blob = await (await fetch(asset.dataUrl)).blob();
        objectUrl = URL.createObjectURL(blob);
        src = objectUrl;
      } catch {
        /* keep dataURL */
      }
      const el = document.createElement("video");
      el.muted = true;
      el.loop = true;
      el.playsInline = true;
      el.preload = "auto";
      el.src = src;
      const source = new VideoSource({
        resource: el,
        autoPlay: true,
        autoLoad: true,
        loop: true,
        muted: true,
        playsinline: true,
        updateFPS: 0, // 매 렌더 프레임 갱신
      });
      const finish = () => {
        if (!videoLoading.has(id)) return; // 이미 처리/파괴됨
        videoLoading.delete(id);
        video.set(id, { el, texture: new Texture({ source }), objectUrl, live: false });
        scheduleRender(); // 첫 프레임 준비됨 → 다시 그려 스프라이트 등록
      };
      el.addEventListener("loadeddata", finish, { once: true });
      el.addEventListener(
        "error",
        () => {
          videoLoading.delete(id);
          if (objectUrl) URL.revokeObjectURL(objectUrl);
        },
        { once: true },
      );
    })();
    return null;
  }

  // 기본 ticker에서 매 프레임: 현재 페이지의 동영상은 현재 프레임을 GPU로 갱신, 화면 밖이면 정지.
  function tickVideos(): void {
    for (const v of video.values()) {
      if (v.live) {
        if (v.el.paused) void v.el.play().catch(() => {});
        if (v.el.readyState >= 2) v.texture.source.update();
      } else if (!v.el.paused) {
        v.el.pause();
      }
    }
  }
  app.ticker.add(tickVideos);

  /* ---------- 선택 박스 매핑(칸/이미지/말풍선 공통) ---------- */
  function getBox(): Box | null {
    const { project, pageIndex, selection } = editorStore.getState();
    const page = currentPage(project, pageIndex);
    if (!page) return null;
    if (selection.kind === "panel") {
      const p = findPanel(page, selection.id);
      return p ? { x: p.X, y: p.Y, w: p.Width, h: p.Height } : null;
    }
    const panel = findPanel(page, selection.panelId);
    if (!panel) return null;
    if (selection.kind === "bubble") {
      const b = panel.Bubbles.find((x) => x.Id === selection.id);
      return b ? { x: panel.X + b.X, y: panel.Y + b.Y, w: b.Width, h: b.Height } : null;
    }
    if (selection.kind === "image") {
      const img = findImage(panel, selection.id);
      const asset = img ? getAssetByPath(img.Path) : undefined;
      if (!img || !asset) return null;
      return {
        x: panel.X + img.TranslateX,
        y: panel.Y + img.TranslateY,
        w: asset.width * img.Scale,
        h: asset.height * (img.ScaleY || img.Scale),
      };
    }
    return null;
  }

  function setBox(box: Box): void {
    const { pageIndex, selection } = editorStore.getState();
    editorStore.getState().apply((p) => {
      const page = currentPage(p, pageIndex);
      if (!page) return;
      if (selection.kind === "panel") {
        const panel = findPanel(page, selection.id);
        if (panel && !panel.IsLocked) {
          panel.X = box.x;
          panel.Y = box.y;
          panel.Width = Math.max(MIN_BOX, box.w);
          panel.Height = Math.max(MIN_BOX, box.h);
        }
        return;
      }
      const panel = findPanel(page, selection.panelId);
      if (!panel) return;
      if (selection.kind === "bubble") {
        const b = panel.Bubbles.find((x) => x.Id === selection.id);
        if (b && !b.IsLocked) {
          b.X = box.x - panel.X;
          b.Y = box.y - panel.Y;
          b.Width = Math.max(MIN_BOX, box.w);
          b.Height = Math.max(MIN_BOX, box.h);
        }
      } else if (selection.kind === "image") {
        const img = findImage(panel, selection.id);
        const asset = img ? getAssetByPath(img.Path) : undefined;
        if (img && asset && !img.IsLocked) {
          img.TranslateX = box.x - panel.X;
          img.TranslateY = box.y - panel.Y;
          img.Scale = Math.max(0.01, box.w / asset.width);
          img.ScaleY = Math.max(0.01, box.h / asset.height);
        }
      }
    }, false);
  }

  // 사변형 모서리 핸들 드래그: index(0=TL,1=TR,2=BR,3=BL)의 변위를 절대값으로 설정.
  function setCornerOffset(index: number, x: number, y: number): void {
    const { pageIndex, selection } = editorStore.getState();
    if (selection.kind !== "panel") return;
    editorStore.getState().apply((p) => {
      const panel = findPanel(currentPage(p, pageIndex), selection.id);
      if (!panel || panel.IsLocked) return;
      panel.CornerOffsets[index * 2] = x;
      panel.CornerOffsets[index * 2 + 1] = y;
    }, false);
  }

  // 선택된 말풍선의 tailIndex 꼬리 점을 갱신(드래그 핸들용).
  function setTailPoint(tailIndex: number, patch: Partial<BubbleTailData>): void {
    const { pageIndex, selection } = editorStore.getState();
    if (selection.kind !== "bubble") return;
    editorStore.getState().apply((p) => {
      const panel = findPanel(currentPage(p, pageIndex), selection.panelId);
      const b = panel?.Bubbles.find((x) => x.Id === selection.id);
      const t = b?.Tails[tailIndex];
      if (!b || b.IsLocked || !t) return;
      Object.assign(t, patch);
    }, false);
  }

  /* ---------- 스냅(이동/리사이즈 시 인접 가장자리·중앙에 흡착) ---------- */
  // 선택 종류에 맞는 스냅 후보 X/Y(페이지 좌표): 페이지 경계+중앙, 형제/소속 박스의 가장자리+중앙.
  function snapCandidates(): { xs: number[]; ys: number[] } {
    const { project, pageIndex, selection } = editorStore.getState();
    const page = currentPage(project, pageIndex);
    const xs = new Set<number>();
    const ys = new Set<number>();
    if (!page) return { xs: [], ys: [] };
    const addRect = (x: number, y: number, w: number, h: number) => {
      xs.add(x);
      xs.add(x + w / 2);
      xs.add(x + w);
      ys.add(y);
      ys.add(y + h / 2);
      ys.add(y + h);
    };
    addRect(0, 0, page.PageWidth, page.PageHeight);
    if (selection.kind === "panel") {
      for (const p of page.Panels) if (p.Id !== selection.id) addRect(p.X, p.Y, p.Width, p.Height);
    } else {
      const panel = findPanel(page, selection.panelId);
      if (panel) {
        addRect(panel.X, panel.Y, panel.Width, panel.Height);
        for (const img of panel.Images) {
          if (selection.kind === "image" && img.Id === selection.id) continue;
          const asset = getAssetByPath(img.Path);
          if (asset) {
            addRect(panel.X + img.TranslateX, panel.Y + img.TranslateY, asset.width * img.Scale, asset.height * (img.ScaleY || img.Scale));
          }
        }
        for (const b of panel.Bubbles) {
          if (selection.kind === "bubble" && b.Id === selection.id) continue;
          addRect(panel.X + b.X, panel.Y + b.Y, b.Width, b.Height);
        }
      }
    }
    return { xs: [...xs], ys: [...ys] };
  }

  function snapMove(box: Box): Box {
    const thr = SNAP_PX / fit;
    const { xs, ys } = snapCandidates();
    const pick = (cands: number[], targets: number[]) => {
      let best: { delta: number; line: number } | null = null;
      for (const t of targets)
        for (const c of cands) {
          const ad = Math.abs(c - t);
          if (ad <= thr && (!best || ad < Math.abs(best.delta))) best = { delta: c - t, line: c };
        }
      return best;
    };
    const bx = pick(xs, [box.x, box.x + box.w / 2, box.x + box.w]);
    const by = pick(ys, [box.y, box.y + box.h / 2, box.y + box.h]);
    activeSnap = { xs: bx ? [bx.line] : [], ys: by ? [by.line] : [] };
    return { ...box, x: box.x + (bx?.delta ?? 0), y: box.y + (by?.delta ?? 0) };
  }

  function snapResize(box: Box, edge: Edge): Box {
    const thr = SNAP_PX / fit;
    const { xs, ys } = snapCandidates();
    const nearest = (cands: number[], target: number) => {
      let best: number | null = null;
      let bd = thr;
      for (const c of cands) {
        const ad = Math.abs(c - target);
        if (ad <= bd) {
          bd = ad;
          best = c;
        }
      }
      return best;
    };
    let { x, y, w, h } = box;
    const lines: { xs: number[]; ys: number[] } = { xs: [], ys: [] };
    if (edge.includes("E")) {
      const s = nearest(xs, x + w);
      if (s != null) {
        w = s - x;
        lines.xs.push(s);
      }
    }
    if (edge.includes("W")) {
      const s = nearest(xs, x);
      if (s != null) {
        w += x - s;
        x = s;
        lines.xs.push(s);
      }
    }
    if (edge.includes("S")) {
      const s = nearest(ys, y + h);
      if (s != null) {
        h = s - y;
        lines.ys.push(s);
      }
    }
    if (edge.includes("N")) {
      const s = nearest(ys, y);
      if (s != null) {
        h += y - s;
        y = s;
        lines.ys.push(s);
      }
    }
    activeSnap = lines;
    return { x, y, w: Math.max(MIN_BOX, w), h: Math.max(MIN_BOX, h) };
  }

  /* ---------- 드래그 상태 ---------- */
  type TailPt = "start" | "mid" | "end";
  type TailBase = { sx: number; sy: number; mx: number; my: number; ex: number; ey: number };
  type Drag =
    | { mode: "move"; start: Point; box: Box }
    | { mode: "resize"; edge: Edge; start: Point; box: Box }
    | { mode: "corner"; index: number; start: Point; ox: number; oy: number }
    | { mode: "tail"; tailIndex: number; pt: TailPt; start: Point; base: TailBase };
  let drag: Drag | null = null;
  let checkpointed = false;
  // 이동 드래그가 데드존을 넘겨 '확정'됐는지. move 외 모드는 즉시 확정(데드존 없음).
  let dragEngaged = false;
  // 겹친 오브젝트 순환: 현재 선택을 다시 누르면 한 단계 안쪽 후보를 보류했다가
  // 이동 없이 떼면(=클릭) 그 후보로 교체한다(원본 _pendingCycle).
  let pendingCycle: Selection | null = null;
  // 드래그 중 활성 스냅 가이드 라인(페이지 좌표). drag 끝나면 비운다.
  let activeSnap: { xs: number[]; ys: number[] } = { xs: [], ys: [] };

  function beginDrag(d: Drag): void {
    drag = d;
    checkpointed = false;
    dragEngaged = d.mode !== "move"; // resize/corner/tail은 즉시 반응, move만 데드존 적용.
  }

  function toPage(e: FederatedPointerEvent): Point {
    return viewport.toLocal(e.global);
  }

  app.stage.on("pointermove", (e: FederatedPointerEvent) => {
    if (!drag) return;
    const cur = toPage(e);
    const dx = cur.x - drag.start.x;
    const dy = cur.y - drag.start.y;
    // 이동 드래그 데드존: 화면 px 기준 임계 안이면 아직 클릭 → 선택/이동을 건드리지 않음
    // (겹친 오브젝트 순환이 망가지지 않도록). 한 번 넘기면 확정.
    if (!dragEngaged) {
      if (Math.hypot(dx, dy) * fit <= DRAG_DEADZONE_PX) return;
      dragEngaged = true;
    }
    if (!checkpointed) {
      editorStore.getState().checkpoint();
      checkpointed = true;
    }
    const snap = !e.altKey;
    if (drag.mode === "move") {
      let box: Box = { ...drag.box, x: drag.box.x + dx, y: drag.box.y + dy };
      box = snap ? snapMove(box) : (clearSnap(), box);
      setBox(box);
    } else if (drag.mode === "resize") {
      let box = resizeBox(drag.edge, drag.box, dx, dy);
      box = snap ? snapResize(box, drag.edge) : (clearSnap(), box);
      setBox(box);
    } else if (drag.mode === "corner") {
      setCornerOffset(drag.index, drag.ox + dx, drag.oy + dy);
    } else {
      const b = drag.base;
      if (drag.pt === "start") {
        setTailPoint(drag.tailIndex, { StartX: b.sx + dx, StartY: b.sy + dy, MidX: b.mx + dx, MidY: b.my + dy, X: b.ex + dx, Y: b.ey + dy });
      } else if (drag.pt === "mid") {
        setTailPoint(drag.tailIndex, { MidX: b.mx + dx, MidY: b.my + dy });
      } else {
        setTailPoint(drag.tailIndex, { X: b.ex + dx, Y: b.ey + dy });
      }
    }
  });
  const endDrag = () => {
    // 이동 없이 떼면(=클릭) 보류된 순환 후보로 교체(원본 CommitPendingCycleIfClick).
    if (pendingCycle && !dragEngaged) editorStore.getState().select(pendingCycle);
    pendingCycle = null;
    drag = null;
    dragEngaged = false;
    if (activeSnap.xs.length || activeSnap.ys.length) {
      activeSnap = { xs: [], ys: [] };
      scheduleRender();
    }
  };
  function clearSnap(): void {
    activeSnap = { xs: [], ys: [] };
  }
  app.stage.on("pointerup", endDrag);
  app.stage.on("pointerupoutside", endDrag);

  /* ---------- 중앙 히트테스트 / 선택 라우팅 ---------- */
  // 현재 선택 종류에 맞는 박스로 이동 드래그를 시작한다(select 직후 호출 → getBox가 새 선택을 읽음).
  function beginMoveDrag(start: Point): void {
    const box = getBox();
    if (box) beginDrag({ mode: "move", start, box });
  }

  // 모든 오브젝트의 pointerdown이 거치는 단일 경로(원본 HandleSelectionPress).
  // 픽셀 알파/도형으로 후보 스택을 만들고, 현재 선택이 그 안에 있으면 클릭 시 한 단계 순환한다.
  function pressAt(e: FederatedPointerEvent): void {
    const pt = toPage(e);
    pendingCycle = null;
    const { project, pageIndex } = editorStore.getState();
    const page = currentPage(project, pageIndex);
    if (!page) return;
    // 페이지 전역 후보 스택(말풍선/이미지가 칸 경계를 넘고, 겹친 칸도 포함).
    const stack = collectSelectablesPage(page, pt.x, pt.y);
    if (stack.length === 0) {
      // 후보 없음 → 빈 공간이면 선택 해제. 단 잠긴 칸 위면 현재 선택 유지(인스펙터 목록으로만 선택).
      const ap = activePanelAt(page, pt.x, pt.y);
      if (!(ap && ap.IsLocked)) editorStore.getState().select({ kind: "none" });
      return;
    }

    const { selection } = editorStore.getState();
    const idx = stack.findIndex((s) => selEq(s, selection));
    if (idx < 0) {
      // 이 지점에 현재 선택 없음 → 최상단 선택 + 즉시 이동(웹 UX 유지).
      editorStore.getState().select(stack[0]!);
      beginMoveDrag(pt);
    } else {
      // 현재 선택을 다시 누름 → 끌면 이동, 이동 없이 떼면 한 단계 안쪽 순환.
      pendingCycle = stack[(idx + 1) % stack.length]!;
      beginMoveDrag(pt);
    }
  }

  /* ---------- 렌더 ---------- */
  let renderQueued = false;
  function scheduleRender(): void {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      renderScene();
    });
  }

  function computeFit(page: ComicPageData): void {
    // 뷰포트(CSS 논리) 크기는 renderer.screen을 직접 쓴다. renderer.width를 resolution으로
    // 나누면 이 Pixi 버전에선 dpr(예: 2)만큼 절반이 되어 페이지가 작게 fit되는 버그가 있었음.
    const vw = app.renderer.screen.width;
    const vh = app.renderer.screen.height;
    fit = Math.min(vw / page.PageWidth, vh / page.PageHeight) * FIT_PADDING;
    if (!Number.isFinite(fit) || fit <= 0) fit = 1;
    viewport.scale.set(fit);
    viewport.position.set((vw - page.PageWidth * fit) / 2, (vh - page.PageHeight * fit) / 2);
    app.stage.hitArea = new Rectangle(0, 0, vw, vh);
  }

  function renderScene(): void {
    const { project, pageIndex, selection } = editorStore.getState();
    const page = currentPage(project, pageIndex);
    // 직전 렌더의 스프라이트는 파괴되므로 애니 스프라이트 셋을 비우고 drawImage가 다시 채운다.
    for (const e of anim.values()) e.sprites.clear();
    // 동영상 live 플래그도 비우고 drawImage가 현재 페이지에 그려진 것만 다시 켠다(화면 밖=정지).
    for (const v of video.values()) v.live = false;
    pageLayer.removeChildren().forEach((c) => c.destroy());
    overlay.removeChildren().forEach((c) => c.destroy());
    if (!page) return;

    computeFit(page);

    // 페이지 배경
    const bg = new Graphics()
      .rect(0, 0, page.PageWidth, page.PageHeight)
      .fill(page.BlackBackground ? 0x000000 : 0xffffff);
    bg.eventMode = "static";
    bg.on("pointerdown", (e: FederatedPointerEvent) => pressAt(e));
    pageLayer.addChild(bg);

    for (const panel of page.Panels) drawPanel(panel);
    drawBubblesOnTop(page); // 말풍선은 모든 칸 위에(경계 넘나듦)

    drawSelectionOverlay(selection);
    drawSnapGuides(page);
  }

  function drawSnapGuides(page: ComicPageData): void {
    if (!drag) return;
    const color = 0xff3b6a;
    for (const x of activeSnap.xs) {
      overlay.addChild(new Graphics().moveTo(x, 0).lineTo(x, page.PageHeight).stroke({ width: 1 / fit, color }));
    }
    for (const y of activeSnap.ys) {
      overlay.addChild(new Graphics().moveTo(0, y).lineTo(page.PageWidth, y).stroke({ width: 1 / fit, color }));
    }
  }

  function drawPanel(panel: ComicPanelData): void {
    const c = new Container();
    c.position.set(panel.X, panel.Y);
    pageLayer.addChild(c);

    // 칸 모양(사변형 모서리 모드면 변위된 4점 폴리곤, 아니면 직사각형).
    const flat = polyFlat(panelCorners(panel));

    // 칸 배경 — ShowBackground면 흰색, 아니면 투명(클릭/이동 히트용 알파만).
    // 투명이면 "그림만"·칸 겹침(아래 칸 비침) 합성이 가능하다.
    const bg = new Graphics()
      .poly(flat)
      .fill(panel.ShowBackground ? { color: 0xffffff } : { color: 0xffffff, alpha: 0.001 });
    bg.eventMode = "static";
    bg.cursor = "move";
    bg.on("pointerdown", (e: FederatedPointerEvent) => {
      e.stopPropagation();
      pressAt(e);
    });
    c.addChild(bg);

    // 이미지(크롭 시 칸 모양으로 마스킹; 크롭 끄면 칸 밖으로 삐져나옴)
    for (const image of panel.Images) drawImage(c, panel, image, flat);

    // 칸 테두리 — ShowBorder일 때만.
    if (panel.ShowBorder) {
      c.addChild(new Graphics().poly(flat).stroke({ width: 2, color: 0x000000, alignment: 0.5 }));
    }
    // 말풍선은 칸 프레임 위에서 별도 최상위 레이어로 그린다(경계 넘나듦) — renderScene 참고.
  }

  /** 모든 칸의 말풍선을 칸 프레임 위 최상위 레이어에 그린다(칸 경계를 넘나들 수 있게). */
  function drawBubblesOnTop(page: ComicPageData): void {
    const layer = new Container();
    pageLayer.addChild(layer);
    for (const panel of page.Panels) {
      if (panel.Bubbles.length === 0) continue;
      const c = new Container();
      c.position.set(panel.X, panel.Y); // 말풍선 좌표는 칸-로컬 유지(데이터 호환)
      layer.addChild(c);
      // 채움/글자/선효과는 말풍선별로, 외곽선은 칸 단위로 합쳐(Union) 그린다.
      for (const bubble of panel.Bubbles) drawBubble(c, panel, bubble);
      drawMergedBubbleOutlines(c, panel);
    }
  }

  function drawImage(parent: Container, panel: ComicPanelData, image: PanelImageData, maskFlat: number[]): void {
    const id = assetIdFromPath(image.Path);
    const asset = getAssetByPath(image.Path);
    // 미디어 종류로 텍스처 경로 분기: 동영상=<video> 텍스처, 그 외=애니 프레임/정지 텍스처.
    let animEntry: AnimEntry | null = null;
    let videoEntry: VideoEntry | null = null;
    let tex: Texture | null;
    if (asset?.kind === "video") {
      videoEntry = ensureVideo(id ?? null);
      tex = videoEntry?.texture ?? null;
    } else {
      ensureAlphaMap(id); // 픽셀 알파 히트테스트용 맵을 백그라운드로 준비.
      // 애니 자산이면 현재 프레임 텍스처, 아니면 정지 텍스처(준비 전엔 정지 첫 프레임으로 폴백).
      animEntry = ensureAnim(id ?? null);
      tex =
        animEntry && animEntry.textures.length > 1
          ? animEntry.textures[animEntry.index] ?? animEntry.textures[0]!
          : ensureTexture(image.Path);
    }
    if (!tex || !asset) {
      // 로딩 중 placeholder
      const ph = new Graphics().poly(maskFlat).fill({ color: 0x000000, alpha: 0.04 });
      parent.addChild(ph);
      return;
    }
    const spr = new Sprite(tex);
    if (animEntry) animEntry.sprites.add(spr); // ticker가 이 스프라이트의 텍스처를 순환
    if (videoEntry) videoEntry.live = true; // ticker가 현재 페이지 동영상만 재생·갱신
    spr.x = image.TranslateX;
    spr.y = image.TranslateY;
    spr.width = asset.width * image.Scale;
    spr.height = asset.height * (image.ScaleY || image.Scale);
    spr.eventMode = "static";
    spr.cursor = "move";
    spr.on("pointerdown", (e: FederatedPointerEvent) => {
      e.stopPropagation();
      pressAt(e); // 사각 스프라이트가 아니라 픽셀 알파/도형으로 실제 대상을 고른다.
    });
    parent.addChild(spr);

    if (image.IsCropped) {
      const mask = new Graphics().poly(maskFlat).fill(0xffffff);
      parent.addChild(mask);
      spr.mask = mask;
    }
  }

  function drawBubble(parent: Container, panel: ComicPanelData, bubble: SpeechBubbleData): void {
    const c = new Container();
    c.position.set(bubble.X, bubble.Y);
    parent.addChild(c);

    const onDown = (e: FederatedPointerEvent) => {
      e.stopPropagation();
      pressAt(e);
    };

    // 집중선/속도선: 본체 없이 페이드 선만, 대사는 숨긴다.
    if (isLineEffect(bubble.Shape)) {
      drawBubbleLineEffect(c, bubble);
      c.addChild(makeHitRect(bubble, onDown));
      return;
    }

    // 일반 말풍선: 본체+꼬리를 합친 도형을 배경색으로 채운다(외곽선은 칸 단위 병합 경로가 그린다).
    const overlay = bubbleOverlayLocal(bubble);
    if (overlay) {
      const fill = new Graphics();
      fillMultiPoly(fill, overlay, col(bubble.BackgroundColor));
      fill.eventMode = "static";
      fill.cursor = "move";
      fill.on("pointerdown", onDown);
      c.addChild(fill);
    } else {
      // 테두리 없음(None): 본체 없이 글자만 → 선택용 투명 히트 영역을 깐다.
      c.addChild(makeHitRect(bubble, onDown));
    }

    if (bubble.Text) c.addChild(makeBubbleText(bubble));
  }

  function makeBubbleText(bubble: SpeechBubbleData): Text {
    const availW = Math.max(1, bubble.Width - bubble.TextMarginLeft - bubble.TextMarginRight);
    const availH = Math.max(1, bubble.Height - bubble.TextMarginTop - bubble.TextMarginBottom);
    const style = new TextStyle({
      fontFamily: "system-ui, sans-serif",
      fontSize: bubble.FontSize,
      fill: col(bubble.FillColor),
      align: "center",
      wordWrap: true,
      wordWrapWidth: availW,
      ...(bubble.HasTextOutline
        ? { stroke: { color: col(bubble.StrokeColor), width: Math.max(2, bubble.FontSize / 4) } }
        : {}),
    });
    const measure = (font: number) => {
      style.fontSize = font;
      const m = CanvasTextMetrics.measureText(bubble.Text, style);
      return { width: m.width, height: m.height };
    };
    style.fontSize = autoFitFontSize(bubble.FontSize, 6, availW, availH, measure);

    const text = new Text({ text: bubble.Text, style });
    text.eventMode = "none";
    // 가운데 정렬 배치
    text.x = bubble.TextMarginLeft + Math.max(0, (availW - text.width) / 2);
    text.y = bubble.TextMarginTop + Math.max(0, (availH - text.height) / 2);
    return text;
  }

  function drawSelectionOverlay(selection: Selection): void {
    if (selection.kind === "none") return;

    // 사변형 모서리 모드 칸: 8방향 리사이즈 대신 사변형 외곽선 + 4 모서리 드래그 핸들.
    if (selection.kind === "panel") {
      const { project, pageIndex } = editorStore.getState();
      const page = currentPage(project, pageIndex);
      const panel = page ? findPanel(page, selection.id) : undefined;
      if (panel?.CornerMode) {
        drawPanelCornerOverlay(panel);
        return;
      }
    }

    const box = getBox();
    if (!box) return;

    const accent = 0x2b6f6a;
    overlay.addChild(
      new Graphics()
        .rect(box.x, box.y, box.w, box.h)
        .stroke({ width: 1.5 / fit, color: accent, alignment: 0.5 }),
    );

    const hs = HANDLE_SCREEN_PX / fit;
    for (const edge of EDGES) {
      const [hx, hy] = handlePos(edge, box);
      const handle = new Graphics()
        .rect(hx - hs / 2, hy - hs / 2, hs, hs)
        .fill(0xffffff)
        .stroke({ width: 1 / fit, color: accent });
      handle.eventMode = "static";
      handle.cursor = cursorForEdge(edge);
      handle.on("pointerdown", (e: FederatedPointerEvent) => {
        e.stopPropagation();
        const fresh = getBox();
        if (fresh) beginDrag({ mode: "resize", edge, start: toPage(e), box: fresh });
      });
      overlay.addChild(handle);
    }

    if (selection.kind === "bubble" && selection.panelId && selection.id) {
      drawTailHandles(selection.panelId, selection.id);
    }
  }

  // 선택된 말풍선의 모든 꼬리에 시작(틸)/중간(주황)/끝(틸) 드래그 핸들을 그린다.
  function drawTailHandles(panelId: string, id: string): void {
    const { project, pageIndex } = editorStore.getState();
    const page = currentPage(project, pageIndex);
    const panel = page ? findPanel(page, panelId) : undefined;
    const bubble = panel?.Bubbles.find((x) => x.Id === id);
    if (!panel || !bubble) return;
    const ox = panel.X + bubble.X;
    const oy = panel.Y + bubble.Y;
    const hr = (HANDLE_SCREEN_PX / fit) * 0.75;
    bubble.Tails.forEach((t, ti) => {
      const mx = t.MidX ?? (t.StartX + t.X) / 2;
      const my = t.MidY ?? (t.StartY + t.Y) / 2;
      const pts: [number, number, TailPt, number][] = [
        [t.StartX, t.StartY, "start", 0x2b6f6a],
        [mx, my, "mid", 0xd67a20],
        [t.X, t.Y, "end", 0x2b6f6a],
      ];
      for (const [lx, ly, pt, color] of pts) {
        const handle = new Graphics().circle(ox + lx, oy + ly, hr).fill(0xffffff).stroke({ width: 1 / fit, color });
        handle.eventMode = "static";
        handle.cursor = "move";
        handle.on("pointerdown", (e: FederatedPointerEvent) => {
          e.stopPropagation();
          beginDrag({ mode: "tail", tailIndex: ti, pt, start: toPage(e), base: { sx: t.StartX, sy: t.StartY, mx, my, ex: t.X, ey: t.Y } });
        });
        overlay.addChild(handle);
      }
    });
  }

  function drawPanelCornerOverlay(panel: ComicPanelData): void {
    const accent = 0x2b6f6a;
    const pageCorners = panelCorners(panel).map((p) => ({ x: panel.X + p.x, y: panel.Y + p.y }));
    overlay.addChild(
      new Graphics().poly(polyFlat(pageCorners)).stroke({ width: 1.5 / fit, color: accent, alignment: 0.5 }),
    );

    const hs = HANDLE_SCREEN_PX / fit;
    pageCorners.forEach((pc, i) => {
      const handle = new Graphics()
        .rect(pc.x - hs / 2, pc.y - hs / 2, hs, hs)
        .fill(0xffffff)
        .stroke({ width: 1 / fit, color: accent });
      handle.eventMode = "static";
      handle.cursor = "move";
      handle.on("pointerdown", (e: FederatedPointerEvent) => {
        e.stopPropagation();
        const o = panel.CornerOffsets;
        beginDrag({ mode: "corner", index: i, start: toPage(e), ox: o[i * 2] ?? 0, oy: o[i * 2 + 1] ?? 0 });
      });
      overlay.addChild(handle);
    });
  }

  /* ---------- 드롭(이미지) ---------- */
  function pageFromClient(clientX: number, clientY: number): Point {
    const g = new Point();
    app.renderer.events.mapPositionToPoint(g, clientX, clientY);
    return viewport.toLocal(g);
  }
  function hitPanelId(pageX: number, pageY: number): string | undefined {
    const { project, pageIndex } = editorStore.getState();
    const page = currentPage(project, pageIndex);
    if (!page) return undefined;
    // 위에 있는 칸 우선(역순)
    for (let i = page.Panels.length - 1; i >= 0; i--) {
      const p = page.Panels[i]!;
      if (pageX >= p.X && pageX <= p.X + p.Width && pageY >= p.Y && pageY <= p.Y + p.Height) return p.Id;
    }
    return undefined;
  }
  const onDragOver = (e: DragEvent) => e.preventDefault();
  const onDrop = async (e: DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files ?? []).filter(
      (f) => f.type.startsWith("image/") || isVideoFile(f),
    );
    if (files.length === 0) return;
    const pt = pageFromClient(e.clientX, e.clientY);
    const panelId = hitPanelId(pt.x, pt.y);
    if (!panelId) return;
    for (const file of files) {
      const asset = await fileToAsset(file);
      addImageFromAsset(panelId, asset.id);
    }
  };
  container.addEventListener("dragover", onDragOver);
  container.addEventListener("drop", onDrop);

  /* ---------- 휠 줌(선택된 이미지) ---------- */
  const onWheel = (e: WheelEvent) => {
    const { selection } = editorStore.getState();
    if (selection.kind !== "image") return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.05 : 1 / 1.05;
    const box = getBox();
    if (!box) return;
    editorStore.getState().checkpoint();
    setBox({ x: box.x + (box.w * (1 - factor)) / 2, y: box.y + (box.h * (1 - factor)) / 2, w: box.w * factor, h: box.h * factor });
  };
  app.canvas.addEventListener("wheel", onWheel, { passive: false });

  /* ---------- 구독 / 리사이즈 ---------- */
  const unsub = editorStore.subscribe(scheduleRender);
  app.renderer.on("resize", scheduleRender);
  renderScene();

  /* ---------- PNG 내보내기 ---------- */
  // 현재 pageLayer(스토어의 현재 페이지가 렌더된 상태)를 페이지 크기로 추출한다.
  async function extractPage(page: ComicPageData): Promise<string | null> {
    const prevScale = viewport.scale.x;
    const prevPos = viewport.position.clone();
    const overlayVisible = overlay.visible;
    viewport.scale.set(1);
    viewport.position.set(0, 0);
    overlay.visible = false;
    // 동영상은 현재 프레임을 스틸로 캡처(원본 seek 썸네일 대체) — 추출 직전 최신 프레임을 GPU로 올린다.
    for (const v of video.values()) if (v.live && v.el.readyState >= 2) v.texture.source.update();
    try {
      return await app.renderer.extract.base64({
        target: pageLayer,
        frame: new Rectangle(0, 0, page.PageWidth, page.PageHeight),
        resolution: 1,
      });
    } finally {
      viewport.scale.set(prevScale);
      viewport.position.copyFrom(prevPos);
      overlay.visible = overlayVisible;
      scheduleRender();
    }
  }

  async function exportCurrentPagePng(): Promise<string | null> {
    const { project, pageIndex } = editorStore.getState();
    const page = currentPage(project, pageIndex);
    return page ? extractPage(page) : null;
  }

  // 원본 ExportPagesAsImages: 대상 페이지로 잠시 전환→동기 렌더→추출→복원(선택 유지).
  async function exportPagePng(index: number): Promise<string | null> {
    const st = editorStore.getState();
    const page = st.project.Pages[index];
    if (!page) return null;
    if (index === st.pageIndex) return extractPage(page);
    const prevIndex = st.pageIndex;
    const prevSel = st.selection;
    editorStore.setState({ pageIndex: index, selection: { kind: "none" } });
    renderScene();
    try {
      return await extractPage(page);
    } finally {
      editorStore.setState({ pageIndex: prevIndex, selection: prevSel });
      renderScene();
    }
  }

  return {
    destroy: () => {
      unsub();
      app.ticker.remove(tickAnimations);
      app.ticker.remove(tickVideos);
      for (const e of anim.values()) for (const t of e.textures) t.destroy(true);
      anim.clear();
      for (const v of video.values()) {
        v.el.pause();
        v.el.removeAttribute("src");
        v.el.load(); // 디코더/버퍼 해제
        v.texture.destroy(true);
        if (v.objectUrl) URL.revokeObjectURL(v.objectUrl);
      }
      video.clear();
      container.removeEventListener("dragover", onDragOver);
      container.removeEventListener("drop", onDrop);
      app.canvas.removeEventListener("wheel", onWheel);
      app.destroy(true, { children: true });
    },
    resize: () => {
      // 숨김 탭(0×0)일 때 resize하면 캔버스가 0으로 줄어 깨지므로 건너뛴다.
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w <= 0 || h <= 0) return;
      // 치수가 같으면 무시(불필요한 재렌더/피드백 방지).
      if (w === app.renderer.screen.width && h === app.renderer.screen.height) return;
      app.renderer.resize(w, h);
      scheduleRender();
    },
    exportCurrentPagePng,
    exportPagePng,
  };
}

/* ---------- 헬퍼 ---------- */

/* ---------- 칸 사변형(Phase 3) ---------- */
// panelCorners 등 히트테스트 기하는 ./hittest 로 분리(Pixi 비의존·단위 테스트 가능).

function polyFlat(pts: GeoPoint[]): number[] {
  const f: number[] = [];
  for (const p of pts) f.push(p.x, p.y);
  return f;
}

/* ---------- 말풍선 도형(Phase 2) ---------- */

function isLineEffect(shape: SpeechBubbleData["Shape"]): boolean {
  return shape === "ConcentrationLines" || shape === "EffectLines";
}

// 말풍선 본체 외곽선(말풍선 로컬 좌표). 선효과/테두리없음은 본체가 없으므로 null.
function bubbleBodyOutline(b: SpeechBubbleData): GeoPoint[] | null {
  switch (b.Shape) {
    case "CloudExplosion":
      return cloudExplosionOutline(b.Width, b.Height, b.ShapeCount, b.ShapeStrength, b.ShapeIrregularity, b.ShapeWidthVariation);
    case "Flash":
      return flashOutline(b.Width, b.Height, b.ShapeCount, b.ShapeStrength, b.ShapeIrregularity);
    case "None":
    case "ConcentrationLines":
    case "EffectLines":
      return null;
    default:
      return roundRectOutline(b.Width, b.Height, b.ShapeStrength);
  }
}

function bubbleTails(b: SpeechBubbleData): { outline: GeoPoint[]; inward: boolean }[] {
  return b.Tails.map((t) => ({ outline: tailOutline(t), inward: t.TailInward }));
}

// 본체+꼬리를 합친 도형(말풍선 로컬). 본체 없으면 null.
function bubbleOverlayLocal(b: SpeechBubbleData): MultiPoly | null {
  const body = bubbleBodyOutline(b);
  if (!body) return null;
  return combineBodyAndTails(body, bubbleTails(b));
}

function makeHitRect(b: SpeechBubbleData, onDown: (e: FederatedPointerEvent) => void): Graphics {
  // 채움이 없는 말풍선(None/선효과)도 클릭·드래그되도록 투명 히트 영역을 깐다.
  const hit = new Graphics().rect(0, 0, b.Width, b.Height).fill({ color: 0xffffff, alpha: 0.001 });
  hit.eventMode = "static";
  hit.cursor = "move";
  hit.on("pointerdown", onDown);
  return hit;
}

function fillMultiPoly(g: Graphics, mp: MultiPoly, color: number): void {
  // 안쪽꼬리 carve는 외곽 링에 노치로 반영되므로 외곽 링만 채워도 충분하다(구멍은 드묾).
  for (const poly of mp) {
    const outer = poly[0];
    if (!outer || outer.length < 3) continue;
    const flat: number[] = [];
    for (const [x, y] of outer) flat.push(x, y);
    g.poly(flat).fill(color);
  }
}

function strokeMultiPoly(g: Graphics, mp: MultiPoly, width: number, color: number): void {
  for (const poly of mp) {
    for (const ring of poly) {
      if (ring.length < 2) continue;
      const flat: number[] = [];
      for (const [x, y] of ring) flat.push(x, y);
      g.poly(flat).stroke({ width, color, alignment: 0.5 });
    }
  }
}

// 칸의 같은 크롭 그룹 말풍선들의 본체+꼬리를 Union 해 외곽선 하나로 그린다(원본 BubbleOutlinePath).
function drawMergedBubbleOutlines(c: Container, panel: ComicPanelData): void {
  for (const cropped of [true, false]) {
    const overlays: MultiPoly[] = [];
    for (const b of panel.Bubbles) {
      if (b.IsCropped !== cropped || isLineEffect(b.Shape)) continue;
      const body = bubbleBodyOutline(b);
      if (!body) continue;
      overlays.push(combineBodyAndTails(body, bubbleTails(b), b.X, b.Y));
    }
    if (overlays.length === 0) continue;
    const g = new Graphics();
    strokeMultiPoly(g, unionAll(overlays), 2, 0x000000);
    g.eventMode = "none";
    c.addChild(g);
  }
}

const FADE_SAMPLES = 12;

// 시작점(fadeStart) 투명 → 끝(fadeEnd) 불투명. 처음 1/6 구간은 투명 유지(원본 CreateDirectionFadeBrush).
function fadeAlpha(u: number): number {
  if (u <= 1 / 6) return 0;
  if (u >= 1) return 1;
  return (u - 1 / 6) / (1 - 1 / 6);
}

// a→b 선분을 그리되, 각 점을 fadeStart→fadeEnd 축에 투영한 위치로 알파를 매긴다(WPF 그라데이션 스트로크 대체).
function drawFadeLine(
  g: Graphics,
  a: GeoPoint,
  b: GeoPoint,
  fadeStart: GeoPoint,
  fadeEnd: GeoPoint,
  color: number,
  width: number,
): void {
  const axX = fadeEnd.x - fadeStart.x;
  const axY = fadeEnd.y - fadeStart.y;
  const axLen2 = axX * axX + axY * axY || 1;
  const proj = (px: number, py: number) => ((px - fadeStart.x) * axX + (py - fadeStart.y) * axY) / axLen2;

  let prevX = a.x;
  let prevY = a.y;
  let prevU = proj(a.x, a.y);
  for (let i = 1; i <= FADE_SAMPLES; i++) {
    const t = i / FADE_SAMPLES;
    const curX = a.x + (b.x - a.x) * t;
    const curY = a.y + (b.y - a.y) * t;
    const curU = proj(curX, curY);
    const alpha = fadeAlpha((prevU + curU) / 2);
    if (alpha > 0.003) {
      g.moveTo(prevX, prevY).lineTo(curX, curY).stroke({ width, color, alpha, cap: "round" });
    }
    prevX = curX;
    prevY = curY;
    prevU = curU;
  }
}

function drawBubbleLineEffect(c: Container, bubble: SpeechBubbleData): void {
  const g = new Graphics();
  const color = col(bubble.FillColor);
  if (bubble.Shape === "ConcentrationLines") {
    for (const l of concentrationLineEndpoints(bubble.Width, bubble.Height, bubble.ShapeCount, bubble.ShapeStrength, bubble.ShapeIrregularity)) {
      drawFadeLine(g, l.inner, l.edge, l.fadeStart, l.fadeEnd, color, 1.6);
    }
  } else {
    for (const l of effectLineEndpoints(bubble.Width, bubble.Height, bubble.ShapeCount, bubble.ShapeStrength, bubble.ShapeIrregularity)) {
      const clipped = clipSegmentToBox(l.base, l.tip, bubble.Width, bubble.Height);
      if (!clipped) continue;
      // 팁(c1) 투명 → 베이스(c0) 불투명.
      drawFadeLine(g, clipped.c0, clipped.c1, clipped.c1, clipped.c0, color, 1.6);
    }
  }
  g.eventMode = "none";
  c.addChild(g);
}

function col(hex: string): number {
  try {
    return new Color(hex).toNumber();
  } catch {
    return 0x000000;
  }
}

function resizeBox(edge: Edge, b: Box, dx: number, dy: number): Box {
  let { x, y, w, h } = b;
  if (edge.includes("W")) {
    x += dx;
    w -= dx;
  }
  if (edge.includes("E")) w += dx;
  if (edge.includes("N")) {
    y += dy;
    h -= dy;
  }
  if (edge.includes("S")) h += dy;
  if (w < MIN_BOX) {
    if (edge.includes("W")) x -= MIN_BOX - w;
    w = MIN_BOX;
  }
  if (h < MIN_BOX) {
    if (edge.includes("N")) y -= MIN_BOX - h;
    h = MIN_BOX;
  }
  return { x, y, w, h };
}

function handlePos(edge: Edge, b: Box): [number, number] {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const left = b.x;
  const right = b.x + b.w;
  const top = b.y;
  const bottom = b.y + b.h;
  switch (edge) {
    case "NW":
      return [left, top];
    case "N":
      return [cx, top];
    case "NE":
      return [right, top];
    case "E":
      return [right, cy];
    case "SE":
      return [right, bottom];
    case "S":
      return [cx, bottom];
    case "SW":
      return [left, bottom];
    case "W":
      return [left, cy];
  }
}

function cursorForEdge(edge: Edge): string {
  switch (edge) {
    case "N":
    case "S":
      return "ns-resize";
    case "E":
    case "W":
      return "ew-resize";
    case "NE":
    case "SW":
      return "nesw-resize";
    case "NW":
    case "SE":
      return "nwse-resize";
  }
}
