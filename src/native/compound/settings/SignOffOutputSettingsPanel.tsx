import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import {
  SIGN_OFF_OUTPUT_COPY,
  SIGN_OFF_OUTPUT_EMPTY_DRAFT,
  SIGN_OFF_OUTPUT_PROBLEMS,
  signOffOutputDraftOf,
  signOffOutputDraftProblem,
  signOffOutputOfDraft,
  type SignOffOutputFormDraft,
  type SignOffOutputSettingView,
  type SignOffTemplateChoice,
} from '../../../headless'
import type { SignOffOutputDefinition } from '../../../headless/api'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevronRight } from '../../icons'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { ConfirmDialog, Modal } from '../../primitives/Modal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/Select'
import { Switch } from '../../primitives/Switch'

export interface SignOffOutputSettingsPanelProps {
  /** What to show of each output; nothing is listed until they are read. */
  views: SignOffOutputSettingView[] | undefined
  /** The outputs kept here, which a new one must not repeat. */
  own: readonly SignOffOutputDefinition[]
  /** The notes a template can be. */
  choices: readonly SignOffTemplateChoice[]
  /** What to say when there is no note to choose. */
  noNotes: string
  /** Who gets them. */
  intro: string
  canAdd: boolean
  /** Why the last change failed. */
  error: string | null
  busy: boolean
  /** Save an output, in the place of the one with key `editing`; resolves `true` when kept. */
  onSave: (output: SignOffOutputDefinition, editing: string | undefined) => Promise<boolean>
  /** Remove the output with this key; resolves `true` when it is gone. */
  onRemove: (key: string) => Promise<boolean>
}

function Pill({ text, tone }: { text: string; tone: 'neutral' | 'onhold' }) {
  const { theme, status } = useNativeTheme()
  const colors = tone === 'onhold' ? status.on_hold : undefined
  return (
    <Text
      style={{
        fontSize: 10,
        overflow: 'hidden',
        color: colors?.softFg ?? theme.text.secondary,
        backgroundColor: colors?.softBg,
        borderWidth: 1,
        borderColor: colors?.softBorder ?? theme.border.subtle,
        borderRadius: nativeRadii.round,
        paddingHorizontal: 6,
      }}
    >
      {text}
    </Text>
  )
}

