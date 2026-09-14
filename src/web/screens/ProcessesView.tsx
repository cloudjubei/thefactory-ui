import { useCallback, useMemo, useState } from 'react'
import type { ProcessDefinition, ProcessStep, ProcessStepKind } from 'thefactory-tools/types'
import { stepChainSummary } from 'thefactory-tools/utils'
import { useActiveProject, useProcesses } from '../../headless'
import Alert from '../primitives/Alert'
import { Button } from '../primitives/Button'
import Field from '../primitives/Field'
import { Input } from '../primitives/Input'
import { NativeSelect } from '../primitives/NativeSelect'
import Surface from '../primitives/Surface'
import { Switch } from '../primitives/Switch'
import { Textarea } from '../primitives/Textarea'
import { IconSave } from '../icons'

/** What each step kind actually does, in the words a person picking one needs. */
const KIND_BLURB: Record<ProcessStepKind, string> = {
  agent: 'An agent run in an isolated copy of the project.',
  check: "The project's verification checks, over what the previous step landed.",
  capture: 'Drive the app and file screenshots as evidence.',
  judge: 'Read the evidence and the diff, and return a verdict.',
  report: 'One model pass over the ledger. No tools, no workspace.',
  gate: 'Stop and wait for a person to decide.',
  process: 'A nested process, one level down.',
}

function blankStep(index: number): ProcessStep {
  return { id: `step-${index}`, name: `Step ${index}`, kind: 'agent', agentType: 'developer' }
}

function blankDefinition(): ProcessDefinition {
  return {
    id: '',
    name: '',
    description: '',
    steps: [blankStep(1)],
    loops: [],
    version: 1,
    updatedAt: 0,
  }
}

export type ProcessesViewProps = {
  /**
   * Collapse to one pane at a time — the small-screen shape. The list is
   * replaced by the detail when something is selected, with a way back.
   *
   * Additive and optional: a big-screen client passes nothing and keeps the
   * two-pane layout. Web passes its narrow-viewport flag; native always
   * collapses.
   */
  narrow?: boolean
}

/**
 * The process library for one project: the shared definitions and the
 * project's own, in one list.
 *
 * The rule the screen exists to make visible is the SHADOW: a project entry
 * that overrides a shared one by id says so on its row, because "why is this
 * different here" is the only question this list is asked.
 */
export default function ProcessesView({ narrow = false }: ProcessesViewProps) {
  const { projectId } = useActiveProject()
  const { isLoaded, loadError, processes, implementedKinds, save, remove } = useProcesses(projectId)
  const [editing, setEditing] = useState<ProcessDefinition | undefined>(undefined)
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const [saveError, setSaveError] = useState<string | undefined>(undefined)

  const selected = useMemo(
    () => processes.find((p) => p.id === selectedId),
    [processes, selectedId],
  )

  const onSave = useCallback(
    async (definition: ProcessDefinition) => {
      setSaveError(undefined)
      try {
        const saved = await save(definition)
        setEditing(undefined)
        setSelectedId(saved.id)
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : String(err))
      }
    },
    [save],
  )

  const showDetail = Boolean(editing || selected)
  const back = () => {
    setEditing(undefined)
    setSelectedId(undefined)
  }

  if (!projectId) {
    return <div className="p-4 text-sm text-(--text-secondary)">Pick a project first.</div>
  }

  return (
    <div className="flex h-full min-h-0 flex-row">
      <div
        className={`${
          narrow ? (showDetail ? 'hidden' : 'flex w-full') : 'flex w-80 min-w-72 border-r'
        } flex-col gap-2 overflow-y-auto border-(--border-subtle) p-3`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Processes</h2>
          <Button size="sm" onClick={() => setEditing(blankDefinition())}>
            New
          </Button>
        </div>
        <p className="text-[11px] text-(--text-secondary)">
          How work gets carried out. A process is chosen before a run starts and frozen for its
          whole life, so editing one changes the next run and never a running one.
        </p>
        {loadError ? <Alert variant="error">{loadError.message}</Alert> : null}
        {!isLoaded ? <div className="text-xs text-(--text-secondary)">Loading…</div> : null}
        {processes.map((definition) => (
          <Surface
            as="button"
            type="button"
            key={definition.id}
            className="w-full p-2 text-left"
            style={
              definition.id === selectedId ? { borderColor: 'var(--accent-primary)' } : undefined
            }
            onClick={() => {
              setSelectedId(definition.id)
              setEditing(undefined)
            }}
          >
            <div className="flex items-center gap-2">
              <span className="truncate text-xs font-medium">{definition.name}</span>
              <ScopeBadge definition={definition} />
            </div>
            <div className="mt-1 truncate text-[11px] text-(--text-secondary)">
              {stepChainSummary(definition)}
            </div>
          </Surface>
        ))}
      </div>

      <div
        className={`${narrow && !showDetail ? 'hidden' : 'block'} min-w-0 flex-1 overflow-y-auto p-4`}
      >
        {narrow && showDetail ? (
          <button
            type="button"
            className="mb-3 text-[11px] underline text-(--text-secondary)"
            onClick={back}
          >
            ← All processes
          </button>
        ) : null}
        {saveError ? <Alert variant="error">{saveError}</Alert> : null}
        {editing ? (
          <ProcessEditor
            definition={editing}
            implementedKinds={implementedKinds}
            isFork={
              editing.scope === 'global' ||
              (processes.find((p) => p.id === editing.id)?.scope === 'global' && editing.id !== '')
            }
            onChange={setEditing}
            onCancel={() => setEditing(undefined)}
            onSave={() => void onSave(editing)}
          />
        ) : selected ? (
          <ProcessDetail
            definition={selected}
            onEdit={() => setEditing(structuredClone(selected))}
            onCopy={() =>
              setEditing({
                ...structuredClone(selected),
                id: `${selected.id}-copy`,
                name: `${selected.name} (copy)`,
                version: 1,
              })
            }
            onDelete={selected.scope === 'project' ? () => void remove(selected.id) : undefined}
          />
        ) : (
          <div className="text-sm text-(--text-secondary)">
            Pick a process to see its steps, or create one.
          </div>
        )}
      </div>
    </div>
  )
}

