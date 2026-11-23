import { useEffect, useState } from 'react'
import type { BothOrder } from '../utils/conflictMarkers'
import { mergeFileText, type FileMergeSegment } from '../utils/pendingFileChange'

export type FileMergeInput = { path: string; base: string; ours: string; theirs: string }

export type FileMergeDialogProps = {
  input: FileMergeInput
  onClose: () => void
  onApply: (text: string) => void
  /** A more recent notification arrived or the editor no longer matches the reviewed draft. */
  stale?: boolean
  /** Fold the latest remote head into this open dialog without opening a second one. */
  onReload?: () => void
  save?: boolean
}

type MergeState = {
  base: string
  ours: string
  theirs: string
  segments: FileMergeSegment[]
  edited: string | null
}

function freshMergeState(base: string, ours: string, theirs: string): MergeState {
  return {
    base,
    ours,
    theirs,
    segments: mergeFileText(base, ours, theirs),
    edited: null,
  }
}

function matchesInput(state: MergeState, base: string, ours: string, theirs: string): boolean {
  return state.base === base && state.ours === ours && state.theirs === theirs
}

export function useFileMerge({ base, ours, theirs }: FileMergeInput) {
  const [state, setState] = useState<MergeState>(() => freshMergeState(base, ours, theirs))
  const [order, setOrder] = useState<BothOrder>('ours-then-theirs')

  useEffect(() => {
    setState((prev) =>
      matchesInput(prev, base, ours, theirs) ? prev : freshMergeState(base, ours, theirs),
    )
  }, [base, ours, theirs])

  const active = matchesInput(state, base, ours, theirs)
    ? state
    : freshMergeState(base, ours, theirs)
  const { segments, edited } = active

  const conflicts = segments.flatMap((segment, index) =>
    segment.type === 'conflict' ? [{ ...segment, index }] : [],
  )
  const result =
    edited ??
    segments.map((segment) => (segment.type === 'text' ? segment.text : segment.ours)).join('')

  const setEdited = (next: string | null) => {
    setState((prev) => {
      const current = matchesInput(prev, base, ours, theirs)
        ? prev
        : freshMergeState(base, ours, theirs)
      return { ...current, edited: next }
    })
  }

  const choose = (index: number | 'all', choice: 'ours' | 'theirs' | 'both') => {
    setState((prev) => {
      const current = matchesInput(prev, base, ours, theirs)
        ? prev
        : freshMergeState(base, ours, theirs)
      return {
        ...current,
        edited: null,
        segments: current.segments.map((segment, i) => {
          if (segment.type !== 'conflict' || (index !== 'all' && i !== index)) return segment
          const [first, second] =
            order === 'ours-then-theirs'
              ? [segment.ours, segment.theirs]
              : [segment.theirs, segment.ours]
          const both = first + (first && second && !first.endsWith('\n') ? '\n' : '') + second
          return { type: 'text', text: choice === 'both' ? both : segment[choice] }
        }),
      }
    })
  }

  return { conflicts, result, setEdited, order, setOrder, choose }
}
