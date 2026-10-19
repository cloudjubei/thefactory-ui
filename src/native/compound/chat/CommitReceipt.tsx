import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import {
  COMMIT_RECEIPT_COPY,
  useChatActions,
  useRunPassedProof,
  type CheckMethodRow,
  type CommitReceiptView,
} from '../../../headless'
import { nativeFontFamilies, nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconCommit } from '../../icons'
import CheckChip from '../chips/CheckChip'
import CommitChip from '../chips/CommitChip'
import { CommitChangeDetails } from './CommitChangeDetails'

export type CommitReceiptProps = {
  view: CommitReceiptView
  /** The proof the turn already has — the methods that passed. */
  proof?: readonly CheckMethodRow[]
  /** The project the commit is in; with it the commit's details open from its chip. */
  projectId?: string
  /** Starts with the change open — for a record that shows it. */
  defaultOpen?: boolean
}

/**
 * Native peer of web's `CommitReceipt`: the one line a commit the person
 * approved leaves in the chat, in place of its tool row, with "View the
 * change" opening the files and the message in place.
 */
export function CommitReceipt({
  view,
  proof = [],
  projectId,
  defaultOpen = false,
}: CommitReceiptProps) {
  const { theme, status } = useNativeTheme()
  const [open, setOpen] = useState(defaultOpen)
  const canOpen = view.files.length > 0 || view.message !== undefined
  return (
    <View
      style={{
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.overlay,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <IconCommit size={15} color={status.done.softFg} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 13, color: theme.text.primary }}>
            {COMMIT_RECEIPT_COPY.committed}
          </Text>
          {projectId && view.fullSha ? (
            <CommitChip projectId={projectId} sha={view.fullSha} />
          ) : (
            <Text
              style={{
                fontFamily: nativeFontFamilies.mono,
                fontSize: 13,
                fontWeight: '600',
                color: theme.text.primary,
              }}
            >
              {view.sha}
            </Text>
          )}
          {view.branch ? (
            <Text style={{ fontSize: 13, color: theme.text.primary }}>
              {`${COMMIT_RECEIPT_COPY.to} ${view.branch}`}
            </Text>
          ) : null}
        </View>
        {view.filesLabel ? (
          <Text style={{ fontSize: 13, color: theme.text.secondary }}>{view.filesLabel}</Text>
        ) : null}
        {proof.map((row) => (
          <CheckChip key={row.id} row={row} inert />
        ))}
        {canOpen ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen((v) => !v)}
            hitSlop={8}
            style={{ marginLeft: 'auto' }}
          >
            <Text style={{ fontSize: 13, color: theme.accent.primary }}>
              {open ? COMMIT_RECEIPT_COPY.hide : COMMIT_RECEIPT_COPY.view}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {open ? <CommitChangeDetails files={view.files} message={view.message} /> : null}
    </View>
  )
}

/** The receipt with the proof the turn that made the commit already has, read off its run. */
export function CommitReceiptConnected({
  view,
  runId,
}: {
  view: CommitReceiptView
  runId: string | undefined
}) {
  const projectId = useChatActions()?.projectId
  const proof = useRunPassedProof(runId, projectId)
  return <CommitReceipt view={view} proof={proof} {...(projectId ? { projectId } : {})} />
}
