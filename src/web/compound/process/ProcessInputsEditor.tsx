import {
  PROCESS_EDITOR_COPY,
  PROCESS_INPUT_KIND_LABELS,
  blankProcessInput,
  blankProcessInputField,
  processDefinitionInputProblems,
  processInputKindChoices,
  setProcessInput,
  type ProcessDefinition,
} from '../../../headless'
import type { ProcessInput, ProcessInputField, ProcessInputKind } from 'thefactory-tools/types'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import { NativeSelect } from '../../primitives/NativeSelect'
import Surface from '../../primitives/Surface'
import { Switch } from '../../primitives/Switch'

export type ProcessInputsEditorProps = {
  definition: ProcessDefinition
  onChange: (next: ProcessDefinition) => void
}

function Row<T extends ProcessInput | ProcessInputField>({
  value,
  nested,
  onChange,
  onRemove,
}: {
  value: T
  nested: boolean
  onChange: (over: Partial<T>) => void
  onRemove: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        className="w-36"
        aria-label={PROCESS_EDITOR_COPY.inputName}
        placeholder={PROCESS_EDITOR_COPY.inputName}
        value={value.name}
        onChange={(e) => onChange({ name: e.target.value } as Partial<T>)}
      />
      <Input
        className="w-44"
        aria-label={PROCESS_EDITOR_COPY.inputLabel}
        placeholder={PROCESS_EDITOR_COPY.inputLabel}
        value={value.label}
        onChange={(e) => onChange({ label: e.target.value } as Partial<T>)}
      />
      <NativeSelect
        className="w-32"
        aria-label={PROCESS_EDITOR_COPY.inputKind}
        value={value.kind}
        onChange={(e) => onChange({ kind: e.target.value as ProcessInputKind } as Partial<T>)}
      >
        {processInputKindChoices(nested).map((kind) => (
          <option key={kind} value={kind}>
            {PROCESS_INPUT_KIND_LABELS[kind]}
          </option>
        ))}
      </NativeSelect>
      <label className="flex items-center gap-1 text-[11px]">
        <Switch
          checked={value.required === true}
          onCheckedChange={(checked) => onChange({ required: checked || undefined } as Partial<T>)}
        />
        {PROCESS_EDITOR_COPY.required}
      </label>
      <Button size="sm" variant="secondary" className="ml-auto" onClick={onRemove}>
        {PROCESS_EDITOR_COPY.remove}
      </Button>
    </div>
  )
}

/** What a process asks a launch for: each input, and what a variant holds. */
export default function ProcessInputsEditor({ definition, onChange }: ProcessInputsEditorProps) {
  const inputs = definition.inputs ?? []
  const problems = processDefinitionInputProblems(definition)
  const remove = (index: number) => {
    const next = setProcessInput(definition, index, { kind: 'text' })
    const left = (next.inputs ?? []).filter((_, at) => at !== index)
    const { inputs: _before, ...rest } = next
    onChange(left.length > 0 ? { ...rest, inputs: left } : rest)
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-semibold">{PROCESS_EDITOR_COPY.inputsHeading}</h3>
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            onChange({ ...definition, inputs: [...inputs, blankProcessInput(inputs.length + 1)] })
          }
        >
          {PROCESS_EDITOR_COPY.addInput}
        </Button>
      </div>
      <p className="text-[11px] text-(--text-secondary)">{PROCESS_EDITOR_COPY.inputsHint}</p>
      {inputs.map((input, index) => (
        <Surface key={index} className="space-y-2 p-3">
          <Row
            value={input}
            nested={false}
            onChange={(over) => onChange(setProcessInput(definition, index, over))}
            onRemove={() => remove(index)}
          />
          {input.kind === 'variants' ? (
            <div className="space-y-2 border-l-2 border-(--border-subtle) pl-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium">{PROCESS_EDITOR_COPY.fieldsHeading}</span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    onChange(
                      setProcessInput(definition, index, {
                        fields: [
                          ...(input.fields ?? []),
                          blankProcessInputField((input.fields?.length ?? 0) + 1),
                        ],
                      }),
                    )
                  }
                >
                  {PROCESS_EDITOR_COPY.addField}
                </Button>
              </div>
              {(input.fields ?? []).map((field, at) => (
                <Row
                  key={at}
                  value={field}
                  nested
                  onChange={(over) =>
                    onChange(
                      setProcessInput(definition, index, {
                        fields: input.fields?.map((one, i) =>
                          i === at ? { ...one, ...over } : one,
                        ),
                      }),
                    )
                  }
                  onRemove={() =>
                    onChange(
                      setProcessInput(definition, index, {
                        fields: input.fields?.filter((_, i) => i !== at),
                      }),
                    )
                  }
                />
              ))}
            </div>
          ) : null}
        </Surface>
      ))}
      {problems.map((problem) => (
        <Alert key={problem} variant="error">
          {problem}
        </Alert>
      ))}
    </div>
  )
}
