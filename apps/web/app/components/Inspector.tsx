import { useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Image as ImageIcon,
  MessageSquare,
  Plus,
  Rows3,
  Square,
  Trash2,
  X,
} from "lucide-react";
import {
  addBubble,
  addCut,
  addImageFromAsset,
  applyLayoutCmd,
  clearSelection,
  currentPage,
  deleteSelection,
  duplicateCut,
  editorStore,
  fileToAsset,
  findBubble,
  findImage,
  findPanel,
  getAssetByPath,
  isVideoFile,
  renamePage,
  reorderSelected,
  select,
  setAutoGutter,
  setAutoMargin,
  setBlackBackground,
  setCutHeight,
  setPageBackgroundColor,
  updateSelectedBubble,
  updateSelectedImage,
  updateSelectedPanel,
  usePageIndex,
  useRev,
  useSelection,
} from "@repo/editor";
import type {
  BubbleTailData,
  ComicPageData,
  ComicPanelData,
  ComicProjectData,
  PanelImageData,
  SpeechBubbleData,
} from "@repo/core";
import type { Selection } from "@repo/editor";
import {
  Btn,
  Check,
  ColorInput,
  EmptyState,
  Field,
  IconBtn,
  ListRow,
  NumberInput,
  Row,
  Section,
  Slider,
  TextInput,
} from "./ui";
import { BubbleShapeGallery, TailGallery, tailVariantOf, tailVariantPatch } from "./gallery";

// 도형마다 개수/강도 슬라이더의 의미가 다르므로 라벨을 바꿔 준다.
function shapeLabels(shape: SpeechBubbleData["Shape"]): { count: string; strength: string } {
  switch (shape) {
    case "Flash":
      return { count: "가시 수", strength: "가시 길이" };
    case "CloudExplosion":
      return { count: "돌기 수", strength: "볼록↔오목" };
    case "ConcentrationLines":
      return { count: "선 수(×10)", strength: "중앙 페이드" };
    case "EffectLines":
      return { count: "선 수(×10)", strength: "방향(0~360°)" };
    default:
      return { count: "개수", strength: "강도" };
  }
}

type GradDir = "None" | "Top" | "Bottom" | "Left" | "Right";
const GRADIENT_DIR_OPTIONS: { value: GradDir; label: string }[] = [
  { value: "None", label: "없음" },
  { value: "Top", label: "위" },
  { value: "Bottom", label: "아래" },
  { value: "Left", label: "왼쪽" },
  { value: "Right", label: "오른쪽" },
];

type TextAlign = "Left" | "Center" | "Right";
type VAlign = "Top" | "Center" | "Bottom";
const ALIGN_OPTIONS: { value: TextAlign; label: string }[] = [
  { value: "Left", label: "왼쪽" },
  { value: "Center", label: "가운데" },
  { value: "Right", label: "오른쪽" },
];
const VALIGN_OPTIONS: { value: VAlign; label: string }[] = [
  { value: "Top", label: "위" },
  { value: "Center", label: "가운데" },
  { value: "Bottom", label: "아래" },
];

const FONT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "기본(고딕)" },
  { value: "serif", label: "명조" },
  { value: "monospace", label: "고정폭" },
  { value: "cursive", label: "손글씨" },
];

const checkpoint = () => editorStore.getState().checkpoint();

// 동영상 또는 애니메이션 가능한 이미지(gif/webp/apng)면 출력 타이밍 입력을 보여 준다.
function isAnimatableImage(path: string): boolean {
  const asset = getAssetByPath(path);
  if (!asset) return false;
  if (asset.kind === "video") return true;
  const url = asset.dataUrl || "";
  return /^data:image\/(gif|webp|apng|png)/i.test(url);
}

/* ---------- 공통: 선택 헤더(브레드크럼 + 액션) ---------- */

