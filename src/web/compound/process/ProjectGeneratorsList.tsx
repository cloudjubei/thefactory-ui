import type { ProjectGeneratorSetting } from 'thefactory-tools/types'

import {
  PROJECT_GENERATOR_INPUTS_LABEL,
  PROJECT_GENERATOR_OUTPUTS_LABEL,
  PROJECT_GENERATORS_HEADING,
  projectGeneratorLines,
} from '../../../headless'

export type ProjectGeneratorsListProps = {
  /** The generators the project declares, as its checks listing returns them. */
  generators: readonly ProjectGeneratorSetting[]
}

/**
 * The project's generators on its checks listing: each one's name, command,
 * what it reads — a path, or another project's file — and what it writes.
 * Nothing when there are none. Native peer:
 * `native/compound/process/ProjectGeneratorsList`.
 */
export default function ProjectGeneratorsList({ generators }: ProjectGeneratorsListProps) {
  const lines = projectGeneratorLines(generators)
  if (lines.length === 0) return null
  return (
    <section
      aria-label={PROJECT_GENERATORS_HEADING}
      className="flex flex-col gap-1.5 rounded-md border border-(--border-subtle) bg-(--surface-raised) p-3"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
        {PROJECT_GENERATORS_HEADING}
      </span>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {lines.map((line, at) => (
          <li key={`${at}:${line.name}`} className="flex min-w-0 flex-col gap-0.5 text-[12px]">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
              <span className="min-w-0 truncate font-medium text-(--text-primary)">
                {line.name}
              </span>
              <span
                className="min-w-0 truncate font-mono text-[11px] text-(--text-secondary)"
                title={line.command}
              >
                {line.command}
              </span>
            </div>
            {line.reads.length > 0 ? (
              <span className="min-w-0 break-words text-[11px] text-(--text-secondary)">
                {PROJECT_GENERATOR_INPUTS_LABEL}:{' '}
                <span className="font-mono">{line.reads.join(', ')}</span>
              </span>
            ) : null}
            <span className="min-w-0 break-words text-[11px] text-(--text-secondary)">
              {PROJECT_GENERATOR_OUTPUTS_LABEL}:{' '}
              <span className="font-mono">{line.writes.join(', ')}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
