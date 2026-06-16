import { useState, useSyncExternalStore } from "react";
import { ChevronRight, Lock } from "lucide-react";
import { editorStore } from "@repo/editor";
import { addRecentColor, getRecentColors, removeRecentColor, subscribeRecentColors } from "../lib/recentColors";

export function Section({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-2 overflow-hidden rounded-lg border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 px-2.5 py-2 text-xs font-semibold tracking-wide text-accent transition-colors hover:bg-raised"
      >
        <ChevronRight size={13} className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
        {icon}
        <span>{title}</span>
      </button>
      {open && <div className="flex flex-col gap-2 px-2.5 pb-3 pt-0.5">{children}</div>}
    </div>
  );
}

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span className="shrink-0 text-ink-muted">{label}</span>
      <span className="flex items-center gap-1">{children}</span>
    </label>
  );
}

/** 라벨이 위, 컨트롤이 아래(전폭 입력용: textarea/select 등). */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

/** 선택 가능한 목록 행(페이지/칸/이미지/말풍선 공용). */
export function ListRow({
  active,
  locked,
  onClick,
  children,
  right,
}: {
  active?: boolean;
  locked?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
        active
          ? "bg-accent/15 text-ink ring-1 ring-inset ring-accent/40"
          : "text-ink-muted hover:bg-raised hover:text-ink"
      }`}
    >
      {locked && <Lock size={11} className="shrink-0 text-ink-faint" />}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {right}
    </button>
  );
}

/** 컴팩트 아이콘 버튼(섹션 내 도구모음). */
export function IconBtn({
  icon,
  title,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`flex size-7 shrink-0 items-center justify-center rounded-md border border-line text-ink-muted transition-colors hover:bg-raised hover:text-ink disabled:pointer-events-none disabled:opacity-40 ${
        danger ? "hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400" : ""
      }`}
    >
      {icon}
    </button>
  );
}

/** 체크박스 + 라벨(액센트 색). */
export function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-ink-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-3.5 accent-[var(--color-accent)]"
      />
      {label}
    </label>
  );
}

/** 빈 상태 안내. */
export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-10 text-center text-xs leading-relaxed text-ink-faint">{children}</div>
  );
}

export function Btn({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="rounded border border-line bg-raised px-2 py-1 text-xs text-ink hover:bg-line disabled:opacity-40"
    >
      {children}
    </button>
  );
}

const checkpoint = () => editorStore.getState().checkpoint();

export function TextInput({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onFocus={checkpoint}
      onChange={(e) => onChange(e.target.value)}
      className={`min-w-0 rounded border border-line bg-raised px-1.5 py-0.5 text-xs text-ink ${className}`}
    />
  );
}

export function NumberInput({
  value,
  onChange,
  width = 56,
}: {
  value: number;
  onChange: (v: number) => void;
  width?: number;
}) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? String(Math.round(value * 100) / 100) : ""}
      onFocus={checkpoint}
      onChange={(e) => {
        const n = Number.parseFloat(e.target.value);
        if (Number.isFinite(n)) onChange(n);
      }}
      style={{ width }}
      className="rounded border border-line bg-raised px-1.5 py-0.5 text-xs text-ink"
    />
  );
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onFocus={checkpoint}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-28"
    />
  );
}

export function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => {
        checkpoint();
        onChange(e.target.value as T);
      }}
      className="rounded border border-line bg-raised px-1.5 py-0.5 text-xs text-ink"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

const EMPTY: string[] = [];
function useRecentColors(): string[] {
  return useSyncExternalStore(subscribeRecentColors, getRecentColors, () => EMPTY);
}

export function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const recents = useRecentColors();
  return (
    <span className="flex items-center gap-1">
      <input
        type="color"
        value={value}
        onFocus={checkpoint}
        onChange={(e) => {
          onChange(e.target.value);
          addRecentColor(e.target.value);
        }}
        className="h-6 w-8 shrink-0 rounded border border-line bg-raised"
      />
      {recents.length > 0 && (
        <span className="flex max-w-[100px] flex-wrap gap-0.5">
          {recents.slice(0, 10).map((c) => (
            <button
              key={c}
              type="button"
              title={`${c} (우클릭=제거)`}
              onClick={() => {
                checkpoint();
                onChange(c);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                removeRecentColor(c);
              }}
              className="h-3.5 w-3.5 rounded-sm border border-line"
              style={{ backgroundColor: c }}
            />
          ))}
        </span>
      )}
    </span>
  );
}