function ScopeBadge({ definition }: { definition: ProcessDefinition }) {
  const label =
    definition.scope === 'project'
      ? definition.shadowsGlobal
        ? 'OVERRIDES SHARED'
        : 'THIS PROJECT'
      : 'SHARED'
  return (
    <span
      className="shrink-0 rounded px-1 py-px text-[9px] tracking-wide text-(--text-secondary)"
      style={{ border: '1px solid var(--border-subtle)' }}
    >
      {label}
    </span>
  )
}

function ProcessDetail({
  definition,
  onEdit,
  onCopy,
  onDelete,
}: {
  definition: ProcessDefinition
  onEdit: () => void
  onCopy: () => void
  onDelete?: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold">{definition.name}</h2>
        <ScopeBadge definition={definition} />
        <span className="text-[11px] text-(--text-secondary)">v{definition.version}</span>
        <div className="ml-auto flex gap-2">
          <Button size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button size="sm" variant="secondary" onClick={onCopy}>
            Copy from…
          </Button>
          {onDelete ? (
            <Button size="sm" variant="secondary" onClick={onDelete}>
              Remove this project&rsquo;s copy
            </Button>
          ) : null}
        </div>
      </div>
      {definition.description ? (
        <p className="max-w-prose text-xs text-(--text-secondary)">{definition.description}</p>
      ) : null}
      {definition.shadowsGlobal ? (
        <Alert variant="info">
          This project has its own copy of a shared process. Removing it brings the shared one back.
        </Alert>
      ) : null}

      <ol className="space-y-2">
        {definition.steps.map((step, index) => (
          <Surface key={step.id} className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-(--text-secondary)">{index + 1}</span>
              <span className="text-sm font-medium">{step.name}</span>
              <span className="rounded bg-(--surface-muted) px-1 py-px text-[10px]">
                {step.kind}
              </span>
              {step.agentType ? (
                <span className="text-[10px] text-(--text-secondary)">{step.agentType}</span>
              ) : null}
              {step.processId ? (
                <span className="text-[10px] text-(--text-secondary)">→ {step.processId}</span>
              ) : null}
              {step.expand ? (
                <span className="text-[10px] text-(--text-secondary)">one per {step.expand}</span>
              ) : null}
              {step.enabled === false ? (
                <span className="text-[10px] text-(--text-secondary)">off</span>
              ) : null}
            </div>
            <div className="mt-1 text-[11px] text-(--text-secondary)">
              {step.description ?? KIND_BLURB[step.kind]}
            </div>
          </Surface>
        ))}
      </ol>

      {definition.loops.length > 0 ? (
        <div className="space-y-1">
          <h3 className="text-xs font-semibold">If a step does not pass</h3>
          {definition.loops.map((loop) => (
            <div key={loop.id} className="text-[11px] text-(--text-secondary)">
              {stepName(definition, loop.from)} ends {loop.when.join(' or ')} → back to{' '}
              {stepName(definition, loop.to)}, at most {loop.maxIterations} attempts.
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function stepName(definition: ProcessDefinition, stepId: string): string {
  return definition.steps.find((s) => s.id === stepId)?.name ?? stepId
}

function ProcessEditor({
  definition,
  implementedKinds,
  isFork,
  onChange,
  onCancel,
  onSave,
}: {
  definition: ProcessDefinition
  implementedKinds: ProcessStepKind[]
  isFork: boolean
  onChange: (next: ProcessDefinition) => void
  onCancel: () => void
  onSave: () => void
}) {
  const patch = (over: Partial<ProcessDefinition>) => onChange({ ...definition, ...over })
  const patchStep = (index: number, over: Partial<ProcessStep>) =>
    patch({ steps: definition.steps.map((s, i) => (i === index ? { ...s, ...over } : s)) })
  const moveStep = (index: number, delta: number) => {
    const next = [...definition.steps]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    patch({ steps: next })
  }

  const isNew = !definition.id
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold">
          {isNew ? 'New process' : `Editing ${definition.name || definition.id}`}
        </h2>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          {isNew ? (
            <Button size="sm" onClick={onSave}>
              Add process
            </Button>
          ) : (
            <Button variant="secondary" size="icon" title="Save" aria-label="Save" onClick={onSave}>
              <IconSave className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {isFork ? (
        <Alert variant="info">
          Saving makes this project its own copy. The shared process everyone else uses is left
          exactly as it is.
        </Alert>
      ) : null}

      <div className="grid max-w-xl gap-3">
        <Field label="Id">
          <Input
            value={definition.id}
            onChange={(e) => patch({ id: e.target.value })}
            placeholder="feature-android"
          />
        </Field>
        <Field label="Name">
          <Input value={definition.name} onChange={(e) => patch({ name: e.target.value })} />
        </Field>
        <Field label="What it is for">
          <Textarea
            rows={2}
            value={definition.description ?? ''}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </Field>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold">Steps</h3>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              patch({ steps: [...definition.steps, blankStep(definition.steps.length + 1)] })
            }
          >
            Add step
          </Button>
        </div>
        {definition.steps.map((step, index) => (
          <Surface key={`${step.id}-${index}`} className="space-y-2 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                className="w-40"
                value={step.name}
                onChange={(e) => patchStep(index, { name: e.target.value })}
              />
              <Input
                className="w-40"
                value={step.id}
                onChange={(e) => patchStep(index, { id: e.target.value })}
              />
              <NativeSelect
                value={step.kind}
                onChange={(e) => patchStep(index, { kind: e.target.value as ProcessStepKind })}
              >
                {implementedKinds.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </NativeSelect>
              {step.kind === 'agent' ? (
                <Input
                  className="w-40"
                  placeholder="developer"
                  value={step.agentType ?? ''}
                  onChange={(e) => patchStep(index, { agentType: e.target.value })}
                />
              ) : null}
              {step.kind === 'process' ? (
                <Input
                  className="w-44"
                  placeholder="feature-default"
                  value={step.processId ?? ''}
                  onChange={(e) => patchStep(index, { processId: e.target.value })}
                />
              ) : null}
              <div className="ml-auto flex items-center gap-2">
                <label className="flex items-center gap-1 text-[11px]">
                  <Switch
                    checked={step.enabled !== false}
                    onCheckedChange={(checked) => patchStep(index, { enabled: checked })}
                  />
                  on
                </label>
                <Button size="sm" variant="secondary" onClick={() => moveStep(index, -1)}>
                  ↑
                </Button>
                <Button size="sm" variant="secondary" onClick={() => moveStep(index, 1)}>
                  ↓
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => patch({ steps: definition.steps.filter((_, i) => i !== index) })}
                >
                  Remove
                </Button>
              </div>
            </div>
            <div className="text-[11px] text-(--text-secondary)">{KIND_BLURB[step.kind]}</div>
          </Surface>
        ))}
      </div>

      {definition.loops.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold">If a step does not pass</h3>
          {definition.loops.map((loop, index) => (
            <Surface key={loop.id} className="flex flex-wrap items-center gap-2 p-3 text-[11px]">
              <span>
                {stepName(definition, loop.from)} → {stepName(definition, loop.to)}
              </span>
              <span className="ml-auto flex items-center gap-1">
                at most
                <Input
                  className="w-16"
                  type="number"
                  min={1}
                  value={String(loop.maxIterations)}
                  onChange={(e) =>
                    patch({
                      loops: definition.loops.map((l, i) =>
                        i === index
                          ? { ...l, maxIterations: Math.max(1, Number(e.target.value) || 1) }
                          : l,
                      ),
                    })
                  }
                />
                attempts
              </span>
            </Surface>
          ))}
        </div>
      ) : null}
    </div>
  )
}
