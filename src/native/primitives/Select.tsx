import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { Modal as RNModal, Pressable, ScrollView, Text, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import {
  nativeControls,
  nativeLightTheme,
  nativeRadii,
  nativeShadows,
  nativeSpace,
} from '../../tokens/native'

export type SelectTriggerSize = 'sm' | 'md' | 'lg'

interface SelectContextValue {
  value?: string
  onValueChange: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
  itemLabels: Map<string, ReactNode>
}

const SelectCtx = createContext<SelectContextValue | null>(null)

function useSelectCtx(component: string): SelectContextValue {
  const ctx = useContext(SelectCtx)
  if (!ctx) throw new Error(`<${component}> must be used inside <Select>`)
  return ctx
}

export interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children: ReactNode
}

// Pre-walks the children tree to extract (value, label) pairs for every
// `<SelectItem>` it finds. This lets `<SelectValue>` resolve the current
// label on the very first render — before the Modal has ever opened.
function collectItemLabels(children: ReactNode, into: Map<string, ReactNode>): void {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    if (child.type === SelectItem) {
      const props = (child as ReactElement<SelectItemProps>).props
      into.set(props.value, props.children)
      return
    }
    const sub = (child.props as { children?: ReactNode }).children
    if (sub !== undefined) collectItemLabels(sub, into)
  })
}

function findContent(children: ReactNode): ReactNode | null {
  let found: ReactNode | null = null
  Children.forEach(children, (child) => {
    if (found || !isValidElement(child)) return
    if (child.type === SelectContent) {
      found = (child as ReactElement<{ children?: ReactNode }>).props.children ?? null
    }
  })
  return found
}

export function Select({ value: controlled, defaultValue, onValueChange, children }: SelectProps) {
  const [internal, setInternal] = useState<string | undefined>(defaultValue)
  const [open, setOpen] = useState(false)

  const value = controlled ?? internal
  const handleChange = (v: string) => {
    if (controlled === undefined) setInternal(v)
    onValueChange?.(v)
  }

  const itemLabels = useMemo(() => {
    const map = new Map<string, ReactNode>()
    collectItemLabels(children, map)
    return map
  }, [children])

  const ctx = useMemo<SelectContextValue>(
    () => ({ value, onValueChange: handleChange, open, setOpen, itemLabels }),
    // handleChange closes over `controlled` + `onValueChange`; the
    // identity-stable inputs are tracked explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, controlled, onValueChange, open, itemLabels],
  )

  const contentChildren = useMemo(() => findContent(children), [children])

  return (
    <SelectCtx.Provider value={ctx}>
      {children}
      <RNModal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: nativeSpace[6],
          }}
        >
          <Pressable
            accessible={false}
            onPress={() => {}}
            style={{
              width: '100%',
              maxWidth: 360,
              maxHeight: '80%',
              borderRadius: nativeRadii[3],
              backgroundColor: nativeLightTheme.surface.overlay,
              borderWidth: 1,
              borderColor: nativeLightTheme.border.subtle,
              ...nativeShadows[4],
            }}
          >
            <ScrollView contentContainerStyle={{ padding: nativeSpace[3] }}>
              {contentChildren}
            </ScrollView>
          </Pressable>
        </Pressable>
      </RNModal>
    </SelectCtx.Provider>
  )
}

export interface SelectTriggerProps {
  children?: ReactNode
  size?: SelectTriggerSize
  disabled?: boolean
  className?: string
  style?: StyleProp<ViewStyle>
}

const TRIGGER_HEIGHT: Record<SelectTriggerSize, number> = {
  sm: nativeControls.height.sm,
  md: nativeControls.height.md,
  lg: nativeControls.height.lg,
}
const TRIGGER_PAD_X: Record<SelectTriggerSize, number> = {
  sm: nativeSpace[5],
  md: nativeSpace[6],
  lg: nativeSpace[7],
}
const TRIGGER_FONT_SIZE: Record<SelectTriggerSize, number> = { sm: 13, md: 14, lg: 16 }

export function SelectTrigger({
  children,
  size = 'md',
  disabled = false,
  className,
  style,
}: SelectTriggerProps) {
  const { setOpen, open } = useSelectCtx('SelectTrigger')
  return (
    <Pressable
      accessibilityRole="combobox"
      accessibilityState={{ expanded: open, disabled }}
      disabled={disabled}
      onPress={() => setOpen(true)}
      className={className}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: nativeSpace[4],
          height: TRIGGER_HEIGHT[size],
          paddingHorizontal: TRIGGER_PAD_X[size],
          borderRadius: nativeRadii[2],
          borderWidth: 1,
          borderColor: nativeLightTheme.border.default,
          backgroundColor: nativeLightTheme.surface.raised,
          opacity: disabled ? 0.6 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        {typeof children === 'string' ? (
          <Text
            numberOfLines={1}
            style={{ fontSize: TRIGGER_FONT_SIZE[size], color: nativeLightTheme.text.primary }}
          >
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
      <Text style={{ fontSize: 12, color: nativeLightTheme.text.muted }}>▾</Text>
    </Pressable>
  )
}

export interface SelectValueProps {
  placeholder?: string
}

export function SelectValue({ placeholder }: SelectValueProps) {
  const { value, itemLabels } = useSelectCtx('SelectValue')
  const label = value !== undefined ? (itemLabels.get(value) ?? value) : undefined
  if (label === undefined || label === '') {
    return placeholder ? (
      <Text numberOfLines={1} style={{ fontSize: 14, color: nativeLightTheme.text.muted }}>
        {placeholder}
      </Text>
    ) : null
  }
  return typeof label === 'string' ? (
    <Text numberOfLines={1} style={{ fontSize: 14, color: nativeLightTheme.text.primary }}>
      {label}
    </Text>
  ) : (
    <>{label}</>
  )
}

export interface SelectContentProps {
  children?: ReactNode
}

// Sentinel — `Select` walks for this and renders its children inside the
// dropdown Modal. Rendering nothing here keeps the trigger row clean.
export function SelectContent(_: SelectContentProps): null {
  return null
}

export interface SelectGroupProps {
  label?: ReactNode
  children?: ReactNode
}

export function SelectGroup({ label, children }: SelectGroupProps) {
  return (
    <View style={{ paddingVertical: nativeSpace[2] }}>
      {label != null && (
        <Text
          style={{
            paddingHorizontal: nativeSpace[5],
            paddingVertical: nativeSpace[2],
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            color: nativeLightTheme.text.muted,
          }}
        >
          {label}
        </Text>
      )}
      {children}
    </View>
  )
}

export interface SelectItemProps {
  value: string
  children: ReactNode
  disabled?: boolean
  className?: string
}

export function SelectItem({ value, children, disabled = false, className }: SelectItemProps) {
  const { value: selected, onValueChange, setOpen } = useSelectCtx('SelectItem')
  const active = selected === value
  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={() => {
        onValueChange(value)
        setOpen(false)
      }}
      className={className}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: nativeSpace[4],
        paddingVertical: nativeSpace[5],
        paddingHorizontal: nativeSpace[5],
        borderRadius: nativeRadii[1],
        backgroundColor: pressed ? nativeLightTheme.surface.muted : 'transparent',
        opacity: disabled ? 0.5 : 1,
      })}
    >
      <View style={{ flex: 1 }}>
        {typeof children === 'string' ? (
          <Text
            style={{
              fontSize: 14,
              fontWeight: active ? '600' : '400',
              color: nativeLightTheme.text.primary,
            }}
          >
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
      {active && <Text style={{ fontSize: 14, color: nativeLightTheme.accent.primary }}>✓</Text>}
    </Pressable>
  )
}
