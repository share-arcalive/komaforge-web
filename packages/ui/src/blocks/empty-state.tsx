import type * as React from "react";
import { cn } from "../lib/cn";

/** 빈 상태 안내(아이콘/제목/설명 모두 선택). 텍스트만 넘기면 흐린 안내문. */
export function EmptyState({
  icon,
  title,
  children,
  className,
}: {
  icon?: React.ReactNode;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2 px-3 py-10 text-center", className)}>
      {icon && <div className="text-faint [&_svg]:size-6">{icon}</div>}
      {title && <p className="text-xs font-medium text-muted-foreground">{title}</p>}
      {children && <p className="text-xs leading-relaxed text-faint">{children}</p>}
    </div>
  );
}
