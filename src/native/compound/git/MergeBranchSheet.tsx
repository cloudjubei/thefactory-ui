import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import {
  GIT_MERGE_TEXT,
  commitsToBringInLabel,
  formatDurationMs,
  mergeBlockedReason,
  mergeChecksOnByDefault,
  mergeSentence,
  mergeSourceOptions,
  useCommitsToBringIn,
  useDurationTimer,
  useGit,
  type MergeChecks,
} from '../../../headless'
import { extractServerError, type GitMergeBranchResult } from '../../../headless/api'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import { Modal } from '../../primitives/Modal'
import Spinner from '../../primitives/Spinner'
import { Switch } from '../../primitives/Switch'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { BranchChip } from '../BranchChip'
import RefChip from '../chips/RefChip'
import MergeChecksResult from './MergeChecksResult'

export type MergeBranchSheetProps = {
  isOpen: boolean
  onClose: () => void
  projectId: string | undefined
  /** The branch to merge in, picked already — a long-pressed branch's local or remote name. */
  initialSource?: string
  /** Called once git has merged, fast-forwarded, staged or stopped on conflicts; a refusal stays in the sheet. */
  onMerged: (outcome: GitMergeBranchResult) => void
}

/**
 * Native peer of web's `MergeBranchSheet`: pick a branch (local or remote) to
 * merge into the current one, say how, and merge. A long-press "Merge X into
 * Y" opens the same sheet with X picked. The result can be built and
 * type-checked before the branch moves — on by default into the default branch.
 */
