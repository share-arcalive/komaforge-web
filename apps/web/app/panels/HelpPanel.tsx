import type { IDockviewPanelProps } from "dockview";

/**
 * 앱 내 "사용법" — 도킹 탭으로 상주(모달 아님). 상단 툴바 "사용법" 버튼이 이 패널을 연다.
 * 페이지(세로 스트립), 사다리꼴 칸, 말풍선 모양/크기, 자동 생성 파이프라인까지 안내.
 */
export function HelpPanel(_props: IDockviewPanelProps) {
  return (
    <div className="h-full overflow-y-auto bg-surface text-ink">
      <div className="mx-auto flex max-w-[680px] flex-col gap-4 px-5 py-5 text-[13px] leading-relaxed">
        <div>
          <div className="text-[15px] font-semibold text-ink">KomaForge 사용법</div>
          <p className="mt-1 text-ink-muted">
            브라우저에서 만화 페이지를 만드는 에디터입니다. 설치·로그인 없이 바로 쓰고, 파일로
            저장하거나 이미지로 내보낼 수 있어요. 왼쪽 <b>페이지</b>, 가운데 <b>캔버스</b>, 오른쪽 <b>속성</b>
            패널로 편집합니다.
          </p>
        </div>

        <Section title="1 · 시작하기">
          <Row k="새 문서">
            <b>새 문서</b>에서 페이지 수(4·8·12·16)와 폭을 고릅니다. 페이지는 세로로 이어져 한 편처럼 보입니다.
          </Row>
          <Row k="칸 구성">
            페이지를 클릭 → 속성의 <b>칸 구성</b>에 <Code>1,2,1</Code>처럼 입력하고 <b>구성</b>. 숫자는 행별 칸 수.
          </Row>
          <Row k="이미지">
            칸에 이미지 파일을 <b>드래그&드롭</b>, 또는 속성에서 <b>이미지 추가</b>. 선택 후 <b>휠</b>로 확대/축소.
          </Row>
          <Row k="말풍선">
            속성에서 <b>말풍선 추가</b> → 대사·모양·색 편집.
          </Row>
        </Section>

        <Section title="2 · 페이지 (세로 스트립)">
          <Row k="폭">가로 폭은 <b>모든 페이지 공통</b>(690–1500px). 속성 상단 슬라이더로 조절.</Row>
          <Row k="높이">페이지마다 <b>세로 높이</b>를 다르게 줘서 완급을 만듭니다. 페이지 아래 손잡이를 끌거나 속성에서 입력.</Row>
          <Row k="순서">페이지 목록에서 <b>복제·위/아래 이동·삭제</b>. 목록을 클릭하면 그 페이지로 스크롤.</Row>
        </Section>

        <Section title="3 · 칸 (모양도 바뀝니다)">
          <Row k="사다리꼴">
            속성의 <b>사변형 모서리</b>를 켜면 칸이 직사각형에서 벗어나 <b>사다리꼴·평행사변형</b>이 됩니다.
            캔버스의 네 모서리 핸들을 끌어 조절. 이미지도 그 모양으로 잘립니다. <b>모서리 초기화</b>로 되돌림.
          </Row>
          <Row k="배경·테두리">배경/테두리 표시와 색을 끄고 켤 수 있어요. 배경을 끄면 아래 칸이 비칩니다.</Row>
        </Section>

        <Section title="4 · 말풍선 (모양·크기 다 다르게)">
          <Row k="모양">
            원/사각(RoundRect), 구름·폭발(CloudExplosion), 플래시(Flash), <b>집중선</b>(ConcentrationLines),
            <b>속도선</b>(EffectLines), 테두리 없음(None). 속성의 <b>모양 갤러리</b>에서 선택.
          </Row>
          <Row k="세부">
            모양마다 슬라이더 뜻이 달라요 — 개수/강도/불규칙도, 속도선은 <b>방향(0~360°)</b>, 집중선은 중앙 페이드.
          </Row>
          <Row k="글자·색">글자 크기(칸에 맞게 자동 축소)·정렬·외곽선·회전, 그리고 글자색·풍선 채움·테두리색.</Row>
          <Row k="꼬리">없음/일반/안쪽/생각 4가지. 시작·중간·끝 점과 굵기 조절.</Row>
        </Section>

        <Section title="5 · 저장 · 내보내기">
          <Row k="저장(.koma)">프로젝트 + 이미지까지 한 파일로. 다시 <b>불러오기</b>하면 그대로 복원(자동저장도 됨).</Row>
          <Row k=".kfjson">프로젝트만(이미지 제외). <b>데스크톱 원본 KomaForge</b>와 호환.</Row>
          <Row k="이미지">현재 페이지 <b>PNG</b> · <b>스트립 PNG</b>(전체 이어붙임) · 전 페이지 <b>ZIP</b> · 움직이는 <b>WebP</b> · <b>대본</b>(.txt).</Row>
        </Section>

        <div className="mt-1 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-faint">
          원작 <b>KomaForge</b> © unknowndevdot(흑우) ·{" "}
          <a
            href="https://github.com/unknowndevdot/KomaForge"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            원본 저장소
          </a>{" "}
          · 라이선스 <b>PolyForm Noncommercial 1.0.0</b> (비상업적 용도만).
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h4 className="text-[13px] font-semibold text-primary">{title}</h4>
      <div className="flex flex-col gap-1">{children}</div>
    </section>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[76px_1fr] gap-2">
      <span className="text-ink-muted">{k}</span>
      <span>{children}</span>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-raised px-1 py-0.5 text-[11px] text-ink">{children}</code>;
}
