# KomaForge → my-webtoon-maker 변환 작업 프롬프트

> 이 문서를 새 Claude Code 세션(또는 작업자)에게 그대로 전달하면 됩니다.
> 한 번에 다 만들지 말고 **Phase 0 → 1 → 2 → 3 → 4** 순서로, 각 단계가 빌드/타입체크/테스트 통과 상태를 유지하며 진행하세요.

---

## 0. 미션

C# WPF 데스크톱 앱 **KomaForge**(망가 페이지 에디터)를 **Turborepo 기반 웹앱 `my-webtoon-maker`** 로 포팅한다.

- **원본 소스**: `~/k-codepoet/KomaForge` (.NET 8 WPF, ~9,600줄, 읽기 전용 참조)
- **타깃**: `~/k-codepoet/my-webtoon-maker` (현재 비어 있음)
- **핵심 원칙**
  1. **도메인 모델과 저장 포맷을 그대로 보존**한다 — KomaForge의 `.kfjson` JSON 스키마를 필드 단위로 호환 round-trip.
  2. **기하·알고리즘은 재발명하지 말고 원본을 충실히 포팅**한다 (말풍선 도형, 곡선 꼬리, 외곽선 병합, 픽셀 알파 히트테스트, 자동 글꼴 맞춤, 스냅, undo 스냅샷). 결과 픽셀이 원본과 시각적으로 일치해야 한다.
  3. **MVP를 먼저 동작**시키고 점진적으로 기능 파리티를 채운다.

> ⚠️ **먼저 원본을 읽어라.** 코드를 작성하기 전에 아래 파일들을 정독하고 도메인·알고리즘을 파악할 것:
> - 모델: `src/Models/ProjectData.cs`(저장 스키마), `src/Models/Models.cs`(런타임 객체 + `OutlinedTextBlock`)
> - 기하: `src/MainWindow/MainWindow.Shapes.cs`(말풍선 도형 생성), `MainWindow.Bubbles.cs`(꼬리·자동맞춤·외곽선 병합)
> - 레이아웃/생성: `MainWindow.Pages.cs`
> - 상호작용: `MainWindow.Interaction.cs`, `MainWindow.Resize.cs`, `MainWindow.Selection.cs`, `MainWindow.HitTest.cs`
> - 이미지/미디어: `MainWindow.Images.cs`
> - 저장/내보내기: `MainWindow.Persistence.cs`, `MainWindow.Clipboard.cs`
> - UI 골격/테마: `MainWindow.xaml`, `App.xaml`

---

## 1. 확정된 기술 스택 (변경 금지)

| 영역 | 선택 |
|---|---|
| 모노레포 | **Turborepo + pnpm workspaces** |
| 앱 프레임워크 | **React Router v7 (framework mode, SSR 활성화)** |
| 에디터 렌더링 | **Pixi.js v8 (WebGL)** — 캔버스 스테이지 전용, **클라이언트 전용** |
| UI 크롬(인스펙터/리스트/메뉴) | React DOM + **Tailwind CSS** |
| 상태관리 | **Zustand** (+ 스냅샷 기반 undo/redo) |
| 스키마/검증 | **zod** (`.kfjson` 파싱·직렬화) |
| 단위테스트 | **Vitest** (특히 `geometry` 골든 테스트) |
| 언어 | **TypeScript strict** |

**SSR ↔ WebGL 경계 규칙 (중요):** Pixi는 `window`/WebGL에 의존하므로 서버에서 렌더하면 안 된다. 에디터 캔버스는 React Router의 `clientLoader` 또는 `<ClientOnly>` 경계 안에서만 마운트하고, `window`/`document` 접근을 가드한다. 서버는 셸 + 인스펙터(DOM)까지만 렌더하고, 캔버스는 하이드레이션 후 클라이언트에서 붙인다.

**UI 텍스트·주석:** UI 문자열은 **한국어 유지**(원본과 동일: "추가/삭제/위로/아래로", "N번 칸", "원형/사각" 등). 원본의 한국어 주석 중 알고리즘 의도를 설명하는 것은 번역해서 보존한다.

