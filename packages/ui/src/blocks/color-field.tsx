import { cn } from "../lib/cn";

/** 색 입력 + 최근색 스와치(클릭=적용, 우클릭=제거). 프레젠테이셔널 — 최근색 상태는 props로 주입.
   (앱은 recentColors 스토어 + checkpoint를 연결한다.) */
export function ColorField({
  value,
  onChange,
  recents = [],
  onPickRecent,
  onRemoveRecent,
  onInteractStart,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  recents?: string[];
  onPickRecent?: (c: string) => void;
  onRemoveRecent?: (c: string) => void;
  onInteractStart?: () => void;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-1", className)}>
      <input
        type="color"
        value={value}
        onFocus={onInteractStart}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-8 shrink-0 cursor-pointer rounded border border-input bg-secondary"
      />
      {recents.length > 0 && (
        <span className="flex max-w-[100px] flex-wrap gap-0.5">
          {recents.slice(0, 10).map((c) => (
            <button
              key={c}
              type="button"
              title={`${c} (우클릭=제거)`}
              onClick={() => onPickRecent?.(c)}
              onContextMenu={(e) => {
                e.preventDefault();
                onRemoveRecent?.(c);
              }}
              className="size-3.5 rounded-sm border border-border"
              style={{ backgroundColor: c }}
            />
          ))}
        </span>
      )}
    </span>
  );
}
