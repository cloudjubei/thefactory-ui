import { useState, type ReactNode } from 'react'

import {
  launchAgentPickMetadata,
  TEST_SESSION_STOP_CONFIRM_COPY,
  useLaunchAgentPick,
  useTestSession,
  type LaunchModelChipSlot,
  type TestSessionDisplay,
  type TestSessionHelperRow,
  type TestSessionTone,
} from '../../../../headless'
import { IconChat, IconExternalLink, IconPlay, IconStop, IconTestTube } from '../../../icons'
import { Button } from '../../../primitives/Button'
import { ConfirmDialog } from '../../../primitives/Modal'
import ToneBadge from '../../chips/ToneBadge'

export type TestWithMeCardProps = {
  /** The run at its sign-off; a leg of a group run shares its group's session. */
  runId: string
  /** The host's model chip, as every launch draws it: the agent the helper runs on. */
  renderModelChip?: (picked: LaunchModelChipSlot) => ReactNode
  /** Open the helper's chat. */
  onOpenChat?: (chat: TestSessionHelperRow['chat']) => void
}

export type TestWithMePanelProps = {
  display: TestSessionDisplay
  onStart?: () => void
  /** Asked once the person confirmed: the panel itself never stops without asking. */
  onStop?: () => void
  /** Draw the stop confirmation open, for the showcase. */
  confirmingStop?: boolean
  /** The helper's model chip, drawn beside a start. */
  modelChip?: ReactNode
  onOpenChat?: (chat: TestSessionHelperRow['chat']) => void
}

const TONE_TEXT: Record<TestSessionTone, string> = {
  working: 'text-(--status-working-soft-fg)',
  done: 'text-(--status-done-soft-fg)',
  stuck: 'text-(--status-stuck-soft-fg)',
  blocked: 'text-(--status-blocked-soft-fg)',
  empty: 'text-(--text-secondary)',
}

/**
 * "Test with me" on a run's sign-off: the app served from this work while the person tests, its
 * log's errors, warnings and the change's own lines, and the proof of what the change wrote.
 * Hidden until the session is read.
 */
export default function TestWithMeCard({
  runId,
  renderModelChip,
  onOpenChat,
}: TestWithMeCardProps) {
  const { display, start, stop } = useTestSession(runId)
  const { pick, slot } = useLaunchAgentPick()
  if (!display) return null
  return (
    <TestWithMePanel
      display={display}
      onStart={() => void start(launchAgentPickMetadata(pick))}
      onStop={() => void stop()}
      {...(renderModelChip ? { modelChip: renderModelChip(slot) } : {})}
      {...(onOpenChat ? { onOpenChat } : {})}
    />
  )
}

