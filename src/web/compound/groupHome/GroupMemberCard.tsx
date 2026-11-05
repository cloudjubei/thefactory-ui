import type { ReactNode } from 'react'
import { GROUP_MEMBER_RUNS_SHOWN, GROUP_STATUS_COPY, type GroupMemberView } from '../../../headless'
import { BranchChip } from '../BranchChip'
import CheckChip from '../chips/CheckChip'
import GroupStatusBadges from './GroupStatusBadges'

export type GroupMemberCardProps = {
  title: string
  icon: ReactNode
  member: GroupMemberView
  onSelect: () => void
  onSelectRun?: (runId: string, projectId: string) => void
}

/** A bar of how much of a member's work is done. */
export function GroupMemberProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-(--surface-muted)">
      <div
        className="h-full rounded-full"
        style={{ width: `${percent}%`, background: 'var(--status-done-bg)' }}
      />
    </div>
  )
}

/** A member's checkout in a line: its branch, how far it is from upstream, or that it is unknown. */
export function GroupMemberGitLine({ member }: { member: GroupMemberView }) {
  const { git } = member
  if (!git) return null
  if (git.unread) return <span className="text-[11px] text-(--text-muted)">{git.unread}</span>
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap">
      <BranchChip type="current" label={git.branch ?? ''} />
      {git.divergence ? (
        <span className="whitespace-nowrap text-[11px] text-(--text-secondary)">
          {git.divergence}
        </span>
      ) : null}
    </span>
  )
}

/** What a member's failing checks read as, the chips the sign-off shows. */
export function GroupMemberChecks({ member }: { member: GroupMemberView }) {
  return (
    <>
      {member.checks.map((check) => (
        <span key={check.id} title={check.title}>
          <CheckChip row={check} inert />
        </span>
      ))}
    </>
  )
}

/**
 * One member at a glance. The card opens the project; a run listed on it opens
 * that run.
 */
export default function GroupMemberCard({
  title,
  icon,
  member,
  onSelect,
  onSelectRun,
}: GroupMemberCardProps) {
  const shown = member.runs.slice(0, GROUP_MEMBER_RUNS_SHOWN)
  const more = member.runs.length - shown.length
  const hasChips = member.badges.length > 0 || member.checks.length > 0
  return (
    <div
      className="relative flex min-w-0 flex-col gap-2 rounded-lg border bg-(--surface-raised) p-4 transition-colors hover:bg-(--surface-overlay)"
      style={{
        borderColor:
          member.attention === 'needs-you'
            ? 'var(--status-on_hold-soft-border)'
            : 'var(--border-subtle)',
      }}
    >
      <button
        type="button"
        aria-label={title}
        onClick={onSelect}
        className="absolute inset-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--accent-primary)"
      />
      <div className="pointer-events-none flex min-w-0 items-center gap-3">
        <div className="text-xl text-(--accent-primary)">{icon}</div>
        <div className="min-w-0 flex-1 truncate font-medium">{title}</div>
      </div>
      {hasChips ? (
        <div className="pointer-events-none flex flex-wrap items-center gap-1.5">
          <GroupStatusBadges badges={member.badges} />
          <GroupMemberChecks member={member} />
        </div>
      ) : null}
      <div className="pointer-events-none flex flex-col gap-1">
        {member.progress ? (
          <>
            <GroupMemberProgressBar percent={member.progress.percent} />
            <div className="text-[11px] text-(--text-secondary)">
              {[member.progress.stories, member.progress.features].filter(Boolean).join(' · ')}
            </div>
          </>
        ) : (
          <div className="text-[11px] text-(--text-muted)">{GROUP_STATUS_COPY.noWork}</div>
        )}
      </div>
      <div className="pointer-events-none flex min-w-0 items-center justify-between gap-2">
        <GroupMemberGitLine member={member} />
        {member.activity ? (
          <span className="shrink-0 text-[11px] text-(--text-muted)">{member.activity}</span>
        ) : null}
      </div>
      {shown.length > 0 ? (
        <ul className="flex flex-col gap-0.5">
          {shown.map((run) => (
            <li key={run.id}>
              <button
                type="button"
                onClick={() => onSelectRun?.(run.id, run.projectId)}
                className="relative flex w-full min-w-0 items-baseline gap-2 rounded px-1 py-0.5 text-left hover:bg-(--surface-muted)"
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full"
                  style={{ background: `var(--status-${run.tone}-bg)` }}
                  aria-hidden
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[12px]">{run.title}</span>
                  <span className="truncate text-[11px] text-(--text-secondary)">{run.line}</span>
                </span>
              </button>
            </li>
          ))}
          {more > 0 ? (
            <li className="pointer-events-none px-1 text-[11px] text-(--text-muted)">
              {GROUP_STATUS_COPY.moreRuns(more)}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}
