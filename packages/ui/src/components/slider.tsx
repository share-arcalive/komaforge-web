import type * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "../lib/cn";

export function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-muted">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-3.5 shrink-0 rounded-full border-2 border-primary bg-background shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50" />
    </SliderPrimitive.Root>
  );
}
