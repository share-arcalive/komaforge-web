import type * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "../lib/cn";

export function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium text-muted-foreground select-none group-data-[disabled=true]:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
