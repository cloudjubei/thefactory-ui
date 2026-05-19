// Public surface for @uikit/native.
// React Native peers of `src/web/`. May import @uikit/tokens and @uikit/headless.
//
// Conventions mirror `src/web/index.ts`: components are surfaced as named
// exports regardless of whether the underlying module uses `export default`;
// types travel with their component as `<ComponentName>Props`.

export * from '../tokens/native'

// Primitives
export { default as Alert, type AlertProps, type AlertVariant } from './primitives/Alert'
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './primitives/Button'
export { default as DotBadge, type DotBadgeProps } from './primitives/DotBadge'
export { default as Field, type FieldProps } from './primitives/Field'
export { Input, type InputProps, type InputSize } from './primitives/Input'
export {
  ConfirmDialog,
  Modal,
  type ConfirmDialogProps,
  type ModalProps,
  type ModalSize,
} from './primitives/Modal'
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type SelectContentProps,
  type SelectGroupProps,
  type SelectItemProps,
  type SelectProps,
  type SelectTriggerProps,
  type SelectTriggerSize,
  type SelectValueProps,
} from './primitives/Select'
export {
  default as SegmentedControl,
  type SegmentedControlProps,
  type SegmentedOption,
  type SegmentedSize,
} from './primitives/SegmentedControl'
export {
  default as Skeleton,
  SkeletonText,
  type SkeletonProps,
  type SkeletonTextProps,
} from './primitives/Skeleton'
export { default as Spinner, type SpinnerProps } from './primitives/Spinner'
export {
  default as SpinnerWithDot,
  type SpinnerWithDotProps,
} from './primitives/SpinnerWithDot'
export { Switch, type SwitchProps } from './primitives/Switch'
export { Textarea, type TextareaProps } from './primitives/Textarea'
export {
  ToastProvider,
  useToast,
  type ToastMessage,
  type ToastVariant,
} from './primitives/Toast'
export {
  default as Tooltip,
  type TooltipPlacement,
  type TooltipProps,
  type TooltipSideAlign,
  type TooltipVariant,
} from './primitives/Tooltip'

// Compounds
export { BranchChip, type BranchChipProps, type BranchChipType } from './compound/BranchChip'
export {
  default as DependencyChip,
  type DependencyChipKind,
  type DependencyChipProps,
  type DependencyChipVariant,
} from './compound/DependencyChip'
export { FeatureCard, type FeatureCardData, type FeatureCardProps } from './compound/FeatureCard'
export {
  default as NotificationBadge,
  getNotificationBadgeColor,
  type NotificationBadgeColor,
  type NotificationBadgeProps,
} from './compound/NotificationBadge'
export {
  default as StatusControl,
  STATUS_LABELS,
  STATUS_ORDER,
  statusKey,
  statusLabel,
  type StatusControlProps,
  type StatusSemanticKey,
  type StoryStatus,
} from './compound/StatusControl'
export { StoryCard, type StoryCardData, type StoryCardProps } from './compound/StoryCard'
export { default as CostChip, type CostChipProps } from './compound/chips/CostChip'
export { default as ProjectChip, type ProjectChipProps } from './compound/chips/ProjectChip'
export {
  default as StatusChip,
  type ChipState,
  type StatusChipProps,
} from './compound/chips/StatusChip'
export { default as TokensChip, type TokensChipProps } from './compound/chips/TokensChip'
export { default as TurnChip, type TurnChipProps } from './compound/chips/TurnChip'
export {
  default as DependencyBullet,
  type DependencyBulletProps,
  type DependencyCardShape,
  type ResolvedDependency,
} from './compound/stories/DependencyBullet'
export {
  default as ExclamationChip,
  type ExclamationChipProps,
} from './compound/stories/ExclamationChip'
export {
  default as StoryAndFeatureCallout,
  type StoryAndFeatureCalloutProps,
} from './compound/stories/StoryAndFeatureCallout'
export {
  default as WarningChip,
  type WarningChipProps,
} from './compound/stories/WarningChip'
export {
  default as AgentModelQuickSelect,
  type AgentModelQuickSelectProps,
  type ModelQuickSelectOption,
} from './compound/agents/AgentModelQuickSelect'
export {
  default as AgentRunBullet,
  type AgentRunBulletData,
  type AgentRunBulletProps,
} from './compound/agents/AgentRunBullet'
export {
  default as AgentRunRowCard,
  type AgentRunRowCardData,
  type AgentRunRowCardProps,
} from './compound/agents/AgentRunRowCard'
export {
  ModelChip,
  type ModelChipConfig,
  type ModelChipMode,
  type ModelChipProps,
  type ModelPriceRecord,
} from './compound/ModelChip'
export {
  default as StoryForm,
  type StoryFormHandle,
  type StoryFormProps,
  type StoryFormValues,
} from './compound/StoryForm'
export { PathDisplay, splitPath, type PathDisplayProps } from './compound/PathDisplay'
export {
  default as FileDisplay,
  type FileDisplayProps,
  type UikitFileMeta,
} from './compound/files/FileDisplay'
export {
  default as FileSelector,
  type FileSelectorProps,
} from './compound/files/FileSelector'
export {
  default as ContextFileChip,
  type ContextFileChipProps,
} from './compound/stories/ContextFileChip'
export {
  default as RichText,
  type RichTextProps,
} from './compound/files/RichText'
export {
  default as GroupHome,
  type GroupHomeProjectCard,
  type GroupHomeProps,
} from './compound/GroupHome'
export {
  default as ChatBody,
  type ChatBodyProps,
} from './compound/chat/ChatBody'
export {
  default as ChatHeader,
  type ChatHeaderProps,
} from './compound/chat/ChatHeader'
export {
  default as ChatInput,
  type ChatInputAttachment,
  type ChatInputProps,
} from './compound/chat/ChatInput'
export {
  default as MessageList,
  type MessageListProps,
} from './compound/chat/MessageList'
export {
  default as MessageRow,
  type MessageRowProps,
} from './compound/chat/MessageRow'
export {
  default as SystemPromptBubble,
  type SystemPromptBubbleProps,
} from './compound/chat/SystemPromptBubble'
export {
  default as ThinkingRow,
  type ThinkingRowProps,
} from './compound/chat/ThinkingRow'

// Status / shell compounds
export {
  default as DisconnectedBanner,
  type DisconnectedBannerProps,
} from './compound/DisconnectedBanner'

// Chat-view domain types (re-exported from headless for convenience)
export type {
  ChatContextLike,
  ChatLiveStateLike,
  ChatMessageLike,
  MessageUsageLike,
  PendingToolConfirmationLike,
  ToolCallLike,
  ToolResultLike,
  ToolResultTypeLike,
} from '../headless/utils/chatTypes'
