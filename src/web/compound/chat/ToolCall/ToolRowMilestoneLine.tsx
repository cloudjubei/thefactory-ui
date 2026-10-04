import type { ToolRowMilestone } from '../../../../headless'

const TONE: Record<ToolRowMilestone['tone'], string> = {
  waiting: 'border-teal-500/40 bg-teal-500/10 text-teal-800 dark:text-teal-200',
  success: 'border-green-500/40 bg-green-500/10 text-green-800 dark:text-green-200',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200',
  error: 'border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-200',
}

/**
 * The line under a tool row that marks where its work stands — waiting on the
 * user, or what it did (a repository created, with the way to it).
 */
export default function ToolRowMilestoneLine({ milestone }: { milestone: ToolRowMilestone }) {
  return (
    <div
      className={`mx-3 mb-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md border px-2.5 py-1.5 text-xs ${TONE[milestone.tone]}`}
    >
      <span className="font-semibold">{milestone.title}</span>
      {milestone.detail ? <span className="opacity-80">{milestone.detail}</span> : null}
      {milestone.link ? (
        <a
          href={milestone.link.url}
          target="_blank"
          rel="noreferrer"
          className="ml-auto font-medium underline underline-offset-2"
          onClick={(e) => e.stopPropagation()}
        >
          {`${milestone.link.label} ↗`}
        </a>
      ) : null}
    </div>
  )
}
