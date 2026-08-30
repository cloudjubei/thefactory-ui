import { useChatDebugDump } from '../../../headless'
import { formatBytes } from '../../../headless/utils/path'
import type { ChatContext } from '../../../headless/api'
import { Modal } from '../..'
import { CopyButton } from '../CopyButton'

export type ChatDebugModalProps = {
  isOpen: boolean
  onClose: () => void
  context: ChatContext
}

/**
 * The chat's rendering diagnostic, as one copyable JSON document: the stored
 * messages, every CLI run belonging to this chat with its RAW transcript
 * entries, and the normalized steps + derived messages those entries produce —
 * so the stream a CLI emitted and the interpretation the chat renders can be
 * compared side by side. Bounded by the caps the document itself reports under
 * `limits`; nothing is redacted, only cut for size.
 */
export default function ChatDebugModal({ isOpen, onClose, context }: ChatDebugModalProps) {
  const { json, byteSize, loading, error, dump, refresh } = useChatDebugDump(context, isOpen)

  if (!isOpen) return null

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Chat debug dump"
      size="xl"
      headerActions={<CopyButton text={json} label="Copy" title="Copy the whole debug dump" />}
    >
      <div className="flex items-center justify-between gap-3 pb-2 text-[12px] text-(--text-muted)">
        <span>
          {formatBytes(byteSize) ?? '—'}
          {dump
            ? ` · ${dump.counts.messages} messages · ${dump.counts.cliRuns} CLI runs · ${dump.counts.transcriptEntries} transcript entries`
            : ''}
          {dump?.truncated ? ' · truncated to fit' : ''}
        </span>
        <button
          type="button"
          onClick={refresh}
          className="shrink-0 rounded border border-(--border-subtle) bg-(--surface-raised) px-2 h-7 hover:bg-(--surface-hover) text-(--text-secondary)"
        >
          {loading ? 'Loading…' : 'Reload'}
        </button>
      </div>

      {error ? <div className="pb-2 text-[12px] text-red-500">{error}</div> : null}

      <div className="max-h-[70vh] overflow-auto rounded border border-(--border-subtle) bg-(--surface-overlay) p-3">
        <pre className="whitespace-pre-wrap break-all font-mono text-[11px] leading-4 text-(--text-secondary)">
          {json}
        </pre>
      </div>
    </Modal>
  )
}
