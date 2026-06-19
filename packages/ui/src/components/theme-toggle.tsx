import { Moon, Sun } from "lucide-react";
import { cn } from "../lib/cn";
import { useTheme } from "../lib/theme";

/** 다크↔라이트 토글 버튼. shadcn 시맨틱 유틸리티(text-muted-foreground 등)를 써서
   @repo/ui 의 @source 스캐닝이 Phase A에서 실제 동작하는지 검증하는 역할도 겸한다. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      title={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      aria-label="테마 전환"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
        className,
      )}
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
