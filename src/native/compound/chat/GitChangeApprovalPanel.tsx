import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import {
  GIT_CHANGE_COPY,
  gitChangeCard,
  gitChangeDecisionMetadata,
  gitChangeEditValues,
  gitChangeProblem,
  useProcessRun,
} from '../../../headless'
import type { GitChangeCardView, GitChangeCommitView, PendingToolGrant } from '../../../headless'
import { grantDecideErrorMessage } from '../../../headless/utils/pendingToolGrants'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevronDown } from '../../icons'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import { Textarea } from '../../primitives/Textarea'
import CommitChip from '../chips/CommitChip'

export type GitChangeApprovalPanelProps = {
  grant: PendingToolGrant
  onDecideLater: () => void
}

const STATUS_MARK: Record<string, string> = { added: 'A', modified: 'M', deleted: 'D' }
const MONO = { fontFamily: 'Menlo' }

function Label({ children }: { children: string }) {
  const { theme } = useNativeTheme()
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        color: theme.text.muted,
      }}
    >
      {children}
    </Text>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Text style={{ width: 92, fontSize: 12, color: theme.text.muted }}>{label}</Text>
      <Text style={[{ flex: 1, fontSize: 12, color: theme.text.primary }, mono ? MONO : null]}>
        {value}
      </Text>
    </View>
  )
}

function CommitList({
  projectId,
  label,
  commits,
  total,
}: {
  projectId: string
  label: string
  commits: GitChangeCommitView[]
  total: number
}) {
  const { theme } = useNativeTheme()
  if (total === 0) return null
  return (
    <View style={{ gap: 4 }}>
      <Label>{`${label} (${total})`}</Label>
      {commits.map((c) => (
        <View key={c.sha} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <CommitChip projectId={projectId} sha={c.sha} />
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, color: theme.text.primary }}>
            {c.subject}
          </Text>
        </View>
      ))}
      {total > commits.length ? (
        <Text style={{ fontSize: 12, color: theme.text.muted }}>
          {GIT_CHANGE_COPY.more(total - commits.length)}
        </Text>
      ) : null}
    </View>
  )
}

