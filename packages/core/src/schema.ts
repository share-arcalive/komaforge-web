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
});
export type BubbleTailData = z.infer<typeof BubbleTailSchema>;

export const SpeechBubbleSchema = z.object({
  Id: z.string().default(""),
  Text: z.string().default(""),
  X: z.number().default(0),
  Y: z.number().default(0),
  Width: z.number().default(170),
  Height: z.number().default(100),
  FontSize: z.number().default(18),
  FontFamily: z.string().default(""),
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

export const ComicProjectSchema = z.object({
  Title: z.string().default(""),
  AutoMargin: z.number().default(24),
  AutoGutter: z.number().default(14),
  CurrentPageIndex: z.number().int().default(0),
  Pages: z.array(ComicPageSchema).default([]),
});
export type ComicProjectData = z.infer<typeof ComicProjectSchema>;
