import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import {
  RUN_PROPOSAL_COLLAPSE_LABEL,
  RUN_PROPOSAL_DECLINE_LABEL,
  RUN_PROPOSAL_EXPAND_LABEL,
  RUN_PROPOSAL_LATER_LABEL,
  RUN_PROPOSAL_OPEN_FULL_LABEL,
  runProposalArgs,
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

export type RunProposalApprovalPanelProps = {
  grant: PendingToolGrant
  onDecideLater: () => void
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
 * Native peer of web's `RunProposalApprovalPanel`: kept small in place of the
 * composer — kind, subject and one-line effect with the decision always in
 * reach; the details open below in a bounded scroll, each section closed to a
 * line, or whole in a sheet for reading.
 */
export default function RunProposalApprovalPanel({
  grant,
  onDecideLater,
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
  if (!view) return null
  const tone = status[view.tone]
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
    void grant.decide(decision, edits).catch((err: unknown) => {
      setBusy(false)
      setError(grantDecideErrorMessage(err))
    })
  }

  const actions = (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        gap: nativeSpace[2],
      }}
    >
      <Button variant="ghost" size="sm" onPress={onDecideLater} disabled={busy}>
        {RUN_PROPOSAL_LATER_LABEL}
      </Button>
      <Button variant="secondary" size="sm" onPress={() => decide('deny')} disabled={busy}>
        {RUN_PROPOSAL_DECLINE_LABEL}
      </Button>
      <Button
        size="sm"
        variant={view.danger ? 'danger' : 'primary'}
        onPress={() => decide('once')}
        loading={busy}
        disabled={landingProblem !== undefined}
      >
        {view.approveLabel}
      </Button>
    </View>
  )

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
      {story && feature ? <DependencyRef dependency={`${story.id}.${feature.id}`} /> : null}
      {view.storyId ? <DependencyRef dependency={view.storyId} /> : null}
      <Text
        numberOfLines={1}
        style={{ flex: 1, fontSize: 13, fontWeight: '600', color: theme.text.primary }}
      >
        {view.title}
      </Text>
    </View>
  )

  return (
    <View
      style={{
        margin: nativeSpace[3],
        maxHeight: 440,
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        borderColor: theme.border.default,
        backgroundColor: theme.surface.raised,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          gap: 4,
          paddingHorizontal: nativeSpace[3],
          paddingVertical: nativeSpace[2],
          borderBottomWidth: 1,
          borderBottomColor: theme.border.subtle,
          backgroundColor: theme.surface.base,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {subject}
          <IconButton
            size="sm"
            accessibilityLabel={RUN_PROPOSAL_OPEN_FULL_LABEL}
            onPress={() => setReading(true)}
          >
            <IconMaximize size={14} color={theme.text.secondary} />
          </IconButton>
        </View>
        <Text numberOfLines={1} style={{ fontSize: 12, color: theme.text.secondary }}>
          {view.effect}
        </Text>
      </View>
      {view.landing ? (
        <ScrollView
          style={{
            maxHeight: 240,
            flexShrink: 0,
            paddingHorizontal: nativeSpace[3],
            borderBottomWidth: 1,
            borderBottomColor: theme.border.subtle,
          }}
        >
          <RunProposalLandingEditor
            landing={view.landing}
            form={landingForm}
            busy={busy}
            onChange={setLandingForm}
          />
        </ScrollView>
      ) : null}
      {view.sections.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={() => setExpanded((v) => !v)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: nativeSpace[3],
            paddingVertical: 6,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '500', color: theme.accent.primary }}>
            {expanded ? RUN_PROPOSAL_COLLAPSE_LABEL : RUN_PROPOSAL_EXPAND_LABEL}
          </Text>
          <View style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}>
            <IconChevronDown size={14} color={theme.accent.primary} />
          </View>
        </Pressable>
      ) : null}
      {expanded ? (
        <ScrollView style={{ flexShrink: 1, paddingHorizontal: nativeSpace[3] }}>
          {view.sections.map((section) => (
            <FoldedSection key={section.key} section={section} />
          ))}
        </ScrollView>
      ) : null}
      <View
        style={{
          gap: 6,
          paddingHorizontal: nativeSpace[3],
          paddingVertical: nativeSpace[2],
          borderTopWidth: 1,
          borderTopColor: theme.border.subtle,
        }}
      >
        {error !== null ? (
          <Text style={{ fontSize: 12, color: status.stuck.softFg }}>{error}</Text>
        ) : null}
        {actions}
      </View>
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
