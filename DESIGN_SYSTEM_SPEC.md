# KomaForge 디자인 시스템 명세서 (Claude Design System)

> **이 문서의 목적**: KomaForge 웹의 **비전·목표**를 정리하고, 거기에 맞는
> **디자인 시스템(Claude 디자인 언어 + shadcn/ui + Tailwind v4)** 과 **새 UI/UX 흐름**을 명세한다.
> 이 문서는 (a) 구현의 청사진이자 (b) claude.ai/design 디자인 에이전트에게 넘길 브리프다.
>
> **상태**: 확정 v1 (2026-06-19). §10 룩앤필 결정 7건 확정 — §3·§4·§7은 확정값 기준으로 작성됨.
> 관련 문서: [REDESIGN.md](./REDESIGN.md) · [PROGRESS.md](./PROGRESS.md) · [README.md](./README.md)

---

## 0. 이 문서를 쓰는 법 (consumers)

| 읽는 주체 | 보는 섹션 | 용도 |
|---|---|---|
| **구현 담당(나/엔지니어)** | §4 토큰, §5 아키텍처, §6 인벤토리, §8 로드맵 | `packages/ui` 생성 + shadcn 이식 |
| **claude.ai/design 에이전트** | §2 비전, §3 디자인 언어, §6 컴포넌트, §7 UX 흐름 | 진짜 컴포넌트로 화면/플로우 생성 |
| **결정권자(당신)** | §1 요약, §9 열린 결정 | 방향 확정·뒤집기 |

이 명세서는 **순서의 1단계**다:
`[1] 명세(이 문서) → [2] packages/ui 구현(shadcn) → [3] /design-sync → claude.ai/design`.

---

## 1. 한눈 요약 (TL;DR)

- **제품**: KomaForge — 브라우저에서 도는 **망가/웹툰 페이지 에디터**. C# WPF 원본의 도메인 모델과 `.kfjson` 포맷을 보존한 웹 포팅본. 렌더는 Pixi.js(WebGL), 앱은 React Router v7(SPA 정적 빌드).
- **디자인 방향(확정)**: **하이브리드** — 프로 에디터의 집중형 **다크 골격**을 유지하되, **Claude의 따뜻함과 완성도**(웜 뉴트럴 + 클레이/코랄 액센트 + 세리프 디스플레이)를 입힌다. shadcn 듀얼 테마로 **라이트("종이")** 모드도 제공(다크 기본).
- **기술 토대**: **shadcn/ui**(Radix + CVA) + **Tailwind v4** + **CSS 변수 토큰**. 컴포넌트를 확장 쉽고 유연하게.
- **캔버스는 예외**: 작업 정확도(색 판단)를 위해 **캔버스 배경은 크롬 테마와 무관하게 중립 다크 유지**. 작업물(페이지)은 항상 그대로.
- **새 UX**: 명령 팔레트(⌘K), 좌측 **툴 레일**, 상태 표시줄, 컨텍스트 인스펙터, 온보딩 빈 상태 — 도킹 워크스페이스(dockview)는 강점이라 유지하되 토큰으로 재테마.

---

## 2. 서비스 비전 & 목표

### 2.1 비전 (Vision)
> **"누구나, 브라우저만 있으면, 설치 없이 만화 한 페이지를 짠다."**
> 전문 만화 편집의 표현력은 지키되, 데스크톱 앱의 진입 장벽은 없앤다. 칸·말풍선·이미지·효과를
> 자유롭게 합성하고, 결과물을 자기 것으로 소유(`.webtoon`/`.kfjson`/PNG/ZIP/WebP)한다.

### 2.2 미션 (Mission)
- 원본 KomaForge의 **표현 파리티**(말풍선 도형·꼬리·집중선/속도선, 사변형 칸, 알파 히트테스트, 애니/동영상)를 웹에서 재현.
- **로컬-퍼스트·소유권**: 파일시스템 없는 브라우저에서 메모리+IndexedDB로 자동저장/복원, 포터블 번들로 내보내기. 서버 종속 없음.
- **데스크톱 호환**: `.kfjson` 직렬화 포맷 보존(모르는 키 무시 왕복).

### 2.3 타깃 사용자 (Personas)
1. **아마추어/취미 작가** — 클립스튜디오·포토샵 없이 가볍게 컷·말풍선을 짜고 싶은 사람. *주 사용자.*
2. **콜라주/밈 제작자** — 이미지를 칸 안팎으로 자유 배치, 말풍선 얹기.
3. **데스크톱 KomaForge 사용자** — 기존 `.kfjson`을 웹에서 열어 이어 작업.

