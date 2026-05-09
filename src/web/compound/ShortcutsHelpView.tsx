import { Modal } from '../primitives/Modal'

export type ShortcutEntry = {
  id: string
  description: string
  combo: string
}

export type ShortcutsHelpViewProps = {
  open: boolean
  onClose: () => void
  shortcuts: ShortcutEntry[]
  prettyShortcut?: (combo: string) => string
  title?: string
}

export function ShortcutsHelpView({
  open,
  onClose,
  shortcuts,
  prettyShortcut,
  title = 'Keyboard shortcuts',
}: ShortcutsHelpViewProps) {
  return (
    <Modal isOpen={open} onClose={onClose} title={title} size="md">
      {shortcuts.length === 0 ? (
        <p className="text-sm opacity-60">No shortcuts registered.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {shortcuts.map((sc) => (
            <li key={sc.id} className="flex items-center justify-between gap-3 py-1">
              <span>{sc.description}</span>
              <span
                className="font-mono text-xs px-1.5 py-0.5 rounded border"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                {prettyShortcut ? prettyShortcut(sc.combo) : sc.combo}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
