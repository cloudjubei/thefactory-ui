import { useCallback, useState } from 'react'
import { Pressable, ScrollView, Switch, Text, View } from 'react-native'

import {
  costChipLabel,
  formatProcessDuration,
  processGroupBadge,
  processGroupLegRows,
  processGroupProgress,
  processGroupResumeRebuildLegIds,
  processGroupResumeView,
  processGroupWorkMs,
  PROCESS_GROUP_MARK_LANDED_LABEL,
  PROCESS_GROUP_RESUME_LABEL,
  PROCESS_GROUP_STOP_CONFIRM_COPY,
  useDurationTimer,
  useProcessGroupRebuildPlans,
  useProcessGroupRun,
  type ProcessGroupLeg,
  type ProcessGroupLegRow,
  type ProcessRunBranch,
  type ProcessStatusTone,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import CostChip from '../chips/CostChip'
import DurationChip from '../chips/DurationChip'
import ProcessGroupLegLandingDialog from './ProcessGroupLegLandingDialog'
import ProcessGroupParkReview from './ProcessGroupParkReview'

export type ProcessGroupPipelineProps = {
  groupRunId: string
  /** Open one project's own pipeline — where it is signed off and its asks are answered. */
  onOpenLegRun: (runId: string, projectId: string) => void
}

const ENDED = ['succeeded', 'failed', 'cancelled']

/**
 * Native peer of
 * [web's `ProcessGroupPipeline`](../../../web/compound/process/ProcessGroupPipeline.tsx).
 * One group run: every project's leg, drawn by dependency level — what needs
 * nothing first, then what builds on it — with where each stands, what it
 * waits for and what it has cost. Each project is signed off and merged in its
 * own pipeline, one tap away — a project only once the ones it builds on are
 * merged; only what the group alone can answer (a project that stopped, a
 * merged project that does not build, a failed merge) is answered here — and a
 * project whose work landed another way is marked so, after which an ended
 * group run can be resumed for the projects that waited on it.
 */
export default function ProcessGroupPipeline({
  groupRunId,
  onOpenLegRun,
}: ProcessGroupPipelineProps) {
  const { theme, status } = useNativeTheme()
  const {
    isLoaded,
    loadError,
    actionError,
    group,
    deleted,
    resume,
    cancel,
    checkLanding,
    markLanded,
    planRebuild,
    reopen,
    listBranches,
    deleteGroupRun,
  } = useProcessGroupRun(groupRunId)
  const resumePlans = useProcessGroupRebuildPlans(
    processGroupResumeRebuildLegIds(group),
    planRebuild,
  )
  const ticking = group?.totals?.ticking === true
  const now = useDurationTimer(ticking)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmStop, setConfirmStop] = useState(false)
  const [branches, setBranches] = useState<ProcessRunBranch[]>([])
  const [alsoBranches, setAlsoBranches] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [landingLeg, setLandingLeg] = useState<ProcessGroupLeg | undefined>(undefined)
  const [confirmResume, setConfirmResume] = useState(false)
  const [resuming, setResuming] = useState(false)

  const runResume = useCallback(() => {
    setResuming(true)
    void reopen()
      .then(() => setConfirmResume(false))
      .finally(() => setResuming(false))
  }, [reopen])

  const openDelete = useCallback(() => {
    setAlsoBranches(false)
    setBranches([])
    setConfirmDelete(true)
    void listBranches()
      .then(setBranches)
      .catch(() => setBranches([]))
  }, [listBranches])

  const runDelete = useCallback(() => {
    setDeleting(true)
    void deleteGroupRun({ deleteBranches: alsoBranches })
      .then(() => setConfirmDelete(false))
      .finally(() => setDeleting(false))
  }, [deleteGroupRun, alsoBranches])

  if (deleted) {
    return (
      <View style={{ padding: nativeSpace[5] }}>
        <Alert variant="info">
          This group run and everything its projects produced were deleted.
        </Alert>
      </View>
    )
  }
  if (loadError) return <Alert variant="error">{loadError.message}</Alert>
  if (!isLoaded) {
    return (
      <View style={{ padding: nativeSpace[5] }}>
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>Loading…</Text>
      </View>
    )
  }
  if (!group) return <Alert variant="error">This group run no longer exists.</Alert>

  const badge = processGroupBadge(group)
  const { merged, total } = processGroupProgress(group)
  const waves = processGroupLegRows(group)
  const ended = ENDED.includes(group.status)
  const workMs = processGroupWorkMs(group.totals, now)
  const spend = costChipLabel(group.totals)
  const resumeView = processGroupResumeView(group, resumePlans)

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: nativeSpace[5] }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: nativeSpace[2],
          paddingHorizontal: nativeSpace[3],
          paddingVertical: nativeSpace[3],
          borderBottomWidth: 1,
          borderBottomColor: theme.border.subtle,
          backgroundColor: theme.surface.raised,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
          {group.title}
        </Text>
        <Text style={{ fontSize: 11, color: theme.text.muted }}>
          {`${total} project${total === 1 ? '' : 's'} · ${merged} merged`}
        </Text>
        <View style={{ flex: 1 }} />
        <ToneBadge tone={badge.tone} label={badge.label} />
        {workMs !== undefined ? (
          <DurationChip
            label={formatProcessDuration(workMs)}
            title="Time every project spent working, summed"
          />
        ) : null}
        {spend ? (
          <CostChip label={spend} cost={group.totals} title="Every project, summed" />
        ) : null}
        {resumeView?.canResume ? (
          <Button size="sm" variant="primary" onPress={() => setConfirmResume(true)}>
            {PROCESS_GROUP_RESUME_LABEL}
          </Button>
        ) : null}
        {ended ? (
          <Button size="sm" variant="ghost" onPress={openDelete}>
            Delete
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onPress={() => setConfirmStop(true)}>
            Stop
          </Button>
        )}
      </View>

      {actionError ? (
        <View
          accessibilityRole="alert"
          style={{
            marginHorizontal: nativeSpace[3],
            marginTop: nativeSpace[3],
            paddingHorizontal: nativeSpace[2],
            paddingVertical: nativeSpace[2],
            borderRadius: nativeRadii[2],
            borderWidth: 1,
            backgroundColor: status.stuck.softBg,
            borderColor: status.stuck.softBorder,
          }}
        >
          <Text style={{ fontSize: 12, color: status.stuck.softFg }}>{actionError}</Text>
        </View>
      ) : null}

      {resumeView && !resumeView.canResume ? (
        <Text
          style={{
            marginHorizontal: nativeSpace[3],
            marginTop: nativeSpace[3],
            fontSize: 11.5,
            color: theme.text.secondary,
          }}
        >
          {resumeView.reason}
        </Text>
      ) : null}

      {group.park ? (
        <View style={{ marginHorizontal: nativeSpace[3], marginTop: nativeSpace[3] }}>
          <ProcessGroupParkReview key={group.park.parkedAt} group={group} onResume={resume} />
        </View>
      ) : null}

      <View
        style={{
          gap: nativeSpace[3],
          paddingHorizontal: nativeSpace[3],
          paddingTop: nativeSpace[3],
          paddingBottom: nativeSpace[4],
        }}
      >
        {waves.map((wave, i) => (
          <View key={i} style={{ gap: 6 }}>
            <Text
              style={{
                fontSize: 10,
                fontWeight: '600',
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                color: theme.text.muted,
              }}
            >
              {i === 0 ? 'Starts at once' : `Then — step ${i + 1}`}
            </Text>
            {wave.map((row) => (
              <LegCard
                key={row.leg.id}
                row={row}
                now={now}
                onOpen={onOpenLegRun}
                onMarkLanded={setLandingLeg}
              />
            ))}
          </View>
        ))}
      </View>

      {group.error ? (
        <Text
          style={{
            paddingHorizontal: nativeSpace[4],
            fontSize: 11,
            color: theme.text.secondary,
          }}
        >
          {group.error}
        </Text>
      ) : null}

      {landingLeg ? (
        <ProcessGroupLegLandingDialog
          group={group}
          leg={landingLeg}
          planRebuild={planRebuild}
          checkLanding={checkLanding}
          markLanded={markLanded}
          onClose={() => setLandingLeg(undefined)}
        />
      ) : null}

      {confirmResume && resumeView?.canResume ? (
        <Modal isOpen onClose={() => setConfirmResume(false)} title="Resume this group run?">
          <View style={{ gap: nativeSpace[3] }}>
            <Text style={{ fontSize: 13, color: theme.text.secondary }}>{resumeView.effect}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
              <Button
                size="sm"
                variant="ghost"
                onPress={() => setConfirmResume(false)}
                disabled={resuming}
              >
                Cancel
              </Button>
              <Button size="sm" variant="primary" onPress={runResume} disabled={resuming}>
                {resuming ? 'Resuming…' : PROCESS_GROUP_RESUME_LABEL}
              </Button>
            </View>
          </View>
        </Modal>
      ) : null}

      {confirmStop ? (
        <Modal
          isOpen
          onClose={() => setConfirmStop(false)}
          title={PROCESS_GROUP_STOP_CONFIRM_COPY.title}
        >
          <View style={{ gap: nativeSpace[3] }}>
            <Text style={{ fontSize: 13, color: theme.text.secondary }}>
              {PROCESS_GROUP_STOP_CONFIRM_COPY.body}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
              <Button size="sm" variant="ghost" onPress={() => setConfirmStop(false)}>
                {PROCESS_GROUP_STOP_CONFIRM_COPY.cancel}
              </Button>
              <Button
                size="sm"
                variant="danger"
                onPress={() => {
                  setConfirmStop(false)
                  void cancel()
                }}
              >
                {PROCESS_GROUP_STOP_CONFIRM_COPY.confirm}
              </Button>
            </View>
          </View>
        </Modal>
      ) : null}

      {confirmDelete ? (
        <Modal isOpen onClose={() => setConfirmDelete(false)} title="Delete this group run?">
          <View style={{ gap: nativeSpace[3] }}>
            <Text style={{ fontSize: 13, color: theme.text.secondary }}>
              This removes the group run and every project’s runs — each step’s agent-run chat and
              its record. This cannot be undone.
            </Text>
            {branches.length > 0 ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: nativeSpace[2],
                  borderRadius: nativeRadii[2],
                  borderWidth: 1,
                  borderColor: theme.border.subtle,
                  backgroundColor: theme.surface.muted,
                  padding: nativeSpace[3],
                }}
              >
                <Switch value={alsoBranches} onValueChange={setAlsoBranches} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
                    {`Also delete ${branches.length} git branch${branches.length === 1 ? '' : 'es'}`}
                  </Text>
                  {branches.map((b) => (
                    <Text
                      key={`${b.projectId}:${b.branch}`}
                      numberOfLines={1}
                      style={{ fontSize: 11, color: theme.text.muted }}
                    >
                      {`${b.projectId} · ${b.branch}`}
                    </Text>
                  ))}
                </View>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
              <Button
                size="sm"
                variant="ghost"
                onPress={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button size="sm" variant="danger" onPress={runDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            </View>
          </View>
        </Modal>
      ) : null}
    </ScrollView>
  )
}