### 2.4 제품 목표 (Goals) — 디자인이 책임질 것
| 목표 | 디자인적 의미 |
|---|---|
| **무설치·즉시성** | 첫 화면에서 30초 안에 첫 칸을 그린다 → 강한 온보딩·빈 상태·툴 레일 |
| **표현력 ≥ 데스크톱** | 깊은 속성을 다루되 압도하지 않는다 → 컨텍스트 인스펙터, 점진 공개(섹션 접기) |
| **집중(Focus)** | 캔버스가 주인공 → 어두운 중립 캔버스, 차분한 크롬, 절제된 색 |
| **소유·안심** | 자동저장·복원·내보내기가 항상 보임 → 명확한 상태 표시줄·토스트 피드백 |
| **확장 용이** | 기능이 계속 는다 → shadcn 기반 재사용 컴포넌트 + 토큰 |

### 2.5 안 할 것 (Non-goals)
- 실시간 협업/계정/클라우드 저장(현재 범위 밖). - 상업적 이용(라이선스: PolyForm Noncommercial). - 캔버스 자체를 DOM으로 재구현(렌더는 Pixi 유지).

### 2.6 디자인 원칙 (Principles) — Claude에서 빌려오는 것
1. **따뜻한 차분함(Warm calm)** — 차가운 블루-그레이 대신 웜 뉴트럴. 인간적이고 종이 같은 결.
2. **캔버스가 주인공(Canvas first)** — 크롬은 물러서고 작업물이 빛난다. 채도 높은 색은 액센트에만.
3. **점진 공개(Progressive disclosure)** — 선택한 대상에 필요한 컨트롤만. 섹션 접기·컨텍스트 인스펙터.
4. **조용한 자신감(Quiet confidence)** — 장식 최소, 여백·타이포·정렬로 품질을 낸다.
5. **즉각적 피드백(Tactile feedback)** — 모든 조작에 즉시 시각/토스트 반응. 실행취소는 신성.
6. **접근성 기본값(Accessible by default)** — Radix 기반 키보드/포커스/대비 보장.

---

## 3. 디자인 언어 (Claude-inspired)

### 3.1 무드 보드
- **Anthropic/Claude 톤**: 웜 아이보리·크림, 클레이/코랄 액센트, 세리프 디스플레이(Copernicus 류)와 깔끔한 산세리프 본문, 넉넉한 여백, 부드럽지만 과하지 않은 라운드.
- **프로 에디터 규율**: Figma/포토샵/클립스튜디오의 고밀도 패널·아이콘 툴·도킹.
- **합성(이 제품의 정체성)**: *"Claude가 만든 프로 만화 에디터"* — 따뜻한 다크 워크스페이스 + 정확한 작업 캔버스.

### 3.2 라이트/다크 전략 (확정)
- **다크("스튜디오")** = 1차 기본·출시 기준. 작업 집중·장시간 사용.
- **라이트("종이")** = shadcn 듀얼 테마로 토큰 완비, 토글 제공. 밝은 환경·접근성. 마감 QA는 Phase C 이후.
- **캔버스 배경은 테마와 분리** — 색 판단 정확도 위해 항상 중립 다크(엔진 `#0e0e11` 유지). 페이지 작업물은 불변.

---

## 4. 디자인 토큰 (shadcn / Tailwind v4) — 확정값

> shadcn 관례대로 **시맨틱 CSS 변수**를 `:root`(라이트) / `.dark`(다크)에 정의하고
> Tailwind v4 `@theme inline`으로 매핑한다. 아래는 **확정 팔레트**(웜 뉴트럴 + Claude 클레이).
> 표기는 가독성 위해 hex. (shadcn 정식은 oklch — 기계적 변환 가능.) 단일 진실원 = `@repo/ui/styles.css`.

