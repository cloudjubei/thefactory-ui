export function splitPath(p: string): { dir: string; name: string } {
  const idx = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  if (idx === -1) return { dir: '', name: p }
  return { dir: p.slice(0, idx + 1), name: p.slice(idx + 1) }
}

// Left-aligned path with bold filename; directory left-truncates first via the
// RTL-flip trick — the filename only starts shrinking once the dir collapses.
export function PathDisplay({ path }: { path: string }) {
  const { dir, name } = splitPath(path)
  return (
    <div className="flex items-baseline min-w-0 w-full overflow-hidden">
      {dir ? (
        <span
          className="truncate text-neutral-500"
          style={{ flexShrink: 1, minWidth: 0, direction: 'rtl', textAlign: 'left' }}
        >
          <span style={{ direction: 'ltr' }}>{`/${dir}`}</span>
        </span>
      ) : null}
      <span
        className="font-mono font-semibold truncate"
        style={{ flexShrink: 0, maxWidth: '100%' }}
      >
        {dir ? ` ${name}` : name}
      </span>
    </div>
  )
}