export default function MergeBranchSheet({
  isOpen,
  onClose,
  projectId,
  initialSource,
  onMerged,
}: MergeBranchSheetProps) {
  const { theme } = useNativeTheme()
  const { branches, status, mergeBranch } = useGit()
  const current = branches.find((b) => b.current)?.name
  const [query, setQuery] = useState('')
  const [source, setSource] = useState<string | undefined>(initialSource)
  const [noFastForward, setNoFastForward] = useState(false)
  const [commitNow, setCommitNow] = useState(true)
  const [checkFirstPick, setCheckFirstPick] = useState<boolean | undefined>(undefined)
  const [submitting, setSubmitting] = useState(false)
  const [startedAt, setStartedAt] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [failedChecks, setFailedChecks] = useState<MergeChecks | null>(null)
  const now = useDurationTimer(submitting)

  useEffect(() => {
    if (!isOpen) return
    setQuery('')
    setSource(initialSource)
    setNoFastForward(false)
    setCommitNow(true)
    setCheckFirstPick(undefined)
    setError(null)
    setFailedChecks(null)
  }, [isOpen, initialSource])

  const options = useMemo(
    () => mergeSourceOptions(branches, current, query),
    [branches, current, query],
  )
  const blocked = mergeBlockedReason({ current, merging: !!status?.merging, source })
  const bringIn = useCommitsToBringIn(isOpen ? projectId : undefined, current, source)
  const checkFirstByDefault = mergeChecksOnByDefault(branches, commitNow)
  const checkFirst = commitNow && (checkFirstPick ?? checkFirstByDefault)

  const onMerge = async () => {
    if (!source || blocked) return
    setSubmitting(true)
    setStartedAt(Date.now())
    setError(null)
    setFailedChecks(null)
    try {
      const outcome = await mergeBranch({ source, noFastForward, commit: commitNow, checkFirst })
      if (outcome.status === 'refused') {
        setError(outcome.reason ?? outcome.message)
        setFailedChecks(outcome.checks?.status === 'failed' ? outcome.checks : null)
        return
      }
      onMerged(outcome)
      onClose()
    } catch (err) {
      setError(extractServerError(err, 'The merge failed').message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Merge into the current branch"
      size="lg"
      footer={
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
          <Button variant="secondary" onPress={onClose}>
            Cancel
          </Button>
          <Button
            loading={submitting}
            disabled={!!blocked || submitting}
            onPress={() => void onMerge()}
          >
            Merge
          </Button>
        </View>
      }
    >
      <View style={{ gap: nativeSpace[3] }}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Find a branch"
          accessibilityLabel="Find a branch"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <ScrollView
          style={{
            maxHeight: 260,
            borderWidth: 1,
            borderColor: theme.border.subtle,
            borderRadius: 8,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {options.length === 0 ? (
            <Text style={{ padding: nativeSpace[3], fontSize: 12, color: theme.text.muted }}>
              No branch matches.
            </Text>
          ) : (
            options.map((o) => {
              const selected = o.ref === source
              return (
                <Pressable
                  key={`${o.kind}:${o.ref}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: !!o.disabledReason }}
                  disabled={!!o.disabledReason}
                  onPress={() => setSource(o.ref)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: nativeSpace[2],
                    paddingHorizontal: nativeSpace[3],
                    paddingVertical: nativeSpace[2],
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border.subtle,
                    backgroundColor: selected ? theme.surface.muted : 'transparent',
                    opacity: o.disabledReason ? 0.5 : 1,
                  }}
                >
                  <View style={{ flexShrink: 1 }}>
                    <RefChip kind="branch" value={o.ref} />
                  </View>
                  <View style={{ flex: 1 }} />
                  {o.disabledReason ? (
                    <Text style={{ fontSize: 11, color: theme.text.muted }}>Current</Text>
                  ) : null}
                  <BranchChip type={o.kind} size="xs" />
                </Pressable>
              )
            })
          )}
        </ScrollView>

        {source && current ? (
          <View
            accessibilityLabel={mergeSentence(source, current)}
            style={{
              gap: 4,
              padding: nativeSpace[3],
              borderRadius: 8,
              backgroundColor: theme.surface.muted,
            }}
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 14, color: theme.text.primary }}>Merge</Text>
              <RefChip kind="branch" value={source} />
              <Text style={{ fontSize: 14, color: theme.text.primary }}>into</Text>
              <RefChip kind="branch" value={current} />
            </View>
            {bringIn.status === 'ready' ? (
              <Text style={{ fontSize: 12, color: theme.text.muted }}>
                {commitsToBringInLabel(bringIn.count, bringIn.capped)}
              </Text>
            ) : null}
          </View>
        ) : null}

        <Switch
          checked={noFastForward || !commitNow}
          disabled={!commitNow}
          onCheckedChange={setNoFastForward}
          label="Create a merge commit even if fast-forward is possible"
        />
        <Switch
          checked={commitNow}
          onCheckedChange={setCommitNow}
          label="Commit the merge right away"
        />
        {!commitNow ? (
          <Text style={{ fontSize: 12, color: theme.text.muted }}>
            The merge is staged and left for you to commit, with its message prefilled.
          </Text>
        ) : null}
        <Switch
          checked={checkFirst}
          disabled={!commitNow || submitting}
          onCheckedChange={setCheckFirstPick}
          label={GIT_MERGE_TEXT.checkFirst}
        />
        <Text style={{ fontSize: 12, color: theme.text.muted }}>
          {!commitNow
            ? GIT_MERGE_TEXT.checkFirstNeedsCommit
            : current
              ? [
                  GIT_MERGE_TEXT.checkFirstHint(current),
                  checkFirstByDefault ? GIT_MERGE_TEXT.checkFirstDefault(current) : '',
                ]
                  .filter(Boolean)
                  .join(' ')
              : ''}
        </Text>

        {submitting && checkFirst && current ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: nativeSpace[2],
              padding: nativeSpace[3],
              borderRadius: 8,
              backgroundColor: theme.surface.muted,
            }}
          >
            <Spinner size={14} />
            <Text style={{ flex: 1, fontSize: 12, color: theme.text.secondary }}>
              {GIT_MERGE_TEXT.checking(current)}
            </Text>
            <Text style={{ fontSize: 12, color: theme.text.muted }}>
              {formatDurationMs(Math.max(0, now - startedAt))}
            </Text>
          </View>
        ) : null}
        {blocked && (source || !current || status?.merging) ? (
          <Alert variant="info">{blocked}</Alert>
        ) : null}
        {error ? <Alert variant="error">{error}</Alert> : null}
        {failedChecks ? <MergeChecksResult checks={failedChecks} /> : null}
      </View>
    </Modal>
  )
}