### 4.1 컬러 — 다크("스튜디오", 기본)
| shadcn 변수 | 값 | 기존 토큰(현행) | 용도 |
|---|---|---|---|
| `--background` | `#1a1815` | `--color-bg #0e0e11` | 앱 바닥(웜 니어블랙) |
| `--card` / `--popover` | `#211f1b` | `--color-surface #17171b` | 패널·툴바·헤더 |
| `--secondary` / `--muted` | `#2d2a25` | `--color-raised #202026` | hover·raised·입력 배경 |
| `--border` / `--input` | `#3a352e` | `--color-line #2a2a31` | 보더·구분선 |
| `--foreground` | `#ece8e1` | `--color-ink #e8e8ec` | 본문 텍스트(웜 잉크) |
| `--muted-foreground` | `#a8a199` | `--color-ink-muted` | 보조 텍스트 |
| (faint) `--muted-foreground/55` | `#6e685f` | `--color-ink-faint` | 흐린 텍스트·플레이스홀더 |
| `--primary` | `#cc785c` | `--color-accent #3a9690` | **Claude 클레이** 액센트 |
| `--primary` (hover) | `#d68b71` | `--color-accent-hover` | 액센트 hover |
| `--primary-foreground` | `#fdf6f2` | — | 클레이 위 텍스트 |
| `--ring` | `#cc785c` | — | 포커스 링 |
| `--destructive` | `#d96a5f` | (red-500) | 삭제·위험(웜 레드) |
| `--accent` (subtle bg) | `color-mix(in srgb, #cc785c 16%, transparent)` | `accent/15` | 선택 행 배경 |

### 4.2 컬러 — 라이트("종이")
| shadcn 변수 | 값 | 용도 |
|---|---|---|
| `--background` | `#faf8f3` | 종이 바닥 |
| `--card` / `--popover` | `#ffffff` | 패널 |
| `--secondary` / `--muted` | `#f1ede4` | raised·입력 |
| `--border` / `--input` | `#e7e1d6` | 보더 |
| `--foreground` | `#2a2521` | 본문(웜 잉크) |
| `--muted-foreground` | `#6b6358` | 보조 |
| (faint) | `#978d7f` | 흐린 텍스트 |
| `--primary` | `#bd5d3c` | 클레이(라이트 대비 상향) |
| `--primary` (hover) | `#a94f31` | 액센트 hover |
| `--primary-foreground` | `#ffffff` | 클레이 위 텍스트 |
| `--ring` | `#bd5d3c` | 포커스 |
| `--destructive` | `#c0392b` | 삭제·위험 |

### 4.3 캔버스(엔진, 테마 무관)
`--canvas-bg: #0e0e11` · 선택 핸들/스냅 가이드/꼬리 핸들 색은 엔진 상수 유지. (Pixi `background`는 `packages/editor/src/engine/index.ts`.)

### 4.4 타이포그래피 (확정)
| 역할 | 글꼴(확정) | 폴백 | 비고 |
|---|---|---|---|
| **디스플레이/브랜드** | `Fraunces` (variable, async) | `ui-serif, Georgia, serif` | 브랜드 워드마크·온보딩 헤드라인만. 본문 아님 |
| **UI/본문** | **system-ui (무페이로드)** | `-apple-system, "Segoe UI", Roboto, sans-serif` | 즉시성 우선. `Inter`는 선택적 업그레이드 |
| **수치/좌표** | `ui-monospace` 스택 | `SFMono-Regular, Menlo, monospace` | 탭ular. `Geist Mono`는 선택 |

- 스케일(Tailwind): UI는 `text-xs`(11–12px)~`text-sm` 중심(현행 유지, 고밀도). 디스플레이만 `text-lg`+.
- **본문 = system-ui 유지(폰트 다운로드 0)** → "무설치·즉시성" 목표 보호. **세리프는 Fraunces 1종만** 비동기(`font-display: swap`)로, 브랜드/온보딩에 한정 → 폴백이 system-serif라 로드 실패해도 깨지지 않음. 자가호스팅 위치 `apps/web/app/fonts/`.

### 4.5 라운드 / 스페이싱 / 그림자 / 모션
- `--radius: 0.625rem`(10px) 기준 → shadcn `sm/md/lg/xl` 파생. 현행 `rounded-md/lg`와 호환.
- 스페이싱: Tailwind 4px 그리드. 패널 내 간격 `gap-2`(8px) 기본(현행 유지).
- 그림자: 다크에선 거의 안 씀(보더로 위계). 플로팅(팝오버/다이얼로그)만 `shadow-lg`.
- 모션: `transition-colors 150ms`(현행) 표준. 패널/다이얼로그 진입은 Radix 기본 + `ease-out 120–180ms`. **과한 애니 금지**(에디터는 즉시성 우선).

---

## 5. 컴포넌트 아키텍처 (shadcn/ui + Tailwind v4)