---

## 2. 모노레포 구조

```
my-webtoon-maker/
├─ turbo.json
├─ pnpm-workspace.yaml
├─ package.json                  # root, scripts: build/dev/lint/typecheck/test
├─ apps/
│  └─ web/                       # React Router v7 (SSR) 앱
│     ├─ app/
│     │  ├─ routes/              # 에디터 라우트(클라이언트 경계), 홈
│     │  ├─ components/          # 인스펙터, 페이지/칸/이미지/말풍선 리스트, 메뉴바, 색 선택기 UI
│     │  ├─ hooks/               # useShortcuts, useEditorStore 바인딩
│     │  └─ root.tsx
│     └─ vite.config.ts
└─ packages/
   ├─ core/                      # 프레임워크 무관: 도메인 모델 + .kfjson 직렬화
   │  ├─ schema.ts               # zod 스키마 (ProjectData.cs 1:1 포팅)
   │  ├─ types.ts
   │  ├─ serialize.ts            # load/save, 구버전 호환(NaN tail mid, ScaleY=0 등)
   │  └─ layout.ts               # "1,2,1" 패턴 → 칸 배치 (CreateLayoutFromPattern 포팅)
   ├─ geometry/                  # 순수 함수: 말풍선 도형/꼬리/외곽선 (Shapes.cs + Bubbles.cs 일부)
   │  ├─ shapes.ts               # RoundRect/CloudExplosion/Flash/Concentration/Effect/Lobed
   │  ├─ tail.ts                 # 3점 곡선 꼬리, inward carve
   │  ├─ merge.ts                # 겹친 말풍선 외곽선 병합 (BuildMergedBubbleOutline)
   │  ├─ autofit.ts              # 글꼴 자동 축소 (ApplyBubbleAutoFit)
   │  ├─ noise.ts                # Pseudo(seed) 결정론적 노이즈 — 원본 공식 정확히 재현
   │  └─ snap.ts                 # 스냅 후보/적용 (Resize.cs 스냅 로직)
   ├─ editor/                    # Pixi 기반 에디터 엔진 + React 마운트 훅
   │  ├─ engine/                 # Stage, Panel, Image, Bubble 런타임 객체 (Models.cs 대응)
   │  ├─ interaction/            # 포인터 드래그/호버/선택 사이클 (Interaction.cs)
   │  ├─ hittest/                # 알파 픽셀 히트테스트 (HitTest.cs), 경계 판정
   │  ├─ media/                  # 정지/GIF/WebP 프레임/동영상 텍스처 (Images.cs)
   │  ├─ store.ts                # Zustand 에디터 상태 + selection
   │  ├─ history.ts              # 스냅샷 undo/redo (CaptureHistoryIfChanged 포팅)
   │  └─ mount.tsx               # <EditorCanvas/> 클라이언트 전용 컴포넌트
   ├─ ui/                        # 공용 프레젠테이션 컴포넌트 (색 선택기, 슬라이더, 리스트 등)
   └─ config/                    # eslint-config, typescript-config, tailwind-config
```

의존 방향: `editor` → (`core`, `geometry`); `apps/web` → (`editor`, `core`, `ui`); `geometry`·`core`는 프레임워크/Pixi 무관(순수 TS, 테스트 용이).

---

## 3. 도메인 모델 (`@repo/core`) — `.kfjson` 1:1 포팅

`src/Models/ProjectData.cs`를 zod 스키마로 그대로 옮긴다. **필드명·기본값·구버전 호환 규칙을 정확히 유지**해야 데스크톱 `.kfjson`을 import/export 할 수 있다.