function OutputFields({
  draft,
  problem,
  choices,
  noNotes,
  onChange,
}: {
  draft: SignOffOutputFormDraft
  problem: string | undefined
  choices: readonly SignOffTemplateChoice[]
  noNotes: string
  onChange: (next: SignOffOutputFormDraft) => void
}) {
  const { theme } = useNativeTheme()
  const missing =
    draft.templateNoteId !== '' && !choices.some((choice) => choice.id === draft.templateNoteId)
  return (
    <View style={{ gap: nativeSpace[3] }}>
      <Field
        label={SIGN_OFF_OUTPUT_COPY.labelField}
        hint={SIGN_OFF_OUTPUT_COPY.labelHint}
        error={problem === SIGN_OFF_OUTPUT_PROBLEMS.repeated ? problem : undefined}
      >
        <Input
          value={draft.label}
          onChangeText={(label) => onChange({ ...draft, label })}
          placeholder={SIGN_OFF_OUTPUT_COPY.labelPlaceholder}
        />
      </Field>
      <Field
        label={SIGN_OFF_OUTPUT_COPY.templateField}
        hint={choices.length > 0 ? SIGN_OFF_OUTPUT_COPY.templateHint : noNotes}
      >
        <Select
          value={draft.templateNoteId}
          onValueChange={(templateNoteId) => {
            if (templateNoteId) onChange({ ...draft, templateNoteId })
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={SIGN_OFF_OUTPUT_COPY.templatePlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {choices.map((choice) => (
              <SelectItem key={choice.id} value={choice.id}>
                {choice.label}
              </SelectItem>
            ))}
            {missing ? (
              <SelectItem value={draft.templateNoteId}>
                {SIGN_OFF_OUTPUT_COPY.deletedNote}
              </SelectItem>
            ) : null}
          </SelectContent>
        </Select>
      </Field>
      <View style={{ gap: nativeSpace[1] }}>
        <Switch
          checked={draft.perRepo}
          onCheckedChange={(perRepo) => onChange({ ...draft, perRepo })}
          label={SIGN_OFF_OUTPUT_COPY.perRepoField}
        />
        <Text style={{ fontSize: 12, color: theme.text.muted }}>
          {SIGN_OFF_OUTPUT_COPY.perRepoHint}
        </Text>
      </View>
    </View>
  )
}

/** One output's form, or what a project gets from its group, read-only. */
function OutputBody({
  view,
  own,
  choices,
  noNotes,
  busy,
  error,
  onSaved,
  onSave,
  onRemove,
}: {
  view: SignOffOutputSettingView
  own: readonly SignOffOutputDefinition[]
  choices: readonly SignOffTemplateChoice[]
  noNotes: string
  busy: boolean
  error: string | null
  onSaved: () => void
  onSave: SignOffOutputSettingsPanelProps['onSave']
  onRemove: (key: string) => void
}) {
  const { theme } = useNativeTheme()
  const [draft, setDraft] = useState(signOffOutputDraftOf(view.definition))
  if (!view.editable) {
    return (
      <View style={{ gap: nativeSpace[2] }}>
        <Text style={{ fontSize: 14, color: theme.text.primary }}>
          {SIGN_OFF_OUTPUT_COPY.templateField}: {view.templateLabel}
        </Text>
        <Text style={{ fontSize: 14, color: theme.text.primary }}>{view.shapeLabel}</Text>
        {view.templateProblem ? <Alert>{view.templateProblem}</Alert> : null}
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>
          {SIGN_OFF_OUTPUT_COPY.changeOnGroup(view.groupTitle ?? '')}
        </Text>
      </View>
    )
  }
  const problem = signOffOutputDraftProblem(draft, { outputs: own, choices, editing: view.key })
  const save = async () => {
    if (problem) return
    if (await onSave(signOffOutputOfDraft(draft), view.key)) onSaved()
  }
  return (
    <View style={{ gap: nativeSpace[3] }}>
      {error ? <Alert>{error}</Alert> : null}
      {view.templateProblem ? <Alert>{view.templateProblem}</Alert> : null}
      <OutputFields
        draft={draft}
        problem={problem}
        choices={choices}
        noNotes={noNotes}
        onChange={setDraft}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: nativeSpace[2] }}>
        <Button variant="ghost" onPress={() => onRemove(view.key)}>
          {SIGN_OFF_OUTPUT_COPY.remove}
        </Button>
        <Button onPress={() => void save()} loading={busy} disabled={problem !== undefined || busy}>
          {SIGN_OFF_OUTPUT_COPY.save}
        </Button>
      </View>
    </View>
  )
}

/** Native peer of the web `SignOffOutputSettingsPanel`, in the layout that ships: rows that open. */
export default function SignOffOutputSettingsPanel({
  views,
  own,
  choices,
  noNotes,
  intro,
  canAdd,
  error,
  busy,
  onSave,
  onRemove,
}: SignOffOutputSettingsPanelProps) {
  const { theme } = useNativeTheme()
  const [draft, setDraft] = useState<SignOffOutputFormDraft | undefined>(undefined)
  const [openKey, setOpenKey] = useState<string | undefined>(undefined)
  const [removingKey, setRemovingKey] = useState<string | undefined>(undefined)
  const opened = views?.find((view) => view.key === openKey)
  const removing = views?.find((view) => view.key === removingKey)
  const problem = draft ? signOffOutputDraftProblem(draft, { outputs: own, choices }) : undefined
  const muted = { fontSize: 13, color: theme.text.secondary }

  const saveDraft = async () => {
    if (!draft || problem) return
    if (await onSave(signOffOutputOfDraft(draft), undefined)) setDraft(undefined)
  }

  return (
    <View style={{ gap: nativeSpace[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: nativeSpace[3] }}>
        <View style={{ flex: 1, gap: nativeSpace[1] }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.primary }}>
            {SIGN_OFF_OUTPUT_COPY.heading}
          </Text>
          <Text style={muted}>{intro}</Text>
        </View>
        {canAdd ? (
          <Button
            variant="secondary"
            size="sm"
            onPress={() => setDraft(SIGN_OFF_OUTPUT_EMPTY_DRAFT)}
          >
            {SIGN_OFF_OUTPUT_COPY.add}
          </Button>
        ) : null}
      </View>

      {error && !draft && !opened ? <Alert>{error}</Alert> : null}

      {!views ? (
        <Text style={muted}>{SIGN_OFF_OUTPUT_COPY.loading}</Text>
      ) : views.length === 0 ? (
        canAdd ? (
          <Text style={muted}>{SIGN_OFF_OUTPUT_COPY.noneYet}</Text>
        ) : null
      ) : (
        <View
          style={{
            borderWidth: 1,
            borderColor: theme.border.subtle,
            borderRadius: nativeRadii[2],
          }}
        >
          {views.map((view, i) => (
            <Pressable
              key={view.key}
              accessibilityRole="button"
              onPress={() => setOpenKey(view.key)}
              style={{
                minHeight: 44,
                flexDirection: 'row',
                alignItems: 'center',
                gap: nativeSpace[2],
                paddingHorizontal: nativeSpace[3],
                paddingVertical: nativeSpace[2],
                ...(i > 0 ? { borderTopWidth: 1, borderTopColor: theme.border.subtle } : {}),
              }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: nativeSpace[1],
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}
                  >
                    {view.label}
                  </Text>
                  {view.sourceLabel || view.replaces ? (
                    <Pill text={view.sourceLabel ?? view.replaces ?? ''} tone="neutral" />
                  ) : null}
                </View>
                <Text numberOfLines={1} style={{ fontSize: 12, color: theme.text.secondary }}>
                  {view.templateLabel} · {view.shapeLabel}
                </Text>
              </View>
              {view.templateProblem ? (
                <Pill text={SIGN_OFF_OUTPUT_COPY.noTemplate} tone="onhold" />
              ) : null}
              <IconChevronRight size={16} color={theme.text.muted} />
            </Pressable>
          ))}
        </View>
      )}

      {opened ? (
        <Modal isOpen onClose={() => setOpenKey(undefined)} title={opened.label} size="lg">
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ gap: nativeSpace[3] }}
            keyboardShouldPersistTaps="handled"
          >
            <OutputBody
              key={opened.key}
              view={opened}
              own={own}
              choices={choices}
              noNotes={noNotes}
              busy={busy}
              error={error}
              onSaved={() => setOpenKey(undefined)}
              onSave={onSave}
              onRemove={setRemovingKey}
            />
          </ScrollView>
        </Modal>
      ) : null}

      {draft ? (
        <Modal
          isOpen
          onClose={() => setDraft(undefined)}
          title={SIGN_OFF_OUTPUT_COPY.add}
          footer={
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
              <Button variant="ghost" onPress={() => setDraft(undefined)}>
                {SIGN_OFF_OUTPUT_COPY.cancel}
              </Button>
              <Button
                onPress={() => void saveDraft()}
                loading={busy}
                disabled={problem !== undefined || busy}
              >
                {SIGN_OFF_OUTPUT_COPY.add}
              </Button>
            </View>
          }
        >
          <View style={{ gap: nativeSpace[3] }}>
            {error ? <Alert>{error}</Alert> : null}
            <OutputFields
              draft={draft}
              problem={problem}
              choices={choices}
              noNotes={noNotes}
              onChange={setDraft}
            />
          </View>
        </Modal>
      ) : null}

      {removing ? (
        <ConfirmDialog
          isOpen
          onClose={() => setRemovingKey(undefined)}
          title={`${SIGN_OFF_OUTPUT_COPY.remove} ${removing.label}`}
          description={SIGN_OFF_OUTPUT_COPY.removeConfirm(removing.label)}
          confirmLabel={SIGN_OFF_OUTPUT_COPY.remove}
          destructive
          onConfirm={async () => {
            if (await onRemove(removing.key)) setOpenKey(undefined)
            setRemovingKey(undefined)
          }}
        />
      ) : null}
    </View>
  )
}
