import { useState } from 'react'

import {
  SIGN_OFF_OUTPUT_DEFAULT_LAYOUT,
  SIGN_OFF_OUTPUT_TEXT,
  type SignOffOutputActions,
  type SignOffOutputDraftView,
  type SignOffOutputLayout,
  type SignOffOutputPanelView,
  type SignOffOutputSectionView,
  type SignOffTextSegment,
} from '../../../../headless'
import Alert from '../../../primitives/Alert'
import { Button } from '../../../primitives/Button'
import SegmentedControl from '../../../primitives/SegmentedControl'
import { Textarea } from '../../../primitives/Textarea'
import { CopyButton } from '../../CopyButton'

export type SignOffOutputPanelProps = {
  view: SignOffOutputPanelView
  actions: SignOffOutputActions
  layout?: SignOffOutputLayout
  /** Sits directly under a heading of its own, with no gap above. */
  flush?: boolean
}

/** Agent-written and ticket-derived: text only, so nothing in it can act as markup. */
export function SignOffOutputText({ segments }: { segments: readonly SignOffTextSegment[] }) {
  return (
    <div className="max-h-[420px] overflow-y-auto whitespace-pre-wrap wrap-break-word rounded-md border border-(--border-subtle) bg-(--surface-base) px-3 py-2.5 text-[12.5px] leading-relaxed text-(--text-primary)">
      {segments.map((segment, i) =>
        segment.unfilled ? (
          <mark
            key={i}
            className="rounded border border-(--status-on_hold-soft-border) bg-(--status-on_hold-soft-bg) px-1 font-medium text-(--status-on_hold-soft-fg)"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={i}>{segment.text}</span>
        ),
      )}
    </div>
  )
}

function StillToFill({ unfilled }: { unfilled: readonly string[] }) {
  if (unfilled.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-(--status-on_hold-soft-fg)">
      <span className="font-medium">{SIGN_OFF_OUTPUT_TEXT.stillToFill}</span>
      {unfilled.map((placeholder) => (
        <code key={placeholder} className="wrap-anywhere">
          {placeholder}
        </code>
      ))}
    </div>
  )
}

function Editor({
  section,
  draft,
  actions,
}: {
  section: SignOffOutputSectionView
  draft: SignOffOutputDraftView
  actions: SignOffOutputActions
}) {
  const { key } = section
  const label = section.heading ?? SIGN_OFF_OUTPUT_TEXT.edit
  const notice = draft.notice
  return (
    <div className="flex flex-col gap-2">
      {notice ? <Alert variant="info">{notice.text}</Alert> : null}
      <Textarea
        aria-label={label}
        rows={12}
        value={draft.text}
        disabled={draft.saving}
        readOnly={notice?.kind === 'closed'}
        onChange={(e) => actions.changeDraft(key, e.target.value)}
      />
      {draft.problem ? (
        <span className="text-[11.5px] text-(--status-stuck-soft-fg)">{draft.problem}</span>
      ) : null}
      {draft.error ? <Alert variant="error">{draft.error}</Alert> : null}
      {notice?.kind === 'changed' ? (
        <>
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-(--text-muted)">
            {SIGN_OFF_OUTPUT_TEXT.newText}
          </span>
          <SignOffOutputText segments={section.segments} />
        </>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {notice?.kind === 'changed' ? (
          <>
            <Button
              size="sm"
              variant="primary"
              loading={draft.saving}
              disabled={draft.problem !== undefined}
              onClick={() => void actions.keepEdit(key)}
            >
              {SIGN_OFF_OUTPUT_TEXT.keep}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => actions.cancelEdit(key)}>
              {SIGN_OFF_OUTPUT_TEXT.useNew}
            </Button>
          </>
        ) : notice?.kind === 'closed' ? (
          <>
            <CopyButton text={draft.text} label={SIGN_OFF_OUTPUT_TEXT.copy} />
            <Button size="sm" variant="ghost" onClick={() => actions.cancelEdit(key)}>
              {SIGN_OFF_OUTPUT_TEXT.discard}
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="primary"
              loading={draft.saving}
              disabled={draft.problem !== undefined}
              onClick={() => void actions.saveDraft(key)}
            >
              {SIGN_OFF_OUTPUT_TEXT.save}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={draft.saving}
              onClick={() => actions.cancelEdit(key)}
            >
              {SIGN_OFF_OUTPUT_TEXT.cancel}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

function Section({
  section,
  actions,
  showHeading,
}: {
  section: SignOffOutputSectionView
  actions: SignOffOutputActions
  showHeading: boolean
}) {
  const { draft, text } = section
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {showHeading && section.heading ? (
          <span className="min-w-0 truncate text-[13px] font-semibold text-(--text-primary)">
            {section.heading}
          </span>
        ) : null}
        {!draft && text !== undefined ? (
          <span className="ml-auto flex items-center gap-2">
            {section.editable ? (
              <Button size="sm" variant="ghost" onClick={() => actions.startEdit(section.key)}>
                {SIGN_OFF_OUTPUT_TEXT.edit}
              </Button>
            ) : null}
            <CopyButton text={text} label={SIGN_OFF_OUTPUT_TEXT.copy} />
          </span>
        ) : null}
      </div>
      {draft ? (
        <Editor section={section} draft={draft} actions={actions} />
      ) : section.error ? (
        <Alert variant="error">{section.error}</Alert>
      ) : !section.written ? (
        <span className="text-[12.5px] text-(--text-muted)">{SIGN_OFF_OUTPUT_TEXT.notWritten}</span>
      ) : section.loading ? (
        <span className="text-[12.5px] text-(--text-muted)">{SIGN_OFF_OUTPUT_TEXT.loading}</span>
      ) : (
        <>
          <SignOffOutputText segments={section.segments} />
          <StillToFill unfilled={section.unfilled} />
        </>
      )}
    </div>
  )
}

/**
 * An output behind its chip: to read, edit and copy. An output for each repo has
 * a section per repo. An edit stays here until it is saved or put down, whatever
 * a read of the sign-off brings.
 */
export default function SignOffOutputPanel({
  view,
  actions,
  layout = SIGN_OFF_OUTPUT_DEFAULT_LAYOUT,
  flush = false,
}: SignOffOutputPanelProps) {
  const { sections } = view
  const gap = flush ? '' : 'pt-3'
  const [picked, setPicked] = useState<string | undefined>(undefined)
  const several = sections.length > 1
  if (layout === 'repo-switch' && several) {
    const shown = sections.find((s) => s.key === picked) ?? sections[0]!
    return (
      <div className={`flex flex-col gap-3 ${gap}`}>
        <SegmentedControl
          size="sm"
          ariaLabel={view.label}
          value={shown.key}
          onChange={setPicked}
          options={sections.map((s) => ({ value: s.key, label: s.heading ?? s.projectId }))}
        />
        <Section section={shown} actions={actions} showHeading={false} />
      </div>
    )
  }
  return (
    <div
      className={
        layout === 'columns' && several
          ? `grid grid-cols-1 gap-4 md:grid-cols-2 ${gap}`
          : `flex flex-col gap-4 ${gap}`
      }
    >
      {sections.map((section) => (
        <Section key={section.key} section={section} actions={actions} showHeading={several} />
      ))}
    </div>
  )
}