function SelectionHeader({
  crumb,
  onCrumbClick,
}: {
  crumb: React.ReactNode;
  onCrumbClick?: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-line bg-surface px-2.5 py-2">
      {onCrumbClick ? (
        <button
          type="button"
          onClick={onCrumbClick}
          className="min-w-0 flex-1 truncate text-left text-xs font-semibold hover:text-primary"
          title="상위 선택으로"
        >
          {crumb}
        </button>
      ) : (
        <span className="min-w-0 flex-1 truncate text-xs font-semibold">{crumb}</span>
      )}
      <IconBtn icon={<ChevronUp size={14} />} title="앞으로(위로)" onClick={() => reorderSelected(-1)} />
      <IconBtn icon={<ChevronDown size={14} />} title="뒤로(아래로)" onClick={() => reorderSelected(1)} />
      <IconBtn icon={<Trash2 size={14} />} title="삭제" danger onClick={deleteSelection} />
      <IconBtn icon={<X size={14} />} title="선택 해제" onClick={clearSelection} />
    </div>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 overflow-y-auto p-2">{children}</div>;
}

/* ---------- 페이지 컨텍스트 ---------- */

function CutContext({
  project,
  cutIndex,
  cut,
  selection,
}: {
  project: ComicProjectData;
  cutIndex: number;
  cut: ComicPageData;
  selection: Selection;
}) {
  const [pattern, setPattern] = useState("1");
  return (
    <div className="flex h-full flex-col text-ink">
      <SelectionHeader crumb={`페이지 ${cutIndex + 1}${cut.Name ? ` — ${cut.Name}` : ""}`} />
      <Body>
        <Section title="페이지" icon={<Rows3 size={13} />}>
          <Field label="이름">
            <TextInput value={cut.Name} onChange={(v) => renamePage(cutIndex, v)} className="w-full" />
          </Field>
          <Row label="세로 높이(px)">
            <NumberInput value={cut.PageHeight} onChange={(v) => setCutHeight(cutIndex, v)} width={72} />
            <span className="text-[11px] text-ink-faint">
              가로 {cut.PageWidth}px — 모든 페이지 공통(페이지 패널에서 조절)
            </span>
          </Row>
          <Check label="검정 배경" checked={cut.BlackBackground} onChange={setBlackBackground} />
          <Row label="배경색">
            <ColorInput
              value={cut.BackgroundColor || (cut.BlackBackground ? "#000000" : "#FFFFFF")}
              onChange={setPageBackgroundColor}
            />
            {cut.BackgroundColor ? <Btn onClick={() => setPageBackgroundColor("")}>기본</Btn> : null}
          </Row>
          <div className="flex flex-wrap items-center gap-1 pt-1">
            <Btn onClick={() => addCut(cutIndex)} title="이 페이지 바로 아래에 새 페이지">
              <span className="flex items-center gap-1">
                <Plus size={12} /> 아래에 페이지 추가
              </span>
            </Btn>
            <Btn onClick={() => duplicateCut(cutIndex)} title="이 페이지를 복제해 아래에 삽입">
              <span className="flex items-center gap-1">
                <Copy size={12} /> 복제
              </span>
            </Btn>
          </div>
        </Section>

        <Section title={`칸 구성 (${cut.Panels.length})`} icon={<Square size={13} />}>
          <Field label="패턴 (예: 1,2,1 — 줄별 칸 수)">
            <div className="flex gap-1">
              <TextInput value={pattern} onChange={setPattern} className="flex-1" />
              <Btn onClick={() => applyLayoutCmd(pattern)}>구성</Btn>
            </div>
          </Field>
          <Row label="여백 / 간격">
            <NumberInput value={project.AutoMargin} onChange={setAutoMargin} />
            <NumberInput value={project.AutoGutter} onChange={setAutoGutter} />
          </Row>
          <div className="mt-1 flex flex-col gap-0.5">
            {cut.Panels.map((p) => (
              <ListRow
                key={p.Id}
                active={selection.kind === "panel" && selection.id === p.Id}
                locked={p.IsLocked}
                onClick={() => select({ kind: "panel", id: p.Id })}
              >
                {p.Name || `${p.Number}번 칸`}
              </ListRow>
            ))}
            {cut.Panels.length === 0 && (
              <span className="px-1 py-1 text-[11px] text-ink-faint">
                패턴을 입력하고 “구성”을 누르면 칸이 생깁니다. 칸 안에 그림을 담습니다.
              </span>
            )}
          </div>
        </Section>
      </Body>
    </div>
  );
}

/* ---------- 칸 컨텍스트 ---------- */

function PanelContext({
  cutIndex,
  panel,
  selection,
}: {
  cutIndex: number;
  panel: ComicPanelData;
  selection: Selection;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const panelName = panel.Name || `${panel.Number}번 칸`;

  const onAddImage = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/") && !isVideoFile(file)) continue;
      const asset = await fileToAsset(file);
      addImageFromAsset(panel.Id, asset.id);
    }
  };

  return (
    <div className="flex h-full flex-col text-ink">
      <SelectionHeader
        crumb={`페이지 ${cutIndex + 1} › ${panelName}`}
        onCrumbClick={() => select({ kind: "cut", cutIndex })}
      />
      <Body>
        <Section title="칸" icon={<Square size={13} />}>
          <Check
            label="배경(흰색) 보이기"
            checked={panel.ShowBackground}
            onChange={(v) => {
              checkpoint();
              updateSelectedPanel({ ShowBackground: v });
            }}
          />
          <Check
            label="테두리 보이기"
            checked={panel.ShowBorder}
            onChange={(v) => {
              checkpoint();
              updateSelectedPanel({ ShowBorder: v });
            }}
          />
          {panel.ShowBackground && (
            <Row label="배경색">
              <ColorInput
                value={panel.BackgroundColor}
                onChange={(v) => updateSelectedPanel({ BackgroundColor: v })}
              />
            </Row>
          )}
          {panel.ShowBorder && (
            <Row label="테두리색">
              <ColorInput
                value={panel.BorderColor}
                onChange={(v) => updateSelectedPanel({ BorderColor: v })}
              />
            </Row>
          )}
          <Check
            label="잠금"
            checked={panel.IsLocked}
            onChange={(v) => updateSelectedPanel({ IsLocked: v })}
          />
          <Check
            label="사변형 모서리"
            checked={panel.CornerMode}
            onChange={(v) => {
              checkpoint();
              updateSelectedPanel({ CornerMode: v });
            }}
          />
          {panel.CornerMode && (
            <Btn
              onClick={() => {
                checkpoint();
                updateSelectedPanel({ CornerOffsets: new Array(8).fill(0) });
              }}
            >
              모서리 초기화
            </Btn>
          )}
        </Section>

        <Section title={`이미지 (${panel.Images.length})`} icon={<ImageIcon size={13} />}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
            onChange={(e) => onAddImage(e.target.files)}
          />
          <Btn onClick={() => fileRef.current?.click()}>
            <span className="flex items-center gap-1">
              <Plus size={12} /> 이미지/동영상 추가
            </span>
          </Btn>
          <div className="flex flex-col gap-0.5">
            {panel.Images.map((img, i) => (
              <ListRow
                key={img.Id}
                active={false}
                locked={img.IsLocked}
                onClick={() => select({ kind: "image", panelId: panel.Id, id: img.Id })}
              >
                {i + 1}번 이미지
              </ListRow>
            ))}
            {panel.Images.length === 0 && (
              <div className="px-1 text-[11px] text-ink-faint">드래그&드롭 또는 위 버튼으로 배치</div>
            )}
          </div>
        </Section>

        <Section title={`말풍선 (${panel.Bubbles.length})`} icon={<MessageSquare size={13} />}>
          <Btn onClick={addBubble}>
            <span className="flex items-center gap-1">
              <Plus size={12} /> 말풍선 추가
            </span>
          </Btn>
          <div className="flex flex-col gap-0.5">
            {panel.Bubbles.map((b, i) => (
              <ListRow
                key={b.Id}
                active={false}
                locked={b.IsLocked}
                onClick={() => select({ kind: "bubble", panelId: panel.Id, id: b.Id })}
              >
                {b.Text?.trim() ? b.Text.slice(0, 18) : `말풍선 ${i + 1}`}
              </ListRow>
            ))}
            {panel.Bubbles.length === 0 && (
              <div className="px-1 text-[11px] text-ink-faint">“말풍선 추가”로 만드세요</div>
            )}
          </div>
        </Section>
      </Body>
    </div>
  );
}

