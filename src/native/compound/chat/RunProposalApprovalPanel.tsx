import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import {
  RUN_PROPOSAL_COLLAPSE_LABEL,
  RUN_PROPOSAL_DECLINE_LABEL,
  RUN_PROPOSAL_EXPAND_LABEL,
  RUN_PROPOSAL_LATER_LABEL,
  RUN_PROPOSAL_OPEN_FULL_LABEL,
  runProposalArgs,
  processRunClosureRowsProblem,
  runProposalEditArgs,
  runProposalEditStart,
  runProposalHostDetail,
  runProposalLandingEdits,
  runProposalLandingForm,
  runProposalLandingProblem,
  runProposalStepName,
  runProposalToolName,
  runProposalView,
  useStories,
} from '../../../headless'
import type {
  PendingToolGrant,
  ProcessIntegrationForm,
  RunProposalEditState,
  RunProposalSection,
} from '../../../headless'
import { grantDecideErrorMessage } from '../../../headless/utils/pendingToolGrants'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevronDown, IconMaximize } from '../../icons'
import BottomSheet from '../../primitives/BottomSheet'
import { Button } from '../../primitives/Button'
import IconButton from '../../primitives/IconButton'
import Markdown from '../Markdown'
import DependencyRef from '../stories/DependencyRef'
import RunProposalLandingEditor from './RunProposalLandingEditor'
import RunProposalEditPanel from './RunProposalEditPanel'
import ToolAskCard from './ToolAskCard'
import { runProposalAskView, toolAskDecidedLine } from '../../../headless/utils/toolAskCard'
import type { ToolAskDecidedLine } from '../../../headless/utils/toolAskCardTypes'

export type RunProposalApprovalPanelProps = {
  grant: PendingToolGrant
  onDecideLater: () => void
  /** The proposal was decided — what its one line says. */
  onDecided?: (line: ToolAskDecidedLine) => void
}

/** One section's whole content: its words, its numbered criteria, its proof chips. */
function SectionBody({ section }: { section: RunProposalSection }) {
  const { theme } = useNativeTheme()
  const textStyle = { fontSize: 12.5, lineHeight: 18, color: theme.text.secondary }
  return (
    <View style={{ gap: 6 }}>
      {section.chips ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {section.chips.map((chip) => (
            <View
              key={chip}
              style={{
                paddingHorizontal: 6,
                paddingVertical: 1,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: theme.border.subtle,
                backgroundColor: theme.surface.base,
              }}
            >
              <Text style={{ fontSize: 11, color: theme.text.secondary }}>{chip}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {section.items?.map((item, i) => (
        <View key={item} style={{ flexDirection: 'row', gap: 6 }}>
          <Text style={textStyle}>{`${i + 1}.`}</Text>
          <View style={{ flex: 1 }}>
            <Markdown text={item} inline textStyle={textStyle} />
          </View>
        </View>
      ))}
      {section.markdown ? <Markdown text={section.markdown} textStyle={textStyle} /> : null}
      {!section.chips && !section.items && !section.markdown ? (
        <Text style={textStyle}>{section.summary}</Text>
      ) : null}
    </View>
  )
}

/** A section closed to its label and one line, opened in place. */
function FoldedSection({ section }: { section: RunProposalSection }) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(false)
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: theme.border.subtle, paddingVertical: 6 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
      >
        <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.primary }}>
          {section.label}
        </Text>
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, color: theme.text.secondary }}>
          {open ? '' : section.summary}
        </Text>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <IconChevronDown size={14} color={theme.text.muted} />
        </View>
      </Pressable>
      {open ? (
        <View style={{ paddingTop: 6 }}>
          <SectionBody section={section} />
        </View>
      ) : null}
    </View>
  )
}

/**
 * Native peer of web's `RunProposalApprovalPanel`: the proposal on the shared
 * tool-ask card in place of the composer — kind in the header, subject as the
 * headline, effect as the consequence, the decision always in reach; the
 * details open in the card's scroll, each section closed to a line, or whole
 * in a sheet for reading.
 */
