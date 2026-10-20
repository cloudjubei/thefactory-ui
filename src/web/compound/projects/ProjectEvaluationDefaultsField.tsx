import { useState } from 'react'

import { EVALUATION_DEFAULTS_COPY } from '../../../headless/utils/evaluationDefaultsConstants'
import {
  evaluationDefaultsFieldView,
  evaluationDefaultsWithChoice,
  evaluationDefaultsWithConcurrency,
  evaluationDefaultsWithFocus,
  evaluationDefaultsWithModel,
  evaluationModelKind,
} from '../../../headless/utils/evaluationDefaults'
import type {
  EvaluationChoiceKey,
  EvaluationChoiceView,
  EvaluationFocusKey,
  EvaluationFocusView,
  EvaluationModelKind,
} from '../../../headless/utils/evaluationDefaultsTypes'
import type {
  KnowledgeEvaluationDefaults,
  KnowledgeEvaluationSettings,
} from '../../../headless/utils/knowledgeEvaluationTypes'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import SegmentedControl from '../../primitives/SegmentedControl'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/Select'
import { cn } from '../../utils/cn'

export type ProjectEvaluationDefaultsFieldProps = {
  /** The Evaluation tab's defaults and every choice, from `useKnowledgeEvaluationSettings`. */
  settings: Pick<KnowledgeEvaluationSettings, 'tabDefaults' | 'choices'>
  /** The project's defaults, or none. */
  value: KnowledgeEvaluationDefaults | undefined
  /** The defaults as edited; `undefined` once nothing is set. */
  onChange: (next: KnowledgeEvaluationDefaults | undefined) => void
}

const PILL = 'rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors'
const PILL_ON = 'border-(--accent-primary) bg-(--accent-primary)/10 text-(--accent-primary)'
const PILL_OFF =
  'border-(--border-subtle) bg-(--surface-raised) text-(--text-secondary) hover:text-(--text-primary)'

function ChoiceField({
  choice,
  onChange,
}: {
  choice: EvaluationChoiceView
  onChange: (value: string) => void
}) {
  return (
    <Field label={choice.label}>
      <Select value={choice.value} onValueChange={onChange}>
        <SelectTrigger aria-label={choice.label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {choice.options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

function FocusField({
  focus,
  onToggle,
}: {
  focus: EvaluationFocusView
  onToggle: (value: string) => void
}) {
  return (
    <div role="group" aria-label={focus.label} className="flex flex-col gap-1">
      <span className="text-sm font-medium">{focus.label}</span>
      <div className="flex flex-wrap gap-1.5">
        {focus.options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={o.selected}
            onClick={() => onToggle(o.value)}
            className={cn(PILL, o.selected ? PILL_ON : PILL_OFF)}
          >
            {o.label}
            {o.count !== undefined ? (
              <span className="ml-1.5 tabular-nums opacity-70">{o.count}</span>
            ) : null}
          </button>
        ))}
      </div>
      {focus.fallback ? <span className="text-xs opacity-60">{focus.fallback}</span> : null}
    </div>
  )
}

/**
 * A project's evaluation defaults: what an `evaluateKnowledge` launch that leaves a setting out runs
 * with, before the Evaluation tab's defaults. Every unset control says what it falls back to; the
 * model is the host's, a CLI with an optional model id, or an API config — one of the three.
 */
export default function ProjectEvaluationDefaultsField({
  settings,
  value,
  onChange,
}: ProjectEvaluationDefaultsFieldProps) {
  const [pickedModel, setPickedModel] = useState<EvaluationModelKind>(() =>
    evaluationModelKind(value, 'host'),
  )
  const view = evaluationDefaultsFieldView(value, settings, pickedModel)
  const choose = (key: EvaluationChoiceKey) => (next: string) =>
    onChange(evaluationDefaultsWithChoice(value, key, next))
  const toggle = (key: EvaluationFocusKey) => (next: string) =>
    onChange(evaluationDefaultsWithFocus(value, key, next))
  const model = view.model

  return (
    <section
      aria-label={view.title}
      className="flex flex-col gap-3 rounded-lg border border-(--border-subtle) p-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium">{view.title}</span>
          <span className="text-xs text-(--text-secondary)">{view.hint}</span>
          <span className="text-xs text-(--text-primary)">{view.summary}</span>
        </div>
        {view.clear ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setPickedModel('host')
              onChange(undefined)
            }}
          >
            {view.clear}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ChoiceField choice={view.stage} onChange={choose('stage')} />
        <ChoiceField choice={view.preset} onChange={choose('preset')} />
        <ChoiceField choice={view.promptMode} onChange={choose('promptMode')} />
        <ChoiceField choice={view.buildMode} onChange={choose('buildMode')} />
        <Field
          label={view.concurrency.label}
          hint={
            view.concurrency.error ? (
              <span role="alert" className="text-(--status-stuck-soft-fg)">
                {view.concurrency.error}
              </span>
            ) : (
              view.concurrency.hint
            )
          }
        >
          <Input
            inputMode="numeric"
            value={view.concurrency.value}
            placeholder={view.concurrency.placeholder}
            aria-invalid={view.concurrency.error ? true : undefined}
            onChange={(e) => onChange(evaluationDefaultsWithConcurrency(value, e.target.value))}
          />
        </Field>
      </div>

      <FocusField focus={view.focusCapabilities} onToggle={toggle('focusCapabilities')} />
      {view.focusFixtures.options.length > 0 ? (
        <FocusField focus={view.focusFixtures} onToggle={toggle('focusFixtures')} />
      ) : null}

      <div role="group" aria-label={model.label} className="flex flex-col gap-2">
        <span className="text-sm font-medium">{model.label}</span>
        <SegmentedControl
          size="sm"
          ariaLabel={model.label}
          options={model.kinds}
          value={model.kind}
          onChange={(next) => {
            setPickedModel(next as EvaluationModelKind)
            onChange(evaluationDefaultsWithModel(value, { kind: next as EvaluationModelKind }))
          }}
        />
        {model.kind === 'cli' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={model.cli.label}>
              <Select
                value={model.cli.value}
                onValueChange={(cli) =>
                  onChange(
                    evaluationDefaultsWithModel(value, {
                      kind: 'cli',
                      cli,
                      modelId: model.modelId.value,
                    }),
                  )
                }
              >
                <SelectTrigger aria-label={model.cli.label}>
                  <SelectValue placeholder={EVALUATION_DEFAULTS_COPY.cliPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {model.cli.options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={model.modelId.label}>
              <Input
                value={model.modelId.value}
                placeholder={model.modelId.placeholder}
                disabled={!model.cli.value}
                spellCheck={false}
                autoCapitalize="none"
                onChange={(e) =>
                  onChange(
                    evaluationDefaultsWithModel(value, {
                      kind: 'cli',
                      cli: model.cli.value,
                      modelId: e.target.value,
                    }),
                  )
                }
              />
            </Field>
          </div>
        ) : model.kind === 'api' ? (
          <Field label={model.llmConfigId.label}>
            <Input
              value={model.llmConfigId.value}
              placeholder={model.llmConfigId.placeholder}
              spellCheck={false}
              autoCapitalize="none"
              onChange={(e) =>
                onChange(
                  evaluationDefaultsWithModel(value, { kind: 'api', llmConfigId: e.target.value }),
                )
              }
            />
          </Field>
        ) : null}
        {model.fallback ? <span className="text-xs opacity-60">{model.fallback}</span> : null}
      </div>
    </section>
  )
}