/* ---------- 이미지 컨텍스트 ---------- */

function ImageContext({
  cutIndex,
  panel,
  image,
}: {
  cutIndex: number;
  panel: ComicPanelData;
  image: PanelImageData;
}) {
  const panelName = panel.Name || `${panel.Number}번 칸`;
  const imageIndex = panel.Images.findIndex((i) => i.Id === image.Id);
  return (
    <div className="flex h-full flex-col text-ink">
      <SelectionHeader
        crumb={`페이지 ${cutIndex + 1} › ${panelName} › ${imageIndex + 1}번 이미지`}
        onCrumbClick={() => select({ kind: "panel", id: panel.Id })}
      />
      <Body>
        <Section title="이미지" icon={<ImageIcon size={13} />}>
          <div className="flex flex-wrap items-center gap-3">
            <Check
              label="칸에 맞춰 자르기(크롭)"
              checked={image.IsCropped}
              onChange={(v) => updateSelectedImage({ IsCropped: v })}
            />
            <Check
              label="잠금"
              checked={image.IsLocked}
              onChange={(v) => updateSelectedImage({ IsLocked: v })}
            />
          </div>
          <div className="mt-1 flex flex-col gap-2 border-t border-line pt-2">
            <Row label="가장자리 그라데이션">
              <SelectDir
                value={image.GradientDirection}
                onChange={(v) => {
                  checkpoint();
                  updateSelectedImage({ GradientDirection: v });
                }}
              />
            </Row>
            {image.GradientDirection !== "None" && (
              <>
                <Check
                  label="색으로 채우기 (끄면 투명 페이드)"
                  checked={image.GradientOpacity > 0}
                  onChange={(v) => {
                    checkpoint();
                    updateSelectedImage({ GradientOpacity: v ? 1 : 0 });
                  }}
                />
                {image.GradientOpacity > 0 && (
                  <Row label="색 / 진하기">
                    <ColorInput
                      value={image.GradientColor}
                      onChange={(v) => updateSelectedImage({ GradientColor: v })}
                    />
                    <Slider
                      min={5}
                      max={100}
                      value={Math.round(image.GradientOpacity * 100)}
                      onChange={(v) => updateSelectedImage({ GradientOpacity: v / 100 })}
                    />
                  </Row>
                )}
                <Row label="시작 % / 끝 %">
                  <NumberInput
                    value={image.GradientStart}
                    onChange={(v) => updateSelectedImage({ GradientStart: v })}
                  />
                  <NumberInput
                    value={image.GradientEnd}
                    onChange={(v) => updateSelectedImage({ GradientEnd: v })}
                  />
                </Row>
              </>
            )}
          </div>
          {isAnimatableImage(image.Path) && (
            <div className="mt-1 flex flex-col gap-2 border-t border-line pt-2">
              <div className="px-1 text-[11px] text-ink-faint">애니/동영상 내보내기 (0=원본/기본)</div>
              <Row label="출력 길이(초) / fps">
                <NumberInput
                  value={image.OutputDuration}
                  onChange={(v) => updateSelectedImage({ OutputDuration: v })}
                />
                <NumberInput
                  value={image.OutputFps}
                  onChange={(v) => updateSelectedImage({ OutputFps: v })}
                />
              </Row>
            </div>
          )}
        </Section>
      </Body>
    </div>
  );
}

