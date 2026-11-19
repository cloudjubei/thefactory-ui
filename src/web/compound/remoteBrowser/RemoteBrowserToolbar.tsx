import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  REMOTE_BROWSER_MODES,
  REMOTE_BROWSER_TEXT,
  canGoBack,
  canGoForward,
  driverOf,
  shownSession,
  type RemoteBrowserMode,
  type RemoteBrowserState,
  type RemoteBrowserStore,
} from '../../../headless'
import { IconChevronLeft, IconChevronRight, IconClose, IconGlobe, IconRefresh } from '../../icons'
import { Button } from '../../primitives/Button'
import SegmentedControl from '../../primitives/SegmentedControl'
import ToneBadge from '../chips/ToneBadge'

export type RemoteBrowserToolbarProps = {
  state: RemoteBrowserState
  store: RemoteBrowserStore
  /** A phone: the address keeps its row, the modes and who drives take a second. */
  compact?: boolean
  /** The page's size in the view, which a newly opened page takes. */
  viewport?: { width: number; height: number }
}

function NavButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-(--text-secondary) hover:bg-(--surface-hover) disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  )
}

/**
 * The browser's own bar: Back, Forward and Reload, the address, what a press on the page does
 * (Browse, Pick, Mark) and who drives it, with Take over and Hand back for the agent's browser.
 */
export default function RemoteBrowserToolbar({
  state,
  store,
  compact = false,
  viewport,
}: RemoteBrowserToolbarProps) {
  const [typed, setTyped] = useState(state.address)
  const editing = useRef(false)
  useEffect(() => {
    if (!editing.current) setTyped(state.address)
  }, [state.address])

  const session = shownSession(state)
  const agentDrives = driverOf(state) === 'agent'
  const lost = state.status === 'reconnecting' || state.status === 'ended'
  const stuck = lost || agentDrives
  const opening = state.status === 'opening'

  const back = (
    <NavButton
      label={REMOTE_BROWSER_TEXT.back}
      disabled={stuck || !canGoBack(state)}
      onClick={() => void store.back()}
    >
      <IconChevronLeft className="h-4 w-4" />
    </NavButton>
  )
  const forward = (
    <NavButton
      label={REMOTE_BROWSER_TEXT.forward}
      disabled={stuck || !canGoForward(state)}
      onClick={() => void store.forward()}
    >
      <IconChevronRight className="h-4 w-4" />
    </NavButton>
  )
  const reload = (
    <NavButton
      label={REMOTE_BROWSER_TEXT.reload}
      disabled={stuck || opening || !state.address}
      onClick={() => void store.reload()}
    >
      <IconRefresh className="h-4 w-4" />
    </NavButton>
  )
  const address = (
    <form
      className="relative min-w-0 flex-1"
      onSubmit={(event) => {
        event.preventDefault()
        editing.current = false
        void store.open(typed, viewport)
      }}
    >
      <IconGlobe className="pointer-events-none absolute left-2.5 top-1.5 h-4 w-4 opacity-70" />
      <input
        aria-label={REMOTE_BROWSER_TEXT.address}
        placeholder={REMOTE_BROWSER_TEXT.addressPlaceholder}
        value={typed}
        disabled={stuck}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        inputMode="url"
        onFocus={(event) => {
          editing.current = true
          event.currentTarget.select()
        }}
        onBlur={() => {
          editing.current = false
          setTyped(state.address)
        }}
        onChange={(event) => setTyped(event.target.value)}
        className="h-7 w-full rounded-full border border-(--border-default) bg-(--surface-base) pl-8 pr-3 text-[13px] text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--focus-ring) disabled:opacity-60"
      />
    </form>
  )
  const modes = (
    <SegmentedControl
      size="sm"
      ariaLabel={REMOTE_BROWSER_TEXT.modes}
      value={state.mode}
      options={REMOTE_BROWSER_MODES.map((mode) => ({ value: mode.value, label: mode.label }))}
      onChange={(value) => {
        if (state.status === 'live') store.setMode(value as RemoteBrowserMode)
      }}
      className={`shrink-0 flex-nowrap ${state.status === 'live' ? '' : 'opacity-55'}`}
    />
  )
  const driver = session ? (
    <span className="inline-flex shrink-0 items-center gap-1.5">
      {agentDrives ? (
        <>
          <ToneBadge tone="running">{REMOTE_BROWSER_TEXT.agentDrives}</ToneBadge>
          <Button variant="secondary" size="sm" onClick={() => store.takeOver()}>
            {REMOTE_BROWSER_TEXT.takeOver}
          </Button>
        </>
      ) : (
        <>
          <ToneBadge tone="empty">{REMOTE_BROWSER_TEXT.youDrive}</ToneBadge>
          {session.holder?.kind === 'agent' ? (
            <Button variant="ghost" size="sm" onClick={() => store.handBack()}>
              {REMOTE_BROWSER_TEXT.handBack}
            </Button>
          ) : null}
        </>
      )}
    </span>
  ) : null
  const close =
    session && session.holder?.kind !== 'agent' ? (
      <NavButton label={REMOTE_BROWSER_TEXT.close} onClick={() => void store.close()}>
        <IconClose className="h-4 w-4" />
      </NavButton>
    ) : null
  const progress = opening ? (
    <span
      aria-hidden
      className="absolute bottom-[-1px] left-0 h-0.5 w-[58%] animate-pulse bg-(--accent-primary)"
    />
  ) : null

  if (compact)
    return (
      <div className="relative flex shrink-0 flex-col gap-1.5 border-b border-(--border-subtle) bg-(--surface-raised) px-2.5 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {back}
          {address}
          {reload}
          {close}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 gap-y-1.5">
          {modes}
          <span className="flex-1" />
          {driver}
        </div>
        {progress}
      </div>
    )
  return (
    <div className="relative flex shrink-0 items-center gap-1.5 border-b border-(--border-subtle) bg-(--surface-raised) px-2.5 py-2">
      {back}
      {forward}
      {reload}
      {address}
      {modes}
      {driver}
      {close}
      {progress}
    </div>
  )
}
