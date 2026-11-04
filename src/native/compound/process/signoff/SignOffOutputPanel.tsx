import { useState } from 'react'
import { Text, TextInput, View } from 'react-native'

import {
  SIGN_OFF_OUTPUT_DEFAULT_LAYOUT,
  SIGN_OFF_OUTPUT_TEXT,
  type SignOffOutputActions,
  type SignOffOutputDraftView,
  type SignOffOutputLayout,
  type SignOffOutputPanelView,
  type SignOffOutputSectionView,
  type SignOffTextSegment,
} from '../../../../headless'
import { nativeRadii, nativeSpace } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import Alert from '../../../primitives/Alert'
import { Button } from '../../../primitives/Button'
import SegmentedControl from '../../../primitives/SegmentedControl'

export type SignOffOutputPanelProps = {
  view: SignOffOutputPanelView
  actions: SignOffOutputActions
  /** The app's clipboard; without it the text stays selectable. */
  onCopy?: (text: string) => unknown
  layout?: SignOffOutputLayout
}

/** Native peer of web's `SignOffOutputText`: text only, each unfilled placeholder standing out. */
export function SignOffOutputText({ segments }: { segments: readonly SignOffTextSegment[] }) {
  const { theme, status } = useNativeTheme()
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border.subtle,
        borderRadius: nativeRadii[2],
        backgroundColor: theme.surface.base,
        padding: 10,
      }}
    >
      <Text selectable style={{ fontSize: 13, lineHeight: 19, color: theme.text.primary }}>
        {segments.map((segment, i) =>
          segment.unfilled ? (
            <Text
              key={i}
              style={{
                fontWeight: '600',
                color: status.on_hold.softFg,
                backgroundColor: status.on_hold.softBg,
              }}
            >
              {segment.text}
            </Text>
          ) : (
            <Text key={i}>{segment.text}</Text>
          ),
        )}
      </Text>
    </View>
  )
}

function CopyAction({ text, onCopy }: { text: string; onCopy: SignOffOutputPanelProps['onCopy'] }) {
  if (!onCopy) return null
  return (
    <Button size="sm" variant="secondary" onPress={() => void onCopy(text)}>
      {SIGN_OFF_OUTPUT_TEXT.copy}
    </Button>
  )
}

function Editor({
  section,
  draft,
  actions,
  onCopy,
}: {
  section: SignOffOutputSectionView
  draft: SignOffOutputDraftView
  actions: SignOffOutputActions
  onCopy: SignOffOutputPanelProps['onCopy']
}) {
  const { theme, status } = useNativeTheme()
  const { key } = section
  const notice = draft.notice
  const row = { flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[2] } as const
  return (
    <View style={{ gap: nativeSpace[2] }}>
      {notice ? <Alert variant="info">{notice.text}</Alert> : null}
      <TextInput
        multiline
        value={draft.text}
        editable={!draft.saving && notice?.kind !== 'closed'}
        onChangeText={(text) => actions.changeDraft(key, text)}
        accessibilityLabel={section.heading ?? SIGN_OFF_OUTPUT_TEXT.edit}
        style={{
          minHeight: 180,
          borderWidth: 1,
          borderColor: theme.border.subtle,
          borderRadius: nativeRadii[2],
          padding: 10,
          fontSize: 13,
          textAlignVertical: 'top',
          color: theme.text.primary,
          backgroundColor: theme.surface.base,
        }}
      />
      {draft.problem ? (
        <Text style={{ fontSize: 12, color: status.stuck.softFg }}>{draft.problem}</Text>
      ) : null}
      {draft.error ? <Alert variant="error">{draft.error}</Alert> : null}
      {notice?.kind === 'changed' ? (
        <>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: theme.text.muted,
            }}
          >
            {SIGN_OFF_OUTPUT_TEXT.newText}
          </Text>
          <SignOffOutputText segments={section.segments} />
        </>
      ) : null}
      {notice?.kind === 'changed' ? (
        <View style={row}>
          <Button
            size="sm"
            variant="primary"
            loading={draft.saving}
            disabled={draft.problem !== undefined}
            onPress={() => void actions.keepEdit(key)}
          >
            {SIGN_OFF_OUTPUT_TEXT.keep}
          </Button>
          <Button size="sm" variant="ghost" onPress={() => actions.cancelEdit(key)}>
            {SIGN_OFF_OUTPUT_TEXT.useNew}
          </Button>
        </View>
      ) : notice?.kind === 'closed' ? (
        <View style={row}>
          <CopyAction text={draft.text} onCopy={onCopy} />
          <Button size="sm" variant="ghost" onPress={() => actions.cancelEdit(key)}>
            {SIGN_OFF_OUTPUT_TEXT.discard}
          </Button>
        </View>
      ) : (
        <View style={row}>
          <Button
            size="sm"
            variant="primary"
            loading={draft.saving}
            disabled={draft.problem !== undefined}
            onPress={() => void actions.saveDraft(key)}
          >
            {SIGN_OFF_OUTPUT_TEXT.save}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={draft.saving}
            onPress={() => actions.cancelEdit(key)}
          >
            {SIGN_OFF_OUTPUT_TEXT.cancel}
          </Button>
        </View>
      )}
    </View>
  )
}

