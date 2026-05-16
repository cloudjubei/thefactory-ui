import { memo } from 'react'
import Markdown from '../Markdown'

export type SystemPromptBubbleProps = {
  content: string
  timestamp?: string
  maxHeight?: number
}

function SystemPromptBubble({ content, timestamp, maxHeight }: SystemPromptBubbleProps) {
  return (
    <div className="flex justify-center">
      <div className="inline-flex flex-col items-end max-w-full">
        {timestamp ? (
          <div className="text-[10px] leading-4 text-(--text-secondary) mb-1 opacity-80 select-none">
            {timestamp}
          </div>
        ) : null}
        <div
          className="overflow-y-auto overflow-x-auto max-w-full px-3 py-2 rounded-2xl wrap-break-word shadow border bg-(--surface-overlay) text-(--text-primary) border-(--border-subtle)"
          style={{
            maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : undefined,
            minHeight: '3.5em',
          }}
          aria-label="System prompt"
        >
          <Markdown text={content} />
        </div>
      </div>
    </div>
  )
}

export default memo(SystemPromptBubble)
