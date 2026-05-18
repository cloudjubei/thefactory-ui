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
  default as Skeleton,
  SkeletonText,
  type SkeletonProps,
  type SkeletonTextProps,
} from './primitives/Skeleton'
export { default as Spinner, type SpinnerProps } from './primitives/Spinner'
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
