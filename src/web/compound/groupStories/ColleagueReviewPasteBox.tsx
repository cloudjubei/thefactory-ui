import { useRef } from 'react'
import type { ChatAttachmentFile } from '../../../headless/api/chatAttachmentUploadTypes'
import { reviewDraftProblem, withReviewFiles } from '../../../headless/utils/colleagueReviewStart'
import {
  COLLEAGUE_REVIEW_FILES_MAX,
  REVIEW_START_TEXT as TEXT,
} from '../../../headless/utils/colleagueReviewStartConstants'
import type { ReviewDraft, ReviewPasteBox } from '../../../headless/utils/colleagueReviewStartTypes'
import { IconAttach, IconClose } from '../../icons'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import { Textarea } from '../../primitives/Textarea'

export type ColleagueReviewPasteFormProps = {
  box: ReviewPasteBox
  onChange: (draft: ReviewDraft) => void
  onStart: () => void
}

const asFiles = (files: FileList | File[] | null | undefined): ChatAttachmentFile[] =>
  Array.from(files ?? []).map((blob) => ({ name: blob.name, size: blob.size, blob }))

/**
 * What the paste box holds: the colleague's update as they wrote it, and the
 * files that came with it — attached, pasted or dropped in. Start is held
 * until there is something to review.
 */
export function ColleagueReviewPasteForm({
  box,
  onChange,
  onStart,
}: ColleagueReviewPasteFormProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { draft } = box
  const problem = reviewDraftProblem(draft)
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
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[12px] font-medium text-(--text-primary)">{TEXT.update}</span>
        <Textarea
          rows={10}
          autoFocus
          value={draft.text}
          placeholder={TEXT.placeholder}
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
      {problem && draft.text.trim() !== '' ? (
        <span className="text-[11.5px] text-(--status-stuck-soft-fg)">{problem}</span>
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
  box,
  onChange,
  onStart,
  onClose,
}: ColleagueReviewPasteBoxProps) {
  return (
    <Modal
      isOpen
      onClose={onClose}
      size="lg"
      title={box.nextRound ? TEXT.nextTitle(box.ticketKey) : TEXT.title(box.ticketKey)}
    >
      <ColleagueReviewPasteForm box={box} onChange={onChange} onStart={onStart} />
    </Modal>
  )
}
