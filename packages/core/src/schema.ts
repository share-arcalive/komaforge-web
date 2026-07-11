import { z } from "zod";

/**
 * KomaForge `.kfjson` 저장 스키마의 1:1 포팅 (원본: src/Models/ProjectData.cs).
 * 키는 PascalCase로 유지하여 데스크톱 파일과 그대로 round-trip 한다.
 * 누락 필드는 .default() 로 채워 구버전 파일도 로드된다.
 */

export const BUBBLE_SHAPES = [
  "RoundRect",
  "CloudExplosion",
  "Flash",
  "ConcentrationLines",
  "EffectLines",
  "None",
] as const;
export type BubbleShape = (typeof BUBBLE_SHAPES)[number];
export const BubbleShapeSchema = z.enum(BUBBLE_SHAPES).catch("RoundRect");

export const BubbleTailSchema = z.object({
  StartX: z.number().default(85),
  StartY: z.number().default(50),
  // 구버전 파일엔 Mid가 없다 → undefined. 로드 정규화에서 시작·끝 중점으로 계산.
  MidX: z.number().optional(),
  MidY: z.number().optional(),
  X: z.number().default(130),
  Y: z.number().default(130),
  Width: z.number().default(28),
  TailInward: z.boolean().default(false),
  // 생각 말풍선 꼬리: 곡선 대신 점점 작아지는 원 3개로 표시(꼬리별). 원본 v0.1.5 BubbleTailData.ThoughtTail.
  ThoughtTail: z.boolean().default(false),
});
export type BubbleTailData = z.infer<typeof BubbleTailSchema>;

// 말풍선/본문 텍스트의 구간별 서식(rich text run). 원본 v0.1.2 FlowTextRun.
// 웹은 현재 데스크톱 파일의 구간 서식을 **라운드트립 보존**한다(스팬 편집 UI는 추후).
export const FlowTextRunSchema = z.object({
  Text: z.string().default(""),
  FontFamily: z.string().nullish(),
  Color: z.string().nullish(),
  OutlineColor: z.string().nullish(),
});
export type FlowTextRunData = z.infer<typeof FlowTextRunSchema>;

export const TEXT_ALIGNMENTS = ["Left", "Center", "Right"] as const;
export const VERTICAL_ALIGNMENTS = ["Top", "Center", "Bottom"] as const;

export const SpeechBubbleSchema = z.object({
  Id: z.string().default(""),
  Text: z.string().default(""),
  X: z.number().default(0),
  Y: z.number().default(0),
  Width: z.number().default(170),
  Height: z.number().default(100),
  FontSize: z.number().default(18),
  FontFamily: z.string().default(""),
  // 가로 정렬(원본 v0.1.2 TextAlignment). 세로 정렬(VerticalAlignment). 줄간격(LineHeight, 0=글꼴 기본).
  TextAlignment: z.enum(TEXT_ALIGNMENTS).catch("Center").default("Center"),
  VerticalAlignment: z.enum(VERTICAL_ALIGNMENTS).catch("Center").default("Center"),
  LineHeight: z.number().default(0),
  // 구간별 서식(라운드트립 보존). 원본 v0.1.2 Runs.
  Runs: z.array(FlowTextRunSchema).default([]),
  TextMarginLeft: z.number().default(16),
  TextMarginTop: z.number().default(12),
  TextMarginRight: z.number().default(16),
  TextMarginBottom: z.number().default(12),
  IsCropped: z.boolean().default(false),
  IsLocked: z.boolean().default(false),
  HasTextOutline: z.boolean().default(false),
  FillColor: z.string().default("#000000"),
  StrokeColor: z.string().default("#FFFFFF"),
  BackgroundColor: z.string().default("#FFFFFF"),
  BorderColor: z.string().default("#000000"),
  Shape: BubbleShapeSchema.default("RoundRect"),
  ShapeCount: z.number().int().default(9),
  ShapeStrength: z.number().default(0),
  ShapeIrregularity: z.number().default(50),
  ShapeWidthVariation: z.number().default(0),
  // 속도선: 각 선을 양쪽 끝 모두 투명하게 페이드할지(기본 OFF=한쪽만). 원본 v0.1.5 LineFadeBothSides.
  LineFadeBothSides: z.boolean().default(false),
  // 글자 회전 각도(도, 0~360). 0이면 회전 없음. 선효과(속도선·집중선) 제외 모든 말풍선. 원본 v0.1.4 TextRotation.
  TextRotation: z.number().default(0),
  // 모서리 워프(사변형 일그러뜨림) 변위 TL,TR,BR,BL × X,Y = 8개. 0이면 일그러짐 없음. 원본 v0.1.2 CornerOffsets.
  CornerOffsets: z.array(z.number()).default(() => new Array(8).fill(0)),
  // 모서리 워프를 도형/글자에 적용할지(개별). 원본 v0.1.2 WarpShape/WarpText.
  WarpShape: z.boolean().default(false),
  WarpText: z.boolean().default(false),
  TailInward: z.boolean().default(false),
  PivotX: z.number().default(0),
  PivotY: z.number().default(1),
  Tails: z.array(BubbleTailSchema).default([]),
});
export type SpeechBubbleData = z.infer<typeof SpeechBubbleSchema>;

