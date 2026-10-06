import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import {
  CODE_REVIEW_GROUP_BY_LABEL,
  CODE_REVIEW_GROUP_BY_OPTIONS,
  CODE_REVIEW_HOW_SHOWN_LABEL,
  CODE_REVIEW_SECTION_TITLES,
  CODE_REVIEW_UNPROVEN_CHIPS,
  CODE_REVIEW_WORTH_A_LOOK_LABEL,
  codeReviewFindingGroups,
  codeReviewView,
  fileNameSlug,
  type CodeReviewCriterionRow,
  type CodeReviewFindingGroup,
  type CodeReviewFindingRow,
  type CodeReviewFindingsGroupBy,
  type CodeReviewRecordedVerdict,
  type CodeReviewTile,
  type CodeReviewView,
  type EvidenceTile,
} from '../../../../headless'
import { nativeRadii } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import { Button } from '../../../primitives/Button'
import {
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconDownload,
  IconFile,
} from '../../../icons'
import Markdown from '../../Markdown'
import { ReportTab, type SaveFileHandler } from '../../chat/signoff'
import Pill from './Pill'
import SignoffSection from './SignoffSection'
import { reviewToneVariant } from './tones'

export type CodeReviewPanelProps = {
  review: EvidenceTile
  /** The verdict the run's ledger kept for this review — the badge's source when given. */
  verdict?: CodeReviewRecordedVerdict
  onSaveFile?: SaveFileHandler
}

type Filter = CodeReviewTile['key'] | undefined

/**
 * Native peer of web's `CodeReviewPanel`: the review in its four fixed
 * sections — Verdict with tiles that filter the findings, Findings with the
 * nits folded, Acceptance criteria, Evidence — or its markdown when it cannot
 * be read as sections.
 */
