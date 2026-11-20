import { useEffect } from 'react'
import { Text, View } from 'react-native'
import type { ProjectGeneratorInput, ProjectGeneratorSetting } from 'thefactory-tools/types'

import { useProjectsOptional } from '../../../headless/contexts/ProjectsContext'
import {
  blankProjectGenerator,
  projectGeneratorErrors,
  projectGeneratorsError,
} from '../../../headless/utils/projectGenerators'
import {
  PROJECT_GENERATOR_ADD,
  PROJECT_GENERATOR_ADD_INPUT,
  PROJECT_GENERATOR_ADD_OUTPUT,
  PROJECT_GENERATOR_COMMAND_LABEL,
  PROJECT_GENERATOR_COMMAND_PLACEHOLDER,
  PROJECT_GENERATOR_FROM_PATH_PLACEHOLDER,
  PROJECT_GENERATOR_FROM_PROJECT_LABEL,
  PROJECT_GENERATOR_FROM_PROJECT_PLACEHOLDER,
  PROJECT_GENERATOR_INPUTS_LABEL,
  PROJECT_GENERATOR_NAME_LABEL,
  PROJECT_GENERATOR_NAME_PLACEHOLDER,
  PROJECT_GENERATOR_OUTPUT_PLACEHOLDER,
  PROJECT_GENERATOR_OUTPUTS_LABEL,
  PROJECT_GENERATOR_PATH_PLACEHOLDER,
  PROJECT_GENERATOR_READ_AT_PLACEHOLDER,
  PROJECT_GENERATOR_REMOVE,
  PROJECT_GENERATORS_EMPTY,
  PROJECT_GENERATORS_HINT,
  PROJECT_GENERATORS_LABEL,
} from '../../../headless/utils/projectGeneratorsConstants'
import {
  projectGeneratorSourceProjects,
  withoutProjectGeneratorAt,
  withProjectGeneratorAt,
  withProjectGeneratorInputFrom,
} from '../../../headless/utils/projectGeneratorsEdit'
import { red } from '../../../tokens/colors'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/Select'
import { Switch } from '../../primitives/Switch'

export type ProjectGeneratorsFieldProps = {
  /** The project being edited, left out of the projects another project's file is picked from. */
  projectId: string | undefined
  /** The generators set, or none. */
  value: readonly ProjectGeneratorSetting[] | undefined
  /** The generators as edited; `undefined` once there are none. */
  onChange: (next: ProjectGeneratorSetting[] | undefined) => void
  /** Told why the generators cannot be saved as they are, and `undefined` once they can. */
  onErrorChange?: (error: string | undefined) => void
}

