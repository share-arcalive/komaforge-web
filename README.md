# my-webtoon-maker

KomaForge(C# WPF 망가 페이지 에디터)를 웹으로 포팅한 **Turborepo 모노레포**.
원본 도메인 모델과 `.kfjson` 저장 포맷을 보존하며, 렌더링은 **Pixi.js(WebGL)**, 앱은 **React Router v7(SSR)** 로 구현했다.

> 변환 설계 문서: [PORTING_PROMPT.md](./PORTING_PROMPT.md) · 이어가기/남은 작업: [PROGRESS.md](./PROGRESS.md)

## 빠른 시작

```bash
pnpm install
pnpm dev          # http://localhost:5173 (에디터)
```

빌드 / 프로덕션 실행 / 검사:

```bash
pnpm build        # 전체 빌드 (web: react-router build)
pnpm --filter web start   # 프로덕션 서버 (clean, dev 경고 없음)
pnpm typecheck    # 전 패키지 tsc
pnpm test         # core/geometry 단위 테스트
```

## 구조

```
apps/web              React Router v7 (SSR) — 에디터 UI, 인스펙터, 저장/내보내기
packages/core         도메인 모델(zod) + .kfjson 직렬화 + 레이아웃 (Pixi/React 무관)
packages/geometry     말풍선 도형(RoundRect)·글꼴 자동맞춤 순수 함수 + 골든 테스트
packages/editor       Zustand 스토어 + 커맨드 + Pixi 엔진(./engine, 클라이언트 전용)
packages/config       공유 tsconfig
```

- `@repo/editor` 진입점은 **Pixi를 import하지 않는다**(SSR 안전). 엔진은 `@repo/editor/engine`에서
  `EditorCanvas`가 `useEffect` 안에서 동적 import 한다.
- 좌표 단위는 `.kfjson`과 동일(기본 페이지 832×1216 px). 화면은 스테이지 스케일로만 변환.

## 현재 동작(Phase 1 MVP)

- 페이지 생성/전환/크기/검정 배경, 다중 페이지
- 칸 구성 패턴(`"1,2,1"`) → 여백/간격 적용 직사각형 칸 배치, 선택·드래그·리사이즈(핸들)
- 이미지: 드래그&드롭 또는 파일 선택으로 칸에 배치, 칸 크롭, 휠 확대/축소, 드래그 이동
- 말풍선: 추가/드래그/리사이즈, 텍스트(글꼴 자동 축소), RoundRect(원↔사각) 모양, 채움/배경/외곽선 색
- 인스펙터: 작품/페이지/칸/이미지/말풍선 속성 + 리스트(추가·삭제·위로·아래로)
- 저장/불러오기: `.webtoon`(프로젝트+이미지 번들) / `.kfjson`(프로젝트만), **IndexedDB 자동저장 + 복원**
- PNG 내보내기(현재 페이지), 실행취소/다시실행(스냅샷)

이미지 자산은 브라우저에 파일시스템이 없으므로 OPFS 대신 **메모리+IndexedDB**에 보관하고,
`PanelImage.Path`를 `asset:<id>`로 재해석한다(데스크톱 `.kfjson` import 시 이미지 없으면 placeholder).

## 다음 단계(Phase 2~4) — PORTING_PROMPT 참고

- 말풍선 파리티: 구름/폭발·플래시·집중선·속도선·없음, 3점 곡선 꼬리, 외곽선 병합, 텍스트 아웃라인
- 칸·이미지 파리티: 사변형 모서리 모드, 픽셀 알파 히트테스트·클릭 순환, 자유 리사이즈·pivot
- 미디어: 애니메이션 GIF/WebP·동영상, 단축키, 색 선택기 최근색, 클립보드, 다중 페이지 zip 내보내기

## 알려진 dev 경고 (기능 무관)

개발 서버 콘솔에 `<Meta>` 컴포넌트의 `Cannot read properties of null (reading 'useContext')`가
보일 수 있다. 이는 **React Router v7 + pnpm + Vite dep-optimize**가 `react-dom`을 별도 패스로
사전번들하며 생기는 알려진 dev 전용 현상으로, 에디터 동작에는 영향이 없다. **프로덕션 빌드
(`pnpm build && pnpm --filter web start`)에는 나타나지 않는다.** `vite.config.ts`의
`resolve.dedupe`와 루트 `.npmrc`의 `node-linker=hoisted`로 완화돼 있다.

> 처음 화면에 이전 자동저장 데이터가 보이면 상단 **새 문서**로 초기화한다.
