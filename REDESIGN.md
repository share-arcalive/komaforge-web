# UI/UX 재설계 계획 (web-app 관점)

> WPF 포팅 잔재(고정 메뉴바 + 고정 인스펙터, 라이트 종이 테마, 아이콘 0)를 걷어내고
> **웹앱 네이티브 도킹 워크스페이스**로 재설계한다.
> (Claude 웹챗 느낌 + 모든 UI가 dockview 도킹 패널). 본 문서는 이어가기용 픽업 포인트.
> 전체 프로젝트 상태는 [PROGRESS.md](./PROGRESS.md) 참고.

## 결정 (2026-06-16)

- **테마: 다크** (참고 레포처럼). 전체 다크 크롬 + 캔버스 배경도 어둡게, 작업물(페이지)은 그대로.
  Figma/Photoshop/클립스튜디오 류 프로 에디터 톤.
- **범위: 풀 도킹 워크스페이스.** dockview 도입 — 캔버스·인스펙터·페이지를 도킹/플로팅/탭 가능한
  패널로. 레이아웃 localStorage 저장/복원/초기화.
- **스택 유지:** RR7(SSR) + Pixi8 + Tailwind v4. dockview/Pixi는 클라이언트 전용 → `<ClientOnly>` 게이트.
- **신규 의존성:** `dockview@^6.6.1`, `lucide-react@^1.18.0` (둘 다 React 19 호환 확인).

## 참고 레포에서 가져올 패턴

- **dockview** `DockviewReact` + `themeDark` + `dockview/dist/styles/dockview.css` + 커스텀 테마 css.
- **시맨틱 토큰** 이름 그대로 차용: `bg / surface / raised / line / ink / ink-muted / ink-faint / accent / accent-hover`.
- **lucide-react** 아이콘 버튼(텍스트 메뉴 대신).
- **패널 레지스트리**: `kind ↔ 컴포넌트/메타(title·icon·description)` 단일 출처, lazy 로딩 + Suspense.
- 얇은 상단 툴바(h-11) + 레이아웃 자동 저장(`api.toJSON/fromJSON`) + (선택) 접이식 사이드바/최소화 바.

## 기술 리스크 & 해결책

1. **Pixi 리사이즈** — 엔진이 `resizeTo: container`라 **창 리사이즈만** 추종. dockview 패널 크기 변경엔 반응 X.
   → `EditorHandle.resize()` 추가(`app.resize()` 호출 → "resize" 이벤트 → `scheduleRender`) +
   캔버스 패널 컨테이너에 `ResizeObserver`. **width/height 0(숨김 탭)일 땐 skip**.
2. **SSR/하이드레이션** — dockview는 DOM 전용. 워크스페이스 전체를 `<ClientOnly>`로 감싼다(기존 패턴 유지).
   기존 "dual-React useContext null" dev 경고는 무관·프로덕션 무.
3. **숨김 패널 Pixi 티커** — 캔버스 패널이 다른 탭 뒤에 있어도 기본 ticker가 계속 렌더(GPU 낭비).
   v1은 허용, 후순위 최적화로 기록(보이는지 여부로 ticker 일시정지).
4. **테스트 영향 최소** — 변경은 대부분 `apps/web`. 엔진은 `resize()` 한 메서드만 추가. 49 테스트 그린 유지.

## 단계 (phased)

각 단계 끝에 typecheck/test/build 그린 + 프리뷰 시각 확인.

### ✅ Phase 0 — 기반: 의존성 + 다크 토큰 + 외형 (완료)
- [x] `dockview@^6.6.1` + `lucide-react@^1.18.0` 설치.
- [x] `app.css` 다크 토큰 팔레트(bg/surface/raised/line/ink/ink-muted/ink-faint/accent/accent-hover) + `color-scheme: dark`.
- [x] 엔진 캔버스 배경 `#cfc9bf` → `#0e0e11`.
- [x] `ui.tsx` 프리미티브 전부 토큰화(인스펙터 자동 반영) + Inspector 인라인 라이트클래스 정리.
- [x] `MenuBar` → lucide 아이콘 툴바(h-11, 다크). `ShortcutsDialog` 다크화. `editor.tsx` aside 토큰화(+overflow-y-auto).
- [x] `vite.config` `optimizeDeps.include:["lucide-react","dockview"]` — context-lib 사전 번들(아래 함정).
- **검증:** typecheck 7/7 · 테스트 49 · 프로덕션 빌드 그린 · dev 화면 다크+아이콘 정상.
- **⚠️ 함정(중요):** lucide/dockview처럼 React-context 쓰는 dep을 **세션 중 새로 추가**하면 Vite가
  열린 페이지에서 재최적화→stale 청크가 섞여 `useContext of null`로 **렌더가 깨진다**(메모리 dual-React의
  심화형). **해결: dev 서버 깨끗이 재시작(.vite 캐시 삭제) + 단일 로드.** `optimizeDeps.include`로 최초 패스에
  묶어 완화. 프로덕션 빌드는 항상 깨끗.

