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
import { useGit } from '../../../headless/contexts/GitContext'
import { useActiveProject } from '../../../headless/contexts/ProjectsContext'
import { gitChangeArgs } from '../../../headless/utils/gitChangeApproval'
import { grantDecideErrorMessage } from '../../../headless/utils/pendingToolGrants'
import { branchPickerItems } from '../../../headless/utils/questionPicker'
import { gitChangeAskView, toolAskDecidedLine } from '../../../headless/utils/toolAskCard'
import { TOOL_ASK_COPY } from '../../../headless/utils/toolAskCardConstants'
import type { ToolAskDecidedLine } from '../../../headless/utils/toolAskCardTypes'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevronDown } from '../../icons'
import { Input } from '../../primitives/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/Select'
import { Switch } from '../../primitives/Switch'
import { Textarea } from '../../primitives/Textarea'
import CommitChip from '../chips/CommitChip'
import ToolAskCard from './ToolAskCard'

export type GitChangeApprovalPanelProps = {
  grant: PendingToolGrant
  onDecideLater: () => void
  /** The change was decided on its card — what the card folds to. */
  onDecided?: (line: ToolAskDecidedLine) => void
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
 * Native peer of web's `GitChangeApprovalPanel`, on the card every waiting
 * tool shares: what it wants and why, the branch to merge (pickable among the
 * project's branches) and where it goes, the commits and the diff, who it is
 * made as and the arguments the card lets the person change — never offered
 * for good, and not approvable while a run works on the branch.
 */
export default function GitChangeApprovalPanel({
  grant,
  onDecideLater,
  onDecided,
}: GitChangeApprovalPanelProps) {
  const { theme } = useNativeTheme()
  const card = gitChangeCard(grant)
  const { run } = useProcessRun(card?.run?.id)
  const { branches } = useGit()
  const { projectId: activeProjectId } = useActiveProject()
  const [values, setValues] = useState(() => (card ? gitChangeEditValues(card) : {}))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!card) return null
  const view = gitChangeAskView(card, gitChangeArgs(grant))
  const problem = gitChangeProblem(card, values, run)
  const setValue = (arg: string, value: string) => setValues((v) => ({ ...v, [arg]: value }))
  const branchNames =
    activeProjectId === card.projectId ? branchPickerItems(branches).map((b) => b.label) : []

  const decide = (decision: 'once' | 'deny') => {
    setBusy(true)
    setError(null)
    const metadata = decision === 'once' ? gitChangeDecisionMetadata(card, values) : undefined
    grant
      .decide(decision, metadata)
      .then(() => onDecided?.(toolAskDecidedLine(view, decision)))
      .catch((err: unknown) => {
        setBusy(false)
        setError(grantDecideErrorMessage(err))
      })
  }

  const edits = card.edits ?? []
  return (
    <View style={{ margin: nativeSpace[3] }}>
      <ToolAskCard
        view={view}
        busy={busy}
        error={error}
        {...(problem !== undefined ? { problem } : {})}
        onApprove={() => decide('once')}
        onDeny={() => decide('deny')}
        onLater={onDecideLater}
      >
        {edits
          .filter((edit) => edit.kind === 'branch')
          .map((edit) => {
            const value = values[edit.arg] ?? ''
            const options = branchNames.includes(value) ? branchNames : [value, ...branchNames]
            return (
              <View key={edit.arg} style={{ gap: 6 }}>
                <Label>{edit.label}</Label>
                {branchNames.length > 0 ? (
                  <Select value={value} onValueChange={(next) => setValue(edit.arg, next)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    size="sm"
                    value={value}
                    disabled={busy}
                    onChangeText={(text) => setValue(edit.arg, text)}
                  />
                )}
                {card.branch ? (
                  <Text style={[{ fontSize: 12.5, color: theme.text.secondary }, MONO]}>
                    {`${TOOL_ASK_COPY.into} ${card.branch}`}
                  </Text>
                ) : null}
              </View>
            )
          })}
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
        {edits
          .filter((edit) => edit.kind === 'toggle')
          .map((edit) => (
            <Switch
              key={edit.arg}
              checked={values[edit.arg] === 'true'}
              disabled={busy}
              onCheckedChange={(on) => setValue(edit.arg, String(on))}
              label={edit.label}
            />
          ))}
        {edits
          .filter((edit) => edit.kind === undefined || edit.kind === 'text')
          .map((edit) => (
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
        {card.diff ? <DiffView diff={card.diff} /> : null}
        <View style={{ gap: 2 }}>
          <Row label={GIT_CHANGE_COPY.repository} value={card.repoPath} mono />
          {card.branch && !edits.some((e) => e.kind === 'branch') ? (
            <Row label={GIT_CHANGE_COPY.branch} value={card.branch} mono />
          ) : null}
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
      </ToolAskCard>
    </View>
  )
}