function Section({
  section,
  actions,
  onCopy,
  showHeading,
}: {
  section: SignOffOutputSectionView
  actions: SignOffOutputActions
  onCopy: SignOffOutputPanelProps['onCopy']
  showHeading: boolean
}) {
  const { theme, status } = useNativeTheme()
  const { draft, text } = section
  const muted = { fontSize: 13, color: theme.text.muted }
  return (
    <View style={{ gap: nativeSpace[2] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: 13.5, fontWeight: '600', color: theme.text.primary }}
        >
          {showHeading ? section.heading : ''}
        </Text>
        {!draft && text !== undefined ? (
          <>
            {section.editable ? (
              <Button size="sm" variant="ghost" onPress={() => actions.startEdit(section.key)}>
                {SIGN_OFF_OUTPUT_TEXT.edit}
              </Button>
            ) : null}
            <CopyAction text={text} onCopy={onCopy} />
          </>
        ) : null}
      </View>
      {draft ? (
        <Editor section={section} draft={draft} actions={actions} onCopy={onCopy} />
      ) : section.error ? (
        <Alert variant="error">{section.error}</Alert>
      ) : !section.written ? (
        <Text style={muted}>{SIGN_OFF_OUTPUT_TEXT.notWritten}</Text>
      ) : section.loading ? (
        <Text style={muted}>{SIGN_OFF_OUTPUT_TEXT.loading}</Text>
      ) : (
        <>
          <SignOffOutputText segments={section.segments} />
          {section.unfilled.length > 0 ? (
            <Text style={{ fontSize: 12, color: status.on_hold.softFg }}>
              {`${SIGN_OFF_OUTPUT_TEXT.stillToFill} ${section.unfilled.join(' ')}`}
            </Text>
          ) : null}
        </>
      )}
    </View>
  )
}

/**
 * Native peer of web's `SignOffOutputPanel`: an output behind its chip, to read,
 * edit and copy, with a section per repo where it has one. Columns stack on a
 * phone.
 */
export default function SignOffOutputPanel({
  view,
  actions,
  onCopy,
  layout = SIGN_OFF_OUTPUT_DEFAULT_LAYOUT,
}: SignOffOutputPanelProps) {
  const { sections } = view
  const [picked, setPicked] = useState<string | undefined>(undefined)
  const several = sections.length > 1
  if (layout === 'repo-switch' && several) {
    const shown = sections.find((s) => s.key === picked) ?? sections[0]!
    return (
      <View style={{ gap: nativeSpace[3] }}>
        <SegmentedControl
          size="sm"
          ariaLabel={view.label}
          value={shown.key}
          onChange={setPicked}
          options={sections.map((s) => ({ value: s.key, label: s.heading ?? s.projectId }))}
        />
        <Section section={shown} actions={actions} onCopy={onCopy} showHeading={false} />
      </View>
    )
  }
  return (
    <View style={{ gap: nativeSpace[4] }}>
      {sections.map((section) => (
        <Section
          key={section.key}
          section={section}
          actions={actions}
          onCopy={onCopy}
          showHeading={several}
        />
      ))}
    </View>
  )
}