function GeneratorInput({
  input,
  projectIds,
  onChange,
  onRemove,
}: {
  input: ProjectGeneratorInput
  projectIds: string[]
  onChange: (next: ProjectGeneratorInput) => void
  onRemove: () => void
}) {
  const { theme } = useNativeTheme()
  const from = input.from
  const readAt = from ? PROJECT_GENERATOR_READ_AT_PLACEHOLDER : PROJECT_GENERATOR_PATH_PLACEHOLDER
  return (
    <View
      style={{
        gap: 6,
        padding: 8,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderRadius: nativeRadii[1],
        borderColor: theme.border.subtle,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Switch
          checked={from !== undefined}
          onCheckedChange={(on) => onChange(withProjectGeneratorInputFrom(input, on))}
          label={PROJECT_GENERATOR_FROM_PROJECT_LABEL}
        />
        <Button variant="ghost" size="sm" onPress={onRemove}>
          {PROJECT_GENERATOR_REMOVE}
        </Button>
      </View>
      {from ? (
        <>
          <Select
            value={from.projectId}
            onValueChange={(projectId) => onChange({ ...input, from: { ...from, projectId } })}
          >
            <SelectTrigger>
              <SelectValue placeholder={PROJECT_GENERATOR_FROM_PROJECT_PLACEHOLDER} />
            </SelectTrigger>
            <SelectContent>
              {projectIds.map((id) => (
                <SelectItem key={id} value={id}>
                  {id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={from.path}
            placeholder={PROJECT_GENERATOR_FROM_PATH_PLACEHOLDER}
            accessibilityLabel={PROJECT_GENERATOR_FROM_PATH_PLACEHOLDER}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={(path) => onChange({ ...input, from: { ...from, path } })}
          />
        </>
      ) : null}
      <Input
        value={input.path}
        placeholder={readAt}
        accessibilityLabel={readAt}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={(path) => onChange({ ...input, path })}
      />
    </View>
  )
}

function GeneratorCard({
  generator,
  errors,
  projectIds,
  onChange,
  onRemove,
}: {
  generator: ProjectGeneratorSetting
  errors: string[] | undefined
  projectIds: string[]
  onChange: (next: ProjectGeneratorSetting) => void
  onRemove: () => void
}) {
  const { theme, status, colorScheme } = useNativeTheme()
  return (
    <View
      accessibilityLabel={generator.name || PROJECT_GENERATOR_NAME_PLACEHOLDER}
      style={{
        gap: 8,
        padding: 10,
        borderWidth: 1,
        borderRadius: nativeRadii[2],
        borderColor: theme.border.default,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Input
            value={generator.name}
            placeholder={PROJECT_GENERATOR_NAME_PLACEHOLDER}
            accessibilityLabel={PROJECT_GENERATOR_NAME_LABEL}
            onChangeText={(name) => onChange({ ...generator, name })}
          />
        </View>
        <Button variant="ghost" size="sm" onPress={onRemove}>
          {PROJECT_GENERATOR_REMOVE}
        </Button>
      </View>
      <Input
        value={generator.command}
        placeholder={PROJECT_GENERATOR_COMMAND_PLACEHOLDER}
        accessibilityLabel={PROJECT_GENERATOR_COMMAND_LABEL}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={(command) => onChange({ ...generator, command })}
      />
      <Field
        label={PROJECT_GENERATOR_INPUTS_LABEL}
        labelTrailing={
          <Button
            variant="ghost"
            size="sm"
            onPress={() => onChange({ ...generator, inputs: [...generator.inputs, { path: '' }] })}
          >
            {PROJECT_GENERATOR_ADD_INPUT}
          </Button>
        }
      >
        {generator.inputs.map((input, at) => (
          <GeneratorInput
            key={at}
            input={input}
            projectIds={projectIds}
            onChange={(next) =>
              onChange({
                ...generator,
                inputs: generator.inputs.map((x, i) => (i === at ? next : x)),
              })
            }
            onRemove={() =>
              onChange({ ...generator, inputs: generator.inputs.filter((_, i) => i !== at) })
            }
          />
        ))}
      </Field>
      <Field
        label={PROJECT_GENERATOR_OUTPUTS_LABEL}
        labelTrailing={
          <Button
            variant="ghost"
            size="sm"
            onPress={() => onChange({ ...generator, outputs: [...generator.outputs, ''] })}
          >
            {PROJECT_GENERATOR_ADD_OUTPUT}
          </Button>
        }
      >
        {generator.outputs.map((output, at) => (
          <View key={at} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Input
                value={output}
                placeholder={PROJECT_GENERATOR_OUTPUT_PLACEHOLDER}
                accessibilityLabel={PROJECT_GENERATOR_OUTPUT_PLACEHOLDER}
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={(next) =>
                  onChange({
                    ...generator,
                    outputs: generator.outputs.map((x, i) => (i === at ? next : x)),
                  })
                }
              />
            </View>
            <Button
              variant="ghost"
              size="sm"
              onPress={() =>
                onChange({ ...generator, outputs: generator.outputs.filter((_, i) => i !== at) })
              }
            >
              {PROJECT_GENERATOR_REMOVE}
            </Button>
          </View>
        ))}
      </Field>
      {errors?.map((error) => (
        <Text
          key={error}
          accessibilityRole="alert"
          style={{ fontSize: 12, color: colorScheme === 'dark' ? red[400] : status.stuck.softFg }}
        >
          {error}
        </Text>
      ))}
    </View>
  )
}

/** Native peer of web's `ProjectGeneratorsField`. */
export default function ProjectGeneratorsField({
  projectId,
  value,
  onChange,
  onErrorChange,
}: ProjectGeneratorsFieldProps) {
  const { theme } = useNativeTheme()
  const projects = useProjectsOptional()?.projects ?? []
  const generators = value ?? []
  const projectIds = projectGeneratorSourceProjects(
    projects.map((p) => p.id),
    projectId,
    generators,
  )
  const errors = projectGeneratorErrors(generators)
  const error = projectGeneratorsError(generators)
  useEffect(() => onErrorChange?.(error), [error, onErrorChange])
  const update = (next: ProjectGeneratorSetting[]) => onChange(next.length > 0 ? next : undefined)

  return (
    <View
      accessibilityLabel={PROJECT_GENERATORS_LABEL}
      style={{
        gap: 12,
        padding: 12,
        borderWidth: 1,
        borderRadius: nativeRadii[2],
        borderColor: theme.border.subtle,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>
            {PROJECT_GENERATORS_LABEL}
          </Text>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            {PROJECT_GENERATORS_HINT}
          </Text>
        </View>
        <Button
          variant="ghost"
          size="sm"
          onPress={() => update([...generators, blankProjectGenerator()])}
        >
          {PROJECT_GENERATOR_ADD}
        </Button>
      </View>
      {generators.length === 0 ? (
        <Text style={{ fontSize: 12, color: theme.text.muted }}>{PROJECT_GENERATORS_EMPTY}</Text>
      ) : (
        generators.map((generator, at) => (
          <GeneratorCard
            key={at}
            generator={generator}
            errors={errors[at]}
            projectIds={projectIds}
            onChange={(next) => update(withProjectGeneratorAt(generators, at, next))}
            onRemove={() => update(withoutProjectGeneratorAt(generators, at))}
          />
        ))
      )}
    </View>
  )
}