### 5.1 패키징 — `@repo/ui` 신설 (design-sync 전제)
현재 UI는 `apps/web` 안에 있다. **재사용·확장·동기화**를 위해 디자인 시스템을 **별도 패키지**로 뺀다:

```
packages/ui/
  src/
    components/   shadcn 컴포넌트(button, input, select, slider, dialog, ...)
    blocks/       에디터 합성 컴포넌트(Section, ListRow, PropertyRow, ColorField, Toolbar, ...)
    lib/cn.ts     clsx + tailwind-merge
    styles.css    @import "tailwindcss" + 토큰(:root/.dark) + @theme inline   ← 단일 진실원
    index.ts      배럴 export
  components.json shadcn 설정(tailwind v4, css 변수)
  package.json    exports "." + "./styles.css"; build → dist/ (tsup/esbuild)
  tsup.config.ts  ESM dist + d.ts   ← design-sync가 dist/를 번들
```

- **신규 의존성**: `@radix-ui/*`(필요분), `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`(이미 있음), `sonner`(토스트), `cmdk`(명령 팔레트), `react-colorful`(컬러피커, 선택).
- `apps/web`는 `@repo/ui`에서 import. 토큰은 `@repo/ui/styles.css` 하나로 관리(app.css는 import만).
- **빌드 산출물 `dist/`** 가 있어야 §[3] design-sync가 동작한다(현재 없음).

### 5.2 테마링
- shadcn CSS 변수 + `next-themes` 류 대신 **경량 테마 토글**(클래스 `.dark` 토글 + localStorage). RR7 SSR이라 `<ClientOnly>`/no-flash 가드.
- 변형은 **CVA**로: `Button({variant, size})` 등. 새 변형 추가가 곧 확장.

### 5.3 SSR/클라이언트 경계 (현행 규약 유지)
- Pixi/dockview/cmdk 등 DOM 전용은 `<ClientOnly>` 안에서. `@repo/editor` 진입점은 Pixi import 금지(엔진은 `@repo/editor/engine` 동적 import) — **현 아키텍처 그대로**.

---

## 6. 컴포넌트 인벤토리 (현행 → shadcn 매핑)

> 현행은 `apps/web/app/components/ui.tsx`의 임시 프리미티브. shadcn 도입 시 아래로 대체/이식.

### 6.1 프리미티브 (shadcn 표준)
| 현행(ui.tsx) | shadcn | 비고 |
|---|---|---|
| `Btn`, `ToolButton` | `Button` (variant: default/secondary/ghost/outline/destructive, size: sm/icon) | ToolButton = ghost + 아이콘 |
| `IconBtn` | `Button size="icon" variant="ghost/outline"` + `Tooltip` | danger = destructive |
| `TextInput` | `Input` | onFocus=checkpoint 콜백 유지 |
| `NumberInput` | `Input type=number` 또는 신규 `NumberField`(스텝퍼) | 좌표/치수 |
| `Select` | `Select`(Radix) | |
| `Slider` | `Slider`(Radix) | |
| `Check` | `Checkbox` + `Label` | |
| `Section`(접기) | `Collapsible` 기반 `Section` 블록 | chevron·제목 유지 |
| `Row` / `Field` | `Label` + 레이아웃 헬퍼(블록 유지) | |
| `ListRow` | CVA 기반 신규(`Button` 토대) | active ring·잠금 아이콘 |
| `EmptyState` | 신규(shadcn 없음) | 온보딩·빈 인스펙터 |
| `ColorInput`(최근색) | `Popover` + `react-colorful` + 최근색 스와치 | localStorage 공유 유지 |

### 6.2 셸/네비 (신규 도입)
| 영역 | shadcn | 메모 |
|---|---|---|
| 상단 메뉴(파일/편집/내보내기) | `Menubar` 또는 `DropdownMenu` | 현 평면 툴바를 그룹화 |
| 아이콘 툴버튼 묶음 | `ToggleGroup` + `Tooltip` + `Separator` | |
| **명령 팔레트 ⌘K** | `Command`(cmdk) + `Dialog` | 모든 액션 검색(신규 UX) |
| 인스펙터 브레드크럼 | `Breadcrumb` | "1번 칸 › 말풍선 1"(현행 텍스트 대체) |
| 단축키 다이얼로그 | `Dialog` + 신규 `Kbd` | 리바인딩 행 |
| 알림(현 `alert()`) | `Sonner`(toast) | "내보낼 내용 없음" 등 |
| 스크롤 영역 | `ScrollArea` | 인스펙터/페이지 패널 |
| 선택 종류별 탭 | `Tabs`(선택) | 인스펙터 섹션 전환 |

