import { useState } from 'react'
import { Text, View } from 'react-native'
import type { ProcessWaitAction } from 'thefactory-tools/types'

import { PROCESS_RUN_WAIT_COPY, PROCESS_WAIT_NOTE_MAX_CHARS } from '../../../headless'
import type {
  ProcessRunWaitView,
  ProcessWaitConfirmView,
} from '../../../headless/utils/processRunWaitTypes'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import Spinner from '../../primitives/Spinner'
import { Textarea } from '../../primitives/Textarea'
import ToneBadge from '../chips/ToneBadge'

export type RunWaitCardProps = {
  view: ProcessRunWaitView
  /** What the confirm before each action says; only a card that takes actions needs it. */
  confirmOf?: (action: ProcessWaitAction) => ProcessWaitConfirmView
  /** Take an action on the wait, with the person's note; without it the card only reports. */
  onDecide?: (action: ProcessWaitAction, note?: string) => Promise<boolean>
  /** Inside a leg's or a repo's card: smaller. */
  compact?: boolean
  /** Start with this action's confirm open — for a fixed showcase state. */
  confirming?: ProcessWaitAction
}

/**
 * Native peer of web's `RunWaitCard`: a run's wait for other work before its
 * proof — what it waits for on which base, since when, that it carries on by
 * itself, each entry as git last read it, Continue now and Stop waiting (Wait
 * again after either), each confirmed with an optional note; how it settled.
 */
export default function RunWaitCard({
  view,
  confirmOf,
  onDecide,
  compact = false,
  confirming,
}: RunWaitCardProps) {
  const { theme, status } = useNativeTheme()
  const [asking, setAsking] = useState<ProcessWaitAction | undefined>(confirming)
  const [note, setNote] = useState('')
  const confirm = asking && confirmOf ? confirmOf(asking) : undefined
  const tone = status[view.tone]
  const small = compact ? 11.5 : 13
  const open = (action: ProcessWaitAction) => {
    setNote('')
    setAsking(action)
  }
  const send = () => {
    if (!asking || !onDecide) return
    const action = asking
    setAsking(undefined)
    void onDecide(action, note)
  }
  return (
    <View
      accessibilityLabel={PROCESS_RUN_WAIT_COPY.label}
      style={{
        gap: compact ? 3 : nativeSpace[2],
        borderWidth: 1,
        borderColor: tone.softBorder,
        backgroundColor: tone.softBg,
        borderRadius: compact ? nativeRadii[2] : nativeRadii[3],
        paddingHorizontal: compact ? nativeSpace[3] : nativeSpace[4],
        paddingVertical: compact ? nativeSpace[2] : nativeSpace[3],
      }}
    >
      {compact ? null : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
          <ToneBadge tone={view.tone} label={PROCESS_RUN_WAIT_COPY.label} />
          {view.pending ? <Spinner size={12} /> : null}
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        <Text
          style={{
            flexShrink: 1,
            fontSize: compact ? 12.5 : 15,
            fontWeight: '600',
            color: theme.text.primary,
          }}
        >
          {view.headline}
        </Text>
        {compact && view.pending ? <Spinner size={11} /> : null}
      </View>
      {view.meta.length > 0 ? (
        <Text style={{ fontSize: small, color: theme.text.secondary }}>
          {view.meta.join(PROCESS_RUN_WAIT_COPY.separator)}
        </Text>
      ) : null}
      {view.entries.map((entry) => (
        <Text key={entry.label} style={{ fontSize: small - 0.5, color: theme.text.muted }}>
          <Text
            style={{
              fontWeight: '600',
              color: entry.onBase ? status.done.softFg : theme.text.primary,
            }}
          >
            {entry.label}
          </Text>
          {`  ${entry.line}`}
        </Text>
      ))}
      {view.note ? (
        <Text style={{ fontSize: small, fontStyle: 'italic', color: theme.text.secondary }}>
          “{view.note}”
        </Text>
      ) : null}
      {onDecide && view.actions.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[2] }}>
          {view.actions.map((a, at) => (
            <Button
              key={a.action}
              size="sm"
              variant={at === 0 ? 'secondary' : 'ghost'}
              onPress={() => open(a.action)}
            >
              {a.label}
            </Button>
          ))}
        </View>
      ) : null}
      {confirm ? (
        <Modal isOpen onClose={() => setAsking(undefined)} title={confirm.title}>
          <View style={{ gap: nativeSpace[3] }}>
            <Text style={{ fontSize: 13, color: theme.text.secondary }}>{confirm.body}</Text>
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '600', color: theme.text.muted }}>
                {confirm.noteLabel}
              </Text>
              <Textarea
                rows={2}
                value={note}
                maxLength={PROCESS_WAIT_NOTE_MAX_CHARS}
                placeholder={confirm.notePlaceholder}
                onChangeText={setNote}
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
              <Button size="sm" variant="ghost" onPress={() => setAsking(undefined)}>
                {confirm.cancel}
              </Button>
              <Button size="sm" variant="primary" onPress={send}>
                {confirm.confirm}
              </Button>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  )
}
