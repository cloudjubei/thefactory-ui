import { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import {
  AGENT_RUN_TYPES,
  PROCESS_KIND_BLURB,
  blankProcessDefinition,
  blankProcessStep,
  copyProcessDefinition,
  isProcessFork,
  processScopeLabel,
  processStepName,
  stepChainSummary,
  useActiveProject,
  useProcesses,
  type ProcessDefinition,
  type ProcessStep,
  type ProcessStepKind,
} from '../../headless'
import { nativeRadii, nativeSpace } from '../../tokens/native'
import Alert from '../primitives/Alert'
import { Button } from '../primitives/Button'
import Field from '../primitives/Field'
import { Input } from '../primitives/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/Select'
import { Switch } from '../primitives/Switch'
import { Textarea } from '../primitives/Textarea'
import { useNativeTheme } from '../hooks/useNativeTheme'

/**
 * Native peer of
 * [web's `ProcessesView`](../../web/screens/ProcessesView.tsx). Same behaviour,
 * one pane at a time — the small-screen shape web collapses to under
 * `narrow`.
 *
 * The rule the screen exists to make visible is the SHADOW: a project entry
 * that overrides a shared one by id says so on its row.
 */
export default function ProcessesView() {
  const { theme } = useNativeTheme()
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

  const back = () => {
    setEditing(undefined)
    setSelectedId(undefined)
  }

  if (!projectId) {
    return (
      <View style={{ padding: nativeSpace[4] }}>
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>Pick a project first.</Text>
      </View>
    )
  }

  if (editing) {
    return (
      <ScrollView contentContainerStyle={{ padding: nativeSpace[4], gap: nativeSpace[3] }}>
        <Pressable onPress={back} accessibilityRole="button">
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>← All processes</Text>
        </Pressable>
        {saveError ? <Alert variant="error">{saveError}</Alert> : null}
        <ProcessEditor
          definition={editing}
          implementedKinds={implementedKinds}
          isFork={isProcessFork(editing)}
          onChange={setEditing}
          onSave={() => void onSave(editing)}
        />
      </ScrollView>
    )
  }

  if (selected) {
    return (
      <ScrollView contentContainerStyle={{ padding: nativeSpace[4], gap: nativeSpace[3] }}>
        <Pressable onPress={back} accessibilityRole="button">
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>← All processes</Text>
        </Pressable>
        <ProcessDetail
          definition={selected}
          onEdit={() => setEditing(structuredClone(selected))}
          onCopy={() => setEditing(copyProcessDefinition(selected))}
          {...(selected.scope === 'project' ? { onDelete: () => void remove(selected.id) } : {})}
        />
      </ScrollView>
    )
  }

  return (
    <ScrollView contentContainerStyle={{ padding: nativeSpace[4], gap: nativeSpace[2] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        <Text style={{ fontSize: 17, fontWeight: '600', color: theme.text.primary, flex: 1 }}>
          Processes
        </Text>
        <Button size="sm" onPress={() => setEditing(blankProcessDefinition())}>
          New
        </Button>
      </View>
      <Text style={{ fontSize: 12, color: theme.text.secondary }}>
        How work gets carried out. A process is chosen before a run starts and frozen for its whole
        life, so editing one changes the next run and never a running one.
      </Text>
      {loadError ? <Alert variant="error">{loadError.message}</Alert> : null}
      {!isLoaded ? (
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>Loading…</Text>
      ) : null}
      {processes.map((definition) => (
        <Pressable
          key={definition.id}
          accessibilityRole="button"
          onPress={() => setSelectedId(definition.id)}
          style={{
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: theme.surface.raised,
            borderRadius: nativeRadii[3],
            padding: nativeSpace[3],
            gap: nativeSpace[1],
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary, flex: 1 }}>
              {definition.name}
            </Text>
            <Text style={{ fontSize: 10, color: theme.text.muted }}>
              {processScopeLabel(definition)}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            {stepChainSummary(definition)}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
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
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: nativeSpace[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        <Text style={{ fontSize: 17, fontWeight: '600', color: theme.text.primary, flex: 1 }}>
          {definition.name}
        </Text>
        <Text style={{ fontSize: 10, color: theme.text.muted }}>
          {processScopeLabel(definition)}
        </Text>
      </View>
      {definition.description ? (
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>{definition.description}</Text>
      ) : null}
      {definition.shadowsGlobal ? (
        <Alert variant="info">
          This project has its own copy of a shared process. Removing it brings the shared one back.
        </Alert>
      ) : null}

      {definition.steps.map((step, index) => (
        <View
          key={step.id}
          style={{
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: theme.surface.raised,
            borderRadius: nativeRadii[3],
            padding: nativeSpace[3],
            gap: nativeSpace[1],
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: nativeSpace[2],
            }}
          >
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>{index + 1}</Text>
            <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>
              {step.name}
            </Text>
            <Text style={{ fontSize: 11, color: theme.text.muted }}>{step.kind}</Text>
            {step.agentType ? (
              <Text style={{ fontSize: 11, color: theme.text.secondary }}>{step.agentType}</Text>
            ) : null}
            {step.processId ? (
              <Text style={{ fontSize: 11, color: theme.text.secondary }}>→ {step.processId}</Text>
            ) : null}
            {/* The most consequential fact on the row: ONE authored step becomes
                N nodes at freeze time, so a 5-step process can execute as 12. */}
            {step.expand ? (
              <Text style={{ fontSize: 11, color: theme.text.secondary }}>
                one per {step.expand}
              </Text>
            ) : null}
            {step.enabled === false ? (
              <Text style={{ fontSize: 11, color: theme.text.muted }}>off</Text>
            ) : null}
          </View>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            {step.description ?? PROCESS_KIND_BLURB[step.kind]}
          </Text>
        </View>
      ))}

      {definition.loops.map((loop) => (
        <Text key={loop.id} style={{ fontSize: 12, color: theme.text.secondary }}>
          {processStepName(definition, loop.from)} ends {loop.when.join(' or ')} → back to{' '}
          {processStepName(definition, loop.to)}, at most {loop.maxIterations} attempts.
        </Text>
      ))}

      <View style={{ flexDirection: 'row', gap: nativeSpace[2] }}>
        <Button size="sm" onPress={onEdit}>
          Edit
        </Button>
        <Button size="sm" variant="secondary" onPress={onCopy}>
          Copy from…
        </Button>
        {onDelete ? (
          <Button size="sm" variant="secondary" onPress={onDelete}>
            Remove this project&rsquo;s copy
          </Button>
        ) : null}
      </View>
    </View>
  )
}

function ProcessEditor({
  definition,
  implementedKinds,
  isFork,
  onChange,
  onSave,
}: {
  definition: ProcessDefinition
  implementedKinds: ProcessStepKind[]
  isFork: boolean
  onChange: (next: ProcessDefinition) => void
  onSave: () => void
}) {
  const { theme } = useNativeTheme()
  const isNew = !definition.id
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

  return (
    <View style={{ gap: nativeSpace[3] }}>
      <Text style={{ fontSize: 17, fontWeight: '600', color: theme.text.primary }}>
        {isNew ? 'New process' : `Editing ${definition.name || definition.id}`}
      </Text>

      {isFork ? (
        <Alert variant="info">
          Saving makes this project its own copy. The shared process everyone else uses is left
          exactly as it is.
        </Alert>
      ) : null}

      <Field label="Id">
        <Input
          value={definition.id}
          onChangeText={(id) => patch({ id })}
          placeholder="feature-android"
        />
      </Field>
      <Field label="Name">
        <Input value={definition.name} onChangeText={(name) => patch({ name })} />
      </Field>
      <Field label="What it is for">
        <Textarea
          value={definition.description ?? ''}
          onChangeText={(description) => patch({ description })}
        />
      </Field>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary, flex: 1 }}>
          Steps
        </Text>
        <Button
          size="sm"
          variant="secondary"
          onPress={() =>
            patch({ steps: [...definition.steps, blankProcessStep(definition.steps.length + 1)] })
          }
        >
          Add step
        </Button>
      </View>

      {definition.steps.map((step, index) => (
        <View
          key={`${step.id}-${index}`}
          style={{
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: theme.surface.raised,
            borderRadius: nativeRadii[3],
            padding: nativeSpace[3],
            gap: nativeSpace[2],
          }}
        >
          <Field label="Name">
            <Input value={step.name} onChangeText={(name) => patchStep(index, { name })} />
          </Field>
          <Field label="Id">
            <Input value={step.id} onChangeText={(id) => patchStep(index, { id })} />
          </Field>
          <Field label="Kind">
            <Select
              value={step.kind}
              onValueChange={(kind) => patchStep(index, { kind: kind as ProcessStepKind })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {implementedKinds.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {kind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {step.kind === 'agent' ? (
            <Field label="Agent">
              {/* A picker, not a text box, for the same reason `kind` is one: a
                  role that does not exist is refused at save, and being refused
                  for a typo is a worse way to learn the list than being shown
                  it. Doubly so on a phone keyboard. */}
              <Select
                value={step.agentType ?? 'developer'}
                onValueChange={(agentType) => patchStep(index, { agentType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGENT_RUN_TYPES.map((agentType) => (
                    <SelectItem key={agentType} value={agentType}>
                      {agentType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}
          {step.kind === 'process' ? (
            <Field label="Process">
              <Input
                placeholder="feature-default"
                value={step.processId ?? ''}
                onChangeText={(processId) => patchStep(index, { processId })}
              />
            </Field>
          ) : null}
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            {PROCESS_KIND_BLURB[step.kind]}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
            <Switch
              checked={step.enabled !== false}
              onCheckedChange={(enabled) => patchStep(index, { enabled })}
            />
            <Text style={{ fontSize: 12, color: theme.text.secondary, flex: 1 }}>on</Text>
            <Button size="sm" variant="secondary" onPress={() => moveStep(index, -1)}>
              ↑
            </Button>
            <Button size="sm" variant="secondary" onPress={() => moveStep(index, 1)}>
              ↓
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => patch({ steps: definition.steps.filter((_, i) => i !== index) })}
            >
              Remove
            </Button>
          </View>
        </View>
      ))}

      {definition.loops.map((loop, index) => (
        <Field
          key={loop.id}
          label={`${processStepName(definition, loop.from)} → ${processStepName(definition, loop.to)}`}
        >
          <Input
            keyboardType="number-pad"
            value={String(loop.maxIterations)}
            onChangeText={(text) =>
              patch({
                loops: definition.loops.map((l, i) =>
                  i === index ? { ...l, maxIterations: Math.max(1, Number(text) || 1) } : l,
                ),
              })
            }
          />
        </Field>
      ))}

      <Button onPress={onSave}>{isNew ? 'Add process' : 'Save'}</Button>
    </View>
  )
}