```ts
// 기본값은 ProjectData.cs와 동일해야 함
ComicProject  = { Title:"", AutoMargin:24, AutoGutter:14, CurrentPageIndex:0, Pages:[] }
ComicPage     = { Name:"Page", PageWidth:832, PageHeight:1216, BlackBackground:false, Panels:[] }
ComicPanel    = { Number, Id:"", Name:"", X,Y,Width,Height, IsLocked:false, CornerMode:false,
                  CornerOffsets:number[8] /*TL,TR,BR,BL × X,Y*/, Images:[], Bubbles:[] }
PanelImage    = { Id:"", Path:"", Scale:1, ScaleY:0 /*0이면 Scale과 동일*/, TranslateX:0, TranslateY:0,
                  IsCropped:true, IsLocked:false, PivotX:0, PivotY:1 }
SpeechBubble  = { Id:"", Text:"", X,Y, Width:170, Height:100, FontSize:18,
                  TextMarginLeft:16, TextMarginTop:12, TextMarginRight:16, TextMarginBottom:12,
                  IsCropped:false, IsLocked:false, HasTextOutline:false,
                  FillColor:"#000000", StrokeColor:"#FFFFFF", BackgroundColor:"#FFFFFF",
                  Shape:"RoundRect", ShapeCount:9, ShapeStrength:0,
                  ShapeIrregularity:50 /*0/미지정→50*/, ShapeWidthVariation:0,
                  TailInward:false, PivotX:0, PivotY:1, Tails:[] }
BubbleTail    = { StartX:85, StartY:50, MidX:NaN /*없으면 시작·끝 중점*/, MidY:NaN,
                  X:130, Y:130, Width:28, TailInward:false }
```

- `Shape` enum: `RoundRect | CloudExplosion | Flash | ConcentrationLines | EffectLines | None`.
- `MediaKind`(Static/Animated/Video)는 **저장하지 않고** 로드 시 파일/확장자로 추론(원본과 동일).
- **좌표 단위는 프로젝트 단위(px) 그대로** 유지(기본 페이지 832×1216). 화면 표시는 스테이지 스케일(페이지 맞춤)로만 변환.
- 구버전 호환: `Tail.MidX/Y`가 NaN이면 시작·끝 중점 계산, `ScaleY<=0`이면 `Scale` 사용, `ShapeIrregularity` 0/미지정이면 50.
- 파일 확장자 필터도 호환: `*.kfjson;*.nvjson;*.json`.

**앱 설정(프로젝트와 별개)** = `WindowSettings`의 웹 대응. 데스크톱 창 좌표(Left/Top/Width/Height/WindowState)는 버리고, 나머지(PageFit, LayoutPattern="1,2,1", AutoMargin/Gutter, InspectorVisible, SelectionPreview, KeepAspectRatio, Shortcuts, RecentColors)는 **localStorage**에 저장/복원.

---

## 4. 웹 전환에서 반드시 다룰 디버전스 (데스크톱 → 브라우저)

원본은 로컬 파일시스템·Win32에 의존한다. 다음을 명시적으로 대체:

1. **이미지 자산(가장 큰 차이).** 원본은 이미지를 **상대 경로 문자열**(`PanelImage.Path`)로 저장. 브라우저엔 파일시스템 직접 접근이 없으므로:
   - 자산 바이트를 **OPFS 또는 IndexedDB**에 콘텐츠 해시 키로 저장하고, `Path` 필드를 **자산 참조(`asset://<hash>` 또는 원래 상대경로)** 로 재해석.
   - 프로젝트 저장 옵션 두 가지: (a) `.kfjson`(JSON)만 — 자산은 로컬 자산 스토어에 상주, (b) **포터블 번들 `.kfz`(zip)** — JSON + 이미지 동봉(데스크톱 ↔ 웹 이식용).
   - 데스크톱 `.kfjson`을 import할 때 자산이 없으면 "이미지 다시 연결" UX로 처리(MVP는 누락 시 placeholder).
