import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useFileMerge, type FileMergeDialogProps } from '../../../headless/hooks/useFileMerge'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'

type Choice = 'ours' | 'theirs' | 'both'
const CHOICES: { key: Choice; label: string }[] = [
  { key: 'ours', label: 'Accept ours' },
  { key: 'theirs', label: 'Accept theirs' },
  { key: 'both', label: 'Accept both' },
]

export default function FileMergeDialog({
  input,
  onClose,
  onApply,
  stale,
  onReload,
  save,
}: FileMergeDialogProps) {
  const { conflicts, result, setEdited, order, setOrder, choose } = useFileMerge(input)
  const [context, setContext] = useState(true)
  const [wrap, setWrap] = useState(true)
  const bodyRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLTextAreaElement>(null)
  const prevConflictsRef = useRef(conflicts.length)
  const prevStaleRef = useRef(!!stale)
  const blocked = !!stale || conflicts.length > 0
  const finish = () => {
    if (!blocked) onApply(result)
  }
  const finishRef = useRef(finish)
  finishRef.current = finish

  // Handle Mod+S across the whole dialog (including initial header Close focus
  // and footer buttons) and block browser Save Page while the modal is open.
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return
      event.preventDefault()
      event.stopPropagation()
      if (!event.repeat) finishRef.current()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])

  // Resolving the final conflict or reloading a stale merge unmounts the
  // focused button, which would otherwise drop document.activeElement to
  // document.body outside the modal.
  useLayoutEffect(() => {
    const hadConflicts = prevConflictsRef.current > 0
    const wasStale = prevStaleRef.current
    prevConflictsRef.current = conflicts.length
    prevStaleRef.current = !!stale
    const clearedConflicts = hadConflicts && conflicts.length === 0
    const clearedStale = wasStale && !stale
    if (!clearedConflicts && !clearedStale) return
    const dialog = bodyRef.current?.closest('[role="dialog"]')
    if (!dialog || !dialog.contains(document.activeElement)) {
      resultRef.current?.focus()
    }
  }, [conflicts.length, stale])

  const whitespace = wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
  const side = (label: string, text: string) => (
    <div className="min-w-0">
      <div className="mb-1 text-xs opacity-70">{label}</div>
      <pre
        className={`max-h-64 overflow-auto rounded-md border border-(--border-subtle) p-2 font-mono text-xs ${whitespace}`}
      >
        <code>{text}</code>
      </pre>
    </div>
  )

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Review and merge"
      size="xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={finish} disabled={blocked}>
            {save ? 'Merge and save' : 'Apply merge'}
          </Button>
        </div>
      }
    >
      <div ref={bodyRef} className="flex flex-col gap-3">
        {stale && (
          <Alert>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                The file changed during review.{' '}
                {onReload
                  ? 'Load the latest remote head to merge against.'
                  : 'Close and reopen the merge to review the latest edits.'}
              </span>
              {onReload && (
                <Button type="button" size="sm" variant="secondary" onClick={onReload}>
                  Load latest remote
                </Button>
              )}
            </div>
          </Alert>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="break-all font-mono">{input.path}</span>
          <span aria-live="polite">
            {conflicts.length ? `${conflicts.length} remaining` : 'No conflicts remaining'}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 text-xs">
          <label>
            <input
              type="checkbox"
              checked={context}
              onChange={(e) => setContext(e.target.checked)}
            />{' '}
            Context panes
          </label>
          <label>
            <input type="checkbox" checked={wrap} onChange={(e) => setWrap(e.target.checked)} />{' '}
            Wrap
          </label>
          <label>
            Both order{' '}
            <select
              value={order}
              onChange={(e) =>
                setOrder(
                  e.target.value === 'theirs-then-ours' ? 'theirs-then-ours' : 'ours-then-theirs',
                )
              }
            >
              <option value="ours-then-theirs">ours → theirs</option>
              <option value="theirs-then-ours">theirs → ours</option>
            </select>
          </label>
        </div>
        <div className={`grid grid-cols-1 gap-3 ${context ? 'lg:grid-cols-3' : ''}`}>
          {context && side('Theirs (incoming)', input.theirs)}
          <label className="min-w-0 text-xs">
            Result {conflicts.length ? '(resolve hunks to edit)' : '(editable)'}
            <textarea
              ref={resultRef}
              className={`mt-1 h-56 w-full resize-y rounded-md border border-(--border-subtle) bg-transparent p-2 font-mono text-xs ${whitespace}`}
              value={result}
              onChange={(e) => setEdited(e.target.value)}
              readOnly={blocked}
              spellCheck={false}
            />
          </label>
          {context && side('Ours (current)', input.ours)}
        </div>
        {conflicts.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {CHOICES.map(({ key, label }) => (
              <Button key={key} size="sm" variant="secondary" onClick={() => choose('all', key)}>
                {label} (all)
              </Button>
            ))}
          </div>
        )}
        {conflicts.map(({ index, ours, theirs }) => (
          <section
            key={index}
            className="overflow-hidden rounded-md border border-amber-300/60 p-3"
          >
            <h3 className="mb-2 text-xs font-semibold">Conflict</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {side('Ours (current)', ours)}
              {side('Theirs (incoming)', theirs)}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {CHOICES.map(({ key, label }) => (
                <Button key={key} size="sm" variant="secondary" onClick={() => choose(index, key)}>
                  {label}
                </Button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Modal>
  )
}
