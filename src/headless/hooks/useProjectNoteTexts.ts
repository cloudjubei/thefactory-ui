import { useEffect, useState } from 'react'
import type { NoteSummary } from '../utils/projectNotesTypes'

/**
 * The text of each plain note in a list, read once per version (`updatedAt`) of
 * the note. A secret is never read here — its value is revealed on demand.
 * A note whose text could not be read is absent.
 */
export function useProjectNoteTexts(
  notes: readonly NoteSummary[],
  readNote: (noteId: string) => Promise<string>,
): ReadonlyMap<string, string> {
  const [texts, setTexts] = useState<ReadonlyMap<string, string>>(new Map())
  const versionKey = notes
    .filter((n) => n.kind !== 'secret')
    .map((n) => `${n.id}@${n.updatedAt}`)
    .join('\n')
  useEffect(() => {
    let live = true
    const plain = notes.filter((n) => n.kind !== 'secret')
    void Promise.all(
      plain.map((n) =>
        readNote(n.id).then(
          (text) => [n.id, text] as const,
          () => undefined,
        ),
      ),
    ).then((read) => {
      if (live) setTexts(new Map(read.flatMap((entry) => (entry ? [entry] : []))))
    })
    return () => {
      live = false
    }
    // Re-read only when a plain note is added, removed or changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionKey])
  return texts
}