2. **Pixi 클라이언트 전용.** WebGL 컨텍스트는 SSR 불가 → 1절의 경계 규칙 준수.
3. **PNG 내보내기.** WPF `RenderTargetBitmap` → 웹은 **Pixi `renderer.extract`** 로 스테이지를 캔버스/Blob 추출 후 다운로드. 다중 페이지는 zip으로 묶어 내보내기.
4. **동영상 스틸.** 원본은 Win32 `SHCreateItemFromParsingName`(Windows 전용)로 썸네일 추출 → 웹은 **`HTMLVideoElement`를 특정 시점으로 seek 후 프레임 캡처**로 대체.
5. **애니메이션 디코드.** GIF/WebP 프레임 분해는 `ImageDecoder`(WebCodecs) 우선, 미지원 브라우저는 폴백 라이브러리. 프레임 시퀀스를 Pixi 텍스처로 재생.
6. **결정론적 노이즈.** `Shapes.cs`의 `Pseudo(seed)` 공식을 **그대로** 재구현해야 같은 `.kfjson`이 동일한 들쭉날쭉 도형으로 렌더된다(저장 파일 시각 일치의 핵심). 골든 테스트로 고정.
7. **DPI.** WPF DIP 개념 제거 — 모든 좌표는 프로젝트 px, 화면은 CSS px + 스테이지 스케일.

---

## 5. 기능 모듈 매핑 (원본 → 웹)

| KomaForge (WPF) | my-webtoon-maker |
|---|---|
| `ProjectData.cs` (저장 스키마) | `@repo/core` zod 스키마 + serialize |
| `Models.cs` 런타임 객체·`OutlinedTextBlock` | `@repo/editor/engine` Pixi 객체 + 아웃라인 텍스트(이중 스트로크) |
| `MainWindow.Pages.cs` (패턴 레이아웃·칸/페이지 생성) | `@repo/core/layout` + `@repo/editor` 팩토리 |
| `MainWindow.Shapes.cs` (SkiaSharp 도형) | `@repo/geometry/shapes` 순수 path 생성 → Pixi `Graphics` |
| `MainWindow.Bubbles.cs` (꼬리·자동맞춤·외곽선 병합) | `@repo/geometry`(tail/merge/autofit) + `@repo/editor` 말풍선 모듈 |
| `MainWindow.Resize.cs` (리사이즈·스냅·pivot) | `@repo/editor/interaction` + `@repo/geometry/snap` |
| `MainWindow.Interaction.cs` (드래그·호버·선택 사이클) | `@repo/editor/interaction` (Pixi 이벤트) |
| `MainWindow.HitTest.cs` (알파 픽셀·경계) | `@repo/editor/hittest` (오프스크린 캔버스 알파 샘플) |
| `MainWindow.Selection.cs` | `@repo/editor/store` 선택 상태 |
| `MainWindow.Images.cs` (로드·GIF/WebP/동영상) | `@repo/editor/media` |
| `MainWindow.Persistence.cs` (저장/로드/PNG) | `@repo/core` serialize + `apps/web` export(Pixi extract→PNG, zip) |
| `MainWindow.Clipboard.cs` | `@repo/editor` 클립보드(cut/copy/paste) |
| `MainWindow.Inspector.cs` + xaml 인스펙터 | `apps/web/components` React 인스펙터 + `@repo/ui` |
| `MainWindow.ColorPicker.cs` | `@repo/ui` 색 선택기(최근 색) |
| `MainWindow.Shortcuts.cs` | `apps/web/hooks/useShortcuts` + 설정 |
| undo/redo 스냅샷 (`MainWindow.xaml.cs`) | `@repo/editor/history` (Zustand + 스냅샷) |
| `App.xaml` 테마 | Tailwind 테마 토큰 |

**테마 토큰**(App.xaml에서): 배경 `#F6F3EE`, 패널 `#FFFFFF`, 액센트 `#2B6F6A`, 텍스트 `#202124`.
**인스펙터 구성**(우측 패널): 제목 → 페이지 리스트/편집(가로·세로·검정배경·레이아웃 패턴·여백·간격·구성) → 칸 리스트/편집(잠금·사변형모드) → 이미지 리스트/편집(잠금·크롭·pivot·X/Y/W/H 슬라이더) → 말풍선 리스트/편집(잠금·크롭·pivot·텍스트·글꼴·채움/배경/외곽선색·모양·강도·개수·불규칙도·폭변동·W/H). 각 리스트는 추가/삭제/위로/아래로 + 인라인 이름 편집.

