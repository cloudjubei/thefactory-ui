import Tooltip from '../../primitives/Tooltip'

export type FileInfoData = {
  path?: string
  absolutePath?: string
  size?: number | null
  type?: string | null
  ext?: string | null
  mtime?: number | string | Date | null
  ctime?: number | string | Date | null
}

export type FileInfoButtonProps = {
  info: FileInfoData
}

function humanSize(n: number): string {
  if (n < 1024) return `${n} B`
  const kb = n / 1024
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`
  const gb = mb / 1024
  return `${gb < 10 ? gb.toFixed(1) : Math.round(gb)} GB`
}

function toDate(v: number | string | Date | null | undefined): Date | null {
  if (v == null) return null
  if (v instanceof Date) return v
  if (typeof v === 'number') return new Date(v)
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

function relTime(d: Date): string {
  const delta = Date.now() - d.getTime()
  const sec = Math.round(delta / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 7) return `${day}d ago`
  const week = Math.round(day / 7)
  if (week < 5) return `${week}w ago`
  return d.toLocaleDateString()
}

function formatAbsolute(d: Date): string {
  return d.toLocaleString()
}

function Row({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-(--text-muted) shrink-0">{label}</span>
      <span className="text-right wrap-break-word" title={title ?? value}>
        {value}
      </span>
    </div>
  )
}

function extFromPath(path?: string): string | undefined {
  if (!path) return undefined
  const dot = path.lastIndexOf('.')
  if (dot === -1) return undefined
  return path.slice(dot + 1).toLowerCase()
}

export function FileInfoButton({ info }: FileInfoButtonProps) {
  const mtime = toDate(info.mtime)
  const ctime = toDate(info.ctime)
  const ext = info.ext ?? extFromPath(info.path)
  const sizeStr = typeof info.size === 'number' ? humanSize(info.size) : undefined

  const content = (
    <div className="min-w-[260px] max-w-[420px] text-xs text-(--text-primary)">
      <div className="font-semibold mb-2">File info</div>
      <div className="space-y-1">
        {info.path && <Row label="Path" value={info.path} />}
        {info.absolutePath && info.absolutePath !== info.path && (
          <Row label="Absolute" value={info.absolutePath} />
        )}
        {info.type && <Row label="Type" value={info.type} />}
        {ext && <Row label="Extension" value={`.${ext}`} />}
        {sizeStr && <Row label="Size" value={sizeStr} title={`${info.size} bytes`} />}
        {mtime && <Row label="Modified" value={relTime(mtime)} title={formatAbsolute(mtime)} />}
        {ctime && <Row label="Created" value={relTime(ctime)} title={formatAbsolute(ctime)} />}
      </div>
    </div>
  )

  return (
    <Tooltip content={content} placement="bottom" sideAlign="start" delayMs={150}>
      <button
        type="button"
        aria-label="File info"
        title="File info"
        className={[
          'inline-flex items-center justify-center w-6 h-6 rounded-full shrink-0',
          'border border-blue-500 text-blue-600 bg-transparent',
          'hover:bg-blue-50 dark:hover:bg-blue-900/20',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
        ].join(' ')}
      >
        <span className="text-[11px] font-semibold leading-none">i</span>
      </button>
    </Tooltip>
  )
}

export default FileInfoButton
