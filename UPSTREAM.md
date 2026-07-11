# UPSTREAM — 원본 KomaForge 추적 & 포팅 델타

> 원본 **[KomaForge](https://github.com/unknowndevdot/KomaForge)** (C# WPF, 원작자 **흑우/unknowndevdot**)
> 의 태그별 변경점을 이 웹 포팅과 대조해 **무엇을 아직 안 가져왔는지** 관리하는 문서.
> 벤더 스냅샷·패치·재동기화는 [`upstream/`](./upstream/) 참고.

## 핀 상태

| 항목 | 값 |
|---|---|
| 벤더된 원본 태그 | **v0.1.5** (`9eddda9`, 2026-06-27) |
| 가져온 날짜 | 2026-07-08 |
| 웹 포팅 상태 | **v0.1.1~v0.1.5 기능 파리티 반영 완료**(2026-07-08). 잔여는 아래 '잔여 리파인'뿐 |
| 원본 소스 위치 | [`upstream/KomaForge/`](./upstream/KomaForge/) — 읽기 전용 |
| 버전별 diff | [`upstream/changes/`](./upstream/changes/) |

> baseline은 `packages/core/src/schema.ts`의 말풍선 필드로 판정: `ShapeWidthVariation`(v0.1.1)까지
> 있고, `WarpShape`/`TextRotation`/`LineFadeBothSides`/`ThoughtTail`은 없음. 단, 미디어(애니
> GIF/WebP/APNG·동영상)는 원본 경로(MF/WPF) 대신 **웹 자체 구현**(WebCodecs)이라 태그 대응이 아닌
> 기능 대응으로 본다.

## 포팅 델타 (v0.1.1 이후 원본 변경 → 웹 반영 여부)

범례: ✅ 반영 · ❌ 미반영 · 🟡 부분/다른 구현 · ⏸ 웹 무관(보류)

| 원본 태그 | 변경점 | 원본 위치 | 웹 상태 | 웹 반영 시 손댈 곳 |
|---|---|---|---|---|
| v0.1.2 | **모서리 워프**(WarpShape/WarpText) — 사변형 일그러뜨림을 도형/글자에 적용 | `Models.cs`, `Bubbles.cs`, `Inspector.cs` | ✅ | `schema.ts` `CornerOffsets/WarpShape/WarpText` · `geometry/warp warpPoint`(이중선형) · `engine`(본체 warpMultiPoly + 글자 PerspectiveMesh) · `Inspector` 체크+모서리 입력 |
| v0.1.2 | **텍스트 정렬·세로정렬·줄간격** (TextAlignment/VerticalAlignment/LineHeight) | `Models.cs`, `Inspector.cs` | ✅ | `schema.ts` · `engine`(style.align/lineHeight + 정렬 배치) · `Inspector` 셀렉트 |
| v0.1.2 | **구간별 서식(Runs)** — 텍스트 스팬별 글꼴/색/외곽선 | `FlowText.cs` Runs 유틸 | 🟡 | `schema.ts Runs` 라운드트립 보존 완료. **스팬 편집 UI + 멀티스타일 렌더는 미구현**(웹 편집 시 단일서식 리셋) — VN과 함께 대형 항목 |
| v0.1.2~3 | **Visual Novel 모드** — 스크립트→페이지 생성 + 템플릿 | `MainWindow.VisualNovel.cs`, `FlowText.cs`, `Resources/DefaultVnTemplate.json` | ✅ | `schema.ts` FlowText/VnTemplates · `commands.ts`(setVnEnabled·addVnTemplate·generateVnPages 등, 원본 VnGenerate/ApplyScriptToPage) · `PagesPanel` VN 섹션. **미구현**: 캔버스 템플릿 편집 모드(웹은 일반 페이지→템플릿 추가로 대체), Ctrl+T(브라우저 새탭 충돌로 UI 토글로 갈음) |
| v0.1.1 | **이미지 애니 출력 타이밍**(BaseWidth/Height·OutputDuration·OutputFps) | `ProjectData.cs` PanelImageData | ✅ | `schema.ts` 필드 + `Inspector`(애니/동영상 출력 길이·fps) 라운드트립 |
| v0.1.1 | **내보내기 개편**(형식 선택·진행률·이미지별 출력·움직이는 WebP·MF 프레임 추출) | `Persistence.cs`, `VideoFrameReader.cs`, `AnimatedPlayer.cs` | ✅ | 웹: PNG(현재)·ZIP(전체)·움직이는 WebP·**대본(.txt)** 4형식 + 배수. `persistence.ts exportScript`(원본 ExportScriptTxt). 잔여: WebP 품질 슬라이더·이미지별 출력타이밍 소비(리파인) |
| v0.1.4 | **말풍선 텍스트 회전**(TextRotation 0~360°, 선효과 제외) | `Models.cs`, `Bubbles.cs`, `Inspector.cs`, `Selection.cs` | ✅ | `schema.ts` `TextRotation` · `engine makeBubbleText`(anchor 0.5 회전) · `Inspector` 슬라이더 |
| v0.1.4 | **RoundRect 강도 블렌딩** 개선 — 타원(0)→캡슐(50)→사각형(100) | `Shapes.cs` `CreateRoundRectGeometry` | ✅ | `geometry roundRectOutline` 캡슐 블렌딩 + 골든 테스트 |
| v0.1.4 | 텍스트 자동 클립 끄기 + 영역 변경 시 autofit/warp 재적용(잘림 방지) | `Models.cs` `GetLayoutClip`, `Bubbles.cs` | 🟡 | 웹은 `autoFitFontSize`가 이미 영역 기준 축소. 텍스트영역 핸들 UI 없어 재적용 트리거 불필요 |
| v0.1.5 | **속도선 양쪽 페이드**(LineFadeBothSides) — 양 끝 투명·중앙 정렬 | `Models.cs`, `Shapes.cs`, `Inspector.cs` | ✅ | `schema.ts` · `geometry effectLineEndpoints(centered)` · `engine drawFadeLineBothSides` · `Inspector` 체크 |
| v0.1.5 | **생각 꼬리**(ThoughtTail) — 곡선 대신 점점 작아지는 원 3개(꼬리별) | `Models.cs`, `Bubbles.cs`, `Inspector.cs`, `Selection.cs` | ✅ | `schema.ts` BubbleTail · `geometry/tail thoughtTailOutlines` · `engine bubbleTails`(원3개 union) · `Inspector` 체크 |
| v0.1.5 | 꼬리 기본 배치 개선(본체 아래 일자·핸들 안 겹침) + 기본 굵기 28→**15** | `Inspector.cs` `AddTail` | ✅ | `Inspector addTail` v0.1.5 배치 + Width 15 |
| v0.1.2~5 | csproj 버전·창 제목·단축키 라벨 정리 | 앱 메타 | ⏸ | 웹 무관 |

### 진행 완료 (2026-07-08)
v0.1.1~v0.1.5의 웹 미반영 기능을 **전부 포팅**했다. 커밋 순서:
1. ✅ 말풍선 v0.1.4~v0.1.5: 텍스트 회전·RoundRect 캡슐·양쪽 페이드·생각 꼬리·꼬리 기본값
2. ✅ 모서리 워프(WarpShape/WarpText) — 본체 이중선형 + 글자 PerspectiveMesh
3. ✅ 텍스트 정렬·세로정렬·줄간격 + Runs 라운드트립
4. ✅ 이미지 애니/동영상 출력 타이밍 필드
5. ✅ 내보내기: 대본(.txt) 추가 → PNG·ZIP·WebP·대본 4형식
6. ✅ Visual Novel 모드 — 스크립트→페이지 생성 + 템플릿

### 잔여 리파인 (기능은 있으나 완전 파리티 아님)
- **구간 서식(Runs) 스팬 편집 UI + 멀티스타일 렌더** — 데이터는 라운드트립 보존. 데스크톱 파일의
  구간 서식은 유지되나, 웹에서 스팬별 서식을 새로 편집하는 UI와 혼합스타일 캔버스 렌더는 미구현.
- **VN 캔버스 템플릿 편집 모드** — 웹은 '일반 페이지→템플릿 추가'로 대체. Ctrl+T는 브라우저 새탭 충돌로 UI 토글.
- **WebP 품질 슬라이더 · 이미지별 출력타이밍 소비** — 필드는 있음(D), 애니 내보내기가 아직 전역 fps/길이 사용.
- v0.1.4 텍스트 자동 클립/autofit 재적용 — 웹 autoFit이 영역 기준이라 사실상 대응(텍스트영역 핸들 UI 없음).

> 픽셀 시각 일치(워프 왜곡·생각꼬리 원 3개·회전각·양쪽 페이드 그라디언트)는 Pixi ticker 제약상 자동
> 스크린샷 불가 → 사용자 눈 확인 권장. 모든 기능의 코드 경로·생성 결과는 프리뷰에서 구동·무에러 확인함.

## 버전 올리기(재동기화) 절차

```bash
./upstream/sync.sh            # 원본 최신 태그로 (또는 ./upstream/sync.sh v0.1.6)
git diff upstream/KomaForge   # 벤더 소스가 어떻게 바뀌었는지 확인
# upstream/changes/<이전>_to_<새>.patch 를 읽고 → 아래 표에 새 행 추가 → 반영 후 상태 갱신
git add upstream UPSTREAM.md && git commit
```

`sync.sh`는 벤더 트리 교체 + 새 인접 패치 생성 + `komaforge.pin.json`의 핀 4개 필드를 갱신한다.
`knownTags` 목록과 이 문서의 델타 표는 **사람이** 새 태그 요약을 보고 채운다.
