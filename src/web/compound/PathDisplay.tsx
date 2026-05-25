import { splitPath } from '../../headless/utils/path'

export { splitPath }

// Left-aligned path with bold filename; directory left-truncates first via
// the RTL-flip trick — the filename only starts shrinking once the dir
// collapses. The inner `<bdi>` (Unicode bidi isolation) processes the
// embedded LTR path as its own context, so the outer `direction: rtl`
// doesn't re-attach neutral characters (the leading `.` on dot-folders
// like `.factory`, the trailing `/`) to the wrong directional run —
// without it `/.factory/` would render as `/factory./`.
export function PathDisplay({ path }: { path: string }) {
  const { dir, name } = splitPath(path)
  return (
    <div className="flex items-baseline min-w-0 w-full overflow-hidden text-xs">
      {dir ? (
        <span
          className="truncate text-neutral-500"
          style={{ flexShrink: 1, minWidth: 0, direction: 'rtl', textAlign: 'left' }}
        >
          <bdi style={{ direction: 'ltr' }}>{`/${dir}`}</bdi>
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
