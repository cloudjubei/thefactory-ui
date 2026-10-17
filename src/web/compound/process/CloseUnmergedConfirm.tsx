import { PROCESS_CLOSE_UNMERGED_CONFIRM_COPY } from '../../../headless'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'

export type CloseUnmergedConfirmProps = {
  onConfirm: () => void
  onCancel: () => void
}

/** "Close without merging?" — what closing a run does, asked before it does it. */
export default function CloseUnmergedConfirm({ onConfirm, onCancel }: CloseUnmergedConfirmProps) {
  return (
    <Modal isOpen onClose={onCancel} title={PROCESS_CLOSE_UNMERGED_CONFIRM_COPY.title} size="sm">
      <div className="flex flex-col gap-3 text-[13px] text-(--text-secondary)">
        <p className="m-0">{PROCESS_CLOSE_UNMERGED_CONFIRM_COPY.body}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {PROCESS_CLOSE_UNMERGED_CONFIRM_COPY.cancel}
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm}>
            {PROCESS_CLOSE_UNMERGED_CONFIRM_COPY.confirm}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