// 그라데이션 방향 셀렉트(이미지 전용의 짧은 목록 — 드롭다운 유지).
function SelectDir({ value, onChange }: { value: GradDir; onChange: (v: GradDir) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {GRADIENT_DIR_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => {
            if (o.value === value) return; // 재클릭 no-op
            onChange(o.value);
          }}
          className={`rounded border px-1.5 py-0.5 text-[11px] ${
            value === o.value
              ? "border-primary bg-primary/15 text-ink"
              : "border-line text-ink-muted hover:bg-raised"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- 말풍선 컨텍스트 ---------- */

function BubbleContext({
  cutIndex,
  panel,
  bubble,
}: {
  cutIndex: number;
  panel: ComicPanelData;
  bubble: SpeechBubbleData;
}) {
  const [tailIdx, setTailIdx] = useState(0);
  const panelName = panel.Name || `${panel.Number}번 칸`;
  const bubbleIndex = panel.Bubbles.findIndex((b) => b.Id === bubble.Id);

  const safeTailIdx = Math.min(tailIdx, bubble.Tails.length - 1);
  const tail = safeTailIdx >= 0 ? bubble.Tails[safeTailIdx] : undefined;

  const addTail = () => {
    const w = bubble.Width;
    const h = bubble.Height;
    // v0.1.5: 본체 아래쪽 중앙에서 곧게 내려가는 '일자' 꼬리. 여러 개 추가해도 핸들이 안 겹치게
    //   중앙 기준 번갈아 가로 이동(0, -30, +30, …). 시작점은 본체 안(0.72h)에서 시작해 자연스럽게 합쳐짐.
    const n = bubble.Tails.length;
    const cx = w / 2 + (n % 2 === 0 ? 1 : -1) * Math.floor((n + 1) / 2) * 30;
    const startY = h * 0.72;
    const tipY = h + (h - startY);
    const nt: BubbleTailData = {
      StartX: cx,
      StartY: startY,
      MidX: cx,
      MidY: (startY + h) / 2,
      X: cx,
      Y: tipY,
      Width: 15,
      TailInward: false,
      ThoughtTail: false,
    };
    checkpoint();
    updateSelectedBubble({ Tails: [...bubble.Tails, nt] });
    setTailIdx(bubble.Tails.length);
  };
  const removeTail = () => {
    if (safeTailIdx < 0) return;
    checkpoint();
    updateSelectedBubble({ Tails: bubble.Tails.filter((_, i) => i !== safeTailIdx) });
    setTailIdx(Math.max(0, safeTailIdx - 1));
  };
  const updateBubbleCorner = (idx: number, val: number) => {
    const next = [...bubble.CornerOffsets];
    while (next.length < 8) next.push(0);
    next[idx] = val;
    updateSelectedBubble({ CornerOffsets: next });
  };
  const updateTail = (patch: Partial<BubbleTailData>) => {
    if (safeTailIdx < 0) return;
    updateSelectedBubble({
      Tails: bubble.Tails.map((t, i) => (i === safeTailIdx ? { ...t, ...patch } : t)),
    });
  };

  return (
    <div className="flex h-full flex-col text-ink">
      <SelectionHeader
        crumb={`페이지 ${cutIndex + 1} › ${panelName} › 말풍선 ${bubbleIndex + 1}`}
        onCrumbClick={() => select({ kind: "panel", id: panel.Id })}
      />
      <Body>
        <Section title="텍스트 · 스타일" icon={<MessageSquare size={13} />}>
          <Field label="대사">
            <textarea
              value={bubble.Text}
              onFocus={checkpoint}
              onChange={(e) =>
                updateSelectedBubble({
                  Text: e.target.value,
                  // 웹에서 대사를 고치면 구간 서식(데스크톱 Runs)은 단일 서식으로 리셋(스팬 편집 UI 미구현).
                  ...(bubble.Runs.length > 0 ? { Runs: [] } : {}),
                })
              }
              rows={2}
              className="w-full rounded border border-line bg-raised p-1.5 text-xs text-ink"
              placeholder="대사를 입력하세요"
            />
          </Field>
          <Row label="글자 크기">
            <NumberInput value={bubble.FontSize} onChange={(v) => updateSelectedBubble({ FontSize: v })} />
          </Row>
          <Row label="글꼴">
            <FontSelect value={bubble.FontFamily} onChange={(v) => updateSelectedBubble({ FontFamily: v })} />
          </Row>
          <Row label="정렬 (가로/세로)">
            <ChipSelect
              value={bubble.TextAlignment}
              options={ALIGN_OPTIONS}
              onChange={(v) => updateSelectedBubble({ TextAlignment: v })}
            />
            <ChipSelect
              value={bubble.VerticalAlignment}
              options={VALIGN_OPTIONS}
              onChange={(v) => updateSelectedBubble({ VerticalAlignment: v })}
            />
          </Row>
          <Row label="줄간격 (0=기본)">
            <NumberInput value={bubble.LineHeight} onChange={(v) => updateSelectedBubble({ LineHeight: v })} />
          </Row>
          <Check
            label="글자 외곽선"
            checked={bubble.HasTextOutline}
            onChange={(v) => updateSelectedBubble({ HasTextOutline: v })}
          />
          <Row label="채움 / 배경 / 외곽선">
            <ColorInput value={bubble.FillColor} onChange={(v) => updateSelectedBubble({ FillColor: v })} />
            <ColorInput
              value={bubble.BackgroundColor}
              onChange={(v) => updateSelectedBubble({ BackgroundColor: v })}
            />
            <ColorInput value={bubble.StrokeColor} onChange={(v) => updateSelectedBubble({ StrokeColor: v })} />
          </Row>
          <Row label="말풍선 테두리">
            <ColorInput value={bubble.BorderColor} onChange={(v) => updateSelectedBubble({ BorderColor: v })} />
          </Row>
        </Section>

        <Section title="모양 · 크기" icon={<Square size={13} />}>
          {/* 모양 갤러리: 각 모양을 실제 지오메트리 썸네일로 보고 고른다(드롭다운 대체). */}
          <BubbleShapeGallery
            value={bubble.Shape}
            onSelect={(v) => {
              if (v === bubble.Shape) return; // 재클릭 no-op undo 항목 방지
              checkpoint();
              updateSelectedBubble({ Shape: v });
            }}
          />
          {bubble.Shape === "RoundRect" && (
            <Row label="강도(원↔사각)">
              <Slider
                min={0}
                max={100}
                value={bubble.ShapeStrength}
                onChange={(v) => updateSelectedBubble({ ShapeStrength: v })}
              />
            </Row>
          )}
          {bubble.Shape !== "RoundRect" && bubble.Shape !== "None" && (
            <>
              <Row label={shapeLabels(bubble.Shape).count}>
                <Slider
                  min={3}
                  max={40}
                  value={bubble.ShapeCount}
                  onChange={(v) => updateSelectedBubble({ ShapeCount: Math.round(v) })}
                />
              </Row>
              <Row label={shapeLabels(bubble.Shape).strength}>
                <Slider
                  min={0}
                  max={100}
                  value={bubble.ShapeStrength}
                  onChange={(v) => updateSelectedBubble({ ShapeStrength: v })}
                />
              </Row>
              <Row label="불규칙도">
                <Slider
                  min={0}
                  max={100}
                  value={bubble.ShapeIrregularity}
                  onChange={(v) => updateSelectedBubble({ ShapeIrregularity: v })}
                />
              </Row>
              {bubble.Shape === "CloudExplosion" && (
                <Row label="폭 변동">
                  <Slider
                    min={0}
                    max={100}
                    value={bubble.ShapeWidthVariation}
                    onChange={(v) => updateSelectedBubble({ ShapeWidthVariation: v })}
                  />
                </Row>
              )}
              {bubble.Shape === "EffectLines" && (
                <Check
                  label="양쪽 페이드 (양 끝 투명)"
                  checked={bubble.LineFadeBothSides}
                  onChange={(v) => {
                    checkpoint();
                    updateSelectedBubble({ LineFadeBothSides: v });
                  }}
                />
              )}
            </>
          )}
          {bubble.Shape !== "ConcentrationLines" && bubble.Shape !== "EffectLines" && (
            <Row label="텍스트 회전(°)">
              <Slider
                min={0}
                max={360}
                value={bubble.TextRotation}
                onChange={(v) => updateSelectedBubble({ TextRotation: v })}
              />
            </Row>
          )}
          {bubble.Shape !== "ConcentrationLines" && bubble.Shape !== "EffectLines" && (
            <>
              <Check
                label="도형 워프 (모서리)"
                checked={bubble.WarpShape}
                onChange={(v) => {
                  checkpoint();
                  updateSelectedBubble({ WarpShape: v });
                }}
              />
              <Check
                label="글자 워프"
                checked={bubble.WarpText}
                onChange={(v) => {
                  checkpoint();
                  updateSelectedBubble({ WarpText: v });
                }}
              />
              {(bubble.WarpShape || bubble.WarpText) && (
                <>
                  {(["좌상", "우상", "우하", "좌하"] as const).map((label, ci) => (
                    <Row key={label} label={`${label} ΔX/ΔY`}>
                      <NumberInput
                        value={bubble.CornerOffsets[ci * 2] ?? 0}
                        onChange={(v) => updateBubbleCorner(ci * 2, v)}
                      />
                      <NumberInput
                        value={bubble.CornerOffsets[ci * 2 + 1] ?? 0}
                        onChange={(v) => updateBubbleCorner(ci * 2 + 1, v)}
                      />
                    </Row>
                  ))}
                  <Btn
                    onClick={() => {
                      checkpoint();
                      updateSelectedBubble({ CornerOffsets: new Array(8).fill(0) });
                    }}
                  >
                    모서리 초기화
                  </Btn>
                </>
              )}
            </>
          )}
          <Row label="가로 / 세로">
            <NumberInput value={bubble.Width} onChange={(v) => updateSelectedBubble({ Width: v })} />
            <NumberInput value={bubble.Height} onChange={(v) => updateSelectedBubble({ Height: v })} />
          </Row>
        </Section>

        <Section title={`꼬리 (${bubble.Tails.length})`}>
          <Btn onClick={addTail}>
            <span className="flex items-center gap-1">
              <Plus size={12} /> 꼬리 추가
            </span>
          </Btn>
          {bubble.Tails.length > 0 && (
            <>
              <div className="flex flex-wrap gap-1">
                {bubble.Tails.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setTailIdx(i)}
                    className={`size-6 rounded border text-xs ${
                      i === safeTailIdx
                        ? "border-primary bg-primary/15 text-ink"
                        : "border-line text-ink-muted hover:bg-raised"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              {tail && (
                <>
                  {/* 꼬리 스타일 갤러리: 일반/안쪽(깎기)/생각을 썸네일로 보고 고른다. '없음'=이 꼬리 삭제. */}
                  <TailGallery
                    value={tailVariantOf(tail)}
                    onSelect={(v) => {
                      if (v === tailVariantOf(tail)) return; // 재클릭 no-op undo 항목 방지
                      const patch = tailVariantPatch(v);
                      if (patch === null) {
                        removeTail();
                      } else {
                        checkpoint();
                        updateTail(patch);
                      }
                    }}
                  />
                  <Row label="시작 X / Y">
                    <NumberInput value={tail.StartX} onChange={(v) => updateTail({ StartX: v })} />
                    <NumberInput value={tail.StartY} onChange={(v) => updateTail({ StartY: v })} />
                  </Row>
                  <Row label="중간 X / Y">
                    <NumberInput
                      value={tail.MidX ?? (tail.StartX + tail.X) / 2}
                      onChange={(v) => updateTail({ MidX: v })}
                    />
                    <NumberInput
                      value={tail.MidY ?? (tail.StartY + tail.Y) / 2}
                      onChange={(v) => updateTail({ MidY: v })}
                    />
                  </Row>
                  <Row label="끝 X / Y">
                    <NumberInput value={tail.X} onChange={(v) => updateTail({ X: v })} />
                    <NumberInput value={tail.Y} onChange={(v) => updateTail({ Y: v })} />
                  </Row>
                  <Row label="너비">
                    <NumberInput value={tail.Width} onChange={(v) => updateTail({ Width: v })} />
                  </Row>
                  <IconBtn icon={<Trash2 size={14} />} title="이 꼬리 삭제" danger onClick={removeTail} />
                </>
              )}
            </>
          )}
        </Section>
      </Body>
    </div>
  );
}

