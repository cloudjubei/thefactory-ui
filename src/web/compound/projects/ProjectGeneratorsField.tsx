import { useEffect } from 'react'
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

const mono = 'font-mono'

/** One input a generator reads: a path, or another project's file and where the command reads it. */
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
  const from = input.from
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-dashed border-(--border-subtle) p-2">
      <div className="flex items-center justify-between gap-2">
        <Switch
          checked={from !== undefined}
          onCheckedChange={(on) => onChange(withProjectGeneratorInputFrom(input, on))}
          label={PROJECT_GENERATOR_FROM_PROJECT_LABEL}
        />
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          {PROJECT_GENERATOR_REMOVE}
        </Button>
      </div>
      {from ? (
        <div className="flex flex-col gap-1.5 sm:flex-row">
          <Select
            value={from.projectId || undefined}
            onValueChange={(projectId) => onChange({ ...input, from: { ...from, projectId } })}
          >
            <SelectTrigger className="sm:w-44" aria-label={PROJECT_GENERATOR_FROM_PROJECT_LABEL}>
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
            className={`flex-1 ${mono}`}
            value={from.path}
            placeholder={PROJECT_GENERATOR_FROM_PATH_PLACEHOLDER}
            aria-label={PROJECT_GENERATOR_FROM_PATH_PLACEHOLDER}
            spellCheck={false}
            autoCapitalize="none"
            onChange={(e) => onChange({ ...input, from: { ...from, path: e.target.value } })}
          />
        </div>
      ) : null}
      <Input
        className={mono}
        value={input.path}
        placeholder={
          from ? PROJECT_GENERATOR_READ_AT_PLACEHOLDER : PROJECT_GENERATOR_PATH_PLACEHOLDER
        }
        aria-label={
          from ? PROJECT_GENERATOR_READ_AT_PLACEHOLDER : PROJECT_GENERATOR_PATH_PLACEHOLDER
        }
        spellCheck={false}
        autoCapitalize="none"
        onChange={(e) => onChange({ ...input, path: e.target.value })}
      />
    </div>
  )
}

/** One generator: its name, command, what it reads and what it writes, and why it cannot be saved. */
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
  const invalid = (errors?.length ?? 0) > 0
  return (
    <div
      role="group"
      aria-label={generator.name || PROJECT_GENERATOR_NAME_PLACEHOLDER}
      className="flex flex-col gap-2 rounded-md border border-(--border-default) p-2.5"
    >
      <div className="flex items-center gap-2">
        <Input
          className="flex-1"
          value={generator.name}
          placeholder={PROJECT_GENERATOR_NAME_PLACEHOLDER}
          aria-label={PROJECT_GENERATOR_NAME_LABEL}
          aria-invalid={invalid ? true : undefined}
          onChange={(e) => onChange({ ...generator, name: e.target.value })}
        />
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          {PROJECT_GENERATOR_REMOVE}
        </Button>
      </div>
      <Input
        className={mono}
        value={generator.command}
        placeholder={PROJECT_GENERATOR_COMMAND_PLACEHOLDER}
        aria-label={PROJECT_GENERATOR_COMMAND_LABEL}
        spellCheck={false}
        autoCapitalize="none"
        onChange={(e) => onChange({ ...generator, command: e.target.value })}
      />
      <div
        role="group"
        aria-label={PROJECT_GENERATOR_INPUTS_LABEL}
        className="flex flex-col gap-1.5"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">{PROJECT_GENERATOR_INPUTS_LABEL}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange({ ...generator, inputs: [...generator.inputs, { path: '' }] })}
          >
            {PROJECT_GENERATOR_ADD_INPUT}
          </Button>
        </div>
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
      </div>
      <div
        role="group"
        aria-label={PROJECT_GENERATOR_OUTPUTS_LABEL}
        className="flex flex-col gap-1.5"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">{PROJECT_GENERATOR_OUTPUTS_LABEL}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange({ ...generator, outputs: [...generator.outputs, ''] })}
          >
            {PROJECT_GENERATOR_ADD_OUTPUT}
          </Button>
        </div>
        {generator.outputs.map((output, at) => (
          <div key={at} className="flex items-center gap-2">
            <Input
              className={`flex-1 ${mono}`}
              value={output}
              placeholder={PROJECT_GENERATOR_OUTPUT_PLACEHOLDER}
              aria-label={PROJECT_GENERATOR_OUTPUT_PLACEHOLDER}
              spellCheck={false}
              autoCapitalize="none"
              onChange={(e) =>
                onChange({
                  ...generator,
                  outputs: generator.outputs.map((x, i) => (i === at ? e.target.value : x)),
                })
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                onChange({ ...generator, outputs: generator.outputs.filter((_, i) => i !== at) })
              }
            >
              {PROJECT_GENERATOR_REMOVE}
            </Button>
          </div>
        ))}
      </div>
      {errors?.map((error) => (
        <span key={error} role="alert" className="field-error text-xs">
          {error}
        </span>
      ))}
    </div>
  )
}

/**
 * The project's generators: each a name, a one-line command, what it reads —
 * a path, or another project's file — and what it writes. Says why each
 * cannot be saved, as the backend would refuse it.
 */
export default function ProjectGeneratorsField({
  projectId,
  value,
  onChange,
  onErrorChange,
}: ProjectGeneratorsFieldProps) {
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
    <section
      aria-label={PROJECT_GENERATORS_LABEL}
      className="flex flex-col gap-3 rounded-lg border border-(--border-subtle) p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{PROJECT_GENERATORS_LABEL}</span>
          <span className="text-xs text-(--text-secondary)">{PROJECT_GENERATORS_HINT}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => update([...generators, blankProjectGenerator()])}
        >
          {PROJECT_GENERATOR_ADD}
        </Button>
      </div>
      {generators.length === 0 ? (
        <span className="text-xs text-(--text-muted)">{PROJECT_GENERATORS_EMPTY}</span>
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
    </section>
  )
}