export default function CodeReviewPanel({
  review,
  verdict: recorded,
  onSaveFile,
}: CodeReviewPanelProps) {
  const { theme, status } = useNativeTheme()
  const view = useMemo(() => codeReviewView(review, recorded), [review, recorded])
  const [filter, setFilter] = useState<Filter>()
  const [groupBy, setGroupBy] = useState<CodeReviewFindingsGroupBy>('severity')

  if (!view) return <ReportTab reports={[review]} {...(onSaveFile ? { onSaveFile } : {})} />

  const severity = filter === 'criteria' ? undefined : filter
  const groups = codeReviewFindingGroups(view.findings, groupBy, severity)
  const verdict = reviewToneVariant(view.verdict.tone, status)
  const markdown = view.markdown
  const toggle = (active: boolean) =>
    ({
      height: 26,
      justifyContent: 'center',
      paddingHorizontal: 10,
      borderRadius: nativeRadii.round,
      borderWidth: 1,
      borderColor: active ? theme.accent.primary : theme.border.subtle,
      backgroundColor: active ? status.review.softBg : theme.surface.raised,
    }) as const

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ flex: 1, fontSize: 12, color: theme.text.secondary }}>{review.caption}</Text>
        {onSaveFile && markdown ? (
          <Button
            variant="secondary"
            size="icon"
            accessibilityLabel="Download the review"
            onPress={() =>
              void onSaveFile({
                name: `${fileNameSlug(review.caption, 'code-review')}.md`,
                dataUri: `data:text/markdown;charset=utf-8,${encodeURIComponent(markdown)}`,
              })
            }
          >
            <IconDownload size={16} color={theme.text.primary} />
          </Button>
        ) : null}
      </View>

      <View
        accessibilityLabel="Verdict"
        style={{
          gap: 12,
          padding: 14,
          borderRadius: nativeRadii[3],
          borderWidth: 1,
          borderColor: verdict.softBorder,
          backgroundColor: verdict.softBg,
        }}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <Pill tone={view.verdict.tone} label={view.verdict.label} bold />
          <View style={{ flex: 1, minWidth: 160 }}>
            <Markdown
              text={view.headline}
              inline
              textStyle={{ fontSize: 14.5, fontWeight: '600', color: theme.text.primary }}
            />
          </View>
        </View>
        {view.detail ? (
          <Markdown text={view.detail} textStyle={{ fontSize: 13, color: theme.text.primary }} />
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {view.tiles.map((tile) => {
            const active = filter === tile.key
            return (
              <Pressable
                key={tile.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setFilter(tile.key === 'criteria' || active ? undefined : tile.key)}
                style={{
                  minWidth: 84,
                  flexGrow: 1,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: nativeRadii[2],
                  borderWidth: active ? 2 : 1,
                  borderColor: active ? theme.accent.primary : theme.border.subtle,
                  backgroundColor: theme.surface.raised,
                }}
              >
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: '700',
                    color:
                      tile.tone === 'neutral'
                        ? theme.text.primary
                        : reviewToneVariant(tile.tone, status).softFg,
                  }}
                >
                  {tile.count}
                </Text>
                <Text style={{ fontSize: 11.5, color: theme.text.secondary }}>{tile.label}</Text>
              </Pressable>
            )
          })}
        </View>
        {view.worthALook ? (
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 12.5, fontWeight: '600', color: theme.text.secondary }}>
              {CODE_REVIEW_WORTH_A_LOOK_LABEL}
            </Text>
            <Markdown
              text={view.worthALook}
              inline
              textStyle={{ fontSize: 12.5, color: theme.text.secondary }}
            />
          </View>
        ) : null}
      </View>

      <View>
        <SignoffSection
          title={CODE_REVIEW_SECTION_TITLES.findings}
          summary={severity ? `Showing ${severity} only` : view.findingsSummary}
          defaultOpen
        >
          <View style={{ gap: 10 }}>
            {view.findings.length > 0 ? (
              <View
                style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}
              >
                <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                  {CODE_REVIEW_GROUP_BY_LABEL}
                </Text>
                {CODE_REVIEW_GROUP_BY_OPTIONS.map((option) => (
                  <Pressable
                    key={option.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: groupBy === option.key }}
                    onPress={() => setGroupBy(option.key)}
                    style={toggle(groupBy === option.key)}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: groupBy === option.key ? theme.accent.primary : theme.text.secondary,
                      }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
                {severity ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setFilter(undefined)}
                    style={toggle(false)}
                  >
                    <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                      All severities
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            {groups.map((group) => (
              <FindingGroup key={`${groupBy}-${group.key}-${severity ?? ''}`} group={group} />
            ))}
            {view.findings.length === 0 ? (
              <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>
                Nothing was found.
              </Text>
            ) : null}
          </View>
        </SignoffSection>

        <SignoffSection
          title={CODE_REVIEW_SECTION_TITLES.criteria}
          summary={view.criteriaSummary}
          defaultOpen
        >
          {view.criteria.length > 0 ? (
            <View
              style={{
                borderRadius: nativeRadii[3],
                borderWidth: 1,
                borderColor: theme.border.subtle,
                overflow: 'hidden',
              }}
            >
              {view.criteria.map((c, i) => (
                <CriterionRow key={c.key} criterion={c} first={i === 0} />
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>
              The review listed no criteria.
            </Text>
          )}
        </SignoffSection>

        <SignoffSection title={CODE_REVIEW_SECTION_TITLES.evidence} summary={view.evidenceSummary}>
          <EvidenceCard view={view} />
        </SignoffSection>
      </View>
    </View>
  )
}

/** A group of findings — a severity or a file — folding its cards under one header. */
function FindingGroup({ group }: { group: CodeReviewFindingGroup }) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(group.defaultOpen)
  return (
    <View
      style={{
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        overflow: 'hidden',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: theme.surface.muted,
        }}
      >
        {group.kind === 'severity' ? (
          <Pill tone={group.tone} label={group.title} />
        ) : (
          <Text
            style={{
              flexShrink: 1,
              fontSize: 12,
              fontWeight: '600',
              fontFamily: 'Menlo',
              color: theme.text.primary,
            }}
          >
            {group.title}
          </Text>
        )}
        <Text style={{ flex: 1, fontSize: 12.5, color: theme.text.secondary }}>{group.count}</Text>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <IconChevronDown size={14} color={theme.text.muted} />
        </View>
      </Pressable>
      {open
        ? group.rows.map((f) => (
            <FindingCard key={f.key} finding={f} showSeverity={group.kind === 'file'} />
          ))
        : null}
    </View>
  )
}

/** One finding: severity, the file as a chip, the symbol, a short title, then the explanation. */
function FindingCard({
  finding,
  showSeverity,
}: {
  finding: CodeReviewFindingRow
  showSeverity: boolean
}) {
  const { theme } = useNativeTheme()
  const { place } = finding
  return (
    <View
      style={{
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: theme.border.subtle,
      }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        {showSeverity ? <Pill tone={finding.tone} label={finding.severity} /> : null}
        {place.file ? (
          <View
            accessibilityLabel={place.line ? `${place.file}:${place.line}` : place.file}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              flexShrink: 1,
              height: 24,
              paddingHorizontal: 7,
              borderRadius: nativeRadii[1],
              borderWidth: 1,
              borderColor: theme.border.subtle,
              backgroundColor: theme.surface.muted,
            }}
          >
            <IconFile size={12} color={theme.text.secondary} />
            <Text
              numberOfLines={1}
              style={{
                flexShrink: 1,
                fontSize: 12,
                fontFamily: 'Menlo',
                color: theme.text.primary,
              }}
            >
              {place.file}
              {place.line ? (
                <Text style={{ color: theme.text.secondary }}>:{place.line}</Text>
              ) : null}
            </Text>
          </View>
        ) : null}
        {place.symbol ? (
          <Text
            style={{
              flexShrink: 1,
              fontSize: 12,
              fontFamily: 'Menlo',
              color: theme.text.secondary,
            }}
          >
            › {place.symbol}
          </Text>
        ) : null}
        {place.prose ? (
          <View style={{ flexShrink: 1 }}>
            <Markdown
              text={place.prose}
              inline
              textStyle={{ fontSize: 12, color: theme.text.secondary }}
            />
          </View>
        ) : null}
      </View>
      {finding.title ? (
        <Markdown
          text={finding.title}
          inline
          textStyle={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}
        />
      ) : null}
      {finding.text ? (
        <Markdown
          text={finding.text}
          inline
          textStyle={{ fontSize: 13, color: theme.text.secondary }}
        />
      ) : null}
    </View>
  )
}

/** One criterion on one line — mark, criterion, status — with how and where it was shown opening under it. */
function CriterionRow({
  criterion: c,
  first,
}: {
  criterion: CodeReviewCriterionRow
  first: boolean
}) {
  const { theme, status } = useNativeTheme()
  const [open, setOpen] = useState(false)
  const tone = reviewToneVariant(c.tone, status)
  const row = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <Text
        accessibilityElementsHidden
        style={{ width: 16, fontSize: 13, fontWeight: '700', color: tone.softFg }}
      >
        {c.mark}
      </Text>
      <View style={{ flex: 1 }}>
        <Markdown text={c.text} inline textStyle={{ fontSize: 13, color: theme.text.primary }} />
      </View>
      <Pill tone={c.tone} label={c.statusLabel} />
      {c.where ? (
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
          <IconChevronRight size={12} color={theme.text.muted} />
        </View>
      ) : null}
    </View>
  )
  return (
    <View style={first ? undefined : { borderTopWidth: 1, borderTopColor: theme.border.subtle }}>
      {c.where ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((v) => !v)}
        >
          {row}
        </Pressable>
      ) : (
        row
      )}
      {open && c.where ? (
        <View style={{ gap: 4, paddingLeft: 38, paddingRight: 12, paddingBottom: 10 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: theme.text.primary }}>
            {CODE_REVIEW_HOW_SHOWN_LABEL}
          </Text>
          {c.where.code ? (
            <Text style={{ fontSize: 12, fontFamily: 'Menlo', color: theme.text.secondary }}>
              {c.where.text}
            </Text>
          ) : (
            <Markdown
              text={c.where.text}
              inline
              textStyle={{ fontSize: 12.5, color: theme.text.secondary }}
            />
          )}
        </View>
      ) : null}
    </View>
  )
}