### ✅ Phase 1 — dockview 워크스페이스 (완료)
- [x] `EditorHandle.resize()` — `resizeTo` 제거하고 **동기 `app.renderer.resize(컨테이너 크기)` + scheduleRender**
      (resizeTo는 창 리사이즈만 추종/비동기라 패널 리사이즈에 fit 누락). 0×0/동일크기 skip.
- [x] 패널 레지스트리(`panels/registry.ts`): `canvas`, `inspector`. `CanvasPanel`/`InspectorPanel`.
- [x] `DockWorkspace`(`DockviewReact` + `themeDark` + `styles/dockview-theme.css` 토큰 매핑) +
      초기 레이아웃(캔버스 중앙 + 속성 우측 340px) + localStorage 저장/복원/초기화(`lib/workspace.ts`).
- [x] 엔진 핸들 싱글톤(`lib/editorHandle.ts`, `useEditorHandle`로 내보내기 버튼 활성화).
- [x] `editor.tsx` = MenuBar(아이콘+레이아웃 초기화) + `<ClientOnly><DockWorkspace/></ClientOnly>`.
- **검증:** typecheck 7/7 · 테스트 49 · 빌드 그린 · 클린 콜드 로드에서 캔버스 정확히 fit·idle 렌더 0·
  도킹 인스펙터에서 칸 선택→캔버스 핸들 표시까지 확인.
- **⚠️ 함정(중요): 캔버스-in-dockview 리사이즈 피드백 루프.** 캔버스 컨테이너가 `h-full`이면 dockview
  초기 레이아웃에서 높이가 안 풀려 **콘텐츠(캔버스) 크기로 collapse → RO 발화 → resize → 캔버스 크기 변경 →
  RO …** 무한루프(100×66 등 엉뚱한 크기로 고정). **해결: 컨테이너를 `absolute inset-0`(부모 `relative`)로
  띄워** 캔버스 자식이 컨테이너 크기에 영향 못 주게 함. + resize()에 동일크기 skip 가드.
- **⚠️ 검증 함정:** 세션 중 반복 리로드/HMR이 옛 엔진·RO를 좀비로 남겨 크기 진동을 유발 → **깨끗한 재시작 후
  단일 콜드 로드로만 판단**(메모리 dual-React 함정과 동일 계열).
- **⚠️ 함정(dpr fit 절반):** `computeFit`이 `renderer.width / resolution`으로 뷰포트 크기를 구하면 Retina(dpr=2)에서
  **페이지가 절반 크기로 작게 fit**됨(이 Pixi 버전 `renderer.width`는 이미 CSS 값). **해결: `renderer.screen.width/height`
  (CSS 논리 크기)를 직접 사용**(`engine computeFit`).

### ✅ Phase 2 — 패널 분해 + 마감 (완료)
- [x] **`페이지`(좌) 패널 신설**(`panels/PagesPanel.tsx`) — 작품(제목)·페이지 목록(ListRow)+아이콘 툴바
      (추가/복제/위·아래/삭제)·페이지 설정(이름/크기/검정배경)·칸 구성(패턴/여백/간격)·칸 목록.
- [x] **`속성` 인스펙터 선택 집중형 재작성** — 헤더 브레드크럼("1번 칸 › 말풍선 1")+액션(앞/뒤/삭제/해제),
      빈 상태 안내, 선택 종류별 섹션(칸 / 이미지 / 말풍선 / 텍스트·스타일 / 모양·크기 / 꼬리). 문서·페이지는 제거(페이지 패널로).
- [x] **UI 프리미티브 강화**(`ui.tsx`): 접이식 `Section`(chevron), `ListRow`(잠금 아이콘·active ring),
      `IconBtn`(danger), `Check`, `Field`, `EmptyState`.
- [x] **레이아웃**: 페이지(좌 220) · 캔버스(중) · 속성(우 320). `LAYOUT_KEY` → `mwm.layout.v2`(구버전 폐기).
      `showPanel(kind)`로 닫은 패널 복구(MenuBar **페이지/속성** 버튼).
- [x] 툴바 좁은 폭에서 아이콘만(`lg:inline` 라벨)로 줄바꿈 방지.
- **검증:** typecheck 7/7 · 테스트 49 · 빌드 그린 · 클린 로드에서 3패널·칸선택→속성·말풍선 추가→텍스트 입력이
      목록 라벨+캔버스에 반영까지 확인.

