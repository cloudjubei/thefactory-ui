import type { RunModel } from '../../../../headless'
import Tooltip from '../../../primitives/Tooltip'

export type RunModelChipProps = {
  model: RunModel | undefined
}

/**
 * Which agent and model did the work, in the same shape as the composer's model
 * chip — but READ-ONLY. A landed run's model is a fact about work already done;
 * there is nothing here to pick. It sits in the head because every other agent
 * message names its model, and sign-off was the one place that did not.
 */
export default function RunModelChip({ model }: RunModelChipProps) {
  if (!model) return null
  const line = model.model ?? model.tool
  if (!line) return null
  return (
    <Tooltip
      placement="bottom"
      content={
        <div className="max-w-[260px] text-xs">
          <b className="mb-0.5 block font-semibold">Ran on {model.tag}</b>
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
        <span className="max-w-[128px] truncate text-[11.5px] font-medium text-(--text-primary)">
          {line}
        </span>
      </span>
    </Tooltip>
  )
}
