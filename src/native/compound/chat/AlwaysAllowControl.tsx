import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { ALWAYS_ALLOW_MENU_LABEL } from '../../../headless/utils/alwaysAllowConstants'
import type { AlwaysAllowChoiceView, AlwaysAllowScope } from '../../../headless/utils/chatTypes'
import { nativePalette } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconCheck, IconChevronDown } from '../../icons'
import { Button } from '../../primitives/Button'
import ActionMenu from '../ActionMenu'

export type AlwaysAllowControlProps = {
  view: AlwaysAllowChoiceView
  toolName: string
  /** Always allow in `scope`, or (`undefined`) take a marked choice back. */
  onChoose: (scope: AlwaysAllowScope | undefined) => void
  /** `row`: the compact link on a tool row. `button`: a ghost button beside a card's decisions. */
  variant?: 'row' | 'button'
  disabled?: boolean
}

/**
 * Native peer of web's `AlwaysAllowControl`: one tap gives the default — the
 * chat the ask was raised in — and the chevron opens a sheet of the other
 * places it can apply, each saying what it allows.
 */
export default function AlwaysAllowControl({
  view,
  toolName,
  onChoose,
  variant = 'row',
  disabled = false,
}: AlwaysAllowControlProps) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(false)
  const menuLabel = ALWAYS_ALLOW_MENU_LABEL(toolName)

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {variant === 'button' ? (
        <Button
          variant="ghost"
          size="sm"
          onPress={() => onChoose(view.primary.scope)}
          disabled={disabled}
          accessibilityHint={view.title}
        >
          {view.primary.label}
        </Button>
      ) : (
        <Pressable
          onPress={() => onChoose(view.primary.scope)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityHint={view.title}
          accessibilityState={{ selected: view.marked, disabled }}
          hitSlop={8}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: view.marked ? '600' : '400',
              color: view.marked ? nativePalette.green[600] : theme.text.secondary,
            }}
          >
            {view.primary.label}
          </Text>
        </Pressable>
      )}
      {view.options.length > 0 ? (
        <Pressable
          onPress={() => setOpen(true)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={menuLabel}
          hitSlop={8}
          style={{ padding: 2 }}
        >
          <IconChevronDown size={12} color={theme.text.secondary} />
        </Pressable>
      ) : null}
      <ActionMenu
        isOpen={open}
        onClose={() => setOpen(false)}
        title={menuLabel}
        actions={view.options.map((option) => ({
          key: option.scope,
          label: option.label,
          description: option.description,
          ...(option.selected
            ? { icon: <IconCheck size={16} color={nativePalette.green[600]} /> }
            : {}),
          onPress: () => {
            setOpen(false)
            onChoose(option.scope)
          },
        }))}
      />
    </View>
  )
}
