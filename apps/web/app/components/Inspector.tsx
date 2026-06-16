import { useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  MessageSquare,
  Plus,
  Square,
  Trash2,
  X,
} from "lucide-react";
import {
  addBubble,
  addImageFromAsset,
  clearSelection,
  currentPage,
  deleteSelection,
  editorStore,
  fileToAsset,
  findBubble,
  findImage,
  findPanel,
  isVideoFile,
  reorderSelected,
  select,
  updateSelectedBubble,
  updateSelectedImage,
  updateSelectedPanel,
  usePageIndex,
  useRev,
  useSelection,
} from "@repo/editor";
import type { BubbleShape, BubbleTailData } from "@repo/core";
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
  Select,
  Slider,
} from "./ui";

const SHAPE_OPTIONS: { value: BubbleShape; label: string }[] = [
  { value: "RoundRect", label: "원/사각" },
  { value: "CloudExplosion", label: "구름/폭발" },
  { value: "Flash", label: "플래시" },
  { value: "ConcentrationLines", label: "집중선" },
  { value: "EffectLines", label: "속도선" },
  { value: "None", label: "테두리 없음" },
];

// 도형마다 개수/강도 슬라이더의 의미가 다르므로 라벨을 바꿔 준다.
function shapeLabels(shape: BubbleShape): { count: string; strength: string } {
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

const FONT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "기본(고딕)" },
  { value: "serif", label: "명조" },
  { value: "monospace", label: "고정폭" },
  { value: "cursive", label: "손글씨" },
];

const checkpoint = () => editorStore.getState().checkpoint();

