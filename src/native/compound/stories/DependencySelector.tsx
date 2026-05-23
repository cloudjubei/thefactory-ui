import { Pressable, ScrollView, Text, View } from 'react-native'

import {
  useDependencySelector,
  type DependencySelectorOptions,
  type StoryLike,
} from '../../../headless'
import { Input } from '../../primitives/Input'
import { Modal } from '../../primitives/Modal'
import { Button } from '../../primitives/Button'
import { nativeLightTheme, nativeRadii, nativeSpace } from '../../../tokens/native'

export interface DependencySelectorProps extends Omit<DependencySelectorOptions, 'stories'> {
  /** Modal open state — consumer-owned. */
  isOpen: boolean
  onClose: () => void
  stories: ReadonlyArray<StoryLike>
  /** Fires on `Add` with the selected deps (`["3", "3.2", …]`). */
  onConfirm: (deps: ReadonlyArray<string>) => void
  /** Modal title — defaults to `"Add references"`. */
  title?: string
}

/**
 * Native peer of
 * [web's `DependencySelector`](../../../../../thefactory-overseer-web/src/ui/components/stories/DependencySelector.tsx).
 * Modal-based picker for stories + their features as dependency tokens
 * (`#3` / `#3.2`). Shares the same headless
 * [`useDependencySelector`](../../../headless/hooks/useDependencySelector.ts)
 * hook web uses — only the row chrome (checkboxes / list layout / search
 * input) is platform-specific.
 *
 * Self-references and already-selected deps render disabled. Tap any row
 * (story or feature) to toggle; `Add N` confirms; cancel discards.
 */
export default function DependencySelector({
  isOpen,
  onClose,
  stories,
  onConfirm,
  currentStoryId,
  currentFeatureId,
  existingDeps,
  getStoryDisplayIndex,
  getFeatureDisplayIndex,
  sortStories,
  title = 'Add references',
}: DependencySelectorProps) {
  const { search, setSearch, selected, items, toggle, canConfirm, collect } = useDependencySelector(
    {
      stories,
      currentStoryId,
      currentFeatureId,
      existingDeps,
      getStoryDisplayIndex,
      getFeatureDisplayIndex,
      sortStories,
    },
  )

  const onAdd = () => {
    onConfirm(collect())
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        // Cancel is intentionally omitted — closing via the modal's X /
        // overlay / back gesture IS the cancel. The only footer action is
        // the primary confirm.
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
          <Button onPress={onAdd} disabled={!canConfirm}>
            {selected.size > 0 ? `Add ${selected.size}` : 'Add'}
          </Button>
        </View>
      }
    >
      <View style={{ gap: nativeSpace[3] }}>
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="Search stories or features…"
          autoCapitalize="none"
          autoCorrect={false}
          size="sm"
        />
        <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
          {items.length === 0 ? (
            <Text
              style={{
                fontSize: 13,
                color: nativeLightTheme.text.muted,
                paddingVertical: nativeSpace[3],
                textAlign: 'center',
              }}
            >
              No stories or features match.
            </Text>
          ) : (
            items.map((item) => (
              <View key={item.story.id} style={{ marginBottom: nativeSpace[2] }}>
                <DepRow
                  display={item.storyDisplay}
                  title={item.story.title}
                  description={item.story.description}
                  disabled={
                    item.storyDisabled ||
                    (currentStoryId === item.story.id && currentFeatureId === undefined)
                  }
                  selected={selected.has(item.storyDep)}
                  onToggle={() => toggle(item.storyDep)}
                  level={0}
                  matches={item.storyMatches}
                />
                {item.features.map((f) => (
                  <DepRow
                    key={f.featureDep}
                    display={f.featureDisplay}
                    title={f.feature.title}
                    description={f.feature.description}
                    disabled={f.disabled}
                    selected={selected.has(f.featureDep)}
                    onToggle={() => toggle(f.featureDep)}
                    level={1}
                    matches
                  />
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}

function DepRow({
  display,
  title,
  description,
  disabled,
  selected,
  onToggle,
  level,
  matches,
}: {
  display: string
  title: string
  description?: string
  disabled: boolean
  selected: boolean
  onToggle: () => void
  level: 0 | 1
  matches: boolean
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      onPress={disabled ? undefined : onToggle}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: nativeSpace[2],
        paddingVertical: nativeSpace[2],
        paddingHorizontal: nativeSpace[2],
        marginLeft: level === 0 ? 0 : nativeSpace[5],
        borderRadius: nativeRadii[2],
        backgroundColor: pressed && !disabled ? nativeLightTheme.surface.hover : 'transparent',
        opacity: disabled || !matches ? 0.5 : 1,
      })}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          borderWidth: 1,
          borderColor: selected ? nativeLightTheme.accent.primary : nativeLightTheme.border.default,
          backgroundColor: selected ? nativeLightTheme.accent.primary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected && (
          <Text style={{ color: nativeLightTheme.text.inverted, fontSize: 12, lineHeight: 14 }}>
            ✓
          </Text>
        )}
      </View>
      <Text
        style={{
          fontSize: 12,
          color: nativeLightTheme.accent.primary,
          fontVariant: ['tabular-nums'],
          minWidth: 32,
        }}
      >
        #{display}
      </Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, color: nativeLightTheme.text.primary }} numberOfLines={1}>
          {title}
        </Text>
        {description ? (
          <Text
            style={{ fontSize: 12, color: nativeLightTheme.text.muted, marginTop: 2 }}
            numberOfLines={1}
          >
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}