### 6.3 에디터 블록 (CVA 기반 합성, `@repo/ui/blocks`)
`PanelHeader` · `Section`(접기) · `ListRow`/`TreeItem` · `PropertyRow`(라벨+컨트롤) · `NumberField`(스텝퍼) · `ColorField`(최근색) · `KeycapInput`(리바인딩 캡처) · `EmptyState` · `Toolbar`/`ToolButton` · `StatusBar`.

### 6.4 유지(교체 안 함)
- **dockview** 도킹 — shadcn에 대체재 없음. `styles/dockview-theme.css`를 토큰 변수로 재매핑(현행 방식 유지).
- **Pixi 캔버스 엔진** — 렌더는 그대로. UI 토큰과 무관.

---

## 7. 새 UI/UX 흐름 (rewrite) — 확정

### 7.1 정보 구조 (레이아웃)
```
┌─────────────────────────────────────────────────────────────┐
│ TopBar: 브랜드 · 파일/편집 메뉴 · ⌘K · 내보내기 · 테마토글 · 레이아웃 │  h-11
├──┬──────────────┬───────────────────────────────┬───────────┤
│T │ Pages 패널    │                               │ Inspector │
│o │ (작품/페이지   │          Canvas (Pixi)         │ (컨텍스트) │
│o │  트리)         │       중립 다크 워크스페이스      │  브레드크럼 │
│l │              │                               │  +섹션     │
│ R│              │                               │           │
├──┴──────────────┴───────────────────────────────┴───────────┤
│ StatusBar: 줌% · 페이지 N/총 · 선택 좌표/치수 · 자동저장 상태      │  h-7
└─────────────────────────────────────────────────────────────┘
```
- **좌측 툴 레일(신규)**: 선택/이동·칸 추가·말풍선 추가·이미지·텍스트·줌 — 프로 에디터 필수, 현재 없음. 세로 아이콘 바(`ToggleGroup`).
- **상태 표시줄(신규)**: 줌·페이지 인덱스·선택 치수·자동저장 표시 — 소유·안심 목표.
- 도킹은 유지: 패널 부유/탭/닫기 + 레이아웃 localStorage 저장/복원/초기화(현행 `lib/workspace.ts`).

### 7.2 핵심 플로우
1. **온보딩(빈 상태)**: 첫 진입 → 캔버스에 "새 페이지 만들기 / 불러오기 / 예시 열기" CTA(EmptyState). 이전 자동저장 있으면 "이어서 / 새로 시작" 선택.
2. **첫 칸 그리기**: 툴 레일 칸 도구 → 칸 구성 패턴 입력 또는 드래그 → 인스펙터에서 여백/간격.
3. **이미지 배치**: 드래그&드롭/파일선택 → 칸에 배치, 휠 줌·크롭 토글.
4. **말풍선·텍스트**: 추가 → 텍스트 입력(자동 축소) → 모양/꼬리/색.
5. **명령 팔레트(⌘K)**: 모든 액션 검색 실행(발견성↑) — "새 문서", "PNG 내보내기", "레이아웃 초기화" 등.
6. **내보내기**: 상단 내보내기 메뉴(`DropdownMenu`) → PNG/ZIP/WebP/.webtoon/.kfjson + 배수(1×/2×/3×). 완료 토스트.

### 7.3 상호작용 규약(유지)
- 클릭=최상단 선택, 같은 지점 재클릭=다음 후보 순환(엔진 `pressAt`). 단축키(Ctrl=Cmd), 실행취소/다시실행, 최근색 — 현행 동작 보존, **외형만 재작성**.

---

## 8. claude.ai/design 연동 경로 (design-sync)

### 8.1 design-sync가 요구하는 전제
design-sync는 **빌드된 디자인 시스템(`dist/`)** 을 claude.ai/design에 올린다(*"고객이 이미 만든 걸 싣는다"*). 따라서 **§5의 `@repo/ui`가 빌드 가능해야** 동작한다. 두 가지 "shape":
- **package shape**: Storybook 없이 `dist/` + 사용 예시로 프리뷰 작성(절대 평가 루브릭). *최소 경로.*
- **storybook shape**: `@repo/ui`에 Storybook 추가 → 실제 스토리 렌더로 고충실 프리뷰 검증. *권장(품질↑).*

