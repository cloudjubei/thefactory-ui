import { useEffect } from 'react'

import {
  SIGNOFF_DECISION_PAIR_LABEL,
  SIGNOFF_DECISION_STEP_LABEL,
  type ScreenPair,
  type SignoffDecisionAction,
  type SignoffDecisionItem,
  type SignoffDecisionTone,
  type SignoffStepTarget,
} from '../../../../headless'
import { IconCheck, IconError, IconEye } from '../../../icons'
import { IdChip } from '../../chat/signoff'
import DependencyBullet from '../../stories/DependencyBullet'

export type SignoffDecisionListProps = {
  items: readonly SignoffDecisionItem[]
  onOpenPair: (key: string) => void
  /** Open a step's output in the side panel; without it a step chip opens its section. */
  onOpenStep?: (target: SignoffStepTarget) => void
  onShowSection: (sectionId: string) => void
  onRequestImage: (id: string, mediaType: string) => void
}

const TONE_TEXT: Record<SignoffDecisionTone, string> = {
  done: 'text-(--status-done-soft-fg)',
  stuck: 'text-(--status-stuck-soft-fg)',
  working: 'text-(--status-working-soft-fg)',
}

/**
 * The decision card's one attention list, under the headline: each item an
 * icon, one line and its chips — a counted pair as a thumbnail that opens the
 * viewer, the fix pass as its step chip, what Verify said as an icon action.
 */
export default function SignoffDecisionList({
  items,
  onOpenPair,
  onOpenStep,
  onShowSection,
  onRequestImage,
}: SignoffDecisionListProps) {
  if (items.length === 0) return null
  return (
    <ul className="m-0 mt-1 flex list-none flex-col gap-1.5 border-t border-(--border-subtle) p-0 pt-2.5">
      {items.map((item) => (
        <li key={item.key} className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className={`inline-flex shrink-0 ${TONE_TEXT[item.tone]}`} aria-hidden>
            {item.tone === 'done' ? (
              <IconCheck className="size-4" />
            ) : (
              <IconError className="size-4" />
            )}
          </span>
          {item.dependency ? (
            <DependencyBullet dependency={item.dependency} interactive />
          ) : item.label ? (
            <IdChip kind="story">{item.label}</IdChip>
          ) : null}
          <span className="min-w-0 text-(--text-primary)">{item.text}</span>
          {item.pairs.map((pair) => (
            <PairChip
              key={pair.key}
              pair={pair}
              onOpen={() => onOpenPair(pair.key)}
              onRequestImage={onRequestImage}
            />
          ))}
          {item.actions.map((action) => (
            <ActionChip
              key={`${action.kind}-${action.sectionId}`}
              action={action}
              onShowSection={onShowSection}
              {...(onOpenStep ? { onOpenStep } : {})}
            />
          ))}
        </li>
      ))}
    </ul>
  )
}

function PairChip({
  pair,
  onOpen,
  onRequestImage,
}: {
  pair: ScreenPair
  onOpen: () => void
  onRequestImage: (id: string, mediaType: string) => void
}) {
  const shown = pair.after ?? pair.before
  useEffect(() => {
    if (shown) onRequestImage(shown.ref.id, shown.ref.mediaType)
  }, [shown, onRequestImage])
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={SIGNOFF_DECISION_PAIR_LABEL(pair.title)}
      title={SIGNOFF_DECISION_PAIR_LABEL(pair.title)}
      className="inline-flex h-7 max-w-[220px] items-center gap-1.5 rounded-md border border-(--border-subtle) bg-(--surface-raised) py-0.5 pl-0.5 pr-2 text-[12px] text-(--text-secondary) hover:bg-(--surface-hover)"
    >
      <span className="block h-full w-9 shrink-0 overflow-hidden rounded-sm bg-(--surface-sunken)">
        {shown?.dataUri ? (
          <img src={shown.dataUri} alt="" className="block h-full w-full object-cover object-top" />
        ) : null}
      </span>
      <span className="truncate">{pair.title}</span>
    </button>
  )
}

function ActionChip({
  action,
  onOpenStep,
  onShowSection,
}: {
  action: SignoffDecisionAction
  onOpenStep?: (target: SignoffStepTarget) => void
  onShowSection: (sectionId: string) => void
}) {
  if (action.kind === 'verify') {
    return (
      <button
        type="button"
        onClick={() => onShowSection(action.sectionId)}
        aria-label={action.label}
        title={action.label}
        className="inline-flex size-7 items-center justify-center rounded-md border border-(--border-subtle) bg-(--surface-raised) text-(--text-secondary) hover:bg-(--surface-hover)"
      >
        <IconEye className="size-3.5" />
      </button>
    )
  }
  const step = action.step
  return (
    <button
      type="button"
      onClick={() => (step && onOpenStep ? onOpenStep(step) : onShowSection(action.sectionId))}
      aria-label={SIGNOFF_DECISION_STEP_LABEL(action.label)}
      title={SIGNOFF_DECISION_STEP_LABEL(action.label)}
      className="inline-flex rounded-full hover:opacity-80"
    >
      <IdChip kind="story">{action.label}</IdChip>
    </button>
  )
}
