import { useRef, type ReactNode } from 'react'
import type { ChatAttachmentFile } from '../../../headless/api/chatAttachmentUploadTypes'
import { reviewBoxOfferLine } from '../../../headless/utils/colleagueReviewSource'
import { REVIEW_OFFER_TEXT } from '../../../headless/utils/colleagueReviewSourceConstants'
import { reviewBoxProblem, withReviewFiles } from '../../../headless/utils/colleagueReviewStart'
import {
  COLLEAGUE_REVIEW_FILES_MAX,
  COLLEAGUE_REVIEW_MODES,
  REVIEW_START_TEXT as TEXT,
} from '../../../headless/utils/colleagueReviewStartConstants'
import type {
  ColleagueReviewMode,
  ReviewBoxOffer,
  ReviewDraft,
  ReviewPasteBox,
} from '../../../headless/utils/colleagueReviewStartTypes'
import { IconAttach, IconChat, IconClose, IconExternalLink } from '../../icons'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import SegmentedControl from '../../primitives/SegmentedControl'
import { Textarea } from '../../primitives/Textarea'

export type ColleagueReviewPasteFormProps = {
  box: ReviewPasteBox
  onChange: (draft: ReviewDraft) => void
  onStart: () => void
  /** How the round is reviewed: the person's pick, else the group's default. */
  mode?: ColleagueReviewMode
  /** Pick how the round is reviewed; without it the choice is not offered. */
  onModeChange?: (mode: ColleagueReviewMode) => void
  /** The app's model chip: the agent the round runs on, in either mode. */
  modelChip?: ReactNode
  /** When the update from Slack was posted is told against this — for a fixed showcase state. */
  now?: number
}

const MODE_LABELS: Record<ColleagueReviewMode, string> = {
  inline: TEXT.modeInline,
  process: TEXT.modeProcess,
}

const MODE_HINTS: Record<ColleagueReviewMode, string> = {
  inline: TEXT.modeInlineHint,
  process: TEXT.modeProcessHint,
}

const asFiles = (files: FileList | File[] | null | undefined): ChatAttachmentFile[] =>
  Array.from(files ?? []).map((blob) => ({ name: blob.name, size: blob.size, blob }))

/** Who sent the update from Slack and when, its message a press away. */
function FromSlack({ offer, now }: { offer: ReviewBoxOffer; now: number }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-(--accent-primary)/8 px-2.5 py-1.5 text-[12px]">
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <IconChat className="size-3.5 shrink-0 text-(--accent-primary)" />
        <span className="min-w-0 text-(--text-primary)">{reviewBoxOfferLine(offer, now)}</span>
      </span>
      {offer.permalink ? (
        <a
          href={offer.permalink}
          target="_blank"
          rel="noreferrer noopener"
          className="ml-auto inline-flex shrink-0 items-center gap-1 text-(--accent-primary) hover:underline"
        >
          {REVIEW_OFFER_TEXT.open}
          <IconExternalLink className="size-3" />
        </a>
      ) : null}
    </div>
  )
}