export default function RunProposalApprovalPanel({
  grant,
  onDecideLater,
  onDecided,
}: RunProposalApprovalPanelProps) {
  const { theme, status } = useNativeTheme()
  const { stories } = useStories()
  const args = runProposalArgs(grant)
  const featureId = runProposalView(runProposalToolName(grant), args)?.featureId
  const story = featureId
    ? stories.find((s) => s.features.some((f) => f.id === featureId))
    : undefined
  const feature = story?.features.find((f) => f.id === featureId)
  const view = runProposalView(
    runProposalToolName(grant),
    args,
    feature?.title ?? runProposalStepName(grant),
    runProposalHostDetail(grant),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [reading, setReading] = useState(false)
  const [landingForm, setLandingForm] = useState<ProcessIntegrationForm | undefined>(() =>
    view?.landing ? runProposalLandingForm(view.landing) : undefined,
  )
  const [editState, setEditState] = useState<RunProposalEditState | undefined>(() =>
    view?.edit ? runProposalEditStart(view.edit, runProposalHostDetail(grant)) : undefined,
  )
  if (!view) return null
  const tone = status[view.tone]
  const askView = runProposalAskView(view, args)
  const editProblem = editState?.closure
    ? processRunClosureRowsProblem(editState.closure)
    : undefined
  const landingProblem =
    landingForm && view.landing?.options
      ? runProposalLandingProblem(landingForm, view.landing.options)
      : undefined

  const decide = (decision: 'once' | 'deny') => {
    setBusy(true)
    setError(null)
    const edits =
      decision === 'once' && view.landing && landingForm
        ? runProposalLandingEdits(view.landing, landingForm)
        : undefined
    const actionArgs = decision === 'once' && editState ? runProposalEditArgs(editState) : {}
    const sent =
      Object.keys(actionArgs).length > 0
        ? { args: { ...(edits?.args ?? {}), ...actionArgs } }
        : edits
    grant
      .decide(decision, sent)
      .then(() => onDecided?.(toolAskDecidedLine(askView, decision)))
      .catch((err: unknown) => {
        setBusy(false)
        setError(grantDecideErrorMessage(err))
      })
  }

  const actions = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <Button
        size="sm"
        variant={view.danger ? 'danger' : 'primary'}
        onPress={() => decide('once')}
        loading={busy}
        disabled={busy || landingProblem !== undefined || editProblem !== undefined}
      >
        {view.approveLabel}
      </Button>
      <Button variant="secondary" size="sm" onPress={() => decide('deny')} disabled={busy}>
        {RUN_PROPOSAL_DECLINE_LABEL}
      </Button>
      <View style={{ flex: 1 }} />
      <Button variant="ghost" size="sm" onPress={onDecideLater} disabled={busy}>
        {RUN_PROPOSAL_LATER_LABEL}
      </Button>
    </View>
  )

  const bullets =
    (story && feature) || view.storyId ? (
      <>
        {story && feature ? <DependencyRef dependency={`${story.id}.${feature.id}`} /> : null}
        {view.storyId ? <DependencyRef dependency={view.storyId} /> : null}
      </>
    ) : null
  const subject = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
      <View
        style={{
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 999,
          backgroundColor: tone.softBg,
          borderWidth: 1,
          borderColor: tone.softBorder,
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: '600', color: tone.softFg }}>
          {view.kindLabel}
        </Text>
      </View>
      {bullets}
      <Text
        numberOfLines={1}
        style={{ flex: 1, fontSize: 13, fontWeight: '600', color: theme.text.primary }}
      >
        {view.title}
      </Text>
    </View>
  )

  const boxStyle = {
    paddingHorizontal: nativeSpace[3],
    borderRadius: nativeRadii[2],
    borderWidth: 1,
    borderColor: theme.border.subtle,
  }

  return (
    <View style={{ margin: nativeSpace[3] }}>
      <ToolAskCard
        view={askView}
        busy={busy}
        error={error}
        ready={landingProblem === undefined}
        {...(editProblem !== undefined ? { problem: editProblem } : {})}
        onApprove={() => decide('once')}
        onDeny={() => decide('deny')}
        onLater={onDecideLater}
        headerAction={
          <IconButton
            size="sm"
            accessibilityLabel={RUN_PROPOSAL_OPEN_FULL_LABEL}
            onPress={() => setReading(true)}
          >
            <IconMaximize size={14} color={theme.text.secondary} />
          </IconButton>
        }
      >
        {bullets ? (
          <View
            style={{
              ...boxStyle,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingVertical: nativeSpace[2],
            }}
          >
            {bullets}
            <Text
              numberOfLines={1}
              style={{ flex: 1, fontSize: 13.5, fontWeight: '600', color: theme.text.primary }}
            >
              {view.title}
            </Text>
          </View>
        ) : null}
        {view.landing ? (
          <View style={boxStyle}>
            <RunProposalLandingEditor
              landing={view.landing}
              form={landingForm}
              busy={busy}
              onChange={setLandingForm}
            />
          </View>
        ) : null}
        {view.edit && editState ? (
          <View style={boxStyle}>
            <RunProposalEditPanel
              edit={view.edit}
              state={editState}
              busy={busy}
              onChange={setEditState}
            />
          </View>
        ) : null}
        {view.sections.length > 0 ? (
          <View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => setExpanded((v) => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 }}
            >
              <Text style={{ fontSize: 12, fontWeight: '500', color: theme.accent.primary }}>
                {expanded ? RUN_PROPOSAL_COLLAPSE_LABEL : RUN_PROPOSAL_EXPAND_LABEL}
              </Text>
              <View style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}>
                <IconChevronDown size={14} color={theme.accent.primary} />
              </View>
            </Pressable>
            {expanded
              ? view.sections.map((section) => (
                  <FoldedSection key={section.key} section={section} />
                ))
              : null}
          </View>
        ) : null}
      </ToolAskCard>
      <BottomSheet
        isOpen={reading}
        onClose={() => setReading(false)}
        headerNode={subject}
        footer={actions}
      >
        <View style={{ gap: nativeSpace[3] }}>
          <Text style={{ fontSize: 13, color: theme.text.secondary }}>{view.effect}</Text>
          {view.sections.map((section) => (
            <View key={section.key} style={{ gap: 4 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                  color: theme.text.muted,
                }}
              >
                {section.label}
              </Text>
              <SectionBody section={section} />
            </View>
          ))}
        </View>
      </BottomSheet>
    </View>
  )
}