function LegCard({
  row,
  now,
  onOpen,
  onMarkLanded,
}: {
  row: ProcessGroupLegRow
  now: number
  onOpen: (runId: string, projectId: string) => void
  onMarkLanded: (leg: ProcessGroupLeg) => void
}) {
  const { theme, status } = useNativeTheme()
  const { leg, totals } = row
  const workMs = processGroupWorkMs(totals, now)
  const spend = costChipLabel(totals)
  return (
    <View
      style={{
        gap: 6,
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
        borderRadius: nativeRadii[3],
        padding: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: 12.5, fontWeight: '600', color: theme.text.primary }}
        >
          {leg.projectId}
        </Text>
        <ToneBadge tone={row.tone} label={row.label} />
      </View>
      <Text numberOfLines={1} style={{ fontSize: 11.5, color: theme.text.secondary }}>
        {leg.title}
      </Text>
      {row.waitsFor ? (
        <Text style={{ fontSize: 11, color: theme.text.muted }}>{row.waitsFor}</Text>
      ) : null}
      {row.landed ? (
        <Text style={{ fontSize: 11, color: theme.text.muted }}>{row.landed}</Text>
      ) : null}
      {row.error ? (
        <View
          style={{
            borderRadius: nativeRadii[2],
            backgroundColor: status.stuck.softBg,
            paddingHorizontal: nativeSpace[2],
            paddingVertical: nativeSpace[1],
          }}
        >
          <Text style={{ fontSize: 11, color: status.stuck.softFg }}>{row.error}</Text>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        {leg.runId ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => onOpen(leg.runId!, leg.projectId)}
            style={{
              borderWidth: 1,
              borderColor: row.readyForSignOff ? status.review.softBorder : theme.border.default,
              backgroundColor: row.readyForSignOff ? status.review.softBg : theme.surface.base,
              borderRadius: nativeRadii[2],
              paddingHorizontal: nativeSpace[2],
              paddingVertical: nativeSpace[1],
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '500',
                color: row.readyForSignOff ? status.review.softFg : theme.text.primary,
              }}
            >
              {`${row.openLabel} ›`}
            </Text>
          </Pressable>
        ) : null}
        {row.canMarkLanded ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => onMarkLanded(leg)}
            style={{
              borderWidth: 1,
              borderColor: theme.border.default,
              backgroundColor: theme.surface.base,
              borderRadius: nativeRadii[2],
              paddingHorizontal: nativeSpace[2],
              paddingVertical: nativeSpace[1],
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '500', color: theme.text.primary }}>
              {PROCESS_GROUP_MARK_LANDED_LABEL}
            </Text>
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }} />
        {workMs !== undefined ? (
          <Text style={{ fontSize: 11, color: theme.text.muted }}>
            {formatProcessDuration(workMs)}
          </Text>
        ) : null}
        {spend ? (
          <CostChip
            label={spend}
            cost={totals}
            title="This project’s runs"
            appearance="text"
            textStyle={{ fontSize: 11, color: theme.text.muted }}
          />
        ) : null}
      </View>
    </View>
  )
}

function ToneBadge({ tone, label }: { tone: ProcessStatusTone; label: string }) {
  const { status } = useNativeTheme()
  const variant = status[tone]
  return (
    <View
      style={{
        backgroundColor: variant.softBg,
        borderColor: variant.softBorder,
        borderWidth: 1,
        borderRadius: nativeRadii[2],
        paddingHorizontal: nativeSpace[2],
        paddingVertical: 1,
      }}
    >
      <Text style={{ fontSize: 10, color: variant.softFg }}>{label}</Text>
    </View>
  )
}
