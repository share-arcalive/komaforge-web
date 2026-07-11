import { useSyncExternalStore } from "react";
import { editorStore } from "@repo/editor";
import {
  Button,
  Checkbox,
  ColorField,
  Input,
  Select as UiSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider as UiSlider,
  IconButton,
} from "@repo/ui";
import {
  addRecentColor,
  getRecentColors,
  removeRecentColor,
  subscribeRecentColors,
} from "../lib/recentColors";

// 레이아웃/목록/섹션/빈상태는 @repo/ui 와 시그니처가 동일 → 그대로 재노출.
export { Section, Row, Field, ListRow, EmptyState } from "@repo/ui";

const checkpoint = () => editorStore.getState().checkpoint();

/** 컴팩트 아이콘 버튼(섹션 내 도구모음). @repo/ui IconButton 어댑터(title→label). */
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
  return <IconButton icon={icon} label={title} onClick={onClick} disabled={disabled} danger={danger} />;
}

/** 체크박스 + 라벨. */
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
    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      {label}
    </label>
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
    <Button variant="secondary" size="sm" title={title} disabled={disabled} onClick={onClick}>
      {children}
    </Button>
  );
}

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
    <Input
      type="text"
      value={value}
      onFocus={checkpoint}
      onChange={(e) => onChange(e.target.value)}
      className={`h-7 px-1.5 py-0.5 text-xs ${className}`}
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
    <Input
      type="number"
      value={Number.isFinite(value) ? String(Math.round(value * 100) / 100) : ""}
      onFocus={checkpoint}
      onChange={(e) => {
        const n = Number.parseFloat(e.target.value);
        if (Number.isFinite(n)) onChange(n);
      }}
      style={{ width }}
      className="h-7 w-auto px-1.5 py-0.5 text-xs"
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
    <UiSlider
      className="w-28"
      value={[value]}
      min={min}
      max={max}
      step={step}
      onPointerDown={checkpoint}
      onValueChange={(v) => {
        if (v[0] !== undefined) onChange(v[0]);
      }}
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
    <UiSelect
      value={value}
      onValueChange={(v) => {
        checkpoint();
        onChange(v as T);
      }}
    >
      <SelectTrigger size="sm" className="w-auto">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </UiSelect>
  );
}

const EMPTY: string[] = [];
function useRecentColors(): string[] {
  return useSyncExternalStore(subscribeRecentColors, getRecentColors, () => EMPTY);
}

export function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const recents = useRecentColors();
  return (
    <ColorField
      value={value}
      recents={recents}
      onInteractStart={checkpoint}
      onChange={(v) => {
        onChange(v);
        addRecentColor(v);
      }}
      onPickRecent={(c) => {
        checkpoint();
        onChange(c);
      }}
      onRemoveRecent={(c) => removeRecentColor(c)}
    />
  );
}
