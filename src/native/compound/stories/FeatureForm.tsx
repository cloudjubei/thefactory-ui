import { forwardRef, useImperativeHandle, useMemo, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import {
  useFeatureForm,
  type FeatureFormInitialValues,
  type FeatureFormValues,
  type ReferenceSuggestion,
  type StoryLike,
} from '../../../headless'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { Modal } from '../../primitives/Modal'
import FileMentionsTextarea from '../files/FileMentionsTextarea'
import FileSelector from '../files/FileSelector'
import type { UikitFileMeta } from '../files/FileDisplay'
import ContextFileChip from './ContextFileChip'
import DependencySelector from './DependencySelector'
import StatusControl from '../StatusControl'
import { IconPlus } from '../../icons'
import { nativeLightTheme, nativeRadii, nativeSpace } from '../../../tokens/native'

export type { FeatureFormValues, FeatureFormInitialValues }

export interface FeatureFormHandle {
  submit: () => void
}

export interface FeatureFormProps {
  /** Slot for the host's project chip — shown in the form header. */
  projectChip?: ReactNode
  /** Slot for the host's parent-story chip (e.g. a `DependencyBullet`),
   *  shown at the header's trailing edge. */
  storyChip?: ReactNode
  /** Stories used to populate the `DependencySelector` modal. */
  stories: ReadonlyArray<StoryLike>
  /** Display-index resolvers — mirror the props on `useDependencySelector`. */
  getStoryDisplayIndex?: (storyId: string) => string | number | undefined
  getFeatureDisplayIndex?: (storyId: string, featureId: string) => string | number | undefined
  currentStoryId?: string
  currentFeatureId?: string
  normalizeDependency?: (raw: string) => string
  onSearchFiles?: (token: string) => ReadonlyArray<string>
  onSearchReferences?: (token: string) => ReadonlyArray<ReferenceSuggestion>
  /** Render a single blocker chip. */
  renderBlocker?: (dep: string, idx: number, onRemove: () => void) => ReactNode
  /** Project files — feed the context-files picker + chip metadata. */
  files?: ReadonlyArray<UikitFileMeta>

  isCreate?: boolean
  initialValues?: FeatureFormInitialValues
  onSubmit: (values: FeatureFormValues) => void | Promise<void>
  submitting?: boolean
  onDirtyChange?: (dirty: boolean) => void
}

/** A small bordered chip that opens a picker — the native peer of web's
 *  `chip chip--ok` "+ Add" affordance. */
function AddChip({
  label,
  onPress,
  disabled,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: nativeSpace[2],
        paddingVertical: 4,
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: nativeLightTheme.accent.primary,
        opacity: disabled ? 0.5 : pressed ? 0.6 : 1,
      })}
    >
      <IconPlus size={12} color={nativeLightTheme.accent.primary} />
      <Text style={{ fontSize: 12, fontWeight: '500', color: nativeLightTheme.accent.primary }}>
        {label}
      </Text>
    </Pressable>
  )
}

/**
 * Native peer of
 * [web's `FeatureForm`](../../../../../thefactory-overseer-web/src/ui/components/stories/FeatureForm.tsx).
 * Same `useFeatureForm` hook, same field flow: a header with the status pill,
 * the project chip, and the parent-story chip; then title, description,
 * rejection reason (always shown, matching web), a bordered context-files
 * box and a bordered blockers box — each with an inline "+ Add".
 */
const FeatureForm = forwardRef<FeatureFormHandle, FeatureFormProps>(function FeatureForm(
  {
    projectChip,
    storyChip,
    stories,
    getStoryDisplayIndex,
    getFeatureDisplayIndex,
    currentStoryId,
    currentFeatureId,
    normalizeDependency,
    onSearchFiles,
    onSearchReferences,
    renderBlocker,
    files,
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
  const [fileSelectorOpen, setFileSelectorOpen] = useState(false)

  const fileByPath = useMemo(() => {
    const m = new Map<string, UikitFileMeta>()
    for (const f of files ?? []) {
      if (f.relativePath) m.set(f.relativePath, f)
    }
    return m
  }, [files])

  const metaFor = (path: string): UikitFileMeta =>
    fileByPath.get(path) ?? {
      name: path.split('/').pop() ?? path,
      relativePath: path,
      absolutePath: path,
      type: null,
      size: 0,
      mtime: 0,
    }

  const boxStyle = {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    alignItems: 'center' as const,
    gap: 6,
    minHeight: 44,
    borderWidth: 1,
    borderColor: nativeLightTheme.border.default,
    borderRadius: nativeRadii[2],
    padding: nativeSpace[2],
    backgroundColor: nativeLightTheme.surface.raised,
  }

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
        {projectChip}
        {storyChip}
      </View>

      <Field label="Title">
        <Input
          value={form.values.title}
          placeholder={isCreate ? 'What is this feature?' : 'Title'}
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

      <Field label="Rejection reason">
        <FileMentionsTextarea
          value={form.values.rejection}
          onChangeText={form.setRejection}
          onSearchFiles={onSearchFiles}
          onSearchReferences={onSearchReferences}
          onAcceptFileMention={form.addContextFile}
          onAcceptReference={form.addBlocker}
          placeholder="Optional reason for rejection (leave blank to remove)"
          rows={2}
          disabled={submitting}
        />
      </Field>

      <Field label="Context files">
        <View style={boxStyle}>
          {form.values.context.map((path, i) => (
            <ContextFileChip
              key={`${path}-${i}`}
              file={metaFor(path)}
              warn={!form.mentionedPaths.has(path)}
              onRemove={() => form.removeContextAt(i)}
            />
          ))}
          <AddChip label="Add" onPress={() => setFileSelectorOpen(true)} disabled={submitting} />
        </View>
        <Text style={{ marginTop: 4, fontSize: 12, color: nativeLightTheme.text.muted }}>
          Files that give the agent useful context. Tip: type @ in the description to reference one.
        </Text>
      </Field>

      <Field label="Blockers">
        <View style={boxStyle}>
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
                <Text style={{ fontSize: 12, color: nativeLightTheme.accent.primary }}>#{dep}</Text>
                <Text style={{ fontSize: 14, opacity: 0.5 }}>×</Text>
              </Pressable>
            ),
          )}
          <AddChip label="Add" onPress={() => setPickerOpen(true)} disabled={submitting} />
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

      <Modal
        isOpen={fileSelectorOpen}
        onClose={() => setFileSelectorOpen(false)}
        title="Select context files"
        size="lg"
      >
        <FileSelector
          files={[...(files ?? [])]}
          initialSelected={form.values.context}
          onCancel={() => setFileSelectorOpen(false)}
          onConfirm={(picked) => {
            for (const p of picked) form.addContextFile(p)
            setFileSelectorOpen(false)
          }}
          allowMultiple
        />
      </Modal>
    </ScrollView>
  )
})

export default FeatureForm