### 8.2 권장 순서
1. **§8 이전(필수)**: `@repo/ui` 생성 → shadcn 컴포넌트 이식 → 토큰 적용 → `tsup`로 `dist/` 빌드.
2. (권장) `@repo/ui`에 **Storybook** + 각 컴포넌트 스토리.
3. **`/design-sync` 실행** → 새 claude.ai/design 프로젝트 생성 → 컴포넌트 업로드(고충실 검증).
4. claude.ai/design **디자인 에이전트**에게 §7 새 UX 흐름을 진짜 컴포넌트로 그리게 요청.
5. `.design-sync/conventions.md` 작성(에이전트용 사용 규약: 래핑/프로바이더·토큰 클래스 어휘·진실의 위치·예시 1개). → 에이전트가 컴포넌트를 오용 없이 사용.

### 8.3 지금은 안 되는 이유(명확화)
- `.design-sync/` 없음 · shadcn 없음 · Storybook 없음 · DS 패키지 `dist/` 없음 → **올릴 대상이 없다.** §8.2의 1–2가 끝나야 3이 의미 있다.

---

## 9. 실행 로드맵 (phased)

각 단계 끝: `pnpm typecheck`(7/7) · `pnpm test`(49) · `pnpm build` 그린 유지 + 시각 확인.

- **Phase A — 토대**: `packages/ui` 생성, Tailwind v4 + shadcn(Radix/CVA/clsx/tailwind-merge) 설치, §4 토큰을 `styles.css`(:root/.dark)에 정의, 테마 토글(라이트/다크), `cn()`.
- **Phase B — 프리미티브 파리티**: §6.1 매핑대로 Button/Input/Select/Slider/Checkbox/Collapsible(Section)/ListRow/Field/ColorField/EmptyState/Tooltip/Dialog/DropdownMenu/Menubar/Command/Breadcrumb/Sonner/ScrollArea/Separator 이식. `apps/web`가 `@repo/ui` 사용하도록 전환. dockview 테마 토큰 재매핑.
- **Phase C — UX 흐름 재작성**: TopBar(메뉴+⌘K+테마+내보내기), **툴 레일**, **상태 표시줄**, 컨텍스트 인스펙터(브레드크럼), 온보딩 빈 상태.
- **Phase D — 동기화 준비**: `@repo/ui` `dist/` 빌드(tsup), (권장)Storybook + 스토리, `conventions.md` 초안.
- **Phase E — /design-sync**: claude.ai/design 새 프로젝트로 업로드 → 에이전트로 플로우 재설계.

---

## 10. 확정된 룩앤필 결정 (2026-06-19)

> "현재 기능에 가장 적합한 룩앤필로 정해 달라"는 위임에 따라 아래 7건을 확정.
> §3·§4·§7 본문은 이 확정값 기준으로 작성됨(🔶 플래그 제거).

| # | 결정 | **확정값** | 근거 |
|---|---|---|---|
| 1 | 정체성/무드 | **하이브리드** — 다크 에디터 골격 + Claude 따뜻함 | 캔버스가 주인공인 장시간 편집 도구 → 다크가 정답. Claude 웜 뉴트럴·클레이로 차별 인상 |
| 2 | 색 모드 | **듀얼**(다크 기본 출시, 라이트 토큰 완비) | shadcn 듀얼이 거의 공짜. 다크 우선, 라이트는 접근성/밝은 환경. 캔버스는 테마와 분리 |
| 3 | 액센트 | **Claude 클레이 `#cc785c`** (teal `#3a9690` 대체) | 따뜻함·인간미. 채도는 액센트에만 한정 → 캔버스 색 판단 방해 없음 |
| 4 | 세리프 | **절제 도입** — 브랜드 워드마크·온보딩 헤드라인만(Fraunces, async) | Claude 시그니처. 본문은 system-ui 유지 → 즉시성(무설치) 훼손 없음 |
| 5 | DS 패키지화 | **`@repo/ui` 별도 패키지** | 재사용·확장 + design-sync 전제 |
| 6 | UX 신규 요소 | **툴 레일 + ⌘K 명령 팔레트 + 상태 표시줄** (Phase C) | 프로 에디터 표준·발견성·안심. 현 기능 위에 얹는 셸 |
| 7 | Storybook | **도입** (Phase D) | 고충실 design-sync 프리뷰. DS의 올바른 집 |

