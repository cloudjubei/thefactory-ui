import { Text, View } from 'react-native'
import type { ProcessInput, ProcessInputField, ProcessInputKind } from 'thefactory-tools/types'

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
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/Select'
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
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: nativeSpace[2] }}>
      <Input
        accessibilityLabel={PROCESS_EDITOR_COPY.inputName}
        placeholder={PROCESS_EDITOR_COPY.inputName}
        autoCapitalize="none"
        value={value.name}
        onChangeText={(name) => onChange({ name } as Partial<T>)}
      />
      <Input
        accessibilityLabel={PROCESS_EDITOR_COPY.inputLabel}
        placeholder={PROCESS_EDITOR_COPY.inputLabel}
        value={value.label}
        onChangeText={(label) => onChange({ label } as Partial<T>)}
      />
      <Select
        value={value.kind}
        onValueChange={(kind) => onChange({ kind: kind as ProcessInputKind } as Partial<T>)}
      >
        <SelectTrigger accessibilityLabel={PROCESS_EDITOR_COPY.inputKind}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {processInputKindChoices(nested).map((kind) => (
            <SelectItem key={kind} value={kind}>
              {PROCESS_INPUT_KIND_LABELS[kind]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        <Switch
          checked={value.required === true}
          onCheckedChange={(checked) => onChange({ required: checked || undefined } as Partial<T>)}
        />
        <Text style={{ flex: 1, fontSize: 12, color: theme.text.secondary }}>
          {PROCESS_EDITOR_COPY.required}
        </Text>
        <Button size="sm" variant="secondary" onPress={onRemove}>
          {PROCESS_EDITOR_COPY.remove}
        </Button>
      </View>
    </View>
  )
}

/** Native peer of web's `ProcessInputsEditor`: what a process asks a launch for. */
export default function ProcessInputsEditor({ definition, onChange }: ProcessInputsEditorProps) {
  const { theme } = useNativeTheme()
  const inputs = definition.inputs ?? []
  const problems = processDefinitionInputProblems(definition)
  const remove = (index: number) => {
    const next = setProcessInput(definition, index, { kind: 'text' })
    const left = (next.inputs ?? []).filter((_, at) => at !== index)
    const { inputs: _before, ...rest } = next
    onChange(left.length > 0 ? { ...rest, inputs: left } : rest)
  }
  return (
    <View style={{ gap: nativeSpace[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
          {PROCESS_EDITOR_COPY.inputsHeading}
        </Text>
        <Button
          size="sm"
          variant="secondary"
          onPress={() =>
            onChange({ ...definition, inputs: [...inputs, blankProcessInput(inputs.length + 1)] })
          }
        >
          {PROCESS_EDITOR_COPY.addInput}
        </Button>
      </View>
      <Text style={{ fontSize: 12, color: theme.text.secondary }}>
        {PROCESS_EDITOR_COPY.inputsHint}
      </Text>
      {inputs.map((input, index) => (
        <View
          key={index}
          style={{
            gap: nativeSpace[3],
            padding: nativeSpace[3],
            borderWidth: 1,
            borderColor: theme.border.subtle,
            borderRadius: nativeRadii[3],
          }}
        >
          <Row
            value={input}
            nested={false}
            onChange={(over) => onChange(setProcessInput(definition, index, over))}
            onRemove={() => remove(index)}
          />
          {input.kind === 'variants' ? (
            <View style={{ gap: nativeSpace[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
                <Text
                  style={{ flex: 1, fontSize: 12, fontWeight: '500', color: theme.text.primary }}
                >
                  {PROCESS_EDITOR_COPY.fieldsHeading}
                </Text>
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() =>
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
              </View>
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
            </View>
          ) : null}
        </View>
      ))}
      {problems.map((problem) => (
        <Alert key={problem} variant="error">
          {problem}
        </Alert>
      ))}
    </View>
  )
}