/** The files the update came with in Slack: the backend fetches them itself. */
function SlackFiles({ files }: { files: readonly string[] }) {
  if (files.length === 0) return null
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[11.5px] text-(--text-muted)">{REVIEW_OFFER_TEXT.slackFiles}</span>
      <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {files.map((name, at) => (
          <li
            key={`${name}-${at}`}
            title={name}
            className="flex items-center gap-1 rounded-md border border-dashed border-(--border-default) px-2 py-0.5 text-[11.5px] text-(--text-secondary)"
          >
            <span className="max-w-[200px] truncate">{name}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * What the paste box holds: the colleague's update as they wrote it, and the
 * files that came with it — attached, pasted or dropped in. Opened on an
 * update from Slack, it starts filled with it, editable, its own files listed
 * as coming from Slack. The person picks whether it is reviewed in the chat
 * or as a run. Start is held until there is something to review.
 */
export function ColleagueReviewPasteForm({
  box,
  onChange,
  onStart,
  mode = 'inline',
  onModeChange,
  modelChip,
  now = Date.now(),
}: ColleagueReviewPasteFormProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { draft, offer } = box
  const reading = offer !== undefined && offer.text === undefined
  const problem = reviewBoxProblem(box)
  const add = (files: ChatAttachmentFile[]) => {
    if (files.length > 0) onChange({ ...draft, files: withReviewFiles(draft.files, files) })
  }
  const full = draft.files.length >= COLLEAGUE_REVIEW_FILES_MAX
  return (
    <div
      className="flex min-w-0 flex-col gap-3"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) e.preventDefault()
      }}
      onDrop={(e) => {
        if (e.dataTransfer.files.length === 0) return
        e.preventDefault()
        add(asFiles(e.dataTransfer.files))
      }}
    >
      {offer ? <FromSlack offer={offer} now={now} /> : null}
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[12px] font-medium text-(--text-primary)">{TEXT.update}</span>
        <Textarea
          rows={10}
          autoFocus
          disabled={reading}
          value={draft.text}
          placeholder={reading ? REVIEW_OFFER_TEXT.reading : TEXT.placeholder}
          onChange={(e) => onChange({ ...draft, text: e.target.value })}
          onPaste={(e) => {
            const pasted = asFiles(e.clipboardData.files)
            if (pasted.length === 0) return
            if (!e.clipboardData.getData('text')) e.preventDefault()
            add(pasted)
          }}
          className="min-h-[160px] resize-y text-[13px]"
        />
      </label>
      {offer ? <SlackFiles files={offer.files} /> : null}
      <div className="flex min-w-0 flex-col gap-1.5">
        {draft.files.length > 0 ? (
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {draft.files.map(({ file }, at) => (
              <li
                key={`${file.name}-${at}`}
                className="flex items-center gap-1 rounded-md border border-(--border-default) bg-(--surface-raised) px-2 py-0.5 text-[11.5px] text-(--text-primary)"
                title={file.name}
              >
                <span className="max-w-[200px] truncate">{file.name}</span>
                <button
                  type="button"
                  className="text-(--text-muted) hover:text-(--text-primary)"
                  aria-label={TEXT.remove(file.name)}
                  onClick={() =>
                    onChange({ ...draft, files: draft.files.filter((_, i) => i !== at) })
                  }
                >
                  <IconClose className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const chosen = asFiles(e.target.files)
              e.target.value = ''
              add(chosen)
            }}
          />
          <Button
            size="sm"
            variant="secondary"
            disabled={full}
            onClick={() => inputRef.current?.click()}
          >
            <IconAttach className="h-3.5 w-3.5" />
            {TEXT.attach}
          </Button>
          <span className="text-[11.5px] text-(--text-muted)">
            {full ? TEXT.tooMany(COLLEAGUE_REVIEW_FILES_MAX) : TEXT.filesHint}
          </span>
        </div>
      </div>
      {box.error ? <Alert variant="error">{box.error}</Alert> : null}
      {problem && !reading && draft.text.trim() !== '' ? (
        <span className="text-[11.5px] text-(--status-stuck-soft-fg)">{problem}</span>
      ) : null}
      {onModeChange ? (
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-[12px] font-medium text-(--text-primary)">{TEXT.mode}</span>
            <SegmentedControl
              size="sm"
              ariaLabel={TEXT.mode}
              value={mode}
              onChange={(next) => onModeChange(next as ColleagueReviewMode)}
              options={COLLEAGUE_REVIEW_MODES.map((value) => ({
                value,
                label: MODE_LABELS[value],
              }))}
            />
          </div>
          <span className="text-[11.5px] text-(--text-muted)">{MODE_HINTS[mode]}</span>
        </div>
      ) : null}
      {modelChip ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-[12px] font-medium text-(--text-primary)">{TEXT.agent}</span>
          {modelChip}
        </div>
      ) : null}
      <div className="flex justify-end">
        <Button variant="primary" disabled={problem !== undefined} onClick={onStart}>
          {box.nextRound ? TEXT.startNext : TEXT.start}
        </Button>
      </div>
    </div>
  )
}

export type ColleagueReviewPasteBoxProps = ColleagueReviewPasteFormProps & {
  onClose: () => void
}

/** The paste box over the Tickets tab: a colleague's update, to start a review round with. */
export default function ColleagueReviewPasteBox({
  onClose,
  ...form
}: ColleagueReviewPasteBoxProps) {
  const { box } = form
  return (
    <Modal
      isOpen
      onClose={onClose}
      size="lg"
      title={box.nextRound ? TEXT.nextTitle(box.ticketKey) : TEXT.title(box.ticketKey)}
    >
      <ColleagueReviewPasteForm {...form} />
    </Modal>
  )
}
