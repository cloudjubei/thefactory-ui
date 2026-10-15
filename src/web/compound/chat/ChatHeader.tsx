import type { ReactNode } from 'react'

import type { ChatHeaderView } from '../../../headless'
import { IconChevron, IconMaximize } from '../../icons'
import CostChip from '../chips/CostChip'
import DurationChip from '../chips/DurationChip'
import ToneBadge from '../chips/ToneBadge'
import HeaderBar from '../HeaderBar'
import StepsStrip from '../process/StepsStrip'
import ChatKindTile from './ChatKindTile'

export type ChatHeaderProps = {
  /** What the header shows — from `useChatHeaderView`. */
  view: ChatHeaderView
  /** The "i" button that opens what the chat is about. */
  contextInfoSlot?: ReactNode
  /** The chat's model chip. */
  modelChip?: ReactNode
  /** The settings gear and its menu — usually `<ChatSettingsMenu>`. */
  settingsMenu?: ReactNode
  /** A panel anchored under the header — the turn limit and tools panel. */
  settingsPanel?: ReactNode
  /** When set (docked panel), a collapse chevron leads the header. */
  onCollapse?: () => void
  /** When set (docked panel), a button opens the chat in its own view. */
  onMaximize?: () => void
  /** Leaves the title to the surrounding chrome — the app bar on a small screen, an overlay's own head. */
  hideTitle?: boolean
  /**
   * A narrow host — a docked panel or a sheet: the title keeps its row with the
   * icon controls, the pill, meta and model chip take a second row, and the
   * steps strip folds.
   */
  narrow?: boolean
  /** Controls after the settings gear. */
  extraRight?: ReactNode
  /**
   * The chat is docked beside what it is about — a run's chat beside its run —
   * so the header is one slim row: collapse, this label, the model chip and
   * maximize. The kind tile, title, status, meta and steps are already on
   * screen beside it; maximized, the chat gets its full header back.
   */
  dockedLabel?: string
}

/**
 * The chat header: the kind tile and title with the status of the run, story
 * or feature the chat is about; a line saying where it sits with its time and
 * cost; the model chip and the settings gear. Under it, for a run, story or
 * feature chat, the steps strip. Narrow, the title keeps its row with the icon
 * controls and the pill, meta and model chip take a second row; docked beside
 * its subject (`dockedLabel`), it is one slim row.
 */
export default function ChatHeader({
  view,
  contextInfoSlot,
  modelChip,
  settingsMenu,
  settingsPanel,
  onCollapse,
  onMaximize,
  hideTitle = false,
  narrow = false,
  extraRight,
  dockedLabel,
}: ChatHeaderProps) {
  const maximize = onMaximize ? (
    <button
      type="button"
      onClick={onMaximize}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-(--border-default) bg-(--surface-raised) text-(--text-secondary) hover:bg-(--surface-hover)"
      aria-label="Open chat in its own view"
      title="Open chat in its own view"
    >
      <IconMaximize className="size-4" />
    </button>
  ) : null
  const collapse = onCollapse ? (
    <button
      type="button"
      onClick={onCollapse}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-(--border-default) bg-(--surface-raised) text-(--text-secondary) hover:bg-(--surface-hover)"
      aria-label="Collapse chat sidebar"
      title="Collapse chat sidebar"
    >
      <IconChevron className="size-4" style={{ transform: 'rotate(90deg)' }} />
    </button>
  ) : null
  if (dockedLabel !== undefined) {
    return (
      <div className="flex shrink-0 flex-col">
        <HeaderBar
          narrow
          leading={collapse}
          title={dockedLabel}
          {...(modelChip || maximize
            ? {
                trailing: (
                  <>
                    {modelChip}
                    {maximize}
                  </>
                ),
              }
            : {})}
        />
      </div>
    )
  }
  const trailing = narrow ? (
    contextInfoSlot || maximize || settingsMenu || extraRight ? (
      <>
        {contextInfoSlot}
        {maximize}
        {settingsMenu}
        {extraRight}
      </>
    ) : undefined
  ) : maximize || modelChip || settingsMenu || extraRight ? (
    <>
      {maximize}
      {modelChip}
      {settingsMenu}
      {extraRight}
    </>
  ) : undefined
  return (
    <div className="flex shrink-0 flex-col">
      <HeaderBar
        narrow={narrow}
        {...(narrow && modelChip ? { secondary: modelChip } : {})}
        leading={
          <>
            {collapse}
            {narrow ? null : contextInfoSlot}
            <ChatKindTile kind={view.kind} label={view.kindLabel} />
          </>
        }
        {...(hideTitle ? {} : { title: view.title })}
        pill={
          view.pill ? <ToneBadge tone={view.pill.tone}>{view.pill.label}</ToneBadge> : undefined
        }
        meta={
          <>
            {view.context ? <span className="min-w-0 truncate">{view.context}</span> : null}
            {view.duration ? (
              <DurationChip
                label={view.duration.label}
                details={view.duration.details}
                title={view.duration.title}
              />
            ) : null}
            {view.cost ? (
              <CostChip label={view.cost.label} cost={view.cost.cost} title={view.cost.title} />
            ) : null}
          </>
        }
        trailing={trailing}
      >
        {settingsPanel}
      </HeaderBar>
      {view.strip ? <StepsStrip model={view.strip} narrow={narrow} /> : null}
    </div>
  )
}
