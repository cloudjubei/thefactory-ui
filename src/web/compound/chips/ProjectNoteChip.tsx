import { useEffect, useRef, useState } from 'react'
import { projectNoteChipView } from '../../../headless'
import type { ProjectNoteSummary } from '../../../headless/api'
import Tooltip from '../../primitives/Tooltip'
import { IconDocument, IconKey } from '../../icons'

export type ProjectNoteChipProps = {
  note: Pick<ProjectNoteSummary, 'label' | 'kind'> &
    Partial<Pick<ProjectNoteSummary, 'access' | 'description'>>
  /** Reads a plain note's text for the hover card; never called for a secret. */
  loadValue?: () => Promise<string>
}

/**
 * A stored project note, as a chip: its kind as an icon, its label, and on
 * hover what it is for, who may read it and — for a plain note — its text.
 */
export default function ProjectNoteChip({ note, loadValue }: ProjectNoteChipProps) {
  const view = projectNoteChipView(note)
  const Glyph = view.kind === 'secret' ? IconKey : IconDocument
  return (
    <Tooltip
      placement="bottom"
      allowedPlacements={['bottom', 'top', 'right', 'left']}
      zIndex={2000}
      content={
        <div className="flex max-w-80 flex-col gap-1.5 text-[12px]">
          <div className="flex items-center gap-1.5 font-semibold text-(--text-primary)">
            <Glyph className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{view.label}</span>
            <span className="font-normal text-(--text-muted)">· {view.kindLabel}</span>
          </div>
          {view.description ? <p className="text-(--text-secondary)">{view.description}</p> : null}
          {view.accessLabel ? (
            <p className="text-(--text-secondary)">
              <span className="font-medium">{view.accessLabel}</span> — {view.accessHelp}
            </p>
          ) : null}
          {view.showsValue && loadValue ? <NoteText load={loadValue} /> : null}
          {view.hiddenValue ? <p className="text-(--text-muted)">{view.hiddenValue}</p> : null}
        </div>
      }
    >
      <span className="inline-flex items-center gap-1 rounded-full border border-(--border-default) bg-(--surface-base) px-2 py-0.5 text-[11.5px] text-(--text-secondary)">
        <Glyph className="h-3 w-3 shrink-0 text-(--text-muted)" aria-label={view.kindLabel} />
        {view.label}
      </span>
    </Tooltip>
  )
}

function NoteText({ load }: { load: () => Promise<string> }) {
  const [text, setText] = useState<string | undefined>()
  const [failed, setFailed] = useState(false)
  const loadOnce = useRef(load)
  useEffect(() => {
    let live = true
    loadOnce
      .current()
      .then((value) => live && setText(value))
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [])
  if (failed) return <p className="text-(--text-muted)">The note could not be read.</p>
  return (
    <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-(--surface-muted) p-2 font-mono text-[11px] text-(--text-secondary)">
      {text ?? 'Loading…'}
    </pre>
  )
}
