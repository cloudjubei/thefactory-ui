import type { RunModel } from '../../../../headless'
import Tooltip from '../../../primitives/Tooltip'

export type RunModelChipProps = {
  model: RunModel | undefined
  /** The agent role that ran — `developer`, `verifier`. Adds the provenance line. */
  role?: string
}

/**
 * Which agent and model did the work, in the same shape as the composer's model
 * chip — but READ-ONLY. A landed run's model is a fact about work already done;
 * there is nothing here to pick. When a `role` is given it leads the model with
 * the role (developer / verifier), so a section can say WHO ran it, not only on
 * what — the "Run by" chip the sign-off shows per section.
 */
export default function RunModelChip({ model, role }: RunModelChipProps) {
  if (!model) return null
  const line = model.model ?? model.tool
  if (!line) return null
  return (
    <Tooltip
      placement="bottom"
      content={
        <div className="max-w-[260px] text-xs">
          <b className="mb-0.5 block font-semibold">
            {role ? `${role} · ` : ''}Ran on {model.tag}
          </b>
          <span>
            {model.model
              ? `Model ${model.model}${model.effort ? `, ${model.effort} effort` : ''}.`
              : 'The runner did not record a model for this run.'}
          </span>
        </div>
      }
    >
      <span className="inline-flex items-center gap-1.5 rounded-full border border-(--border-default) bg-(--surface-base) py-0.5 pl-1.5 pr-2">
        <span className="rounded-[3px] bg-purple-500/20 px-1 text-[8.5px] font-bold uppercase tracking-wide text-purple-700 dark:text-purple-200">
          {model.tag}
        </span>
        {role ? (
          <span className="flex flex-col leading-tight">
            <span className="text-[9px] uppercase tracking-wide text-(--text-muted)">{role}</span>
            <span className="max-w-[128px] truncate text-[11.5px] font-medium text-(--text-primary)">
              {line}
            </span>
          </span>
        ) : (
          <span className="max-w-[128px] truncate text-[11.5px] font-medium text-(--text-primary)">
            {line}
          </span>
        )}
      </span>
    </Tooltip>
  )
}
