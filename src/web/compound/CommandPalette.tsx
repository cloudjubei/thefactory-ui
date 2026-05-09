import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Modal } from '../primitives/Modal'

export type CommandPaletteItem = {
  id: string
  label: string
  shortcut?: string
  run: () => void
}

export type CommandPaletteProps = {
  open: boolean
  onClose: () => void
  commands: CommandPaletteItem[]
  placeholder?: string
  // Optional pretty-printer for shortcut combos. If omitted, the raw combo string
  // is rendered. Library does not assume any shortcut serialisation format.
  prettyShortcut?: (combo: string) => string
  initialFocusRef?: RefObject<HTMLInputElement | null>
}

export function CommandPalette({
  open,
  onClose,
  commands,
  placeholder = 'Type a command…',
  prettyShortcut,
  initialFocusRef,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const fallbackRef = useRef<HTMLInputElement>(null)
  const inputRef = initialFocusRef ?? fallbackRef

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIdx(0)
    }
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter((c) => c.label.toLowerCase().includes(q))
  }, [commands, query])

  useEffect(() => {
    setActiveIdx(0)
  }, [query])

  return (
    <Modal isOpen={open} onClose={onClose} hideHeader size="md" initialFocusRef={inputRef}>
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActiveIdx((i) => Math.min(filtered.length - 1, i + 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActiveIdx((i) => Math.max(0, i - 1))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              const cmd = filtered[activeIdx]
              if (cmd) cmd.run()
            }
          }}
          className="w-full rounded border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--border-subtle)' }}
        />
        <ul role="listbox" className="flex flex-col max-h-72 overflow-auto">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm opacity-60">No commands match.</li>
          ) : (
            filtered.map((cmd, idx) => (
              <li
                key={cmd.id}
                role="option"
                aria-selected={idx === activeIdx}
                onMouseDown={(e) => {
                  e.preventDefault()
                  cmd.run()
                }}
                onMouseEnter={() => setActiveIdx(idx)}
                className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm cursor-pointer rounded"
                style={{
                  background: idx === activeIdx ? 'var(--surface-muted)' : 'transparent',
                }}
              >
                <span>{cmd.label}</span>
                {cmd.shortcut && (
                  <span className="font-mono text-xs opacity-60">
                    {prettyShortcut ? prettyShortcut(cmd.shortcut) : cmd.shortcut}
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </Modal>
  )
}
