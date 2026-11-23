import { ScrollView, Text, View } from 'react-native'
import { useFileMerge, type FileMergeDialogProps } from '../../../headless/hooks/useFileMerge'
import {
  nativeFontFamilies,
  nativeFontSizes,
  nativeFontWeights,
  nativeRadii,
  nativeSpace,
} from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import SegmentedControl from '../../primitives/SegmentedControl'
import { Textarea } from '../../primitives/Textarea'

type Choice = 'ours' | 'theirs' | 'both'
const CHOICES: { key: Choice; label: string }[] = [
  { key: 'ours', label: 'Accept ours' },
  { key: 'theirs', label: 'Accept theirs' },
  { key: 'both', label: 'Accept both' },
]

const BOTH_ORDER_OPTIONS = [
  { value: 'ours-then-theirs', label: 'ours → theirs' },
  { value: 'theirs-then-ours', label: 'theirs → ours' },
]

function MergeSide({ label, text }: { label: string; text: string }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: nativeSpace[2] }}>
      <Text style={{ fontSize: nativeFontSizes.xs, color: theme.text.muted }}>{label}</Text>
      <ScrollView
        horizontal
        style={{
          borderRadius: nativeRadii[2],
          borderWidth: 1,
          borderColor: theme.border.subtle,
          backgroundColor: theme.surface.muted,
        }}
        contentContainerStyle={{ padding: nativeSpace[4] }}
      >
        <Text
          selectable
          style={{
            fontFamily: nativeFontFamilies.mono,
            fontSize: nativeFontSizes.xs,
            color: theme.text.primary,
          }}
        >
          {text || '(empty)'}
        </Text>
      </ScrollView>
    </View>
  )
}

/** Native hosts open this with their canonical draft and the accepted disk base.
 * Revalidate the pending change before applying the result to the host editor. */
export default function FileMergeDialog({
  input,
  onClose,
  onApply,
  stale,
  onReload,
  save,
}: FileMergeDialogProps) {
  const { theme, status } = useNativeTheme()
  const { conflicts, result, setEdited, order, setOrder, choose } = useFileMerge(input)
  const blocked = !!stale || conflicts.length > 0
  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Review and merge"
      size="xl"
      fillHeight
      contentStyle={{ flex: 1, minHeight: 0 }}
      footer={
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            gap: nativeSpace[4],
          }}
        >
          <Button variant="secondary" onPress={onClose}>
            Cancel
          </Button>
          <Button
            disabled={blocked}
            onPress={() => {
              if (!blocked) onApply(result)
            }}
          >
            {save ? 'Merge and save' : 'Apply merge'}
          </Button>
        </View>
      }
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: nativeSpace[6] }}
        keyboardShouldPersistTaps="handled"
      >
        {stale ? (
          <Alert>
            {onReload ? (
              <View style={{ gap: nativeSpace[4] }}>
                <Text style={{ fontSize: 14, color: status.stuck.softFg }}>
                  The file changed during review. Load the latest remote head to merge against.
                </Text>
                <View style={{ flexDirection: 'row' }}>
                  <Button size="sm" variant="secondary" onPress={onReload}>
                    Load latest remote
                  </Button>
                </View>
              </View>
            ) : (
              'The file changed during review. Close and reopen the merge to review the latest edits.'
            )}
          </Alert>
        ) : null}
        <Text
          style={{
            fontFamily: nativeFontFamilies.mono,
            fontSize: nativeFontSizes.xs,
            color: theme.text.secondary,
          }}
        >
          {input.path}
        </Text>
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontSize: nativeFontSizes.xs, color: theme.text.muted }}
        >
          {conflicts.length ? `${conflicts.length} remaining` : 'No conflicts remaining'}
        </Text>
        <MergeSide label="Theirs (incoming)" text={input.theirs} />
        <Text style={{ fontSize: nativeFontSizes.xs, color: theme.text.muted }}>
          Result {conflicts.length ? '(resolve hunks to edit)' : '(editable)'}
        </Text>
        <Textarea
          accessibilityLabel="Result"
          value={result}
          onChangeText={setEdited}
          disabled={blocked}
          autoCapitalize="none"
          autoCorrect={false}
          rows={6}
          style={{ fontFamily: nativeFontFamilies.mono, fontSize: nativeFontSizes.xs }}
        />
        <MergeSide label="Ours (current)" text={input.ours} />
        {conflicts.length > 0 && (
          <View style={{ gap: nativeSpace[2] }}>
            <Text style={{ fontSize: nativeFontSizes.xs, color: theme.text.muted }}>
              Both order
            </Text>
            <SegmentedControl
              size="sm"
              options={BOTH_ORDER_OPTIONS}
              value={order}
              onChange={(v) => setOrder(v === 'theirs-then-ours' ? v : 'ours-then-theirs')}
            />
          </View>
        )}
        {conflicts.length > 1 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[4] }}>
            {CHOICES.map(({ key, label }) => (
              <Button key={key} size="sm" variant="secondary" onPress={() => choose('all', key)}>
                {`${label} (all)`}
              </Button>
            ))}
          </View>
        )}
        {conflicts.map(({ index, ours, theirs }) => (
          <View
            key={index}
            style={{
              gap: nativeSpace[4],
              borderRadius: nativeRadii[2],
              borderWidth: 1,
              borderColor: status.review.softBorder,
              backgroundColor: status.review.softBg,
              padding: nativeSpace[6],
            }}
          >
            <Text
              style={{
                fontSize: nativeFontSizes.xs,
                fontWeight: nativeFontWeights.semibold,
                color: theme.text.primary,
              }}
            >
              Conflict
            </Text>
            <MergeSide label="Ours (current)" text={ours} />
            <MergeSide label="Theirs (incoming)" text={theirs} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[4] }}>
              {CHOICES.map(({ key, label }) => (
                <Button key={key} size="sm" variant="secondary" onPress={() => choose(index, key)}>
                  {label}
                </Button>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </Modal>
  )
}
