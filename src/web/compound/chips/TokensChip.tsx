import { IconArrowLeftMini, IconArrowRightMini } from '../../icons'
import Tooltip from '../../primitives/Tooltip'
import { CHIP_PILL_NEUTRAL } from './pillStyles'

export type TokensChipProps = {
  // Total prompt-side tokens across the run.
  prompt: number
  // Total completion-side tokens.
  completion: number
  // Optional per-message averages, surfaced in the tooltip.
  averages?: {
    userMessages?: number
    assistantMessages?: number
    avgPromptPerUser?: number
    avgCompletionPerAssistant?: number
  }
}

// Chip showing prompt/completion token usage. Caller passes the aggregated
// numbers directly — the library doesn't know about message shapes.
export default function TokensChip({ prompt, completion, averages }: TokensChipProps) {
  const content = (
    <div className="text-xs max-w-90">
      <div className="font-semibold mb-1">Token usage</div>
      <div className="mb-1 text-neutral-400">
        Prompt: {prompt} · Completion: {completion} · Total: {prompt + completion}
      </div>
      {averages ? (
        <div className="mb-2">
          <div className="text-neutral-600 dark:text-neutral-300">Per-message averages</div>
          <div className="text-neutral-400">
            User ({averages.userMessages ?? 0}):{' '}
            {averages.avgPromptPerUser != null ? `${averages.avgPromptPerUser} tokens/msg` : '—'} ·
            Assistant ({averages.assistantMessages ?? 0}):{' '}
            {averages.avgCompletionPerAssistant != null
              ? `${averages.avgCompletionPerAssistant} tokens/msg`
              : '—'}
          </div>
        </div>
      ) : null}
    </div>
  )

  return (
    <Tooltip content={content} placement="top">
      <span className={`inline-flex flex-col items-start gap-0.5 leading-3 ${CHIP_PILL_NEUTRAL}`}>
        <span className="flex items-center gap-1">
          <IconArrowLeftMini className="text-neutral-400 h-4 w-4" />
          <span>{prompt}</span>
        </span>
        <span className="flex items-center gap-1">
          <IconArrowRightMini className="text-neutral-400 h-4 w-4" />
          <span>{completion}</span>
        </span>
      </span>
    </Tooltip>
  )
}