export const PanelImageSchema = z.object({
  Id: z.string().default(""),
  Path: z.string().default(""),
  Scale: z.number().default(1),
  // 0/미지정이면 Scale과 동일(비율 유지).
  ScaleY: z.number().default(0),
  TranslateX: z.number().default(0),
  TranslateY: z.number().default(0),
  // 원본 자연 크기 캐시(데스크톱 라운드트립). 0/미지정이면 자산 실측값을 쓴다. 원본 v0.1.x BaseWidth/BaseHeight.
  BaseWidth: z.number().default(0),
  BaseHeight: z.number().default(0),
  // 애니/동영상 내보내기 타이밍. OutputDuration=한 바퀴 길이(초, 0=원본 길이), OutputFps=출력 fps(0=기본). 원본 v0.1.1.
  OutputDuration: z.number().default(0),
  OutputFps: z.number().default(0),
  IsCropped: z.boolean().default(true),
  IsLocked: z.boolean().default(false),
  PivotX: z.number().default(0),
  PivotY: z.number().default(1),
  // 가장자리 그라데이션(웹 확장). 선택한 변이 GradientColor로 페이드. 색 알파/Opacity 0이면
  // 가장자리가 투명해지는 페이드아웃(마스크), >0이면 그 색 오버레이. Start%까지 완전·End% 이후 원본.
  GradientDirection: z.enum(["None", "Top", "Bottom", "Left", "Right"]).catch("None").default("None"),
  GradientColor: z.string().default("#FFFFFF"),
  GradientOpacity: z.number().default(0),
  GradientStart: z.number().default(40),
  GradientEnd: z.number().default(60),
});
export type PanelImageData = z.infer<typeof PanelImageSchema>;

export const ComicPanelSchema = z.object({
  Number: z.number().int().default(0),
  Id: z.string().default(""),
  Name: z.string().default(""),
  X: z.number().default(0),
  Y: z.number().default(0),
  Width: z.number().default(0),
  Height: z.number().default(0),
  IsLocked: z.boolean().default(false),
  CornerMode: z.boolean().default(false),
  // 사변형 모서리 변위 (TL,TR,BR,BL × X,Y) = 8개. 기본 0이면 직사각형.
  CornerOffsets: z.array(z.number()).default(() => new Array(8).fill(0)),
  // 칸 프레임 표시(웹 확장). 끄면 흰 배경/검정 테두리를 그리지 않아 "그림만"·겹침 합성이 가능.
  // 데스크톱 .kfjson엔 없는 키 → 구파일은 기본값(true=기존 모습)으로 로드.
  ShowBackground: z.boolean().default(true),
  ShowBorder: z.boolean().default(true),
  BackgroundColor: z.string().default("#FFFFFF"),
  BorderColor: z.string().default("#000000"),
  Images: z.array(PanelImageSchema).default([]),
  Bubbles: z.array(SpeechBubbleSchema).default([]),
});
export type ComicPanelData = z.infer<typeof ComicPanelSchema>;

