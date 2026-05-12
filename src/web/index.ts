// Public surface for @uikit/web.
// DOM + Tailwind. May import @uikit/tokens and @uikit/headless.
//
// Conventions:
//   - Components are exposed as named exports here regardless of whether the
//     underlying module uses `export default`. Internal/deep imports remain free
//     to use the default form.
//   - Types travel with their component. Props types use the `<ComponentName>Props`
//     form; supporting unions stay alongside (e.g. `TooltipPlacement`).

// Primitives
export { default as Alert, type AlertProps, type AlertVariant } from './primitives/Alert'
export { Button, type ButtonProps } from './primitives/Button'
export { Chip, type ChipProps } from './primitives/Chip'
export { DotBadge, type DotBadgeProps } from './primitives/DotBadge'
export { default as Field, type FieldProps } from './primitives/Field'
export { Input, type InputProps, type InputSize } from './primitives/Input'
export { ConfirmDialog, Modal, type ModalProps, type ModalSize } from './primitives/Modal'
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type SelectTriggerSize,
} from './primitives/Select'
export {
  NativeSelect,
  type NativeSelectProps,
  type NativeSelectSize,
} from './primitives/NativeSelect'
export {
  default as SegmentedControl,
  type SegmentedControlProps,
  type SegmentedOption,
  type SegmentedSize,
} from './primitives/SegmentedControl'
export { default as Skeleton, SkeletonText } from './primitives/Skeleton'
export { default as Spinner } from './primitives/Spinner'
export { default as SpinnerWithDot, type SpinnerWithDotProps } from './primitives/SpinnerWithDot'
export { default as Surface, type SurfaceProps } from './primitives/Surface'
export { Switch, type SwitchProps } from './primitives/Switch'
export { Textarea } from './primitives/Textarea'
export { ToastProvider, useToast, type ToastMessage, type ToastVariant } from './primitives/Toast'
export {
  default as Tooltip,
  type TooltipPlacement,
  type TooltipProps,
  type TooltipSideAlign,
  type TooltipVariant,
} from './primitives/Tooltip'

// Compound
export { BranchChip, type BranchChipProps, type BranchChipType } from './compound/BranchChip'
export { default as Code, type CodeProps } from './compound/Code'
export {
  default as CollapsibleSidebar,
  type CollapsibleSidebarItem,
  type CollapsibleSidebarProps,
} from './compound/CollapsibleSidebar'
export {
  DiffViewer,
  generateHunkPatch,
  generateSelectedPatch,
  InlineTextDiff,
  parseUnifiedDiff,
  SimpleSplitText,
  SimpleUnifiedDiff,
  StructuredUnifiedDiff,
  type DiffViewerProps,
  type IntraMode,
  type ParsedHunk,
  type StructuredUnifiedDiffProps,
} from './compound/diff'
export {
  applyMention,
  applyReference,
  FileDisplay,
  FileMentionsTextarea,
  FileSelector,
  FileTypeIcon,
  parseMention,
  parseReference,
  rankMentionMatches,
  RichText,
  type FileDisplayProps,
  type FileMentionsTextareaProps,
  type FileSelectorProps,
  type FileTypeIconProps,
  type MentionParse,
  type ReferenceParse,
  type ReferenceSuggestion,
  type RichTextProps,
  type UikitFileMeta,
} from './compound/files'
export {
  CostChip,
  ProjectChip,
  StatusChip,
  StatusIcon,
  TokensChip,
  TurnChip,
  type ChipState,
  type CostChipProps,
  type ProjectChipProps,
  type StatusChipProps,
  type TokensChipProps,
} from './compound/chips'
export {
  CommandPalette,
  type CommandPaletteItem,
  type CommandPaletteProps,
} from './compound/CommandPalette'
export { default as JsonView, type JsonViewProps } from './compound/JsonView'
export { default as Markdown, type MarkdownProps } from './compound/Markdown'
export {
  default as MarkdownEditor,
  type MarkdownEditorPaneView,
  type MarkdownEditorProps,
} from './compound/MarkdownEditor'
export {
  default as NotificationBadge,
  getNotificationBadgeColorClass,
  type NotificationBadgeColor,
  type NotificationBadgeProps,
} from './compound/NotificationBadge'
export {
  ICON_RAIL_DEFAULT_WIDTH,
  IconRail,
  IconRailButton,
  type IconRailButtonProps,
  type IconRailProps,
} from './compound/IconRail'
export { PathDisplay, splitPath } from './compound/PathDisplay'
export {
  PROJECT_ICON_REGISTRY,
  PROJECT_ICONS,
  renderProjectIcon,
  type ProjectIconKey,
} from './compound/projectIcons'
export { ResizeHandle, type ResizeHandleProps } from './compound/ResizeHandle'
export { default as SafeText, type SafeTextProps } from './compound/SafeText'
export {
  TimeAxisHeader,
  TimeAxisRow,
  type TimeAxisHeaderGroup,
  type TimeAxisHeaderProps,
  type TimeAxisRowProps,
  type TimeAxisUnit,
} from './compound/TimeAxis'
export { default as TypewriterText, type TypewriterTextProps } from './compound/TypewriterText'
export {
  ShortcutsHelpView,
  type ShortcutEntry,
  type ShortcutsHelpViewProps,
} from './compound/ShortcutsHelpView'

// Utils
export { cn } from './utils/cn'