> **다음 액션** → §9 Phase A 착수(`@repo/ui` + shadcn 토대) 또는 본 명세서를 그대로 claude.ai/design 요청 브리프로 사용.

---

## 11. 구현 노트 — Phase A 완료 (2026-06-20)

> `@repo/ui` 토대를 깔고 토큰/테마를 적용함. **typecheck 9/9 · test 통과 · 프로덕션 빌드 그린**으로 검증.

### 11.1 한 것
- **`packages/ui` 신설**(JIT 소스 패키지, 기존 `@repo/core`/`editor`와 동일 패턴). exports `.`(배럴) + `./styles.css`. 빌드 no-op(tsup는 Phase D).
- **deps**: `clsx` · `tailwind-merge`(^3, Tailwind v4 호환) · `class-variance-authority` · `lucide-react`. react/react-dom = peer.
- **`src/styles.css` = 토큰 단일 진실원**: §4 확정 팔레트를 raw 토큰(`--background` 등)으로 정의, 다크=`:root`(기본)·라이트=`.light`. `@theme`로 shadcn 시맨틱 + 레거시 브리지 유틸 생성.
- **`src/lib/cn.ts`**(clsx+twMerge), **`src/lib/theme.tsx`**(`useTheme`/`setTheme`/`toggleTheme`/`themeScript`, `useSyncExternalStore` 패턴), **`src/components/theme-toggle.tsx`**.
- **앱 배선**: `app.css`가 `@import "tailwindcss"` → `@import "@repo/ui/styles.css"`. `root.tsx`에 FOUC 방지 인라인 `themeScript` + `<html suppressHydrationWarning>`. `MenuBar`에 `<ThemeToggle/>`.

### 11.2 핵심 결정 (Phase B가 알아야 할 함정)
1. **비-inline `@theme` (shadcn 표준 `@theme inline` 아님)**: 현행 코드가 `var(--color-bg)`·`var(--color-accent)` 등을 **직접** 참조하고(특히 `dockview-theme.css`) 네이티브 `accent-color`도 var를 쓴다. `@theme inline`은 `--color-*`를 `:root`에 emit하지 않아 이들이 깨진다. → 비-inline으로 `--color-*`를 실제 emit. 빌드 CSS에서 `--color-bg/surface/accent/ink/foreground` emit 확인됨.
2. **기본 다크 = `:root`, 라이트 = `.light`**(shadcn 표준 `:root`=light/`.dark`=dark의 **반전**). 이유: 다크가 출시 기본이라 클래스 없이 즉시 다크 → **FOUC·하이드레이션 불일치 0**. 저장값 light일 때만 인라인 스크립트가 `.light` 추가. `@custom-variant dark`는 `html:not(.light)`로 정의해 shadcn 스니펫의 `dark:` 변형도 기본 상태에서 동작.
3. **⚠️ `accent` 토큰 충돌 (Phase B 필수 정리)**: 현행 앱은 `text-accent`/`bg-accent/15`/`ring-accent`/`border-accent`를 **브랜드 색**으로 쓴다. 표준 shadcn은 `accent`를 **subtle bg**(ghost hover 등)로 쓴다. Phase A는 비파괴 위해 `--color-accent: var(--primary)`(=클레이)로 두었다. **Phase B에서 shadcn 컴포넌트(Button 등) 도입 시**: 기존 `*-accent` 사용처를 `*-primary`로 이관 → `accent`를 shadcn subtle 의미로 되돌린다. (`--color-primary`는 미사용이라 현재 트리셰이크되어 빌드에 없음 → `bg-primary` 첫 사용 시 자동 emit.)
4. **레거시 브리지 유지**: `--color-{bg,surface,raised,line,ink,ink-muted,ink-faint,paper,panel,accent-hover}` 전부 raw 토큰으로 매핑 → 현행 컴포넌트·dockview 무수정으로 따뜻한 팔레트 적용. Phase B에서 점진적으로 shadcn 시맨틱(`bg-background`/`bg-card`/`text-foreground`…)으로 이관하며 브리지 축소.

### 11.3 시각 확인(사용자) 권장
Pixi 기본 ticker 때문에 자동 스크린샷이 막힘(`document_idle` 미도달). **눈 확인 1회**: `pnpm dev` → ① 전체 크롬이 웜 다크 + 클레이 액센트로 보이는지 ② 우상단 해/달 토글로 라이트("종이") 전환·새로고침 유지 ③ dockview 패널/선택 링이 클레이인지.

