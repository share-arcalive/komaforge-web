import type * as React from "react";
import { ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../components/collapsible";
import { cn } from "../lib/cn";

/** 접이식 섹션(인스펙터/패널 공용). chevron + 제목 + (선택)아이콘. */
export function Section({
  title,
  icon,
  defaultOpen = true,
  className,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className={cn("group/section mb-2 overflow-hidden rounded-lg border border-border bg-card", className)}
    >
      <CollapsibleTrigger className="flex w-full items-center gap-1.5 px-2.5 py-2 text-xs font-semibold tracking-wide text-primary outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/40">
        <ChevronRight className="size-3 shrink-0 transition-transform group-data-[state=open]/section:rotate-90" />
        {icon}
        <span>{title}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-2 px-2.5 pt-0.5 pb-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}