function DiffView({ diff }: { diff: NonNullable<GitChangeCardView['diff']> }) {
  const { theme, status } = useNativeTheme()
  const [open, setOpen] = useState(true)
  return (
    <View style={{ gap: 4 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
      >
        <Label>{`${GIT_CHANGE_COPY.diff} — ${diff.files.length} ${diff.files.length === 1 ? 'file' : 'files'}`}</Label>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <IconChevronDown size={14} color={theme.text.muted} />
        </View>
      </Pressable>
      {diff.files.map((f) => (
        <Text key={f.path} style={[{ fontSize: 12, color: theme.text.secondary }, MONO]}>
          {`${STATUS_MARK[f.status] ?? '?'}  ${f.path}${f.binary ? '  (binary)' : ''}`}
        </Text>
      ))}
      {open && diff.patch ? (
        <ScrollView
          horizontal
          style={{
            maxHeight: 240,
            borderWidth: 1,
            borderColor: theme.border.subtle,
            borderRadius: nativeRadii[2],
            backgroundColor: theme.surface.base,
          }}
        >
          <ScrollView nestedScrollEnabled style={{ padding: 8 }}>
            {diff.patch.split('\n').map((line, i) => (
              <Text
                key={i}
                style={[
                  {
                    fontSize: 11.5,
                    color:
                      line.startsWith('+') && !line.startsWith('+++')
                        ? status.done.softFg
                        : line.startsWith('-') && !line.startsWith('---')
                          ? status.stuck.softFg
                          : theme.text.secondary,
                  },
                  MONO,
                ]}
              >
                {line || ' '}
              </Text>
            ))}
          </ScrollView>
        </ScrollView>
      ) : null}
      {diff.patchTruncated ? (
        <Text style={{ fontSize: 12, color: theme.text.muted }}>
          {GIT_CHANGE_COPY.diffTruncated}
        </Text>
      ) : null}
    </View>
  )
}

/**
 * Native peer of web's `GitChangeApprovalPanel`: the repository's path, the
 * branch and the run on it, the exact change, who it is made as and the
 * arguments the card lets the person change — never offered for good, and not approvable
 * while a run works on the branch.
 */
export default function GitChangeApprovalPanel({
  grant,
  onDecideLater,
}: GitChangeApprovalPanelProps) {
  const { theme, status } = useNativeTheme()
  const card = gitChangeCard(grant)
  const { run } = useProcessRun(card?.run?.id)
  const [values, setValues] = useState(() => (card ? gitChangeEditValues(card) : {}))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!card) return null
  const problem = gitChangeProblem(card, values, run)
  const setValue = (arg: string, value: string) => setValues((v) => ({ ...v, [arg]: value }))
  const tone = card.danger ? status.stuck : status.working

  const decide = (decision: 'once' | 'deny') => {
    setBusy(true)
    setError(null)
    const metadata = decision === 'once' ? gitChangeDecisionMetadata(card, values) : undefined
    void grant.decide(decision, metadata).catch((err: unknown) => {
      setBusy(false)
      setError(grantDecideErrorMessage(err))
    })
  }

  return (
    <View
      style={{
        margin: nativeSpace[3],
        maxHeight: 560,
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        borderColor: theme.border.default,
        backgroundColor: theme.surface.raised,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          gap: 6,
          paddingHorizontal: nativeSpace[3],
          paddingVertical: nativeSpace[2],
          borderBottomWidth: 1,
          borderBottomColor: theme.border.subtle,
          backgroundColor: theme.surface.base,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
              {GIT_CHANGE_COPY.kind}
            </Text>
          </View>
          <Text
            numberOfLines={2}
            style={{ flex: 1, fontSize: 13, fontWeight: '600', color: theme.text.primary }}
          >
            {card.headline}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: nativeRadii[2],
            borderWidth: 1,
            borderColor: status.stuck.softBorder,
            backgroundColor: status.stuck.softBg,
          }}
        >
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: status.stuck.softFg }}>
            {card.warning}
          </Text>
        </View>
        <Row label={GIT_CHANGE_COPY.repository} value={card.repoPath} mono />
        {card.branch ? <Row label={GIT_CHANGE_COPY.branch} value={card.branch} mono /> : null}
        {card.run ? (
          <Row
            label={GIT_CHANGE_COPY.run}
            value={run ? `${card.run.title} · ${run.status}` : card.run.title}
          />
        ) : null}
        {card.identity ? (
          <Row
            label={GIT_CHANGE_COPY.commitsAs}
            value={`${card.identity.name} <${card.identity.email}>`}
          />
        ) : null}
      </View>
      <ScrollView
        style={{ flexShrink: 1 }}
        contentContainerStyle={{ gap: 12, paddingHorizontal: nativeSpace[3], paddingVertical: 8 }}
      >
        {(card.edits ?? []).map((edit) => (
          <View key={edit.arg} style={{ gap: 4 }}>
            <Label>{edit.label}</Label>
            {edit.multiline ? (
              <Textarea
                value={values[edit.arg] ?? ''}
                rows={3}
                disabled={busy}
                onChangeText={(text) => setValue(edit.arg, text)}
              />
            ) : (
              <Input
                size="sm"
                value={values[edit.arg] ?? ''}
                disabled={busy}
                onChangeText={(text) => setValue(edit.arg, text)}
              />
            )}
          </View>
        ))}
        {card.facts.map((fact) => (
          <Text key={fact} style={{ fontSize: 12.5, color: theme.text.secondary }}>
            {`•  ${fact}`}
          </Text>
        ))}
        {card.commits ? (
          <>
            <CommitList
              projectId={card.projectId}
              label={GIT_CHANGE_COPY.gained}
              commits={card.commits.gained}
              total={card.commits.gainedTotal}
            />
            <CommitList
              projectId={card.projectId}
              label={GIT_CHANGE_COPY.dropped}
              commits={card.commits.dropped}
              total={card.commits.droppedTotal}
            />
          </>
        ) : null}
        {card.diff ? <DiffView diff={card.diff} /> : null}
      </ScrollView>
      <View
        style={{
          gap: 6,
          paddingHorizontal: nativeSpace[3],
          paddingVertical: nativeSpace[2],
          borderTopWidth: 1,
          borderTopColor: theme.border.subtle,
        }}
      >
        {problem ? (
          <Text style={{ fontSize: 12, color: status.stuck.softFg }}>{problem}</Text>
        ) : null}
        {error !== null ? (
          <Text style={{ fontSize: 12, color: status.stuck.softFg }}>{error}</Text>
        ) : null}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            gap: nativeSpace[2],
          }}
        >
          <Button variant="ghost" size="sm" onPress={onDecideLater} disabled={busy}>
            {GIT_CHANGE_COPY.later}
          </Button>
          <Button variant="secondary" size="sm" onPress={() => decide('deny')} disabled={busy}>
            {GIT_CHANGE_COPY.decline}
          </Button>
          <Button
            size="sm"
            variant={card.danger ? 'danger' : 'primary'}
            onPress={() => decide('once')}
            loading={busy}
            disabled={problem !== undefined}
          >
            {card.danger ? GIT_CHANGE_COPY.approveDanger : GIT_CHANGE_COPY.approve}
          </Button>
        </View>
      </View>
    </View>
  )
}
