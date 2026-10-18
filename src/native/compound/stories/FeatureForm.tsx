import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native'

import {
  FEATURE_KIND_HINTS,
  FEATURE_KIND_OPTIONS,
  useFeatureForm,
  type FeatureFormInitialValues,
  type FeatureKind,
  type FeatureFormValues,
  type ProofPlan,
  type ReferenceSuggestion,
  type StoryLike,
} from '../../../headless'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { Modal } from '../../primitives/Modal'
import SegmentedControl from '../../primitives/SegmentedControl'
import FileMentionsTextarea from '../files/FileMentionsTextarea'
import type { ReferenceSigil } from '../../../headless/utils/reference'
import FileSelector from '../files/FileSelector'
import type { UikitFileMeta } from '../files/FileDisplay'
import ContextFileChip from './ContextFileChip'
import DependencySelector from './DependencySelector'
import ProofPlanEditor from './ProofPlanEditor'
import StatusControl from '../StatusControl'
import { IconClose, IconPlus } from '../../icons'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

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
  /** `&` suggestions — the project's notes. */
  onSearchHandles?: (token: string) => ReadonlyArray<ReferenceSuggestion>
  /** Turns what was typed (`#3.2`, `&qa-login`) into ids on save. */
  canonicalize?: (text: string, before?: string) => string
  /** Stored text as a person edits it — `#3.2` instead of ids. */
  toTyped?: (text: string) => string
  /** Render a single blocker chip. */
  renderBlocker?: (dep: string, idx: number, onRemove: () => void) => ReactNode
  /** Project files — feed the context-files picker + chip metadata. */
  files?: ReadonlyArray<UikitFileMeta>
  /** The parent story's proof plan — what a feature with none of its own inherits. */
  inheritedProofPlan?: ProofPlan

  /**
   * Kept for symmetry with web's `FeatureForm`. The native form currently
   * has no create-vs-edit visual difference (placeholder & title come from
   * the host modal), so the flag is accepted but unused.
   */
  isCreate?: boolean
  initialValues?: FeatureFormInitialValues
  onSubmit: (values: FeatureFormValues) => void | Promise<void>
  submitting?: boolean
  onDirtyChange?: (dirty: boolean) => void
}

/**
 * Native peer of web's `chip chip--ok` "+ Add" affordance. Round (pill) shape
 * with a soft border and primary text colour — the same recipe as
 * `thefactory-ui/src/web/styles/components/badges.css :: .chip`.
 */
function AddChip({
  label,
  onPress,
  disabled,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
}) {
  const { theme } = useNativeTheme()
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
        height: 24,
        paddingHorizontal: nativeSpace[4],
        borderRadius: nativeRadii.round,
        borderWidth: 1,
        borderColor: theme.accent.primary,
        backgroundColor: theme.surface.base,
        opacity: disabled ? 0.5 : pressed ? 0.6 : 1,
      })}
    >
      <IconPlus size={12} color={theme.accent.primary} />
      {/* Border + leading icon stay accent.primary (blue), but the label uses
       *  text.primary so the chip reads as a neutral pill with a blue affordance. */}
      <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.primary }}>{label}</Text>
    </Pressable>
  )
}

