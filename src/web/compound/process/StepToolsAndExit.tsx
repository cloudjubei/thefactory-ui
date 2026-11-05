import { useState } from 'react'
import { processStepToolsView } from '../../../headless'
import type { ProcessPlanStep } from 'thefactory-tools/types'
import { IconChevron } from '../../icons'

export type StepToolsAndExitProps = {
  step: Pick<ProcessPlanStep, 'kind' | 'agentType' | 'agentRole' | 'documents'>
}

/** What a step is handed and what ends it. The tools fold under one line, as a chat's steps do. */
export default function StepToolsAndExit({ step }: StepToolsAndExitProps) {
  const [open, setOpen] = useState(false)
  const { exitLabel, tools, toolsLabel, noTools } = processStepToolsView(step)
  return (
    <div className="mt-1.5 flex flex-col gap-1 text-[11px] text-(--text-secondary)">
      <div>{exitLabel}</div>
      {noTools ? <div>{noTools}</div> : null}
      {toolsLabel ? (
        <>
          <button
            type="button"
            className="flex w-fit items-center gap-1 hover:text-(--text-primary)"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <IconChevron
              className="h-3 w-3 shrink-0 transition-transform"
              style={{ transform: `rotate(${open ? 90 : 0}deg)` }}
            />
            {toolsLabel}
          </button>
          {open ? (
            <ul className="flex flex-wrap gap-x-2 gap-y-0.5 pl-4 font-mono text-[10.5px]">
              {tools.map((tool) => (
                <li key={tool}>{tool}</li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