---

## 6. Phase 0 — 스캐폴드

- Turborepo + pnpm workspace, 위 트리 생성. `turbo.json`에 `build/lint/typecheck/test/dev` 파이프라인.
- `apps/web`: React Router v7 framework mode, SSR on, Tailwind + 테마 토큰, 기본 셸/홈 라우트.
- `packages/config`: 공유 eslint/tsconfig/tailwind preset.
- `packages/core|geometry|editor|ui`: 빈 패키지 + 빌드 가능한 `index.ts`.
- **완료 기준**: `pnpm i && pnpm build && pnpm typecheck && pnpm lint` 그린, `pnpm dev`로 빈 SSR 페이지 렌더.

---

## 7. Phase 1 — MVP (먼저 동작시킬 것)

핵심 편집 루프가 끝까지 도는 최소 기능:

- **모델**: `@repo/core` 스키마 + `.kfjson` 로드/저장 round-trip(샘플 픽스처 포함).
- **레이아웃**: `"1,2,1"` 패턴 → 여백/간격 적용한 직사각형 칸 배치(`CreateLayoutFromPattern`).
- **페이지**: Pixi 스테이지(클라이언트 경계), 단일·다중 페이지 전환(PgUp/PgDn), 페이지 맞춤.
- **칸**: 선택·드래그 이동·리사이즈(직사각형만, 스냅 포함), 잠금, 이름.
- **이미지**: 드래그&드롭/파일 선택으로 칸에 배치, **정지 이미지만**(PNG/JPG/정지 WebP), 칸 경계 크롭, 휠 확대/축소, 드래그 이동. 자산은 OPFS/IndexedDB.
- **말풍선**: 추가·드래그·리사이즈, 텍스트 입력, **RoundRect 모양만**, 채움/배경/외곽선 색, 글꼴 자동 맞춤(`ApplyBubbleAutoFit`).
- **인스펙터**: 페이지/칸/이미지/말풍선 속성(React DOM).
- **저장/로드**: `.kfjson` 호환 JSON + 자산 스토어, **자동 저장 + 다음 실행 복원**.
- **내보내기**: 현재 페이지 → PNG 다운로드.
- **undo/redo**: 스냅샷 기반.

**완료 기준(수용 테스트)**: ① 빈 프로젝트 생성 → "1,2,1" 구성 → 칸에 이미지·말풍선 추가 → PNG 내보내기. ② 저장 후 새로고침하면 자동 복원. ③ `.kfjson`으로 저장 → 로드 시 동일 상태. ④ `core`/`geometry` 단위테스트 그린.

---

## 8. Phase 2~4 — 점진적 기능 파리티

**Phase 2 — 말풍선 파리티** (`@repo/geometry` 집중)
- 전체 모양: `CloudExplosion`, `Flash`, `ConcentrationLines`(집중선), `EffectLines`(속도선), `None`. `CreateLobedGeometry`·라인 엔드포인트·`ClipSegmentToBox`·방향 페이드 브러시까지 포팅.
- **3점 곡선 꼬리**(시작·중간·끝), 안으로 깎기(inward), 한 말풍선에 여러 꼬리.
- **겹친 말풍선 외곽선 자동 병합**(`BuildMergedBubbleOutline`).
- 텍스트 아웃라인(`OutlinedTextBlock` 대응), 불규칙도/폭변동/개수/강도 슬라이더.
- **골든 테스트**: 동일 파라미터·시드에서 path 좌표가 기준값과 일치.