/**
 * Native peer of
 * [web's `FeatureForm`](../../../../../thefactory-overseer-web/src/ui/components/stories/FeatureForm.tsx).
 * Same `useFeatureForm` hook, same field flow: a header with the status pill,
 * the project chip, and the parent-story chip; then title, kind, description,
 * acceptance criteria, the proof plan, rejection reason (always shown,
 * matching web), a bordered context-files box and a bordered blockers box —
 * each with an inline "+ Add".
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
    onSearchHandles,
    canonicalize,
    toTyped,
    renderBlocker,
    files,
    inheritedProofPlan,
    // Accepted for API symmetry with the web form; not currently consumed.
    isCreate: _isCreate = false,
    initialValues,
    onSubmit,
    submitting = false,
    onDirtyChange,
  },
  ref,
) {
  const { theme } = useNativeTheme()
  const form = useFeatureForm({
    initialValues,
    onSubmit,
    onDirty: onDirtyChange,
    normalizeDependency,
    ...(canonicalize ? { canonicalize } : {}),
    ...(toTyped ? { toTyped } : {}),
  })
  // A `#` pick is a story or feature this one may depend on; an `&` pick is a note.
  const { addBlocker } = form
  const onAcceptReference = useCallback(
    (value: string, sigil: ReferenceSigil) => {
      if (sigil === '#') addBlocker(value)
    },
    [addBlocker],
  )

  useImperativeHandle(ref, () => ({ submit: () => void form.handleSubmit() }), [form])

  const [pickerOpen, setPickerOpen] = useState(false)
  const [fileSelectorOpen, setFileSelectorOpen] = useState(false)

  // Cap the multiline textareas so they grow up to ~30% of the available
  // window height, then scroll internally — otherwise the form stretches
  // forever and the submit button is pushed off-screen.
  const { height: windowHeight } = useWindowDimensions()
  const textareaMaxHeight = Math.round(windowHeight * 0.3)

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

  // Wrapper for the bordered Context Files / Blockers boxes. Border + bg
  // live on the outer View so the inner ScrollView can take over scrolling
  // once the chip cluster exceeds `textareaMaxHeight`. Same growth model as
  // the multiline textareas above.
  const boxOuterStyle = {
    minHeight: 44,
    maxHeight: textareaMaxHeight,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: nativeRadii[2],
    backgroundColor: theme.surface.raised,
  }
  const boxContentStyle = {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    alignItems: 'center' as const,
    gap: 6,
    padding: nativeSpace[2],
  }

  return (
    <ScrollView contentContainerStyle={{ gap: nativeSpace[8], paddingBottom: nativeSpace[4] }}>
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
          placeholder="What is this feature?"
          onChangeText={form.setTitle}
          disabled={submitting}
          returnKeyType="next"
        />
      </Field>

      <Field label="Kind" hint={FEATURE_KIND_HINTS[form.values.kind]}>
        <SegmentedControl
          options={[...FEATURE_KIND_OPTIONS]}
          value={form.values.kind}
          onChange={(v) => form.setKind(v as FeatureKind)}
          size="sm"
          ariaLabel="Feature kind"
          testID="feature-kind"
          style={{ alignSelf: 'flex-start' }}
        />
      </Field>

      <Field label="Description">
        <FileMentionsTextarea
          value={form.values.description}
          onChangeText={form.setDescription}
          onSearchFiles={onSearchFiles}
          onSearchReferences={onSearchReferences}
          onSearchHandles={onSearchHandles}
          onAcceptFileMention={form.addContextFile}
          onAcceptReference={onAcceptReference}
          placeholder="Optional details. Tip: @ to reference files, # to reference stories/features"
          rows={4}
          disabled={submitting}
          textInputProps={{ style: { maxHeight: textareaMaxHeight } }}
        />
      </Field>

      <Field label="Acceptance Criteria">
        <FileMentionsTextarea
          value={form.values.acceptance}
          onChangeText={form.setAcceptance}
          onSearchFiles={onSearchFiles}
          onSearchReferences={onSearchReferences}
          onSearchHandles={onSearchHandles}
          onAcceptFileMention={form.addContextFile}
          onAcceptReference={onAcceptReference}
          placeholder="What done means — what a reviewer checks the change against"
          rows={3}
          disabled={submitting}
          textInputProps={{ style: { maxHeight: textareaMaxHeight } }}
        />
      </Field>

      <ProofPlanEditor
        draft={form.proofPlanDraft}
        onToggleKind={form.toggleProofKind}
        onNotesChange={form.setProofNotes}
        {...(inheritedProofPlan ? { inherited: inheritedProofPlan } : {})}
        disabled={submitting}
      />

      <Field label="Rejection Reason">
        <FileMentionsTextarea
          value={form.values.rejection}
          onChangeText={form.setRejection}
          onSearchFiles={onSearchFiles}
          onSearchReferences={onSearchReferences}
          onSearchHandles={onSearchHandles}
          onAcceptFileMention={form.addContextFile}
          onAcceptReference={onAcceptReference}
          placeholder="Optional reason for rejection (leave blank to remove). Tip: @ files, # stories/features"
          rows={3}
          disabled={submitting}
          textInputProps={{ style: { maxHeight: textareaMaxHeight } }}
        />
      </Field>

      <Field
        label="Context Files"
        labelTrailing={
          <AddChip label="Add" onPress={() => setFileSelectorOpen(true)} disabled={submitting} />
        }
      >
        <View style={boxOuterStyle}>
          <ScrollView contentContainerStyle={boxContentStyle}>
            {form.values.context.map((path, i) => (
              <ContextFileChip
                key={`${path}-${i}`}
                file={metaFor(path)}
                warn={!form.mentionedPaths.has(path)}
                onRemove={() => form.removeContextAt(i)}
              />
            ))}
          </ScrollView>
        </View>
        <Text style={{ marginTop: 4, fontSize: 12, color: theme.text.muted }}>
          Select any files across the project that provide useful context for this feature. Tip:
          type @ in description to quickly reference files.
        </Text>
      </Field>

      <Field
        label="Blockers"
        labelTrailing={
          <AddChip label="Add" onPress={() => setPickerOpen(true)} disabled={submitting} />
        }
      >
        <View style={boxOuterStyle}>
          <ScrollView contentContainerStyle={boxContentStyle}>
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
                    backgroundColor: theme.surface.muted,
                  }}
                >
                  <Text style={{ fontSize: 12, color: theme.accent.primary }}>#{dep}</Text>
                  <IconClose size={12} color={theme.text.muted} />
                </Pressable>
              ),
            )}
          </ScrollView>
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
