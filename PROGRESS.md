# 진행 상황 & 이어가기 (resume here)

> 나중에 이어서 작업하기 위한 "픽업 포인트" 문서. 전체 설계는 [PORTING_PROMPT.md](./PORTING_PROMPT.md),
> 현재 상태 요약은 [README.md](./README.md) 참고. 원본 참조: `../KomaForge` (C# WPF, 읽기 전용).

## 한 줄 상태

**Phase 0~4 완료. 좌표 규약 정합은 의도적 보류(아래 결정 참고).** typecheck 7/7 · 테스트 49(core 5 + geometry 20 + editor 24) · 빌드 그린. Phase 4 = 애니 프레임 + 동영상 + 마무리 묶음(클립보드·단축키·최근색·ZIP 내보내기) 전부 완료. **시각/상호작용 확인 필요(사용자 눈)**: 동영상 재생, 단축키 동작, ZIP 내보내기 결과 — 자동 검증은 typecheck/test/build로 끝냈으나 캔버스 시각·키 입력은 Pixi 스크린샷 함정으로 도구 확인 불가.

> **결정(2026-06-16)**: 이미지 좌표 규약 정합은 **지금 건드리지 않음**. 데스크톱 `.kfjson` 픽셀 단위 호환은 web/desktop/모바일앱을 **다 같이 검증할 때** 실제 차이가 보이면 그때 맞춘다(아래 ‘보류’ 참고). 현재 web은 top-left=Translate로 자체 일관 → 그대로 둠.

## ▶ 다음 세션 시작점 (여기부터)

**Phase 4 끝. 코드 작업 없음 — 남은 것은 의도적 보류 항목 하나뿐(결정 완료):**

**보류(결정됨, 트리거 대기):** 이미지 좌표 규약 정합 — **지금은 건드리지 않는다.** 사용자 결정(2026-06-16): web/desktop/모바일앱을 다 같이 검증하다가 데스크톱 `.kfjson`을 **픽셀 단위로 똑같이** 열어야 할 실제 차이가 보이면 그때 착수. 현재 web은 top-left=Translate로 자체 일관. **착수 트리거가 오면** `commands.ts addImageFromAsset` + `engine getBox/setBox` + `hittest.ts imageOpaqueAt`(자연-픽셀 역산)를 center-origin scale+uniform-fit으로 함께 수정 + 골든 테스트 추가.

**권장(사용자 눈 확인, 1회):**
1. 동영상(.mp4/.webm)을 칸에 드롭/추가 → 재생·반복 + PNG/ZIP에 현재 프레임 스틸.
2. 단축키: Ctrl+C/X/V(클립보드), Ctrl+Z/Y(undo/redo), Delete/Backspace(삭제), L(잠금), Ctrl+S(저장). 메뉴 **단축키…**에서 리바인딩(설정 저장).
3. 색 입력 옆 최근색 스와치(클릭=적용, 우클릭=제거). **전 페이지 ZIP** 버튼.

**✅ 방금 끝낸 것(Phase 4 마무리 묶음):**
   - **클립보드**(`commands.ts`): 내부 클립보드(깊은 복제 DTO) `copySelection`/`cutSelection`/`pasteClipboard` — 붙여넣기 때 새 ID 부여, 같은 위치·크기 충돌 시 24px 우하단 오프셋(칸=현재 페이지, 이미지/말풍선=선택 칸 또는 마지막 칸). `toggleSelectedLock`/`hasClipboard`. 원본 `MainWindow.Clipboard.cs`. 골든 `commands.test.ts` 4.
   - **단축키**(`apps/web/app/lib/shortcuts.ts`): 기본 제스처 + localStorage 오버라이드(설정 저장), Ctrl=Cmd 매칭, 텍스트 입력 중 충돌 단축키 양보, Backspace 삭제 폴백(맥). 라우트 `installShortcuts`로 설치. `ShortcutsDialog`(클릭→키 캡처는 capture phase로 전역보다 먼저, 중복 제거, 기본값 복원). MenuBar **단축키…** 버튼, 불러오기 input을 라우트로 이동. 원본 `MainWindow.Shortcuts.cs`.
   - **최근색**(`apps/web/app/lib/recentColors.ts` + `ui.tsx ColorInput`): localStorage(최신순·최대12, 모든 색 입력 공유) + `useSyncExternalStore`. 색 선택 시 추가, 입력 옆 스와치(클릭=적용·우클릭=제거). 원본 `MainWindow.ColorPicker.cs`.
   - **다중 페이지 ZIP**(`engine exportPagePng(index)` + `lib/zip.ts` + `lib/persistence.ts exportAllPagesZip`): 페이지마다 전환→동기 렌더→추출→복원, `001_이름.png`…을 의존성 없는 store-zip(CRC32, UTF-8 파일명)으로 묶어 다운로드. MenuBar **전 페이지 ZIP**. 원본 `MainWindow.Persistence.cs ExportPagesAsImages`(폴더→웹은 zip). **포터블 `.kfz`는 데스크톱에 실제로 없음** → 웹 `.webtoon`(프로젝트+자산 번들)이 이미 포터블 포맷이라 생략.

**그 전(Phase 4 동영상):** `<video>`→Pixi `VideoSource` 텍스처를 기본 ticker로 매 프레임 갱신(음소거·루프·자동재생, 화면 밖 정지). `assets.ts isVideoFile`/`AssetRecord.kind`/`measureVideo`, `engine ensureVideo`/`tickVideos`. 동영상은 알파 맵 없음=불투명 히트. 원본 `MediaKind.Video`. 골든 `assets.test.ts` 3.

**그 전(Phase 4 애니 프레임):** `assets.ts decodeAnimatedFrames`(WebCodecs `ImageDecoder`로 gif/webp/apng→프레임+딜레이) + `engine ensureAnim`/`tickAnimations`(기본 ticker로 텍스처 순환, 최소 20ms·루프). 정지/미지원은 `ensureTexture` 폴백.

## 재개 방법

```bash
cd ~/k-codepoet/my-webtoon-maker
pnpm install
pnpm dev            # http://localhost:5173
pnpm typecheck && pnpm test
```
처음 화면에 이전 테스트 자동저장이 보이면 상단 **새 문서** 클릭.

---

## ✅ 완료 (Phase 0 + 1) — 다시 만들지 말 것

- [x] Turborepo(pnpm) + RR v7(SSR) + Tailwind v4 + 테마 토큰
- [x] `@repo/core`: `.kfjson` zod 스키마(필드/기본값 1:1) · 직렬화(구버전 호환) · `applyLayout`(패턴→칸)
- [x] `@repo/geometry`: `roundRectOutline`(원↔사각) · `autoFitFontSize` · 골든 테스트
- [x] `@repo/editor`: Zustand 스토어 + 스냅샷 undo/redo + 커맨드 + 자산 레지스트리
- [x] `@repo/editor/engine`: Pixi v8 엔진 — 페이지/칸/이미지/말풍선 렌더, 선택·드래그·리사이즈(핸들), 드롭, 휠 줌, PNG 추출
- [x] `apps/web`: 메뉴바 · 인스펙터(전 섹션) · 저장/불러오기(.webtoon/.kfjson) · IndexedDB 자동저장/복원 · PNG 내보내기
- [x] 전 패키지 typecheck 그린, core/geometry 테스트 9개 통과, 프로덕션 빌드 성공

---

## ⬜ 남은 작업

### ✅ Phase 2 — 말풍선 도형 파리티 (완료)
원본 `KomaForge/src/MainWindow/MainWindow.Shapes.cs`, `MainWindow.Bubbles.cs` 포팅 완료.

- [x] `packages/geometry/src/noise.ts` — `pseudo(seed)` 공식 그대로 + `irregularityMul`. (`internal.ts`에 `clamp`/`sampleQuadratic` 공용 헬퍼)
- [x] `packages/geometry/src/shapes.ts` — 구름/폭발(`cloudExplosionOutline`)·플래시(`flashOutline`)·집중선(`concentrationLineEndpoints`)·속도선(`effectLineEndpoints`) + `clipSegmentToBox`. WPF StreamGeometry→폴리곤 샘플(베지어 `sampleQuadratic`).
- [x] `packages/geometry/src/tail.ts` — 3점 곡선 꼬리(`tailOutline`), Mid 누락 시 중점 보정.
- [x] `packages/geometry/src/merge.ts` — `polygon-clipping`으로 본체+꼬리 Union/Exclude(`combineBodyAndTails`), 칸 단위 외곽선 Union(`unionAll`).
- [x] 골든 테스트 20개(pseudo 결정성, 도형 점 수/좌표, 클립, 꼬리, union/carve).
- [x] `engine/index.ts` — Shape별 분기(본체 채움은 말풍선별, 외곽선은 칸 단위 병합 stroke), 집중선/속도선 페이드(세그먼트 알파), None/선효과 투명 히트영역.
- [x] `Inspector.tsx` — 모양 콤보 + 개수/강도/불규칙도/폭변동 슬라이더(도형별 라벨) + 꼬리 추가/선택/편집/삭제 UI. `ui.tsx`에 `Select`/`Slider` 추가.

**Phase 2에서 미룬 디테일(현황):**
- ~~캔버스 꼬리 드래그 핸들~~ → ✅ Phase 3(2/4)에서 완료(`drawTailHandles`/`setTailPoint`).
- `IsCropped` 말풍선의 칸 사변형 클리핑: **아직 미적용**. 현재는 크롭 그룹별 외곽선 병합만(`drawMergedBubbleOutlines`), 말풍선 자체를 칸 폴리곤으로 클립하지 않음. `panelCorners()`가 이미 있으니 칸 컨테이너에 마스크 씌우면 됨(원하면 Phase 3에서).
- 채움 구멍(완전 내부에 있는 inward 꼬리)은 외곽 링만 채움(노치는 정상 반영). 실사용 드묾 → 보류.

### Phase 3 — 칸·이미지 파리티 (진행 중)
- [x] **사변형 모서리 모드**: `engine` `drawPanel()`이 `panelCorners()`(TL,TR,BR,BL + `CornerOffsets[8]`) 폴리곤으로 배경/테두리/이미지 마스크를 그린다. 칸 선택 시 `CornerMode`면 8방향 리사이즈 대신 사변형 외곽선 + 4 모서리 드래그 핸들(`drag mode:"corner"` → `setCornerOffset`). Inspector에 토글 + 모서리 초기화. (`updateSelectedPanel`이 `CornerMode/CornerOffsets` 허용)
- [x] **픽셀 알파 히트테스트 + 겹친 오브젝트 클릭 순환**: `assets.ts` 알파 맵 캐시(오프스크린 캔버스→`Uint8Array`), `engine/hittest.ts`(신규, Pixi 비의존)에 후보 스택/알파·도형 판정 분리(+골든 17), `engine/index.ts`는 모든 `pointerdown`을 단일 `pressAt()`로 라우팅(투명 픽셀 통과·z-순환·이동 데드존 6px). 원본 `HitTest.cs`+`Interaction.cs CollectSelectablesAt`.
- [x] **자유 리사이즈·스냅·꼬리 핸들**: 자유 리사이즈는 `setBox`가 Scale/ScaleY·W/H 독립 설정으로 이미 동작. 스냅(`snapCandidates/snapMove/snapResize`) — 이동/리사이즈 시 페이지·소속 칸·형제 박스의 가장자리+중앙에 흡착(임계 6px, Alt로 해제), 빨강 가이드 라인 표시. **캔버스 꼬리 드래그 핸들**(Phase 2 숙제) — 선택 말풍선의 모든 꼬리에 시작/중간/끝 핸들(`drag "tail"`→`setTailPoint`), 시작 드래그는 꼬리 전체 이동. (pivot 추종은 리사이즈가 반대편 고정으로 충분 → 보류)
- [~] **이미지 좌표 규약 정합**: 현재 web은 top-left=Translate(자체 일관). 데스크톱은 center-origin 스케일+uniform-fit. **의도적 보류(2026-06-16 결정)** — `.kfjson` 픽셀 호환은 web/desktop/모바일 교차 검증 시 실제 차이가 보이면 그때 맞춘다. (`commands.ts addImageFromAsset`, `engine getBox/setBox`, `hittest.ts imageOpaqueAt`)

### ✅ Phase 4 — 미디어·마무리 (완료)
- [x] **애니메이션 GIF/WebP/APNG 프레임**: `assets.ts decodeAnimatedFrames`(WebCodecs `ImageDecoder`) + `engine` `ensureAnim`/`tickAnimations`(기본 ticker로 텍스처 순환, 최소 20ms·루프). 정지/미지원은 `ensureTexture` 폴백. 원본 `TryDecodeAnimatedFrames`/`StartFrameAnimation`.
- [x] **동영상**: `<video>`(음소거·루프·자동재생)→Pixi `VideoSource` 텍스처를 기본 ticker로 매 프레임 갱신, 화면 밖이면 정지. 내보내기 추출 직전 현재 프레임 갱신=seek 스틸 대체. `assets.ts isVideoFile`/`AssetRecord.kind`/`measureVideo`, `engine ensureVideo`/`tickVideos`. 원본 `MediaKind.Video`/`MediaElement`. (실제 재생은 사용자 눈 확인.)
- [x] **클립보드(cut/copy/paste)**: `commands.ts` 내부 클립보드(깊은 복제 DTO)+24px 충돌 오프셋+새 ID, `toggleSelectedLock`. 원본 `MainWindow.Clipboard.cs`. 골든 `commands.test.ts` 4.
- [x] **사용자 단축키(설정 저장)**: `apps/web/app/lib/shortcuts.ts`(기본+localStorage 오버라이드, Ctrl=Cmd, 텍스트 입력 양보) + 라우트 설치 + `ShortcutsDialog`(리바인딩). 원본 `MainWindow.Shortcuts.cs`.
- [x] **색 선택기 최근색**: `apps/web/app/lib/recentColors.ts`(localStorage·최신순12) + `ui.tsx ColorInput` 스와치. 원본 `MainWindow.ColorPicker.cs`.
- [x] **다중 페이지 ZIP 내보내기**: `engine exportPagePng(index)` + `lib/zip.ts`(의존성 없는 store-zip·CRC32·UTF-8) + `persistence.ts exportAllPagesZip`. 원본 `Persistence.cs ExportPagesAsImages`(폴더→웹은 zip). **`.kfz`는 데스크톱에 없음** → `.webtoon`이 포터블 포맷이라 생략.

---

## 🧠 기억해둘 아키텍처 결정 / 함정

- **SSR 경계**: `@repo/editor` 진입점은 Pixi import 금지. 엔진은 `@repo/editor/engine`에서 `EditorCanvas`가 `useEffect` 안 동적 import. 새 React 컴포넌트가 클라이언트 전용이면 `<ClientOnly>` 안에 둘 것(스토어 랜덤 ID 하이드레이션 불일치 방지).
- **상태 흐름**: 스토어가 `project`를 **제자리 변경 + `rev` 증가**로 알림. 드래그/리사이즈는 `engine`의 `getBox/setBox`(칸/이미지/말풍선 공통 박스 매핑) 한 경로. checkpoint는 드래그 시작·인스펙터 onFocus에서 1회(코얼레싱 undo).
- **좌표 단위 = `.kfjson`과 동일(px)**. 말풍선 X/Y는 **칸 로컬**(원본과 동일). 화면은 viewport 스케일만.
- **자산**: 파일시스템 없음 → 메모리+IndexedDB, `PanelImage.Path = asset:<id>`. 저장 `.webtoon`=프로젝트+자산 번들, `.kfjson`=프로젝트만.
- **dev 전용 경고**: RR7+pnpm+Vite가 `react-dom`을 별도 optimize 패스로 묶어 `<Meta>`에서 `useContext of null`. **기능 무관, 프로덕션 빌드엔 없음.** `vite.config` `resolve.dedupe` + `.npmrc node-linker=hoisted`로 완화. 프리뷰로 검증 시엔 dev 서버 깨끗이 재시작 후 1회 로드로 판단(오래된 청크 섞임 주의).
- **Pseudo(seed) 결정론**: Phase 2에서 원본 공식을 정확히 재현해야 같은 `.kfjson`이 동일 도형으로 렌더됨 → 골든 테스트로 고정(`noise.ts`). 절대 바꾸지 말 것.
- **불 연산 = `polygon-clipping`**: WPF `Geometry.Combine`(Union/Exclude) 대체. WPF StreamGeometry/베지어는 전부 폴리곤 점열로 샘플(`sampleQuadratic`). 말풍선 **채움은 말풍선별**(배경색), **외곽선(stroke)은 칸 단위로 Union**해 겹친 말풍선 경계선이 하나로 이어짐. `.d.ts`는 named export지만 런타임은 default export → `import polygonClipping from "polygon-clipping"`(esModuleInterop) 사용.
- **엔진 드래그 모드 = 4종**: `move`/`resize`/`corner`/`tail`. 모두 `beginDrag→pointermove(setBox 또는 set*)→pointerup` 한 경로. 스냅은 `move`/`resize`에서 `setBox` 직전에 박스 변환(`snapMove/snapResize`, **Alt 누르면 해제**). 가이드 라인은 `activeSnap`에 저장→`drawSnapGuides`, `endDrag`에서 비움.
- **히트테스트 = 중앙 `pressAt()` 한 경로**: 칸/이미지/말풍선/페이지 배경의 `pointerdown`이 전부 `pressAt(e)`로 라우팅된다(Pixi가 어느 객체에 전달하든 무관 — `pressAt`이 기하/알파로 진실을 재계산). 순서: `activePanelAt`(최상단 칸) → `collectSelectables`(테두리=칸 위 → 말풍선 위부터 → 이미지 배열역순·**불투명 픽셀만** → 칸 몸체). **투명 이미지 픽셀은 스택에서 빠져 아래로 통과**. 현재 선택이 스택에 있으면 클릭(이동<6px)마다 `(idx+1)%len` 순환(`pendingCycle`, `endDrag`에서 커밋). 이동 드래그는 **데드존 6px** 넘겨야 확정(`dragEngaged`) → 클릭과 드래그 구분, 순수 클릭은 checkpoint/이동 안 함.
- **히트 기하는 `engine/hittest.ts`(Pixi 비의존)**: 단위 테스트 위해 분리. `panelCorners`도 여기로 이동(렌더는 `index.ts`가 재-import). **이미지 알파 규약**: 웹은 텍스처를 박스에 X/Y 독립 스케일 직접 매핑 → 자연픽셀 = (박스로컬-Translate)/Scale. 데스크톱 uniform-fit+여백과 **다름**(좌표 규약 정합 결정 시 같이 수정). 알파 맵 미준비/동영상 = 불투명(사각형) 취급(원본 `bitmap==null→true`).
- **잠금 + 캔버스 선택**: `collectSelectables`는 잠긴 말풍선/이미지를 후보에서 제외, 잠긴 칸은 캔버스 선택 불가(원본 동일). **해제는 인스펙터의 칸/이미지/말풍선 목록 버튼으로 선택**(목록은 히트테스트 우회). 그래서 캔버스에서 잠긴 대상이 안 잡혀도 잠금 해제 가능.
- **동영상 = `<video>` + Pixi `VideoSource` 텍스처**: 원본 `MediaElement`(음소거·루프·자동재생) 대응. 자산 `kind:"video"`로 판별(`isVideoFile`=원본 확장자 + `video/*`). `ensureVideo`가 dataURL→Blob URL→`<video>`→`VideoSource`(autoPlay·loop·`updateFPS:0`)→`Texture`, `loadeddata`에 캐시. **갱신은 애니와 같은 기본 ticker 경로**(`tickVideos`): `drawImage`가 현재 페이지에 그린 동영상만 `live=true` → ticker가 `texture.source.update()`로 매 프레임 GPU 재업로드(VideoSource 자동갱신과 중복이어도 무해), 화면 밖이면 `pause`(`renderScene` 시작에 `live` 리셋). **자연 크기는 `<video>.videoWidth/Height`로 측정**해 `asset.width/height`에 저장 → `getBox/setBox`/스냅은 이미지와 동일. **동영상은 알파 맵 없음** → 히트테스트는 불투명 사각형(원본 `bitmap==null→true`), `ensureAlphaMap`/`decodeAnimatedFrames`가 `kind==="video"`면 조기 return. **PNG 내보내기 = 현재 프레임 스틸**(추출 직전 live 갱신; 원본 Win32 seek 썸네일 대체). 영속화는 dataURL 그대로(이미지와 동일, 용량 큼). 미지원/디코드 실패는 placeholder(정지 폴백 없음 — 동영상은 정지 텍스처 경로를 타지 않음).
- **애니 프레임 = 기본 ticker 텍스처 교체**: Pixi `Application` 기본 ticker가 매 프레임 렌더하므로 별도 rAF 없이 `tickAnimations`가 스프라이트 `.texture`만 바꾸면 다음 렌더에 보인다. 스프라이트는 `renderScene`마다 재생성되므로 **anim 엔트리에 `sprites: Set` 보관 → `renderScene` 시작에 비우고 `drawImage`가 다시 등록**(파괴된 스프라이트가 셋에 남지 않게). 프레임 index/acc(딜레이 누적)는 엔트리에 영속 → 재렌더에도 이어짐. 모든 프레임은 자산과 같은 픽셀 크기라 텍스처 교체해도 스프라이트 width/height(=scale) 불변. 정지 판명 자산은 `animStatic`에 넣어 재디코드 안 함. **자산 dataURL이 애니 원본을 그대로 보존**하므로 영속화(.webtoon/IndexedDB) 변경 불필요. 알파 맵은 첫 프레임 기준(프레임별 알파는 과함 → 보류).
- **WebCodecs 가용성**: `ImageDecoder`는 Chrome/Edge엔 있고 일부 브라우저엔 없음 → `decodeAnimatedFrames`가 미지원/실패 시 null 반환해 **정지 이미지로 폴백**(원본도 코덱 없으면 정지 폴백). `image.duration`은 마이크로초(0이면 100ms, 최소 20ms).
- **사변형 칸**: `CornerOffsets`는 **flat 8개**(TL,TR,BR,BL 순서 × X,Y). `panelCorners(panel)`가 단일 진실원. `CornerMode` 칸은 선택 시 8핸들 대신 사변형 외곽선+4모서리 핸들.
- **말풍선 좌표는 칸 로컬**, 꼬리 좌표도 말풍선 로컬. 페이지 좌표 = `panel.X + bubble.X + local`. 꼬리 핸들은 선택 말풍선의 **모든 꼬리**를 표시(엔진은 인스펙터의 `tailIdx`를 모름 — 독립).
- **브라우저 검증 함정(중요)**: Pixi `Application` 기본 ticker가 매 프레임 렌더 → 페이지가 `document_idle`에 도달 못 해 **`computer` 스크린샷 도구가 45s 타임아웃**. 시각 확인은 사용자가 직접. 자동 검증은 `javascript_tool`로 **DOM 컨트롤(인스펙터 버튼/체크박스) 클릭** + `read_console_messages(onlyErrors)`로 렌더 경로 에러 0 확인. 캔버스 Pixi 인터랙션(드래그)은 화면 변환을 못 구해 합성 이벤트로 구동 어려움 → 눈으로 확인.
- **클립보드 = 모듈 내부 상태(commands.ts)**: 시스템 클립보드 아님. `copySelection`이 선택 오브젝트를 **깊은 복제 DTO**(`structuredClone` 폴백 JSON)로 모듈 변수에 보관(원본 `_clipboard*`). `paste`는 **새 ID 부여**(칸은 내부 이미지·말풍선까지) + 같은 위치·크기 충돌이면 **24px 우하단**(`near` eps 0.5, 이미지 scale eps 0.001). 칸=현재 페이지에, 이미지/말풍선=선택 칸(없으면 마지막 칸)에. `apply(checkpoint=true)` 한 번으로 undo 1스텝. 리로드하면 비워짐(세션 한정).
- **단축키 = 웹 전역 keydown(apps/web/app/lib/shortcuts.ts)**: 기본 제스처 + `localStorage("mwm.shortcuts")` 오버라이드(""=없음). **"Ctrl" 제스처는 ctrlKey OR metaKey(맥 Cmd) 매칭**. 입력칸(INPUT/TEXTAREA/SELECT/contentEditable) 포커스 + 충돌 제스처(수정자 없음 또는 Ctrl+C/V/X/Z/Y/A)면 **양보**(원본 ConflictsWithTextEditing). 맥 친화로 Backspace→삭제 폴백. 리바인딩 모달은 **capture phase** 리스너로 전역보다 먼저 키를 가로채 캡처. SSR 안전: localStorage 접근 전부 지연. `reset/preferences`/`Ctrl+R`은 제외(브라우저 새로고침 보호).
- **최근색(apps/web/app/lib/recentColors.ts)**: `localStorage("mwm.recentColors")` 최신순·최대12, **모든 색 입력 공유**. `ColorInput`이 색 선택 시 `addRecentColor`, 옆에 스와치(클릭=적용+checkpoint, 우클릭=제거). `useSyncExternalStore`로 구독(서버 스냅샷=빈 배열).
- **다중 페이지 ZIP**: `engine.exportPagePng(index)`가 **대상 페이지로 잠시 전환(`editorStore.setState`)→`renderScene()` 동기 렌더→`extractPage`→복원**(현재 페이지는 `extractPage` 직접). `exportCurrentPagePng`와 `extractPage`(스케일1·오버레이 숨김·동영상 현재프레임) 공용. `lib/zip.ts`는 **의존성 없는 store(무압축) ZIP + CRC32**(PNG는 이미 압축 → 무압축 무손해), 파일명 UTF-8(범용비트 11)로 한글 페이지명 보존. system `unzip`으로 무결성·라운드트립 검증함.

---

## 파일 지도 (어디를 건드리나)

| 작업 | 파일 |
|---|---|
| 스키마/기본값 | `packages/core/src/schema.ts` (말풍선/꼬리/`CornerMode`/`CornerOffsets` 등) |
| 레이아웃/직렬화 | `packages/core/src/{layout,serialize,factory}.ts` |
| 도형/꼬리/병합/노이즈 | `packages/geometry/src/{shapes,tail,merge,noise,internal}.ts` (+ `index.ts` 재노출) |
| 렌더·상호작용·애니·동영상 | `packages/editor/src/engine/index.ts` (드로잉: `drawPanel`/`drawImage`/`drawBubble`/`drawMergedBubbleOutlines`/`drawBubbleLineEffect`; 애니: `ensureAnim`/`tickAnimations`; 동영상: `ensureVideo`/`tickVideos`; 인터랙션: `pressAt`(중앙 라우팅)/`beginDrag`/`setBox`/`setCornerOffset`/`setTailPoint`/`snap*`; 오버레이: `drawSelectionOverlay`/`drawPanelCornerOverlay`/`drawTailHandles`/`drawSnapGuides`) |
| **히트테스트(Pixi 비의존)** | `packages/editor/src/engine/hittest.ts` (`panelCorners`/`pointInPoly`/`onPanelBorder`/`bubbleContains`/`imageOpaqueAt`/`activePanelAt`/`collectSelectables`/`selEq`) + `hittest.test.ts`(골든 17) |
| 스토어/undo/커맨드/자산 | `packages/editor/src/{store,commands,assets,types}.ts` (`commands.ts`: 클립보드 `copy/cut/pasteSelection`·`toggleSelectedLock`·`hasClipboard`; `assets.ts`: 알파 맵·애니 `decodeAnimatedFrames`·동영상 `isVideoFile`/`measureVideo`/`AssetRecord.kind`; `commands.test.ts` 골든 4, `assets.test.ts` 골든 3) |
| 인스펙터/메뉴/저장/단축키/색 | `apps/web/app/{components,lib}/*` (`ui.tsx` `Select`/`Slider`/`ColorInput`(최근색); `lib/{shortcuts,recentColors,zip,persistence}.ts`; `components/ShortcutsDialog.tsx`; `routes/editor.tsx`가 단축키 설치·open input·모달) |

> **다음 작업**: Phase 0~4 완료, 코드 작업 없음. ‘이미지 좌표 규약 정합’은 **의도적 보류**(2026-06-16 결정 — web/desktop/모바일 교차 검증 중 실제 차이가 보이면 그때 착수, 위 ‘보류’ 섹션 참고). 그 외 마감은 사용자 눈 확인(동영상 재생·단축키·ZIP)뿐.
