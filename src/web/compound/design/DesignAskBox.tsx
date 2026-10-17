import { designAskSummary, useActiveProject, useDesignPreview } from '../../../headless'
import type { DesignAskEntry } from '../../../headless/utils/toolAskCardTypes'
import type { DesignIndex } from '../../../headless/api'
import DesignPill from './DesignPill'

export type DesignAskBoxProps = {
  /** The project the ask names; the chat's own when it names none. */
  projectId?: string
  entries: DesignAskEntry[]
  newScreens: Array<{ name: string; closest: string[]; why: string }>
}

/** What a design ask files, against a design already read — drawn the same with or without the API. */
export function DesignAskSummaryBox({
  index,
  entries,
  newScreens,
}: Omit<DesignAskBoxProps, 'projectId'> & { index: DesignIndex }) {
  const summary = designAskSummary(index, entries)
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-(--border-subtle) bg-(--surface-base) p-3 text-[12.5px]">
      {summary.screens.map((s) => (
        <div key={s.name} className="flex flex-col gap-1.5">
          <span className="text-(--text-primary)">
            {s.found ? (
              <>
                Found the screen you already have — <strong>“{s.name}”</strong> in {s.found.app}. It
                holds {s.found.versions} {s.found.versions === 1 ? 'image' : 'images'}; these go in
                as its states, not a new screen.
              </>
            ) : (
              <>
                A new screen — <strong>“{s.name}”</strong>.
              </>
            )}
          </span>
          <span className="flex flex-wrap gap-1.5">
            {s.states.map((st) => (
              <span key={st.name} className="flex items-center gap-1">
                <DesignPill tone={st.tag === 'replaces' ? 'review' : 'running'}>
                  {st.tag === 'replaces' ? 'Replaces' : 'New'}
                </DesignPill>
                {st.name}
              </span>
            ))}
          </span>
        </div>
      ))}
      {summary.unfiled > 0 ? (
        <span className="text-(--text-secondary)">
          {summary.unfiled} {summary.unfiled === 1 ? 'image names' : 'images name'} no screen yet —
          you file {summary.unfiled === 1 ? 'it' : 'them'} in Proposals.
        </span>
      ) : null}
      {summary.variants.length > 0 ? (
        <span className="text-(--text-secondary)">
          Variants, given once: {summary.variants.join(', ')}
        </span>
      ) : null}
      {newScreens.map((n) => (
        <div
          key={n.name}
          className="flex flex-col gap-0.5 rounded-md border px-2.5 py-2"
          style={{
            background: 'var(--status-on_hold-soft-bg)',
            borderColor: 'var(--status-on_hold-soft-border)',
          }}
        >
          <span className="font-semibold text-(--text-primary)">
            Why “{n.name}” is not{' '}
            {n.closest.map((c) => `“${c}”`).join(' or ') || 'an existing screen'}
          </span>
          <span className="text-(--text-secondary)">{n.why}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * The body of an agent's design ask on its card: each screen it files into —
 * the one the design already has, or a new one — the states it replaces or
 * adds, the variants once, and why a new screen is not one it resembles.
 */
export default function DesignAskBox({ projectId, entries, newScreens }: DesignAskBoxProps) {
  const active = useActiveProject().projectId ?? undefined
  const { index } = useDesignPreview(projectId ?? active)
  return <DesignAskSummaryBox index={index} entries={entries} newScreens={newScreens} />
}
