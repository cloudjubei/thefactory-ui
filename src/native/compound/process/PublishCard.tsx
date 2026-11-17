import { useState } from 'react'
import { Text, View } from 'react-native'
import {
  PROCESS_PUBLISH_COPY,
  type ProcessPublishEdit,
  type ProcessPublishRow,
  type ProcessPublishView,
} from '../../../headless'
import { nativeFontFamilies, nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { ConfirmDialog } from '../../primitives/Modal'

export interface PublishCardProps {
  /** The card; undefined while the repos are read. */
  view: ProcessPublishView | undefined
  readError?: string | null
  /** Inside the "Needs you" card, which draws the frame. */
  embedded?: boolean
  onEdit: (projectId: string, field: keyof ProcessPublishEdit, value: string) => void
  onPublish: () => void
  /** Stop the run here, once confirmed. */
  onStop: () => void
  /** Start on the confirm to stop. */
  initialStopping?: boolean
}

function RepoRow({
  row,
  busy,
  showAccount,
  onEdit,
}: {
  row: ProcessPublishRow
  busy: boolean
  /** Repos are pushed as different accounts, so each names its own. */
  showAccount: boolean
  onEdit: PublishCardProps['onEdit']
}) {
  const { theme, status } = useNativeTheme()
  return (
    <View
      style={{
        gap: nativeSpace[3],
        padding: nativeSpace[3],
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
      }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 6 }}>
        <Text
          numberOfLines={1}
          style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}
        >
          {row.name}
        </Text>
        <Text
          style={{ fontSize: 11, fontFamily: nativeFontFamilies.mono, color: theme.text.muted }}
        >
          {PROCESS_PUBLISH_COPY.onto(row.baseBranch)}
        </Text>
      </View>
      {row.changed ? (
        <>
          <Field
            label={PROCESS_PUBLISH_COPY.shortField}
            hint={row.branch ?? PROCESS_PUBLISH_COPY.shortHint}
            error={row.branchError}
          >
            <Input
              value={row.short}
              disabled={busy}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel={`${row.name} ${PROCESS_PUBLISH_COPY.shortField}`}
              onChangeText={(value) => onEdit(row.projectId, 'short', value)}
            />
          </Field>
          <Field label={PROCESS_PUBLISH_COPY.titleField} error={row.titleError}>
            <Input
              value={row.prTitle}
              disabled={busy}
              accessibilityLabel={`${row.name} ${PROCESS_PUBLISH_COPY.titleField}`}
              onChangeText={(value) => onEdit(row.projectId, 'prTitle', value)}
            />
          </Field>
          {!row.account ? (
            <Text style={{ fontSize: 12, color: status.on_hold.softFg }}>
              {PROCESS_PUBLISH_COPY.noAccount}
            </Text>
          ) : showAccount ? (
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>
              {PROCESS_PUBLISH_COPY.account}{' '}
              <Text style={{ fontWeight: '500', color: theme.text.primary }}>{row.account}</Text>
            </Text>
          ) : null}
        </>
      ) : (
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>
          {PROCESS_PUBLISH_COPY.noChanges}
        </Text>
      )}
    </View>
  )
}

/**
 * Native peer of web's `PublishCard`: the publish gate of a pull-request-first
 * run — each repo with its branch name and pull request title, both editable,
 * who it is pushed as, and Publish or Stop.
 */
export default function PublishCard({
  view,
  readError,
  embedded = false,
  onEdit,
  onPublish,
  onStop,
  initialStopping = false,
}: PublishCardProps) {
  const { theme, status } = useNativeTheme()
  const [stopping, setStopping] = useState(initialStopping)
  const busy = view?.publishing === true
  const review = status.review
  return (
    <View
      style={
        embedded
          ? { gap: nativeSpace[3] }
          : {
              gap: nativeSpace[3],
              marginTop: nativeSpace[2],
              padding: nativeSpace[3],
              borderRadius: nativeRadii[3],
              borderWidth: 1,
              borderColor: review.softBorder,
              backgroundColor: review.softBg,
            }
      }
    >
      <View style={{ gap: 2 }}>
        <Text
          style={
            embedded
              ? { fontSize: 17, fontWeight: '600', color: theme.text.primary }
              : { fontSize: 14, fontWeight: '600', color: review.softFg }
          }
        >
          {PROCESS_PUBLISH_COPY.title}
        </Text>
        {view ? (
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>{view.line}</Text>
        ) : null}
      </View>
      {readError && !view ? <Alert>{readError}</Alert> : null}
      {!view ? (
        readError ? null : (
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            {PROCESS_PUBLISH_COPY.loading}
          </Text>
        )
      ) : (
        <>
          {view.rows.map((row) => (
            <RepoRow
              key={row.projectId}
              row={row}
              busy={busy}
              showAccount={!view.account}
              onEdit={onEdit}
            />
          ))}
          {view.account ? (
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>
              {PROCESS_PUBLISH_COPY.account}{' '}
              <Text style={{ fontWeight: '500', color: theme.text.primary }}>{view.account}</Text>
            </Text>
          ) : null}
          {view.error ? <Alert>{view.error}</Alert> : null}
        </>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[2] }}>
        <Button size="sm" disabled={!view?.canPublish} loading={busy} onPress={onPublish}>
          {busy ? PROCESS_PUBLISH_COPY.publishing : PROCESS_PUBLISH_COPY.publish}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onPress={() => setStopping(true)}>
          {PROCESS_PUBLISH_COPY.stop}
        </Button>
      </View>
      <ConfirmDialog
        isOpen={stopping}
        onClose={() => setStopping(false)}
        title={PROCESS_PUBLISH_COPY.stopTitle}
        description={PROCESS_PUBLISH_COPY.stopBody}
        confirmLabel={PROCESS_PUBLISH_COPY.stop}
        cancelLabel={PROCESS_PUBLISH_COPY.stopKeep}
        destructive
        onConfirm={() => {
          setStopping(false)
          onStop()
        }}
      />
    </View>
  )
}
