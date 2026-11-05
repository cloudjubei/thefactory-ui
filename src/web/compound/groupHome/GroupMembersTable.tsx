import type { ReactNode } from 'react'
import { GROUP_STATUS_COPY, type GroupMemberView } from '../../../headless'
import { GroupMemberChecks, GroupMemberGitLine, GroupMemberProgressBar } from './GroupMemberCard'
import GroupStatusBadges from './GroupStatusBadges'

export type GroupMembersTableProps = {
  members: readonly GroupMemberView[]
  titleOf: (projectId: string) => string
  iconOf: (projectId: string) => ReactNode
  onSelect: (projectId: string) => void
}

const HEAD = 'px-3 py-2 text-left text-[11px] font-medium text-(--text-secondary)'
const CELL = 'px-3 py-2 align-middle'

/** The members as rows, one column per thing the roll-up says. A row opens the project. */
export default function GroupMembersTable({
  members,
  titleOf,
  iconOf,
  onSelect,
}: GroupMembersTableProps) {
  const { columns } = GROUP_STATUS_COPY
  return (
    <div className="overflow-x-auto rounded-lg border border-(--border-subtle) bg-(--surface-raised)">
      <table className="w-full min-w-[720px] border-collapse">
        <thead className="border-b border-(--border-subtle)">
          <tr>
            <th className={HEAD}>{columns.project}</th>
            <th className={HEAD}>{columns.runs}</th>
            <th className={HEAD}>{columns.work}</th>
            <th className={HEAD}>{columns.checks}</th>
            <th className={HEAD}>{columns.git}</th>
            <th className={HEAD}>{columns.activity}</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr
              key={member.projectId}
              onClick={() => onSelect(member.projectId)}
              className="cursor-pointer border-b border-(--border-subtle) last:border-b-0 hover:bg-(--surface-overlay)"
            >
              <td className={CELL}>
                <button
                  type="button"
                  className="flex min-w-0 items-center gap-2 text-left text-sm font-medium"
                  onClick={(event) => {
                    event.stopPropagation()
                    onSelect(member.projectId)
                  }}
                >
                  <span className="text-(--accent-primary)">{iconOf(member.projectId)}</span>
                  <span className="truncate">{titleOf(member.projectId)}</span>
                </button>
              </td>
              <td className={CELL}>
                <div className="flex flex-wrap gap-1">
                  <GroupStatusBadges badges={member.badges} />
                </div>
              </td>
              <td className={`${CELL} w-36`}>
                {member.progress ? (
                  <div className="flex flex-col gap-1">
                    <GroupMemberProgressBar percent={member.progress.percent} />
                    <span className="whitespace-nowrap text-[11px] text-(--text-secondary)">
                      {member.progress.features ?? member.progress.stories}
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] text-(--text-muted)">
                    {GROUP_STATUS_COPY.noWork}
                  </span>
                )}
              </td>
              <td className={CELL}>
                <div className="flex flex-wrap gap-1">
                  <GroupMemberChecks member={member} />
                </div>
              </td>
              <td className={CELL}>
                <GroupMemberGitLine member={member} />
              </td>
              <td className={`${CELL} whitespace-nowrap text-[11px] text-(--text-muted)`}>
                {member.activity}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