**Phase 3 — 칸·이미지 파리티**
- **사변형 모서리 모드**(`CornerMode` + `CornerOffsets[8]`): 모서리 핸들 드래그로 기울인 칸, 이미지 클립을 사변형에 맞춤.
- **픽셀 알파 히트테스트** + 겹친 오브젝트 **클릭 순환 선택**(`CollectSelectablesAt`, `IsOpaqueImagePixelAtPoint`).
- **자유 리사이즈**(비율 미유지, Shift로 일시 비율 유지) + **pivot 기반 리사이즈 추종**.
- 호버 미리보기 강조(SelectionPreview).

**Phase 4 — 미디어·마무리**
- **애니메이션 GIF/WebP 프레임 재생**, **동영상 텍스처** + 내보내기용 스틸 프레임.
- 사용자 지정 **단축키**(설정 저장), **색 선택기 최근 색**.
- 클립보드 **잘라내기/복사/붙여넣기**(붙여넣기 위치 보정 포함).
- **다중 페이지 일괄 내보내기**(zip), 검정 배경 페이지, 포터블 `.kfz` 번들.

---

## 9. 충실히 포팅해야 하는 알고리즘 (원본 라인 인용 후 작성)

작성 전 해당 함수를 읽고 주석으로 출처를 남길 것. 결과가 원본과 시각적으로 일치해야 한다.

- 도형 생성 — `Shapes.cs`: `CreateLobedGeometry`, `CreateCloudExplosionGeometry`, `CreateFlashGeometry`, `Concentration/EffectLineEndpoints`, `ClipSegmentToBox`, **`Pseudo(seed)`(결정론 노이즈)**, `CreateDirectionFadeBrush`.
- 꼬리 — `Bubbles.cs`: `CreateTailGeometry`(3점), `DragSelectedTailPoint`, inward carve.
- 외곽선 병합 — `Bubbles.cs`: `BuildMergedBubbleOutline`.
- 글꼴 자동 맞춤 — `Bubbles.cs`: `ApplyBubbleAutoFit` + `OutlinedTextBlock.MeasureAtFont`.
- 알파 히트테스트 — `HitTest.cs`: `GetAlphaBitmap`, `GetPixelAlpha`, `IsOpaqueImagePixelAtPoint`.
- 스냅 — `Resize.cs`: `CollectSnapCandidates`, `SnapBoundsFree`, `SnapImageBounds`, `SnapImageTranslate`.
- 레이아웃 — `Pages.cs`: `CreateLayoutFromPattern`, `CreatePanel`, `UpdatePanelShape`/사변형 지오메트리.
- undo 스냅샷 캐던스 — `MainWindow.xaml.cs`: `CaptureHistoryIfChanged`(dirty 플래그 + 타이머 + `MaxHistory`).

---

## 10. 규칙·검증

- **TypeScript strict**, 모든 패키지 명확한 public API. `core`/`geometry`는 Pixi/React 의존 0(순수 함수, 테스트 용이).
- 좌표 단위는 `.kfjson`과 동일(px). 색은 hex 문자열 그대로.
- **각 Phase 종료 시**: `pnpm typecheck && pnpm lint && pnpm test` 그린 + 수동 확인(샘플 프로젝트 로드 → 편집 → PNG 내보내기). `geometry`는 골든(스냅샷) 테스트로 회귀 방지.
- 작은 PR 단위로, 항상 빌드 가능한 상태 유지. 새 라이브러리 도입 시 이유를 커밋 메시지에 남길 것.

---

## 11. 시작 지시

1. `~/k-codepoet/KomaForge`의 0절 파일 목록을 먼저 읽고 도메인·알고리즘을 요약한다.
2. Phase 0 스캐폴드를 만들고 빌드 그린을 확인한다.
3. Phase 1을 구현하고 수용 테스트를 통과시킨다.
4. 이후 Phase 2 → 3 → 4를 순서대로 진행하며 각 단계 종료 기준을 충족한다.

> 참고: 타깃 이름이 "webtoon"이지만 원본은 **고정 페이지(망가) 모델**이다. 페이지 기반 모델을 그대로 유지하되, 향후 세로 스크롤(웹툰) 내보내기는 별도 확장 포인트로 남겨둔다(이번 범위 아님).
