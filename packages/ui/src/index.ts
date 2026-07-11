// @repo/ui — 디자인 시스템 배럴. (스타일은 "@repo/ui/styles.css" 로 별도 import)

// ── 기반 ──
export { cn } from "./lib/cn";
export { useTheme, setTheme, toggleTheme, themeScript, type Theme } from "./lib/theme";

// ── 프리미티브 (shadcn) ──
export { Button, buttonVariants, type ButtonProps } from "./components/button";
export { Badge, badgeVariants, type BadgeProps } from "./components/badge";
export { Input } from "./components/input";
export { Textarea } from "./components/textarea";
export { Label } from "./components/label";
export { Separator } from "./components/separator";
export { Checkbox } from "./components/checkbox";
export { Slider } from "./components/slider";
export { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./components/collapsible";
export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "./components/popover";
export { ScrollArea, ScrollBar } from "./components/scroll-area";
export {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/tooltip";
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./components/select";
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "./components/dialog";
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./components/dropdown-menu";

// ── 에디터 블록 (합성) ──
export { Section } from "./blocks/section";
export { ListRow } from "./blocks/list-row";
export { Field, Row } from "./blocks/field";
export { IconButton } from "./blocks/icon-button";
export { EmptyState } from "./blocks/empty-state";
export { Kbd } from "./blocks/kbd";
export { ColorField } from "./blocks/color-field";
export { ThemeToggle } from "./components/theme-toggle";
