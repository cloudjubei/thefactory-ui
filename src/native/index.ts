// Public surface for @uikit/native.
// React Native presentation peers of `src/web/`. May import `react`,
// `react-native`, `tokens/`, `headless/`. Must NOT import from `react-dom`
// or `src/web/` — the boundary check enforces this.
//
// Conventions mirror `src/web/index.ts`:
//   - Components are exposed as named exports here regardless of whether the
//     underlying module uses `export default`.
//   - Types travel with their component. Props types use the `<ComponentName>Props`
//     form; supporting unions stay alongside.

// RN-flavoured token exports — numeric metrics, flat hex colours, RN-typed
// shadow / status / semantic-theme objects. Consumers of `'thefactory-ui/native'`
// reach for these when they need to read a token value directly inside a
// `style={{}}` prop or feed them into a NativeWind theme extension.
export * from '../tokens/native'

// Primitives
export { default as Alert, type AlertProps, type AlertVariant } from './primitives/Alert'
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './primitives/Button'
export { default as Field, type FieldProps } from './primitives/Field'
export { Input, type InputProps, type InputSize } from './primitives/Input'
export {
  default as Skeleton,
  SkeletonText,
  type SkeletonProps,
  type SkeletonTextProps,
} from './primitives/Skeleton'
export { default as Spinner, type SpinnerProps } from './primitives/Spinner'
export { Switch, type SwitchProps } from './primitives/Switch'
export { Textarea, type TextareaProps } from './primitives/Textarea'
