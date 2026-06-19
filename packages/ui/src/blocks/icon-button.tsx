import type * as React from "react";
import { Button } from "../components/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/tooltip";
import { cn } from "../lib/cn";

/** 컴팩트 아이콘 버튼 + 툴팁(섹션 내 도구모음용). */
export function IconButton({
  icon,
  label,
  onClick,
  disabled,
  danger,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  className?: string;
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={label}
            onClick={onClick}
            disabled={disabled}
            className={cn(
              "size-7 [&_svg]:size-3.5",
              danger && "hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive",
              className,
            )}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