/** What the evidence shows, and what it leaves unproven — a list, a "nothing" chip, or a dashed "not said" chip. */
function EvidenceCard({ view }: { view: Pick<CodeReviewView, 'showsItems' | 'unproven'> }) {
  const { theme, status } = useNativeTheme()
  const heading = (color: string) =>
    ({ fontSize: 11.5, fontWeight: '600', letterSpacing: 0.4, color }) as const
  const item = (mark: string, color: string, text: string, key: number) => (
    <View key={key} style={{ flexDirection: 'row', gap: 8 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color }}>{mark}</Text>
      <View style={{ flex: 1 }}>
        <Markdown text={text} inline textStyle={{ fontSize: 13, color: theme.text.primary }} />
      </View>
    </View>
  )
  return (
    <View
      style={{
        gap: 6,
        padding: 12,
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        borderColor: theme.border.subtle,
      }}
    >
      <Text style={heading(status.done.softFg)}>
        {CODE_REVIEW_SECTION_TITLES.shows.toUpperCase()}
      </Text>
      {view.showsItems.length > 0 ? (
        view.showsItems.map((text, i) => item('✓', status.done.softFg, text, i))
      ) : (
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>—</Text>
      )}
      {view.unproven.state === 'listed' ? (
        <>
          <Text style={[heading(status.working.softFg), { marginTop: 6 }]}>
            {CODE_REVIEW_SECTION_TITLES.unproven.toUpperCase()}
          </Text>
          {view.unproven.items.map((text, i) => item('!', status.working.softFg, text, i))}
        </>
      ) : view.unproven.state === 'none' ? (
        <View
          style={{
            marginTop: 6,
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            height: 24,
            paddingHorizontal: 10,
            borderRadius: nativeRadii.round,
            backgroundColor: status.done.softBg,
          }}
        >
          <IconCheck size={12} color={status.done.softFg} />
          <Text style={{ fontSize: 12, color: status.done.softFg }}>
            {CODE_REVIEW_UNPROVEN_CHIPS.none}
          </Text>
        </View>
      ) : (
        <View
          style={{
            marginTop: 6,
            alignSelf: 'flex-start',
            height: 24,
            justifyContent: 'center',
            paddingHorizontal: 10,
            borderRadius: nativeRadii.round,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: status.working.softBorder,
          }}
        >
          <Text style={{ fontSize: 12, color: status.working.softFg }}>
            {CODE_REVIEW_UNPROVEN_CHIPS.unstated}
          </Text>
        </View>
      )}
    </View>
  )
}
