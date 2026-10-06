import { useState } from 'react'

import { Button } from '../../primitives/Button'
import {
  RUN_PROPOSAL_DECLINE_LABEL,
  RUN_PROPOSAL_LATER_LABEL,
  runProposalArgs,
  runProposalToolName,
  runProposalView,
  useStories,
} from '../../../headless'
import type { PendingToolGrant, RunProposalView } from '../../../headless'
import { grantDecideErrorMessage } from '../../../headless/utils/pendingToolGrants'
import DependencyBullet from '../stories/DependencyBullet'

export type RunProposalApprovalPanelProps = {
  grant: PendingToolGrant
  onDecideLater: () => void
}

const KIND_TONE: Record<RunProposalView['tone'], string> = {
  review: 'badge--review',
  working: 'badge--working',
  done: 'badge--done',
}

/**
 * Approving a run chat's proposal — a feature added to the run, a feature
 * changed and sent back, or a decision on a "Needs you" item: its kind, what
 * it says and what approving it does, with the approve button saying the
 * outcome. "Not now" leaves everything as it is.
 */
export default function RunProposalApprovalPanel({
  grant,
  onDecideLater,
}: RunProposalApprovalPanelProps) {
  const { stories } = useStories()
  const args = runProposalArgs(grant)
  const featureId = typeof args.featureId === 'string' ? args.featureId : undefined
  const story = featureId
    ? stories.find((s) => s.features.some((f) => f.id === featureId))
    : undefined
  const feature = story?.features.find((f) => f.id === featureId)
  const view = runProposalView(runProposalToolName(grant), args, feature?.title)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!view) return null

  const decide = (decision: 'once' | 'deny') => {
    setBusy(true)
    setError(null)
    void grant.decide(decision).catch((err: unknown) => {
      setBusy(false)
      setError(grantDecideErrorMessage(err))
    })
  }

  return (
    <div className="m-3 overflow-hidden rounded-lg border border-(--border-default) bg-(--surface-raised)">
      <div className="flex items-center gap-2 border-b border-(--border-subtle) bg-(--surface-base) px-3 py-2.5">
        <span className={`badge badge--soft badge--sm ${KIND_TONE[view.tone]}`}>
          {view.kindLabel}
        </span>
        {story && feature ? (
          <DependencyBullet dependency={`${story.id}.${feature.id}`} interactive />
        ) : null}
        {view.storyId ? <DependencyBullet dependency={view.storyId} interactive /> : null}
        <span className="min-w-0 flex-1 text-[13px] font-semibold text-(--text-primary)">
          {view.title}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 px-3 py-2.5 text-[13px] text-(--text-secondary)">
        {view.lines.map((line) => (
          <div key={line.label}>
            <span className="font-semibold text-(--text-primary)">{line.label}: </span>
            {line.text}
          </div>
        ))}
        <span className="text-[12px] text-(--text-secondary)">{view.effect}</span>
        {error !== null ? (
          <div className="rounded-md border border-(--status-stuck-soft-border) bg-(--status-stuck-soft-bg) px-2.5 py-1.5 text-[12px] text-(--status-stuck-soft-fg)">
            {error}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onDecideLater} disabled={busy}>
            {RUN_PROPOSAL_LATER_LABEL}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => decide('deny')} disabled={busy}>
            {RUN_PROPOSAL_DECLINE_LABEL}
          </Button>
          <Button size="sm" onClick={() => decide('once')} loading={busy}>
            {view.approveLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
