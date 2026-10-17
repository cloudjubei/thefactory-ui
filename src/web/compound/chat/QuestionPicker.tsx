import { useState, type ReactNode } from 'react'
import { Button } from '../../primitives/Button'
import { IconSearch } from '../../icons'
import {
  useContextPickerItems,
  useProcessPickerItems,
  type QuestionPickerItems,
} from '../../../headless/hooks/useQuestionPickerItems'
import {
  QUESTION_AGENTS_PICK,
  QUESTION_PICKER_EMPTY,
  QUESTION_PICKER_FILTER,
  QUESTION_PICKER_LIMIT,
  QUESTION_PICKER_LOADING,
  QUESTION_PICKER_VERB,
} from '../../../headless/utils/agentQuestionConstants'
import { filterPickerItems, unmatchedOptions } from '../../../headless/utils/questionPicker'
import type {
  AgentQuestionOption,
  QuestionPickerKind,
} from '../../../headless/utils/agentQuestionTypes'

export type QuestionPickerProps = {
  kind: QuestionPickerKind
  options: readonly AgentQuestionOption[] | undefined
  disabled: boolean
  onSend: (answer: string) => void
  /** The agent's options none of the listed items stands for, still one click away. */
  renderOtherOptions: (options: AgentQuestionOption[]) => ReactNode
}

const MONO_KINDS: readonly QuestionPickerKind[] = ['branch', 'file']

function PickerList({
  kind,
  options,
  source,
  disabled,
  onSend,
  renderOtherOptions,
}: QuestionPickerProps & { source: QuestionPickerItems }) {
  const others = unmatchedOptions(source.items, options)
  const [query, setQuery] = useState('')
  const [chosenId, setChosenId] = useState<string>()
  const selectedId = chosenId ?? source.items.find((i) => i.recommended)?.id
  const shown = filterPickerItems(source.items, query, QUESTION_PICKER_LIMIT, selectedId)
  const selected = source.items.find((i) => i.id === selectedId)
  const mono = MONO_KINDS.includes(kind)
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-lg border border-(--border-default)">
        <label className="flex h-9 items-center gap-2 border-b border-(--border-subtle) px-3 text-(--text-secondary)">
          <IconSearch className="h-3.5 w-3.5 shrink-0" />
          <span className="sr-only">{QUESTION_PICKER_FILTER[kind](source.items.length)}</span>
          <input
            type="text"
            value={query}
            disabled={disabled}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={QUESTION_PICKER_FILTER[kind](source.items.length)}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-(--text-primary) outline-none"
          />
        </label>
        <div role="listbox" aria-label={kind} className="flex max-h-72 flex-col overflow-y-auto">
          {shown.length === 0 ? (
            <div className="px-3 py-2.5 text-[12.5px] text-(--text-muted)">
              {source.isLoaded ? QUESTION_PICKER_EMPTY : QUESTION_PICKER_LOADING}
            </div>
          ) : (
            shown.map((item, i) => {
              const on = item.id === selectedId
              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={on}
                  disabled={disabled}
                  onClick={() => setChosenId(item.id)}
                  className={`grid w-full grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2 text-left ${
                    i > 0 ? 'border-t border-(--border-subtle)' : ''
                  } ${on ? 'bg-(--accent-soft-bg)' : 'hover:bg-(--surface-hover)'}`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] ${
                      on ? 'border-(--accent-primary)' : 'border-(--border-strong)'
                    }`}
                  >
                    {on ? <span className="h-2 w-2 rounded-full bg-(--accent-primary)" /> : null}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={`truncate text-[12.5px] font-semibold text-(--text-primary) ${mono ? 'font-mono' : ''}`}
                      >
                        {item.label}
                      </span>
                      {item.recommended ? <AgentsPickPill /> : null}
                    </span>
                    {item.detail ? (
                      <span className="truncate text-[12px] text-(--text-secondary)">
                        {item.detail}
                      </span>
                    ) : null}
                  </span>
                  {item.tag ? (
                    <span className="text-[11.5px] text-(--text-muted)">{item.tag}</span>
                  ) : (
                    <span />
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>
      {others.length > 0 ? (
        <div className="flex flex-col gap-1.5">{renderOtherOptions(others)}</div>
      ) : null}
      <div>
        <Button
          size="sm"
          disabled={disabled || !selected}
          onClick={() => selected && onSend(selected.answer)}
        >
          {QUESTION_PICKER_VERB[kind]}
        </Button>
      </div>
    </div>
  )
}

function ContextPicker(
  props: QuestionPickerProps & { kind: Exclude<QuestionPickerKind, 'process'> },
) {
  const source = useContextPickerItems(props.kind, props.options)
  return <PickerList {...props} source={source} />
}

function ProcessPicker(props: QuestionPickerProps) {
  const source = useProcessPickerItems(props.options)
  return <PickerList {...props} source={source} />
}

/** The pill on the agent's own pick. */
export function AgentsPickPill() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-(--status-done-soft-border) bg-(--status-done-soft-bg) px-1.5 text-[11px] leading-[17px] font-semibold text-(--status-done-soft-fg)">
      {QUESTION_AGENTS_PICK}
    </span>
  )
}

/**
 * A question's picker of the real items its answer is one of — the project's
 * branches, files, stories, … — filterable, the agent's pick marked and
 * chosen first, sent with one primary button.
 */
export default function QuestionPicker(props: QuestionPickerProps) {
  return props.kind === 'process' ? (
    <ProcessPicker {...props} />
  ) : (
    <ContextPicker {...props} kind={props.kind} />
  )
}
