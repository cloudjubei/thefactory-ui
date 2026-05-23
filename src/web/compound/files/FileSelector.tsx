import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import FileDisplay, { type UikitFileMeta } from './FileDisplay'

const SMALL_SCREEN_MEDIA_QUERY = '(max-width: 767px)'

function useIsSmallScreen(): boolean {
  const [isSmall, setIsSmall] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(SMALL_SCREEN_MEDIA_QUERY).matches,
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(SMALL_SCREEN_MEDIA_QUERY)
    const handler = (e: MediaQueryListEvent) => setIsSmall(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isSmall
}

export type FileSelectorProps = {
  /** Pool of files to choose from. Library doesn't fetch — consumer supplies. */
  files: UikitFileMeta[]
  /** Initial selection (matches against `file.relativePath`). Subsequent prop changes are ignored. */
  initialSelected?: string[]
  onConfirm: (selected: string[]) => void
  allowMultiple?: boolean
  title?: string
  /** Async preview loader passed through to `FileDisplay`. */
  onReadPreview?: (relativePath: string) => Promise<string | null>
}

export default function FileSelector({
  files,
  initialSelected,
  onConfirm,
  allowMultiple = true,
  title,
  onReadPreview,
}: FileSelectorProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>(() => initialSelected ?? [])
  const inputRef = useRef<HTMLInputElement>(null)
  const isSmall = useIsSmallScreen()

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0)
    return () => clearTimeout(t)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? files.filter((p) => p.name.toLowerCase().includes(q)) : files
    return [...list].sort((a, b) => {
      if (q) {
        const aScore = a.name.toLowerCase().indexOf(q)
        const bScore = b.name.toLowerCase().indexOf(q)
        if (aScore !== bScore) return aScore - bScore
      }
      return a.name.localeCompare(b.name)
    })
  }, [files, query])

  const toggle = (path: string) =>
    setSelected((prev) => {
      if (prev.includes(path)) return prev.filter((p) => p !== path)
      return allowMultiple ? [...prev, path] : [path]
    })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          <Input
            ref={inputRef}
            placeholder="Search files by name or path"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search files"
          />
        </div>
        <div className="text-xs text-(--text-muted) whitespace-nowrap pl-1">
          {filtered.length} files
        </div>
      </div>

      <div
        role="listbox"
        aria-label={title || 'Files'}
        aria-multiselectable={allowMultiple}
        className="border border-(--border-subtle) rounded-md max-h-[50vh] overflow-auto p-1 bg-(--surface-raised) flex flex-col gap-1"
      >
        {filtered.map((file) => {
          const path = file.relativePath ?? file.name
          const isSelected = selected.includes(path)
          return (
            <div
              key={path}
              role="option"
              aria-selected={isSelected}
              className="context-file-chip flex w-full items-center"
            >
              <FileDisplay
                file={file}
                density="normal"
                interactive
                showPreviewOnHover={!isSmall}
                onReadPreview={onReadPreview}
                onClick={() => toggle(path)}
                className={`w-full ${isSelected ? 'bg-(--surface-hover)' : ''}`}
                trailing={
                  <span
                    className={[
                      'inline-flex items-center justify-center w-5 h-5 rounded-sm border text-[10px]',
                      // Reference the CSS variable directly rather than the
                      // `bg-brand-600` theme utility — consumers without the
                      // `@theme inline` block registered (e.g. via legacy
                      // piecemeal Tailwind imports) won't have the named
                      // utility generated, but `--color-brand-600` is always
                      // defined by the package's `tokens.css`.
                      isSelected
                        ? 'bg-(--color-brand-600) text-white border-(--color-brand-600)'
                        : 'bg-transparent text-(--text-muted) border-(--border-subtle)',
                    ].join(' ')}
                    aria-hidden
                  >
                    {isSelected ? '✓' : ''}
                  </span>
                }
              />
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="p-4 text-sm text-(--text-muted)">No files match your search.</div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        {/* Cancel intentionally removed across all platforms — closing the
         *  modal via X / overlay / Esc IS the cancel. Only the primary
         *  Confirm remains. */}
        <Button onClick={() => onConfirm(selected)} disabled={selected.length === 0}>
          Confirm{selected.length ? ` (${selected.length})` : ''}
        </Button>
      </div>
    </div>
  )
}