### 11.4 다음(Phase B) 진입점
§6.1 매핑대로 shadcn 컴포넌트를 `@repo/ui/src/components`에 추가(Button부터, CVA 변형). 추가 즉시 §11.2-3의 `accent`→`primary` 이관을 함께 처리. `apps/web`가 `@repo/ui` 프리미티브를 쓰도록 `ui.tsx`를 점진 대체.

---

## 12. 구현 노트 — Phase B 완료 (2026-06-20)

> shadcn 프리미티브 라이브러리 구축 + 앱 연결 + `accent` 토큰 정리. **typecheck 9/9 · test 49 · 빌드 그린**, 빌드 CSS 검증 완료.

### 12.1 한 것
- **shadcn 프리미티브 14종**(`@repo/ui/src/components`): `Button`(CVA 6변형×4크기)·`Badge`·`Input`·`Textarea`·`Label`·`Separator`·`Checkbox`·`Slider`·`Select`·`Tooltip`·`Dialog`·`DropdownMenu`·`ScrollArea`·`Collapsible`·`Popover`. Radix 12개 + `tw-animate-css` 도입.
- **에디터 블록 7종**(`@repo/ui/src/blocks`): `Section`(Collapsible)·`ListRow`·`Field`/`Row`·`IconButton`(+Tooltip)·`EmptyState`·`Kbd`·`ColorField`(프레젠테이셔널, 최근색 props 주입).
- **앱 연결**: `apps/web/.../ui.tsx`를 **얇은 어댑터**로 재작성 — 기존 13개 export 시그니처(`Btn`/`IconBtn`/`TextInput`/`NumberInput`/`Slider`/`Select`/`Check`/`ColorInput` + 재노출 `Section`/`Row`/`Field`/`ListRow`/`EmptyState`) 그대로 유지하며 내부만 `@repo/ui`로 위임. **Inspector·패널·MenuBar 무수정**. checkpoint(undo 코얼레싱)·최근색 스토어 배선은 앱에 유지.
- **`accent`→`primary` 이관 완료**(§11.2-3 해소): `MenuBar`(워드마크)·`Inspector`(꼬리 탭)·`ShortcutsDialog`(2)·`ui.tsx`(Section/ListRow/Check) 브랜드 사용처를 `primary`로. `--color-accent`는 shadcn 표준 **subtle bg**(`var(--accent)`)로 환원 → ghost/outline hover, select/dropdown focus에 사용. (빌드 CSS에서 `--color-accent:var(--accent)`, `.hover\:bg-accent`, `.focus\:bg-accent` 생성 확인.)
- **dockview 견고화**: `dockview-theme.css`를 `--color-*`(트리셰이크 가능) → **raw 토큰**(`--background`/`--card`/`--primary`…)으로 전환 → 항상 정의 + 테마 스왑 추종.

### 12.2 결정/주의
- **비-inline `@theme` 유지로 인한 트리셰이크**: Tailwind v4는 **미사용 `--color-*`를 :root에서 제거**한다. CSS/인라인에서 `var(--color-x)`를 **직접** 쓰려면 그 유틸(`bg-x` 등)이 어딘가 쓰여야 emit된다. → **직접 var 참조는 항상 raw 토큰(`--primary` 등) 사용**(dockview가 그 예). 유틸 클래스는 `--color-*` 그대로 OK.
- **IconButton 툴팁**: 인스턴스마다 `TooltipProvider`(delay 300) 래핑 — 앱 전역 Provider 불필요. disabled 버튼은 hover 이벤트가 없어 툴팁 미표시(원본 native title과 동일 수준).
- **Slider checkpoint**: Radix는 native focus가 없어 `onPointerDown={checkpoint}`로 드래그 1회 코얼레싱.

### 12.3 다음
- **Phase C**(UX 셸): TopBar(Menubar+⌘K Command+DropdownMenu 내보내기)·툴 레일·상태 표시줄·온보딩. 새 셸은 위 프리미티브로 조립.
- **Phase D**(동기화 준비): `@repo/ui` `dist` 빌드(tsup) 또는 Storybook + 스토리 → 고충실 design-sync.
- **design-sync**: 이제 22개 컴포넌트 + 토큰이 있어 **실행 가능**(package shape). Storybook 추가 시 프리뷰 충실도↑.
