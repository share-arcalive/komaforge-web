import type * as React from "react";
import { cn } from "../lib/cn";

/** 라벨(왼쪽) + 컨트롤(오른쪽) 한 줄. */
export function Row({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex items-center justify-between gap-2 text-xs", className)}>
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1">{children}</span>
    </label>
  );
}

/** 라벨(위) + 컨트롤(아래, 전폭). textarea/select 등. */
export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1 text-xs", className)}>
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
