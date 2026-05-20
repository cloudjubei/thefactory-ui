import { forwardRef, useImperativeHandle, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import {
  useFeatureForm,
  type FeatureFormInitialValues,
  type FeatureFormValues,
  type ReferenceSuggestion,
  type StoryLike,
} from '../../../headless'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import FileMentionsTextarea from '../files/FileMentionsTextarea'
import DependencySelector from './DependencySelector'
import StatusControl from '../StatusControl'
import { nativeLightTheme, nativeRadii, nativeSpace } from '../../../tokens/native'

export type { FeatureFormValues, FeatureFormInitialValues }

export interface FeatureFormHandle {
  submit: () => void
}

export interface FeatureFormProps {
  /** Parent story — provides the form's display context (chip in header) and
   *  scopes `normalizeDependency` to the right project. */
  storyTitle?: string
  /** Stories used to populate the `DependencySelector` modal — usually the
   *  current project's full list. */
  stories: ReadonlyArray<StoryLike>
  /** Display-index resolvers — mirror the props on `useDependencySelector`. */
  getStoryDisplayIndex?: (storyId: string) => string | number | undefined
  getFeatureDisplayIndex?: (storyId: string, featureId: string) => string | number | undefined
  currentStoryId?: string
  currentFeatureId?: string
  /** Optional: when the user types `#3.2` in the description, the host can
   *  expand it to a canonical id before it lands in `values.blockers`. */
  normalizeDependency?: (raw: string) => string
  /** `@<path>` autocomplete: the host returns ranked path suggestions. */
  onSearchFiles?: (token: string) => ReadonlyArray<string>
  /** `#<dep>` autocomplete: the host returns reference suggestions. */
  onSearchReferences?: (token: string) => ReadonlyArray<ReferenceSuggestion>
  /** Render a single blocker chip. Hosts use the project-aware
   *  `DependencyBullet` here so taps navigate to the referenced item. */
  renderBlocker?: (dep: string, idx: number, onRemove: () => void) => ReactNode

  isCreate?: boolean
  initialValues?: FeatureFormInitialValues
  onSubmit: (values: FeatureFormValues) => void | Promise<void>
  submitting?: boolean
  onDirtyChange?: (dirty: boolean) => void
}

/**
 * Native peer of
 * [web's `FeatureForm`](../../../../../thefactory-overseer-web/src/ui/components/stories/FeatureForm.tsx).
 * Same `useFeatureForm` hook (shared state machine), same field flow —
 * status pill + parent-story chip header, title, description (rich textarea
 * with `@file` / `#dep` autocomplete), rejection (same), blockers chip row
 * (taps a "+ Add" button to open `DependencySelector`), context-files chip
 * row (auto-pruned: `@<path>` mentions in any text field drive the set).
 *
 * The rich-text inputs route through
 * [`FileMentionsTextarea`](../files/FileMentionsTextarea.tsx) which shares
 * its state machine with web via `useFileMentions`.
 */
const FeatureForm = forwardRef<FeatureFormHandle, FeatureFormProps>(function FeatureForm(
  {
    storyTitle,
    stories,
    getStoryDisplayIndex,
    getFeatureDisplayIndex,
    currentStoryId,
    currentFeatureId,
    normalizeDependency,
    onSearchFiles,
    onSearchReferences,
    renderBlocker,
    isCreate = false,
    initialValues,
    onSubmit,
    submitting = false,
    onDirtyChange,
  },
  ref,
) {
  const form = useFeatureForm({
    initialValues,
    onSubmit,
    onDirty: onDirtyChange,
    normalizeDependency,
  })

  useImperativeHandle(ref, () => ({ submit: () => void form.handleSubmit() }), [form])

  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <ScrollView contentContainerStyle={{ gap: nativeSpace[3], paddingBottom: nativeSpace[4] }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: nativeSpace[2],
        }}
      >
        <StatusControl status={form.values.status} onChange={form.setStatus} />
        {storyTitle ? (
          <View
            style={{
              alignSelf: 'flex-start',
              borderRadius: nativeRadii[2],
              backgroundColor: 'rgba(0, 115, 234, 0.1)',
              paddingHorizontal: nativeSpace[2],
              paddingVertical: 2,
              flexShrink: 1,
            }}
          >
            <Text
              style={{ fontSize: 12, color: nativeLightTheme.accent.primary }}
              numberOfLines={1}
            >
              {storyTitle}
            </Text>
          </View>
        ) : null}
      </View>

      <Field label="Title">
        <Input
          value={form.values.title}
          placeholder={isCreate ? 'Give your feature a clear title' : 'Title'}
          onChangeText={form.setTitle}
          disabled={submitting}
          returnKeyType="next"
        />
      </Field>

      <Field label="Description">
        <FileMentionsTextarea
          value={form.values.description}
          onChangeText={form.setDescription}
          onSearchFiles={onSearchFiles}
          onSearchReferences={onSearchReferences}
          onAcceptFileMention={form.addContextFile}
          onAcceptReference={form.addBlocker}
          placeholder="Optional description (type @file or #3.2 to autocomplete)"
          rows={3}
          disabled={submitting}
        />
      </Field>

      {(form.values.status === '=' || form.values.rejection.length > 0) && (
        <Field label="Rejection reason">
          <FileMentionsTextarea
            value={form.values.rejection}
            onChangeText={form.setRejection}
            onSearchFiles={onSearchFiles}
            onSearchReferences={onSearchReferences}
            onAcceptFileMention={form.addContextFile}
            onAcceptReference={form.addBlocker}
            placeholder="Why was this rejected?"
            rows={2}
            disabled={submitting}
          />
        </Field>
      )}

      <Field label={`Blockers (${form.values.blockers.length})`}>
        <View style={{ gap: nativeSpace[2] }}>
          {form.values.blockers.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {form.values.blockers.map((dep, i) =>
                renderBlocker ? (
                  <View key={`${dep}-${i}`}>
                    {renderBlocker(dep, i, () => form.removeBlockerAt(i))}
                  </View>
                ) : (
                  <Pressable
                    key={`${dep}-${i}`}
                    onPress={() => form.removeBlockerAt(i)}
                    accessibilityLabel={`Remove blocker ${dep}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: nativeSpace[2],
                      paddingVertical: 2,
                      borderRadius: nativeRadii[2],
                      backgroundColor: nativeLightTheme.surface.muted,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: nativeLightTheme.accent.primary }}>
                      #{dep}
                    </Text>
                    <Text style={{ fontSize: 14, opacity: 0.5 }}>×</Text>
                  </Pressable>
                ),
              )}
            </View>
          )}
          <Button
            variant="secondary"
            size="sm"
            onPress={() => setPickerOpen(true)}
            disabled={submitting}
          >
            + Add blocker
          </Button>
        </View>
      </Field>

      <Field label={`Context files (${form.values.context.length})`}>
        <View style={{ gap: nativeSpace[2] }}>
          {form.values.context.length === 0 ? (
            <Text style={{ fontSize: 12, color: nativeLightTheme.text.muted }}>
              Mention a file in the description with `@path` to add it here.
            </Text>
          ) : (
            <View style={{ gap: 4 }}>
              {form.values.context.map((path, i) => (
                <Pressable
                  key={`${path}-${i}`}
                  onPress={() => form.removeContextAt(i)}
                  accessibilityLabel={`Remove context ${path}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: nativeSpace[2],
                    paddingVertical: 4,
                    borderRadius: nativeRadii[2],
                    backgroundColor: nativeLightTheme.surface.muted,
                  }}
                >
                  <Text style={{ fontSize: 12, flex: 1 }} numberOfLines={1} ellipsizeMode="middle">
                    {path}
                  </Text>
                  <Text style={{ fontSize: 14, opacity: 0.5 }}>×</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </Field>

      {form.error && <Text style={{ fontSize: 12, color: '#dc2626' }}>{form.error}</Text>}

      <DependencySelector
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        stories={stories}
        currentStoryId={currentStoryId}
        currentFeatureId={currentFeatureId}
        existingDeps={form.values.blockers}
        getStoryDisplayIndex={getStoryDisplayIndex}
        getFeatureDisplayIndex={getFeatureDisplayIndex}
        onConfirm={(deps) => {
          for (const dep of deps) form.addBlocker(dep)
        }}
      />
    </ScrollView>
  )
})

export default FeatureForm
