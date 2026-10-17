import { useState } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'

import {
  PROCESS_INTEGRATION_CONFLICT,
  PROCESS_INTEGRATION_FORM_LABELS,
  PROCESS_INTEGRATION_RETRY,
  PROCESS_INTEGRATION_RETRY_HEAD,
  processIntegrationView,
  useProcessRunAlreadyLanded,
  type ProcessIntegrationDecision,
  type ProcessIntegrationMode,
  type ProcessRun,
} from '../../../headless'
import { nativeFontFamilies, nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import CommitChip from '../chips/CommitChip'
import MergeChecksResult from '../git/MergeChecksResult'
import AlreadyMergedOffer from './AlreadyMergedOffer'
import IntegrationChooser from './IntegrationChooser'

export type IntegrationResultProps = {
  run: ProcessRun
  /** The only ways the work may land, when they are narrowed. */
  modes?: readonly ProcessIntegrationMode[]
  /** Resolves `false` when refused — the reason then arrives as `error`. */
  onRetry: (decision: ProcessIntegrationDecision) => Promise<boolean>
  /** Send work that conflicts with its base to an agent; resolves `false` when refused. */
  onResolve: () => Promise<boolean>
  /** Why the last retry was refused. */
  error?: string | null
}

/**
 * What bringing an approved story's work in came to, on the run: the merged
 * commit, the pull request (opened in the browser), the commit its base has
 * held it since when there was nothing to merge, or why it did not land — with
 * a retry, the same way or another; when its base already holds the work,
 * "Finish as already landed"; and, when it conflicts with its base, an agent to
 * resolve it. While an agent resolves the conflict, and when the
 * work comes back to be confirmed, it says so and shows what changed. The
 * native peer of the web `IntegrationResult`.
 */
export default function IntegrationResult({
  run,
  modes,
  onRetry,
  onResolve,
  error,
}: IntegrationResultProps) {
  const { theme, status } = useNativeTheme()
  const [choosing, setChoosing] = useState<{ mode?: ProcessIntegrationMode } | null>(null)
  const [sending, setSending] = useState(false)
  const alreadyLanded = useProcessRunAlreadyLanded(run)
  const offer = alreadyLanded.offer
  const view = processIntegrationView(run)
  if (!view || !run.workBranch) return null
  const workBranch = run.workBranch
  const variant = status[view.tone]
  const link = view.link
  const pullRequestOffered = !workBranch.shadow && (!modes || modes.includes('pull-request'))

  const settle = (attempt: Promise<boolean>) => {
    setSending(true)
    attempt
      .then((ok) => {
        if (ok) setChoosing(null)
      })
      .finally(() => setSending(false))
  }

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        marginHorizontal: nativeSpace[4],
        marginBottom: nativeSpace[3],
        gap: nativeSpace[2],
        borderRadius: nativeRadii[3],
        padding: nativeSpace[3],
        backgroundColor: variant.softBg,
        borderWidth: 1,
        borderColor: variant.softBorder,
      }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: variant.softFg }}>{view.title}</Text>
        {view.sha ? <CommitChip projectId={run.projectId} sha={view.sha} /> : null}
      </View>
      {view.detail ? (
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{view.detail}</Text>
      ) : null}
      {view.checks ? <MergeChecksResult checks={view.checks} /> : null}
      {view.files && view.files.length > 0 ? (
        <View style={{ gap: 2 }}>
          {view.files.map((file) => (
            <Text
              key={file}
              selectable
              style={{
                fontFamily: nativeFontFamilies.mono,
                fontSize: 11.5,
                color: theme.text.primary,
              }}
            >
              {file}
            </Text>
          ))}
        </View>
      ) : null}
      {link ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(link.url).catch(() => undefined)}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '500',
              color: theme.accent.primary,
              textDecorationLine: 'underline',
            }}
          >
            {`${link.label} ↗`}
          </Text>
        </Pressable>
      ) : null}
      {error ? <Text style={{ fontSize: 12, color: status.stuck.softFg }}>{error}</Text> : null}
      {offer && !choosing ? (
        <AlreadyMergedOffer
          projectId={run.projectId}
          offer={offer}
          busy={alreadyLanded.busy || sending}
          error={alreadyLanded.actionError}
          onSettle={() => void alreadyLanded.settle()}
        />
      ) : null}
      {view.canRetry ? (
        choosing ? (
          <IntegrationChooser
            runId={run.id}
            workBranch={workBranch}
            {...(modes ? { modes } : {})}
            {...(choosing.mode ? { initialMode: choosing.mode } : {})}
            head={PROCESS_INTEGRATION_RETRY_HEAD}
            submitLabel={PROCESS_INTEGRATION_FORM_LABELS.confirm}
            busy={sending}
            onChoose={(decision) => settle(onRetry(decision))}
            onCancel={() => setChoosing(null)}
          />
        ) : (
          <View style={{ gap: 6 }}>
            {view.conflict ? (
              <Text style={{ fontSize: 11.5, color: theme.text.secondary }}>
                {PROCESS_INTEGRATION_CONFLICT.resolveDetail}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[2] }}>
              {view.conflict ? (
                <Button
                  size="sm"
                  variant="primary"
                  disabled={sending}
                  onPress={() => settle(onResolve())}
                >
                  {PROCESS_INTEGRATION_CONFLICT.resolve}
                </Button>
              ) : null}
              <Button
                size="sm"
                variant={view.conflict || offer ? 'ghost' : 'primary'}
                disabled={sending}
                onPress={() =>
                  workBranch.shadow ? settle(onRetry({ mode: 'merge' })) : setChoosing({})
                }
              >
                {PROCESS_INTEGRATION_RETRY}
              </Button>
              {view.conflict && pullRequestOffered ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={sending}
                  onPress={() => setChoosing({ mode: 'pull-request' })}
                >
                  {PROCESS_INTEGRATION_CONFLICT.openPullRequest}
                </Button>
              ) : null}
            </View>
          </View>
        )
      ) : null}
    </View>
  )
}
