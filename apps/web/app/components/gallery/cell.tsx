import type { ReactNode } from "react";
import { cn } from "@repo/ui";

/**
 * 갤러리 공통 셀: 썸네일 + 한글 라벨 버튼. 선택 시 primary 링 강조.
 * 썸네일 SVG가 stroke=currentColor 라서 셀의 글자색(선택/호버)에 따라 자동으로 테마를 탄다.
 */
export function GalleryCell({
  label,
  selected,
  onClick,
  children,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      title={label}
      onClick={onClick}
      className={cn(
        "flex min-w-0 flex-col items-center gap-0.5 rounded border p-1 outline-none transition-colors",
        "focus-visible:ring-1 focus-visible:ring-primary",
        selected
          ? "border-primary bg-primary/15 text-ink ring-1 ring-primary"
          : "border-line text-ink-muted hover:bg-raised hover:text-ink",
      )}
    >
      {children}
      <span className="w-full truncate text-center text-[10px] leading-tight">{label}</span>
    </button>
  );
}
