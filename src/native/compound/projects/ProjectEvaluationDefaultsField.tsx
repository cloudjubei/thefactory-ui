import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

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
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
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

export type ProjectEvaluationDefaultsFieldProps = {
  /** The Evaluation tab's defaults and every choice, from `useKnowledgeEvaluationSettings`. */
  settings: Pick<KnowledgeEvaluationSettings, 'tabDefaults' | 'choices'>
  /** The project's defaults, or none. */
  value: KnowledgeEvaluationDefaults | undefined
  /** The defaults as edited; `undefined` once nothing is set. */
  onChange: (next: KnowledgeEvaluationDefaults | undefined) => void
}

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
        <SelectTrigger>
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
  const { theme } = useNativeTheme()
  return (
    <Field label={focus.label} hint={focus.fallback}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {focus.options.map((o) => (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: o.selected }}
            accessibilityLabel={o.label}
            onPress={() => onToggle(o.value)}
            style={{
              flexDirection: 'row',
              gap: 6,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderWidth: 1,
              borderRadius: nativeRadii.round,
              borderColor: o.selected ? theme.accent.primary : theme.border.subtle,
              backgroundColor: theme.surface.raised,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '500',
                color: o.selected ? theme.accent.primary : theme.text.secondary,
              }}
            >
              {o.label}
            </Text>
            {o.count !== undefined ? (
              <Text style={{ fontSize: 12, color: theme.text.muted }}>{o.count}</Text>
            ) : null}
          </Pressable>
        ))}
      </View>
    </Field>
  )
}

/** Native peer of web's `ProjectEvaluationDefaultsField`. */
export default function ProjectEvaluationDefaultsField({
  settings,
  value,
  onChange,
}: ProjectEvaluationDefaultsFieldProps) {
  const { theme } = useNativeTheme()
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
    <View
      accessibilityLabel={view.title}
      style={{
        gap: 12,
        padding: 12,
        borderWidth: 1,
        borderRadius: nativeRadii[2],
        borderColor: theme.border.subtle,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>
            {view.title}
          </Text>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>{view.hint}</Text>
          <Text style={{ fontSize: 12, color: theme.text.primary }}>{view.summary}</Text>
        </View>
        {view.clear ? (
          <Button
            variant="ghost"
            size="sm"
            onPress={() => {
              setPickedModel('host')
              onChange(undefined)
            }}
          >
            {view.clear}
          </Button>
        ) : null}
      </View>

      <ChoiceField choice={view.stage} onChange={choose('stage')} />
      <ChoiceField choice={view.preset} onChange={choose('preset')} />
      <ChoiceField choice={view.promptMode} onChange={choose('promptMode')} />
      <ChoiceField choice={view.buildMode} onChange={choose('buildMode')} />
      <Field
        label={view.concurrency.label}
        hint={view.concurrency.hint}
        error={view.concurrency.error}
      >
        <Input
          keyboardType="number-pad"
          value={view.concurrency.value}
          placeholder={view.concurrency.placeholder}
          invalid={Boolean(view.concurrency.error)}
          accessibilityLabel={view.concurrency.label}
          onChangeText={(v) => onChange(evaluationDefaultsWithConcurrency(value, v))}
        />
      </Field>

      <FocusField focus={view.focusCapabilities} onToggle={toggle('focusCapabilities')} />
      {view.focusFixtures.options.length > 0 ? (
        <FocusField focus={view.focusFixtures} onToggle={toggle('focusFixtures')} />
      ) : null}

      <Field label={model.label} hint={model.fallback}>
        <View style={{ gap: 8 }}>
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
            <>
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
                <SelectTrigger>
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
              <Input
                value={model.modelId.value}
                placeholder={model.modelId.placeholder}
                accessibilityLabel={model.modelId.label}
                disabled={!model.cli.value}
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={(v) =>
                  onChange(
                    evaluationDefaultsWithModel(value, {
                      kind: 'cli',
                      cli: model.cli.value,
                      modelId: v,
                    }),
                  )
                }
              />
            </>
          ) : model.kind === 'api' ? (
            <Input
              value={model.llmConfigId.value}
              placeholder={model.llmConfigId.placeholder}
              accessibilityLabel={model.llmConfigId.label}
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={(v) =>
                onChange(evaluationDefaultsWithModel(value, { kind: 'api', llmConfigId: v }))
              }
            />
          ) : null}
        </View>
      </Field>
    </View>
  )
}