export const ComicPageSchema = z.object({
  Name: z.string().default("Page"),
  PageWidth: z.number().default(832),
  PageHeight: z.number().default(1216),
  BlackBackground: z.boolean().default(false),
  // 빈 문자열이면 BlackBackground(검정/흰색)로, 값이 있으면 그 색을 페이지 배경으로(웹 확장·KomaForge 대응).
  BackgroundColor: z.string().default(""),
  Panels: z.array(ComicPanelSchema).default([]),
});
export type ComicPageData = z.infer<typeof ComicPageSchema>;

// 비주얼 노벨 모드 상태. Enabled가 핵심(모드 ON/OFF), 나머지는 라운드트립 보존용. 원본 v0.1.3 FlowTextData.
export const FlowTextSchema = z.object({
  Enabled: z.boolean().default(false),
  Text: z.string().default(""),
  FontFamily: z.string().default("Malgun Gothic"),
  FontSize: z.number().default(20),
  LineHeight: z.number().default(30),
  Alignment: z.string().default("Justify"),
  MarginLeft: z.number().default(30),
  MarginTop: z.number().default(30),
  MarginRight: z.number().default(30),
  MarginBottom: z.number().default(30),
  Color: z.string().default("#FFFFFF"),
  OutlineColor: z.string().default("#000000"),
  BackdropColor: z.string().default("#FFFFFF"),
  Runs: z.array(FlowTextRunSchema).default([]),
});
export type FlowTextData = z.infer<typeof FlowTextSchema>;

// ── 세로 스트립 모드 ─────────────────────────────────────────────
// 페이지를 세로로 이어붙인 무한 스크롤 스트립. 웹 확장 키(데스크톱 .kfjson엔 없음).
export const STRIP_MIN_WIDTH = 690;
export const STRIP_MAX_WIDTH = 1500;
export const STRIP_DEFAULT_WIDTH = 800;
/** 초기 시작 템플릿에서 한꺼번에 만들 페이지 수. */
export const CUT_TEMPLATE_COUNTS = [4, 8, 12, 16] as const;
export type CutTemplateCount = (typeof CUT_TEMPLATE_COUNTS)[number];

/** 스트립 너비를 [690, 1500] 정수로 보정. 비정상 입력은 기본 너비. */
export function clampStripWidth(width: number): number {
  if (!Number.isFinite(width)) return STRIP_DEFAULT_WIDTH;
  return Math.min(Math.max(Math.round(width), STRIP_MIN_WIDTH), STRIP_MAX_WIDTH);
}

/** 새 페이지의 기본 높이 — 스트립 너비에 비례(5:4 세로비). */
export function defaultCutHeight(stripWidth: number): number {
  return Math.round(clampStripWidth(stripWidth) * 1.25);
}

export const ComicProjectSchema = z.object({
  Title: z.string().default(""),
  AutoMargin: z.number().default(24),
  AutoGutter: z.number().default(14),
  CurrentPageIndex: z.number().int().default(0),
  // 세로 스트립 전역 너비(웹 확장). 0 = 레거시 페이지 문서(페이지별 너비 독립).
  // > 0 이면 로드 정규화에서 [690,1500] 클램프 후 모든 Pages[i].PageWidth에 동기화.
  // 데스크톱은 이 키를 모르고 저장 시 떨굴 수 있음 → 로드 시 첫 페이지 너비로 재유도 가능해야 한다.
  StripWidth: z.number().default(0),
  Pages: z.array(ComicPageSchema).default([]),
  // 비주얼 노벨 모드(원본 v0.1.3). FlowText.Enabled=모드, VnTemplates=스크립트→페이지 생성 템플릿.
  FlowText: FlowTextSchema.default(() => FlowTextSchema.parse({})),
  VnTemplates: z.array(ComicPageSchema).default([]),
  VnEditingIndex: z.number().int().default(-1),
});
export type ComicProjectData = z.infer<typeof ComicProjectSchema>;