/** 선택된 대상(칸/이미지/말풍선)에 집중한 속성 패널. 문서/페이지/구성은 페이지 패널 담당. */
export function Inspector() {
  useRev();
  const pageIndex = usePageIndex();
  const selection = useSelection();
  const project = editorStore.getState().project;
  const page = currentPage(project, pageIndex);
  const [tailIdx, setTailIdx] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!page) return null;

  const panelId = selection.kind === "panel" ? selection.id : selection.panelId;
  const panel = findPanel(page, panelId);

  if (selection.kind === "none" || !panel) {
    return (
      <div className="h-full overflow-y-auto p-2 text-ink">
        <EmptyState>
          캔버스에서 칸·이미지·말풍선을 클릭하거나,
          <br />
          왼쪽 <b className="text-ink-muted">페이지</b> 패널에서 칸을 선택하세요.
        </EmptyState>
      </div>
    );
  }

  const bubble = selection.kind === "bubble" ? findBubble(panel, selection.id) : undefined;
  const image = selection.kind === "image" ? findImage(panel, selection.id) : undefined;
  const panelName = panel.Name || `${panel.Number}번 칸`;
  const imageIndex = image ? panel.Images.findIndex((i) => i.Id === image.Id) : -1;
  const bubbleIndex = bubble ? panel.Bubbles.findIndex((b) => b.Id === bubble.Id) : -1;

  const crumb =
    image ? `${panelName} › ${imageIndex + 1}번 이미지`
    : bubble ? `${panelName} › 말풍선 ${bubbleIndex + 1}`
    : panelName;

  const onAddImage = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/") && !isVideoFile(file)) continue;
      const asset = await fileToAsset(file);
      addImageFromAsset(panel.Id, asset.id);
    }
  };

  // ----- 말풍선 꼬리 -----
  const safeTailIdx = bubble ? Math.min(tailIdx, bubble.Tails.length - 1) : -1;
  const tail = bubble && safeTailIdx >= 0 ? bubble.Tails[safeTailIdx] : undefined;
  const addTail = () => {
    if (!bubble) return;
    const w = bubble.Width;
    const h = bubble.Height;
    const nt: BubbleTailData = {
      StartX: w / 2,
      StartY: h * 0.85,
      MidX: w / 2,
      MidY: h + 12,
      X: w / 2,
      Y: h + 48,
      Width: 28,
      TailInward: false,
    };
    checkpoint();
    updateSelectedBubble({ Tails: [...bubble.Tails, nt] });
    setTailIdx(bubble.Tails.length);
  };
  const removeTail = () => {
    if (!bubble || safeTailIdx < 0) return;
    checkpoint();
    updateSelectedBubble({ Tails: bubble.Tails.filter((_, i) => i !== safeTailIdx) });
    setTailIdx(Math.max(0, safeTailIdx - 1));
  };
  const updateTail = (patch: Partial<BubbleTailData>) => {
    if (!bubble || safeTailIdx < 0) return;
    updateSelectedBubble({
      Tails: bubble.Tails.map((t, i) => (i === safeTailIdx ? { ...t, ...patch } : t)),
    });
  };

  return (
    <div className="flex h-full flex-col text-ink">
      {/* 선택 헤더(브레드크럼 + 액션) */}
      <div className="flex shrink-0 items-center gap-2 border-b border-line bg-surface px-2.5 py-2">
        <span className="min-w-0 flex-1 truncate text-xs font-semibold">{crumb}</span>
        <IconBtn
          icon={<ChevronUp size={14} />}
          title="앞으로(위로)"
          onClick={() => reorderSelected(-1)}
        />
        <IconBtn
          icon={<ChevronDown size={14} />}
          title="뒤로(아래로)"
          onClick={() => reorderSelected(1)}
        />
        <IconBtn icon={<Trash2 size={14} />} title="삭제" danger onClick={deleteSelection} />
        <IconBtn icon={<X size={14} />} title="선택 해제" onClick={clearSelection} />
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {/* 칸 */}
        <Section title="칸" icon={<Square size={13} />}>
          <div className="text-xs text-ink-muted">{panelName}</div>
          {selection.kind === "panel" && (
            <>
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
            </>
          )}
        </Section>

        {/* 이미지 */}
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
                active={selection.kind === "image" && selection.id === img.Id}
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
          {image && (
            <>
              <div className="mt-1 flex flex-wrap items-center gap-3 border-t border-line pt-2">
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
                  <Select
                    value={image.GradientDirection}
                    options={GRADIENT_DIR_OPTIONS}
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
            </>
          )}
        </Section>

        {/* 말풍선 */}
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
                active={selection.kind === "bubble" && selection.id === b.Id}
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

        {/* 말풍선 속성(선택 시) */}
        {bubble && (
          <>
            <Section title="텍스트 · 스타일" icon={<MessageSquare size={13} />}>
              <Field label="대사">
                <textarea
                  value={bubble.Text}
                  onFocus={checkpoint}
                  onChange={(e) => updateSelectedBubble({ Text: e.target.value })}
                  rows={2}
                  className="w-full rounded border border-line bg-raised p-1.5 text-xs text-ink"
                  placeholder="대사를 입력하세요"
                />
              </Field>
              <Row label="글자 크기">
                <NumberInput
                  value={bubble.FontSize}
                  onChange={(v) => updateSelectedBubble({ FontSize: v })}
                />
              </Row>
              <Row label="글꼴">
                <Select
                  value={bubble.FontFamily}
                  options={FONT_OPTIONS}
                  onChange={(v) => updateSelectedBubble({ FontFamily: v })}
                />
              </Row>
              <Check
                label="글자 외곽선"
                checked={bubble.HasTextOutline}
                onChange={(v) => updateSelectedBubble({ HasTextOutline: v })}
              />
              <Row label="채움 / 배경 / 외곽선">
                <ColorInput
                  value={bubble.FillColor}
                  onChange={(v) => updateSelectedBubble({ FillColor: v })}
                />
                <ColorInput
                  value={bubble.BackgroundColor}
                  onChange={(v) => updateSelectedBubble({ BackgroundColor: v })}
                />
                <ColorInput
                  value={bubble.StrokeColor}
                  onChange={(v) => updateSelectedBubble({ StrokeColor: v })}
                />
              </Row>
              <Row label="말풍선 테두리">
                <ColorInput
                  value={bubble.BorderColor}
                  onChange={(v) => updateSelectedBubble({ BorderColor: v })}
                />
              </Row>
            </Section>

            <Section title="모양 · 크기" icon={<Square size={13} />}>
              <Row label="모양">
                <Select
                  value={bubble.Shape}
                  options={SHAPE_OPTIONS}
                  onChange={(v) => updateSelectedBubble({ Shape: v })}
                />
              </Row>
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
                </>
              )}
              <Row label="가로 / 세로">
                <NumberInput value={bubble.Width} onChange={(v) => updateSelectedBubble({ Width: v })} />
                <NumberInput
                  value={bubble.Height}
                  onChange={(v) => updateSelectedBubble({ Height: v })}
                />
              </Row>
            </Section>

            <Section title={`꼬리 (${bubble.Tails.length})`} defaultOpen={false}>
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
                            ? "border-accent bg-accent/15 text-ink"
                            : "border-line text-ink-muted hover:bg-raised"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  {tail && (
                    <>
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
                      <Check
                        label="안쪽으로(깎기)"
                        checked={tail.TailInward}
                        onChange={(v) => {
                          checkpoint();
                          updateTail({ TailInward: v });
                        }}
                      />
                      <IconBtn
                        icon={<Trash2 size={14} />}
                        title="이 꼬리 삭제"
                        danger
                        onClick={removeTail}
                      />
                    </>
                  )}
                </>
              )}
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