// 짧은 선택지는 드롭다운 대신 눈에 보이는 칩 버튼으로.
function ChipSelect<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => {
            if (o.value === value) return; // 이미 선택된 값 재클릭 → no-op undo 항목 방지
            checkpoint();
            onChange(o.value);
          }}
          className={`rounded border px-1.5 py-0.5 text-[11px] ${
            value === o.value
              ? "border-primary bg-primary/15 text-ink"
              : "border-line text-ink-muted hover:bg-raised"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function FontSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <ChipSelect value={value} options={FONT_OPTIONS} onChange={onChange} />;
}

/* ---------- 진입점: 선택 컨텍스트 라우팅 ---------- */

/** 선택 컨텍스트 속성 패널 — 선택한 것(페이지/칸/이미지/말풍선)의 액션만 보여 준다. */
export function Inspector() {
  useRev();
  const pageIndex = usePageIndex();
  const selection = useSelection();
  const project = editorStore.getState().project;
  const page = currentPage(project, pageIndex);

  if (!page) return null;

  // 페이지 컨텍스트
  if (selection.kind === "cut") {
    const cutIndex = Math.min(selection.cutIndex ?? pageIndex, project.Pages.length - 1);
    const cut = project.Pages[cutIndex];
    if (cut) return <CutContext project={project} cutIndex={cutIndex} cut={cut} selection={selection} />;
  }

  const panelId = selection.kind === "panel" ? selection.id : selection.panelId;
  const panel = findPanel(page, panelId);

  if (selection.kind === "none" || !panel) {
    return (
      <div className="h-full overflow-y-auto p-2 text-ink">
        <EmptyState>
          캔버스에서 <b className="text-ink-muted">페이지</b>를 클릭하면 페이지 액션이,
          <br />
          칸·이미지·말풍선을 클릭하면 그 속성이 표시됩니다.
        </EmptyState>
      </div>
    );
  }

  if (selection.kind === "bubble") {
    const bubble = findBubble(panel, selection.id);
    if (bubble) return <BubbleContext cutIndex={pageIndex} panel={panel} bubble={bubble} />;
  }
  if (selection.kind === "image") {
    const image = findImage(panel, selection.id);
    if (image) return <ImageContext cutIndex={pageIndex} panel={panel} image={image} />;
  }
  return <PanelContext cutIndex={pageIndex} panel={panel} selection={selection} />;
}
