import type * as React from "react";
import { Lock } from "lucide-react";
import { cn } from "../lib/cn";

/** 선택 가능한 목록 행(페이지/칸/이미지/말풍선 공용). */
export function ListRow({
  active,
  locked,
  onClick,
  children,
  right,
  className,
}: {
  active?: boolean;
  locked?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
        active
          ? "bg-primary/15 text-foreground ring-1 ring-inset ring-primary/40"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        className,
      )}
    >
      {locked && <Lock className="size-3 shrink-0 text-faint" />}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {right}
    </button>
  );
}
