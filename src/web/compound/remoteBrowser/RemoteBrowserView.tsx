import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react'
import {
  REMOTE_BROWSER_MOVE_EVERY_MS,
  REMOTE_BROWSER_RESIZE_AFTER_MS,
  REMOTE_BROWSER_TEXT,
  boxBetween,
  driverOf,
  fitFrame,
  frameSrc,
  isMarkable,
  keyInput,
  noteTitle,
  noteWhere,
  shortSelector,
  toPagePoint,
  viewBoxOf,
  type RemoteBrowserBox,
  type RemoteBrowserNote,
  type RemoteBrowserPoint,
  type RemoteBrowserSize,
  type RemoteBrowserState,
  type RemoteBrowserStore,
} from '../../../headless'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Skeleton from '../../primitives/Skeleton'
import Spinner from '../../primitives/Spinner'
import NoteForAgentPopover from '../chat/NoteForAgentPopover'
import RemoteBrowserToolbar from './RemoteBrowserToolbar'

export type RemoteBrowserViewProps = {
  state: RemoteBrowserState
  store: RemoteBrowserStore
  /** A phone's width: a two-row bar. */
  compact?: boolean
  className?: string
}

type Drag = { from: RemoteBrowserPoint; to: RemoteBrowserPoint }

const EMPTY_SIZE: RemoteBrowserSize = { width: 0, height: 0 }

function boxStyle(box: RemoteBrowserBox) {
  return { left: box.x, top: box.y, width: box.width, height: box.height }
}

function Tag({ box, children }: { box: RemoteBrowserBox; children: string }) {
  return (
    <span
      className="absolute -translate-y-full whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-[11px] text-(--text-on-accent)"
      style={{ left: box.x, top: box.y - 4, background: 'var(--accent-primary)' }}
    >
      {children}
    </span>
  )
}

function Pin({ x, y, n }: { x: number; y: number; n: number }) {
  return (
    <span
      className="absolute -ml-2.5 -mt-2.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-(--text-on-accent) shadow-[0_0_0_2px_#fff]"
      style={{ left: x, top: y, background: 'var(--accent-primary)' }}
    >
      {n}
    </span>
  )
}

function Outline({
  note,
  box,
  faded,
  anchorRef,
}: {
  note: RemoteBrowserNote
  box: RemoteBrowserBox
  faded?: boolean
  anchorRef?: { current: HTMLDivElement | null }
}) {
  const pick = note.kind === 'pick'
  return (
    <div
      ref={anchorRef}
      className={`absolute ${pick ? 'rounded border-2 border-solid' : 'rounded-sm border-2 border-dashed'}`}
      style={{
        ...boxStyle(
          pick ? { x: box.x - 4, y: box.y - 4, width: box.width + 8, height: box.height + 8 } : box,
        ),
        borderColor: 'var(--accent-primary)',
        background: `color-mix(in srgb, var(--accent-primary) ${pick ? 10 : 8}%, transparent)`,
        opacity: faded ? 0.6 : 1,
      }}
    />
  )
}

function Card({
  busy,
  title,
  body,
  action,
  onAction,
}: {
  busy?: boolean
  title: string
  body: string
  action: string
  onAction: () => void
}) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center p-4"
      style={{ background: 'color-mix(in srgb, var(--surface-base) 35%, transparent)' }}
    >
      <div
        role="status"
        className="flex max-w-[300px] flex-col items-center gap-2 rounded-[10px] border border-(--border-subtle) bg-(--surface-raised) px-[18px] py-4 text-center shadow-(--shadow-2)"
      >
        {busy ? <Spinner size={22} className="text-(--text-muted)" /> : null}
        <b className="text-sm text-(--text-primary)">{title}</b>
        <span className="text-[12.5px] text-(--text-secondary)">{body}</span>
        <Button variant="secondary" size="sm" onClick={onAction}>
          {action}
        </Button>
      </div>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div aria-hidden className="absolute inset-0 flex flex-col gap-5 p-6">
      <Skeleton className="h-6 w-1/4 rounded" />
      <div className="flex flex-col items-center gap-2.5">
        <Skeleton className="h-7 w-1/2 rounded-lg" />
        <Skeleton className="h-3 w-1/3 rounded" />
      </div>
      <div className="grid flex-1 grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5">
        <Skeleton className="min-h-[90px] rounded-lg" />
        <Skeleton className="min-h-[90px] rounded-lg" />
        <Skeleton className="min-h-[90px] rounded-lg" />
      </div>
    </div>
  )
}

