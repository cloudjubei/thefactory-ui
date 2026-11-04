import { useRef, useState, type ReactNode } from 'react'

import {
  LOOM_WALKTHROUGH_DEFAULT_LAYOUT,
  LOOM_WALKTHROUGH_TEXT,
  type LoomWalkthroughActions,
  type LoomWalkthroughLayout,
  type LoomWalkthroughRow,
  type LoomWalkthroughView,
} from '../../../../headless'
import { IconChevron } from '../../../icons'
import Alert from '../../../primitives/Alert'
import { Button } from '../../../primitives/Button'
import { Input } from '../../../primitives/Input'

export type LoomWalkthroughPanelProps = LoomWalkthroughActions & {
  view: LoomWalkthroughView
  layout?: LoomWalkthroughLayout
  /** The step open first, over the first still to record — for a fixed showcase state. */
  openId?: string
  /** A step's attach box starts on Replace — for a fixed showcase state. */
  replacingId?: string
  /** What the link box of the open step starts with — for a fixed showcase state. */
  linkDraft?: string
}

type AttachProps = LoomWalkthroughActions & {
  row: LoomWalkthroughRow
  startsReplacing: boolean
  linkDraft: string
  /** It went in: the next step can open. */
  onAttached: () => void
}

function Part({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
        {label}
      </span>
      {children}
    </div>
  )
}

function Script({ row }: { row: LoomWalkthroughRow }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 text-[12.5px] text-(--text-primary)">
      <Part label={LOOM_WALKTHROUGH_TEXT.open}>
        <span className="wrap-break-word">{row.open}</span>
      </Part>
      <Part label={LOOM_WALKTHROUGH_TEXT.steps}>
        <ol className="m-0 flex list-decimal flex-col gap-0.5 pl-4">
          {row.steps.map((step, i) => (
            <li key={i} className="wrap-break-word">
              {step}
            </li>
          ))}
        </ol>
      </Part>
      <Part label={LOOM_WALKTHROUGH_TEXT.mustShow}>
        <ul className="m-0 flex list-disc flex-col gap-0.5 pl-4">
          {row.mustShow.map((line, i) => (
            <li key={i} className="wrap-break-word">
              {line}
            </li>
          ))}
        </ul>
      </Part>
    </div>
  )
}

function Attach({
  row,
  startsReplacing,
  linkDraft,
  attachLink,
  attachFile,
  onAttached,
}: AttachProps) {
  const [link, setLink] = useState(linkDraft)
  const [replacing, setReplacing] = useState(startsReplacing)
  const fileInput = useRef<HTMLInputElement>(null)
  const busy = row.sending !== undefined
  const done = (ok: boolean) => {
    if (!ok) return
    setLink('')
    setReplacing(false)
    onAttached()
  }
  const addLink = () => void attachLink(row.id, link).then(done)
  const onFile = (file: File | undefined) => {
    if (fileInput.current) fileInput.current.value = ''
    if (!file) return
    void attachFile(row.id, { name: file.name, size: file.size, blob: file }).then(done)
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {row.result ? (
        <div className="flex flex-wrap items-center gap-2">
          {row.result.kind === 'link' ? (
            <a
              href={row.result.url}
              target="_blank"
              rel="noreferrer noopener"
              className="chip chip--ok no-underline"
            >
              {row.result.label}
            </a>
          ) : (
            <span className="chip chip--ok">{row.result.label}</span>
          )}
          {!replacing ? (
            <Button size="sm" variant="ghost" onClick={() => setReplacing(true)}>
              {LOOM_WALKTHROUGH_TEXT.replace}
            </Button>
          ) : null}
        </div>
      ) : null}
      {!row.result || replacing ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            size="sm"
            className="min-w-[200px] flex-1"
            type="url"
            value={link}
            disabled={busy}
            aria-label={LOOM_WALKTHROUGH_TEXT.linkLabel}
            placeholder={LOOM_WALKTHROUGH_TEXT.linkPlaceholder}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addLink()
              }
            }}
          />
          <Button
            size="sm"
            variant="primary"
            disabled={busy || link.trim() === ''}
            onClick={addLink}
          >
            {LOOM_WALKTHROUGH_TEXT.addLink}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            {LOOM_WALKTHROUGH_TEXT.uploadVideo}
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="video/*"
            hidden
            aria-hidden
            tabIndex={-1}
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>
      ) : null}
      {row.sending ? (
        <span className="text-[11.5px] text-(--text-secondary)" aria-live="polite">
          {row.sending}
        </span>
      ) : null}
      {row.error ? <Alert variant="error">{row.error}</Alert> : null}
    </div>
  )
}

function StepState({ row }: { row: LoomWalkthroughRow }) {
  return (
    <span
      className={`badge badge--soft badge--sm shrink-0 ${
        row.recorded ? 'badge--done' : 'badge--queued'
      }`}
    >
      {row.state}
    </span>
  )
}

/**
 * What an agent could not capture, for a person to record: each step with what
 * to open, what to do and what must be visible, and a place for a Loom link or a
 * video. By default one step is open at a time, the first still to record, and
 * attaching moves on to the next.
 */
export default function LoomWalkthroughPanel({
  view,
  layout = LOOM_WALKTHROUGH_DEFAULT_LAYOUT,
  openId,
  replacingId,
  linkDraft = '',
  attachLink,
  attachFile,
}: LoomWalkthroughPanelProps) {
  const [picked, setPicked] = useState<string | null | undefined>(openId)
  const opened = picked === undefined ? view.firstOpen : picked
  const attach = (row: LoomWalkthroughRow) => (
    <Attach
      row={row}
      startsReplacing={row.id === replacingId}
      linkDraft={row.id === (openId ?? view.firstOpen) ? linkDraft : ''}
      attachLink={attachLink}
      attachFile={attachFile}
      onAttached={() => setPicked(undefined)}
    />
  )
  const heading = (row: LoomWalkthroughRow) => (
    <>
      <span className="id-chip shrink-0">{row.number}</span>
      <span className="min-w-0 flex-1 text-[13px] font-semibold text-(--text-primary)">
        {row.title}
      </span>
      <StepState row={row} />
    </>
  )

  return (
    <div className="flex flex-col gap-2.5 pt-3">
      <div className="flex flex-col gap-0.5 text-[12.5px]">
        <span className="text-(--text-secondary)">{LOOM_WALKTHROUGH_TEXT.intro}</span>
        <span className="font-medium text-(--text-primary)">{view.summary}</span>
      </div>
      {layout === 'folds' ? (
        <div className="flex flex-col overflow-hidden rounded-lg border border-(--border-subtle)">
          {view.rows.map((row) => {
            const open = row.id === opened
            return (
              <div key={row.id} className="border-b border-(--border-subtle) last:border-b-0">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setPicked(open ? null : row.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
                >
                  <IconChevron
                    className={`size-3 shrink-0 text-(--text-muted) transition-transform ${open ? 'rotate-90' : ''}`}
                  />
                  {heading(row)}
                </button>
                {open ? (
                  <div className="flex flex-col gap-3 px-3 pb-3 pl-8">
                    <Script row={row} />
                    {attach(row)}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {view.rows.map((row) => (
            <div
              key={row.id}
              className="@container flex flex-col gap-2.5 rounded-lg border border-(--border-subtle) p-3"
            >
              <div className="flex items-center gap-2">{heading(row)}</div>
              {layout === 'script' ? (
                <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                  <Script row={row} />
                  {attach(row)}
                </div>
              ) : (
                <>
                  <Script row={row} />
                  {attach(row)}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