### ✅ Phase 3 — 합성 모델 유연화 (완료)
WPF식 "모든 것을 칸 안에 가둠"에서 벗어나 자유 합성. 사용자 요청 4형태:
- [x] **① 말풍선이 칸 경계 넘나듦** — 말풍선을 `drawPanel`에서 빼고 `renderScene`의 **최상위 `drawBubblesOnTop`**
      레이어로(모든 칸 위). 말풍선 좌표는 칸-로컬 유지(데이터 호환). 히트테스트는 기하 기반이라 무영향.
- [x] **② 이미지가 칸 밖으로** — 기존 `image.IsCropped` 그대로(끄면 칸 폴리곤 마스크 없이 삐져나옴).
      인스펙터 라벨 "칸에 맞춰 자르기(크롭)"로 명확화.
- [x] **③ 칸 없이 그림만** — `ComicPanel`에 `ShowBackground`/`ShowBorder`(기본 true) 추가. 둘 다 끄면 흰 배경/검정
      테두리 미표시(투명 히트만 남겨 선택·이동 유지) → 이미지 크롭까지 끄면 "그림만".
- [x] **④ 칸끼리 겹침** — 칸 자유 위치/크기(기존)+`reorderSelected`(앞/뒤 z순서, 기존)+배경 끄면 아래 칸 비침.
- [x] **클릭 선택을 페이지 전역으로** — 기존 `pressAt`은 `activePanelAt`(최상단 칸 하나)의 자식만 후보로 봐서,
      칸 경계를 넘은 말풍선/칸 밖 이미지/겹친 아래 칸을 못 골랐다. `hittest.collectSelectablesPage(page,x,y)` 신설:
      z-순(말풍선 전부 위 → 칸별 위→아래[이미지(불투명)→칸 몸체])으로 페이지 전역 후보를 모은다. `pressAt`이 이걸 사용
      → 클릭=최상단 선택, **같은 지점 재클릭=다음 후보 순환**(말풍선↔이미지↔칸, 겹친 칸까지). 잠긴 칸/오브젝트 제외.
      골든 테스트 5개 추가(경계 넘는 말풍선/칸 밖 이미지/겹친 칸 순환/빈 공간/잠금). 라이브 검증 완료.
- **변경:** `core/schema.ts`(+2필드), `commands.ts updateSelectedPanel`(화이트리스트), `engine`(drawPanel 토글+
      drawBubblesOnTop), `Inspector`(칸 섹션 배경/테두리 체크).
- **호환:** `.kfjson` 직렬화에 새 키가 써짐 → 데스크톱(C#)은 모르는 키 무시(왕복 시 기본값 복원). 골든 테스트 영향 없음.
- **검증:** typecheck 7/7 · 테스트 49 · 빌드 그린 · 사용자 실제 콜라주 문서에서 말풍선이 칸 경계 넘어 떠 있는 것 +
      배경/테두리 토글 동작(상태 반영·렌더 에러 0) 확인.

## 파일 지도

| 작업 | 파일 |
|---|---|
| 다크 토큰 | `apps/web/app/app.css` |
| 캔버스 배경 | `packages/editor/src/engine/index.ts` (`background`) |
| Pixi 리사이즈 | `packages/editor/src/engine/index.ts` (`resize()`), `apps/web/app/components/EditorCanvas.tsx` |
| 프리미티브 토큰화 | `apps/web/app/components/ui.tsx` |
| 툴바(아이콘) | `apps/web/app/components/MenuBar.tsx` → `Toolbar.tsx` |
| 도킹 | `apps/web/app/components/DockWorkspace.tsx`(신), `apps/web/app/panels/*`(신), `apps/web/app/styles/dockview-theme.css`(신) |
| 레이아웃 진입 | `apps/web/app/routes/editor.tsx` |
| 패널 분해 | `apps/web/app/components/Inspector.tsx` 분할 |

## 다크 토큰 초안 (app.css `@theme`)

```css
--color-bg:          #0e0e11;  /* 앱 바닥 */
--color-surface:     #17171b;  /* 툴바·패널 헤더 */
--color-raised:      #202026;  /* hover·raised */
--color-line:        #2a2a31;  /* 보더 */
--color-ink:         #e8e8ec;  /* 본문 */
--color-ink-muted:   #a2a2ab;
--color-ink-faint:   #6c6c76;
--color-accent:      #3a9690;  /* 기존 teal #2b6f6a를 다크 대비로 상향 */
--color-accent-hover:#46b0a8;
```
(확정 시 본 표를 갱신)