/**
 * A browser beside a chat, live: the page's frames as they come, driven by pointer, wheel and
 * keys mapped onto the page, or — in Pick and Mark — an element or an area pressed on the page,
 * each opening a note for the agent. Who drives shows in its bar; while the agent does, the page
 * only takes picks and marks until the person takes over.
 */
export default function RemoteBrowserView({
  state,
  store,
  compact = false,
  className,
}: RemoteBrowserViewProps) {
  const castRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState<RemoteBrowserSize>(EMPTY_SIZE)
  const [drag, setDrag] = useState<Drag | null>(null)
  const lastMove = useRef(0)

  useLayoutEffect(() => {
    const cast = castRef.current
    if (!cast) return
    const measure = () => setSize({ width: cast.clientWidth, height: cast.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(cast)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!size.width || !size.height || !state.shownId) return
    const timer = window.setTimeout(() => void store.resize(size), REMOTE_BROWSER_RESIZE_AFTER_MS)
    return () => window.clearTimeout(timer)
  }, [store, size, state.shownId])

  const metadata = state.frame?.metadata
  const page = metadata ? { width: metadata.deviceWidth, height: metadata.deviceHeight } : size
  const fit = fitFrame(size, page)
  const live = state.status === 'live'
  const drives = live && driverOf(state) === 'person'
  const pressable = live && (state.mode !== 'browse' || drives)

  useEffect(() => {
    const cast = castRef.current
    if (!cast) return
    const onWheel = (event: WheelEvent) => {
      if (!drives || state.mode !== 'browse') return
      const local = localOf(event.clientX, event.clientY)
      const at = local && toPagePoint(local, fit, page)
      if (!at) return
      event.preventDefault()
      void store.send({ kind: 'wheel', x: at.x, y: at.y, dx: event.deltaX, dy: event.deltaY })
    }
    cast.addEventListener('wheel', onWheel, { passive: false })
    return () => cast.removeEventListener('wheel', onWheel)
  })

  function localOf(clientX: number, clientY: number): RemoteBrowserPoint | null {
    const rect = castRef.current?.getBoundingClientRect()
    return rect ? { x: clientX - rect.left, y: clientY - rect.top } : null
  }

  function pageOf(event: { clientX: number; clientY: number }): RemoteBrowserPoint | null {
    const local = localOf(event.clientX, event.clientY)
    return local ? toPagePoint(local, fit, page) : null
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    castRef.current?.focus({ preventScroll: true })
    if (!live || state.mode !== 'mark' || event.button !== 0) return
    const local = localOf(event.clientX, event.clientY)
    if (!local) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ from: local, to: local })
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (drag) {
      const local = localOf(event.clientX, event.clientY)
      if (local) setDrag({ ...drag, to: local })
      return
    }
    if (!drives || state.mode !== 'browse') return
    const now = event.timeStamp
    if (now - lastMove.current < REMOTE_BROWSER_MOVE_EVERY_MS) return
    lastMove.current = now
    const at = pageOf(event)
    if (at) void store.send({ kind: 'move', x: at.x, y: at.y })
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!drag) return
    setDrag(null)
    const from = toPagePoint(drag.from, fit, page)
    const to = pageOf(event)
    if (!from || !to) return
    const box = boxBetween(from, to)
    if (isMarkable(box)) void store.mark(box)
  }

  function onClick(event: MouseEvent<HTMLDivElement>) {
    const at = pageOf(event)
    if (!at || !live) return
    if (state.mode === 'pick') void store.pick(at)
    else if (state.mode === 'browse' && drives)
      void store.send({ kind: 'click', x: at.x, y: at.y, clickCount: Math.max(1, event.detail) })
  }

  function onContextMenu(event: MouseEvent<HTMLDivElement>) {
    if (!drives || state.mode !== 'browse') return
    const at = pageOf(event)
    if (!at) return
    event.preventDefault()
    void store.send({ kind: 'click', x: at.x, y: at.y, button: 'right' })
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!drives || state.mode !== 'browse') return
    const input = keyInput(event)
    if (!input) return
    event.preventDefault()
    void store.send(input)
  }

  const shownBox = (note: RemoteBrowserNote) =>
    metadata ? viewBoxOf(note.box, note.scroll, metadata, fit) : null
  const draft = state.draft
  const draftBox = draft ? shownBox(draft) : null
  const dragBox = drag ? boxBetween(drag.from, drag.to) : null
  const lost = state.status === 'reconnecting' || state.status === 'ended'

  return (
    <div className={`flex min-h-0 min-w-0 flex-1 flex-col bg-(--surface-base) ${className ?? ''}`}>
      <RemoteBrowserToolbar
        state={state}
        store={store}
        compact={compact}
        viewport={size.width && size.height ? size : undefined}
      />
      <div
        ref={castRef}
        role="application"
        aria-label={state.title || REMOTE_BROWSER_TEXT.page}
        tabIndex={0}
        className={`relative min-h-0 flex-1 overflow-hidden bg-(--surface-muted) outline-none ${
          live && state.mode !== 'browse' ? 'cursor-crosshair' : ''
        } ${live && state.mode === 'browse' && !drives ? 'cursor-not-allowed' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrag(null)}
        onClick={pressable ? onClick : undefined}
        onContextMenu={onContextMenu}
        onKeyDown={onKeyDown}
        onPaste={(event) => {
          if (!drives || state.mode !== 'browse') return
          const text = event.clipboardData.getData('text')
          if (!text) return
          event.preventDefault()
          void store.send({ kind: 'text', text })
        }}
      >
        {state.frame ? (
          <img
            alt=""
            draggable={false}
            src={frameSrc(state.frame.data)}
            className="pointer-events-none absolute select-none"
            style={{
              ...boxStyle(fit),
              filter: lost ? 'grayscale(1)' : undefined,
              opacity: lost ? 0.45 : 1,
            }}
          />
        ) : state.status === 'opening' ? (
          <PageSkeleton />
        ) : state.status === 'idle' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-6 text-center">
            <b className="text-sm text-(--text-primary)">{REMOTE_BROWSER_TEXT.emptyTitle}</b>
            <span className="max-w-[320px] text-[12.5px] text-(--text-secondary)">
              {REMOTE_BROWSER_TEXT.emptyBody}
            </span>
          </div>
        ) : null}
        <div className="pointer-events-none absolute inset-0">
          {state.notes.map((note, index) => {
            const box = shownBox(note)
            if (!box) return null
            return (
              <div key={note.id}>
                <Outline note={note} box={box} faded />
                {note.kind === 'pick' ? (
                  <Pin x={box.x + box.width + 4} y={box.y - 4} n={index + 1} />
                ) : (
                  <Pin x={box.x} y={box.y} n={index + 1} />
                )}
              </div>
            )
          })}
          {draft && draftBox ? (
            <>
              <Outline
                note={draft}
                box={draftBox}
                anchorRef={draft.kind === 'pick' ? anchorRef : undefined}
              />
              {draft.kind === 'mark' ? (
                <div
                  ref={anchorRef}
                  className="absolute h-0 w-0"
                  style={{ left: draftBox.x + 24, top: draftBox.y + 24 }}
                />
              ) : null}
              {draft.kind === 'pick' ? (
                draft.target?.kind === 'element' ? (
                  <Tag box={{ ...draftBox, x: draftBox.x - 4, y: draftBox.y - 4 }}>
                    {`${shortSelector(draft.target.selector)} · ${REMOTE_BROWSER_TEXT.size(
                      Math.round(draft.box.width),
                      Math.round(draft.box.height),
                    )}`}
                  </Tag>
                ) : null
              ) : (
                <Tag box={draftBox}>
                  {REMOTE_BROWSER_TEXT.size(
                    Math.round(draft.box.width),
                    Math.round(draft.box.height),
                  )}
                </Tag>
              )}
            </>
          ) : null}
          {dragBox ? (
            <div
              className="absolute rounded-sm border-2 border-dashed"
              style={{
                ...boxStyle(dragBox),
                borderColor: 'var(--accent-primary)',
                background: 'color-mix(in srgb, var(--accent-primary) 8%, transparent)',
              }}
            />
          ) : null}
        </div>
        {state.status === 'reconnecting' ? (
          <Card
            busy
            title={REMOTE_BROWSER_TEXT.reconnectingTitle}
            body={REMOTE_BROWSER_TEXT.reconnectingBody}
            action={REMOTE_BROWSER_TEXT.tryNow}
            onAction={() => void store.retry()}
          />
        ) : state.status === 'ended' ? (
          <Card
            title={REMOTE_BROWSER_TEXT.endedTitle}
            body={REMOTE_BROWSER_TEXT.endedBody}
            action={REMOTE_BROWSER_TEXT.openAgain}
            onAction={() => void store.retry()}
          />
        ) : null}
        {state.error ? (
          <div className="absolute inset-x-2 top-2">
            <Alert onDismiss={() => store.dismissError()}>{state.error}</Alert>
          </div>
        ) : null}
      </div>
      {draft && draftBox ? (
        <NoteForAgentPopover
          key={draft.id}
          anchorRef={anchorRef}
          align="start"
          title={noteTitle(draft, state.notes.length + 1)}
          where={noteWhere(draft)}
          onCancel={() => store.cancelDraft()}
          onAdd={(note) => store.addDraft(note)}
        />
      ) : null}
    </div>
  )
}