/** The block itself, from its laid-out view — what the connected card and the showcase both draw. */
export function TestWithMePanel({
  display,
  onStart,
  onStop,
  confirmingStop,
  modelChip,
  onOpenChat,
}: TestWithMePanelProps) {
  const [confirming, setConfirming] = useState(!!confirmingStop)
  const { action } = display
  const press = () => {
    if (!action || action.busy) return
    if (action.kind === 'start') onStart?.()
    else setConfirming(true)
  }

  return (
    <section
      aria-label={display.title}
      className="flex min-w-0 flex-col gap-3 rounded-xl border border-(--border-subtle) bg-(--surface-raised) px-5 py-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <IconTestTube className="mt-0.5 h-4 w-4 shrink-0 text-(--text-secondary)" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="text-[14px] font-semibold text-(--text-primary)">{display.title}</div>
            <div
              className={`text-[12.5px] font-medium ${TONE_TEXT[display.tone]}`}
              aria-live="polite"
            >
              {display.headline}
            </div>
            {display.detail ? (
              <div className="wrap-break-word text-[12px] text-(--text-secondary)">
                {display.detail}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {display.picksAgent && modelChip ? modelChip : null}
          {display.open ? (
            <a
              className="btn btn-secondary btn-sm inline-flex items-center gap-2"
              href={display.open.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconExternalLink className="h-3.5 w-3.5" />
              {display.open.label}
            </a>
          ) : null}
          {action ? (
            <Button
              size="sm"
              variant={action.kind === 'start' ? 'primary' : 'secondary'}
              loading={action.busy}
              aria-disabled={action.busy || undefined}
              onClick={press}
            >
              {action.kind === 'start' ? (
                <IconPlay className="h-3.5 w-3.5" />
              ) : (
                <IconStop className="h-3.5 w-3.5" />
              )}
              {action.label}
            </Button>
          ) : null}
        </div>
      </div>

      {display.helper ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-[12px]">
          <span className={`font-medium ${TONE_TEXT[display.helper.tone]}`}>
            {display.helper.label}
          </span>
          {display.helper.detail ? (
            <span className="min-w-0 wrap-break-word text-(--text-secondary)">
              {display.helper.detail}
            </span>
          ) : null}
          {onOpenChat ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-(--accent-primary) hover:underline"
              onClick={() => display.helper && onOpenChat(display.helper.chat)}
            >
              <IconChat className="h-3.5 w-3.5" />
              {display.helper.openLabel}
            </button>
          ) : null}
        </div>
      ) : null}

      {display.error ? (
        <div role="alert" className="text-[12px] text-(--status-stuck-soft-fg)">
          {display.error}
        </div>
      ) : null}

      {display.showsFindings ? (
        <>
          <div className="flex flex-wrap gap-2">
            {display.counts.map((count) => (
              <ToneBadge key={count.key} tone={count.value > 0 ? count.tone : 'empty'}>
                {`${count.label} ${count.value}`}
              </ToneBadge>
            ))}
          </div>

          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="text-[12.5px] font-semibold text-(--text-primary)">
              {display.linesTitle}
            </div>
            {display.lines.length === 0 ? (
              <div className="text-[12px] text-(--text-tertiary)">{display.linesEmpty}</div>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {display.linesHidden > 0 ? (
                  <li className="text-[11.5px] text-(--text-tertiary)">{`+${display.linesHidden}`}</li>
                ) : null}
                {display.lines.map((line) => (
                  <li key={line.key} className="flex min-w-0 items-start gap-2 text-[12px]">
                    <span className={`shrink-0 font-medium ${TONE_TEXT[line.tone]}`}>
                      {line.kindLabel}
                    </span>
                    <span className="shrink-0 text-(--text-tertiary)">{line.role}</span>
                    <code className="min-w-0 flex-1 break-all font-mono text-[11.5px] text-(--text-secondary)">
                      {line.text}
                    </code>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="text-[12.5px] font-semibold text-(--text-primary)">
              {display.proofTitle}
            </div>
            {display.proof.length === 0 ? (
              <div className="text-[12px] text-(--text-tertiary)">{display.proofEmpty}</div>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {display.proof.map((item) => (
                  <li key={item.key} className="flex min-w-0 flex-col gap-0.5 text-[12px]">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <ToneBadge tone="review">{item.kindLabel}</ToneBadge>
                      <span className="min-w-0 break-all font-medium text-(--text-primary)">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-[11.5px] text-(--text-tertiary)">{item.meta}</span>
                    {item.detail ? (
                      <code className="line-clamp-3 break-all font-mono text-[11.5px] text-(--text-secondary)">
                        {item.detail}
                      </code>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}

      <ConfirmDialog
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => onStop?.()}
        title={TEST_SESSION_STOP_CONFIRM_COPY.title}
        description={TEST_SESSION_STOP_CONFIRM_COPY.body}
        confirmLabel={TEST_SESSION_STOP_CONFIRM_COPY.confirm}
        cancelLabel={TEST_SESSION_STOP_CONFIRM_COPY.cancel}
        destructive
      />
    </section>
  )
}
