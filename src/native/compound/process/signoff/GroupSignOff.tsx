import { useState, type ReactNode } from 'react'
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native'

import {
  GROUP_SIGN_OFF_DEFAULT_LAYOUT,
  GROUP_SIGN_OFF_SUBMITTED_DEFAULT_LAYOUT,
  GROUP_SIGN_OFF_TEXT,
  groupSignOffAnswers,
  requestProofChoices,
  type GroupSignOffAttachmentRow,
  type GroupSignOffDecision,
  type GroupSignOffLayout,
  type GroupSignOffRepoRow,
  type GroupSignOffScreen,
  type GroupSignOffSubmittedLayout,
  type ParkAnswerView,
  type SignOffOutputActions,
  type SignOffOutputChipView,
  type SignOffOutputLayout,
} from '../../../../headless'
import { nativeRadii, nativeSpace } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import { IconChevronDown, IconChevronRight } from '../../../icons'
import Alert from '../../../primitives/Alert'
import { Button } from '../../../primitives/Button'
import SegmentedControl from '../../../primitives/SegmentedControl'
import TicketChip from '../../chips/TicketChip'
import ToneBadge from '../../chips/ToneBadge'
import ParkAnswers from '../ParkAnswers'
import ParkNoteComposer from '../ParkNoteComposer'
import RunNeedsYouCard from '../RunNeedsYouCard'
import type { StorySignoffExtraChip } from '../StorySignoffReview'
import SignOffOutputPanel from './SignOffOutputPanel'
import TicketPostNote from './TicketPostNote'

export type GroupSignOffProps = {
  screen: GroupSignOffScreen
  outputs: readonly SignOffOutputChipView[]
  outputActions: SignOffOutputActions
  acting?: string | undefined
  actionError?: string | null
  onDecide: (decision: GroupSignOffDecision) => Promise<boolean>
  onRetry: () => Promise<boolean>
  /** Save an attachment; downloads stay hidden without it. */
  onDownload?: (row: GroupSignOffAttachmentRow) => void
  /** The app's clipboard; without it the text stays selectable. */
  onCopy?: (text: string) => unknown
  /** Open a repo's own run. */
  onOpenRun: (runId: string, projectId: string) => void
  /** A repo's proof, with the output chips set beside its own. */
  renderEvidence: (repo: GroupSignOffRepoRow, chips: readonly StorySignoffExtraChip[]) => ReactNode
  /** What is still to record, once the pull requests are open. */
  loom?: ReactNode
  layout?: GroupSignOffLayout
  outputLayout?: SignOffOutputLayout
  submittedLayout?: GroupSignOffSubmittedLayout
}

function Heading({ children }: { children: string }) {
  const { theme } = useNativeTheme()
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        color: theme.text.muted,
      }}
    >
      {children}
    </Text>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  const { theme } = useNativeTheme()
  return (
    <View
      accessibilityLabel={title}
      style={{
        gap: 10,
        padding: nativeSpace[4],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        borderRadius: nativeRadii[3],
        backgroundColor: theme.surface.raised,
      }}
    >
      <Heading>{title}</Heading>
      {children}
    </View>
  )
}

function OpenLink({ label, url }: { label: string; url: string }) {
  const { theme } = useNativeTheme()
  return (
    <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(url)}>
      <Text style={{ fontSize: 13, fontWeight: '500', color: theme.accent.primary }}>{label}</Text>
    </Pressable>
  )
}

function RepoFacts({ repo, plain = false }: { repo: GroupSignOffRepoRow; plain?: boolean }) {
  const { theme } = useNativeTheme()
  const facts = [repo.filesLine, repo.branchLine].filter(Boolean).join(' · ')
  return (
    <View style={{ gap: 2 }}>
      {repo.prTitle ? (
        <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.primary }}>
          {repo.prTitle}
        </Text>
      ) : null}
      {repo.line ? (
        <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>{repo.line}</Text>
      ) : null}
      {facts ? <Text style={{ fontSize: 12, color: theme.text.muted }}>{facts}</Text> : null}
      {repo.link && !plain ? <OpenLink label={repo.link.label} url={repo.link.url} /> : null}
      {repo.error && !plain ? <Alert variant="error">{repo.error}</Alert> : null}
    </View>
  )
}

function RepoHead({ repo }: { repo: GroupSignOffRepoRow }) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: nativeSpace[2],
        flexShrink: 1,
      }}
    >
      <Text
        numberOfLines={1}
        style={{ fontSize: 13.5, fontWeight: '600', color: theme.text.primary }}
      >
        {repo.name}
      </Text>
      <ToneBadge tone={repo.badge.tone} label={repo.badge.label} />
      {repo.busy ? <ActivityIndicator size="small" /> : null}
    </View>
  )
}

function RepoRows({
  repos,
  onOpenRun,
}: {
  repos: readonly GroupSignOffRepoRow[]
  onOpenRun: GroupSignOffProps['onOpenRun']
}) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border.subtle,
        borderRadius: nativeRadii[2],
        backgroundColor: theme.surface.base,
      }}
    >
      {repos.map((repo, i) => (
        <View
          key={repo.legId}
          style={{
            gap: 4,
            padding: 10,
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: theme.border.subtle,
          }}
        >
          <RepoHead repo={repo} />
          <RepoFacts repo={repo} />
          {repo.ticketPost ? <TicketPostNote view={repo.ticketPost} /> : null}
          {repo.runId ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => onOpenRun(repo.runId!, repo.projectId)}
              style={{ minHeight: 32, justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.secondary }}>
                {GROUP_SIGN_OFF_TEXT.openRun}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  )
}

function Head({ screen }: { screen: GroupSignOffScreen }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 17, fontWeight: '600', color: theme.text.primary }}>
        {screen.title}
      </Text>
      {screen.tickets.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {screen.tickets.map((ticket) => (
            <TicketChip key={ticket.key} view={ticket} />
          ))}
        </View>
      ) : null}
      <Text style={{ fontSize: 13, color: theme.text.secondary }}>{screen.line}</Text>
    </View>
  )
}

function GoingLive({ words }: { words: string }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: 2 }}>
      <Heading>{GROUP_SIGN_OFF_TEXT.goingLive}</Heading>
      <Text style={{ fontSize: 13, color: theme.text.primary }}>{words}</Text>
    </View>
  )
}

function Decision({
  screen,
  acting,
  actionError,
  onDecide,
  repoRows,
}: Pick<GroupSignOffProps, 'screen' | 'acting' | 'actionError' | 'onDecide'> & {
  repoRows: ReactNode
}) {
  const { theme } = useNativeTheme()
  const [selected, setSelected] = useState<string | undefined>(undefined)
  const [noting, setNoting] = useState(false)
  const [legId, setLegId] = useState(screen.sendBack[0]?.legId)
  const busy = acting !== undefined || screen.unsaved.length > 0
  const answers = groupSignOffAnswers(screen.choices, selected)
  const send = (answer: ParkAnswerView) => {
    if (answer.choice === 'request-changes') return setNoting(true)
    void onDecide({ choice: answer.choice as 'approve' | 'reject' })
  }
  return (
    <RunNeedsYouCard
      style={{ marginHorizontal: 0, marginTop: 0 }}
      tone="review"
      where={<ToneBadge tone={screen.badge.tone} label={screen.badge.label} />}
    >
      <Head screen={screen} />
      {repoRows}
      {screen.plan ? (
        <Text style={{ fontSize: 13.5, fontWeight: '500', color: theme.text.primary }}>
          {screen.plan}
        </Text>
      ) : null}
      {screen.goingLive ? <GoingLive words={screen.goingLive} /> : null}
      {screen.loomLeft > 0 ? (
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>
          {GROUP_SIGN_OFF_TEXT.loomLeft(screen.loomLeft)}
        </Text>
      ) : null}
      {screen.unsaved.length > 0 ? (
        <Alert variant="info">{GROUP_SIGN_OFF_TEXT.unsaved(screen.unsaved.join(' and '))}</Alert>
      ) : null}
      {noting ? (
        <View style={{ gap: 10 }}>
          <Heading>{GROUP_SIGN_OFF_TEXT.whichRepo}</Heading>
          <SegmentedControl
            size="sm"
            ariaLabel={GROUP_SIGN_OFF_TEXT.whichRepoLabel}
            value={legId ?? ''}
            onChange={setLegId}
            options={screen.sendBack.map((r) => ({ value: r.legId, label: r.name }))}
          />
          <ParkNoteComposer
            proofChoices={requestProofChoices()}
            onCancel={() => setNoting(false)}
            onSend={(note, requestedProof) => {
              if (!legId || busy) return
              void onDecide({
                choice: 'request-changes',
                legId,
                ...(note ? { note } : {}),
                ...(requestedProof?.length ? { requestedProof } : {}),
              }).then((ok) => {
                if (ok) setNoting(false)
              })
            }}
          />
        </View>
      ) : (
        <ParkAnswers view={answers} busy={busy} onSelect={setSelected} onSend={send} />
      )}
      {actionError ? <Alert variant="error">{actionError}</Alert> : null}
    </RunNeedsYouCard>
  )
}

function Attachments({
  rows,
  onDownload,
}: {
  rows: readonly GroupSignOffAttachmentRow[]
  onDownload: GroupSignOffProps['onDownload']
}) {
  const { theme } = useNativeTheme()
  if (rows.length === 0) {
    return (
      <Text style={{ fontSize: 13, color: theme.text.muted }}>
        {GROUP_SIGN_OFF_TEXT.attachNone}
      </Text>
    )
  }
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border.subtle,
        borderRadius: nativeRadii[2],
        backgroundColor: theme.surface.base,
      }}
    >
      {rows.map((row, i) => (
        <View
          key={row.key}
          style={{
            gap: 6,
            padding: 10,
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: theme.border.subtle,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.primary }}>
                {row.name}
              </Text>
              <Text style={{ fontSize: 12, color: theme.text.muted }}>
                {`${row.kindLabel} · ${row.projectName}`}
              </Text>
            </View>
            {row.link ? (
              <OpenLink label={row.link.label} url={row.link.url} />
            ) : row.attachment.downloadPath && onDownload ? (
              <Button
                size="sm"
                variant="secondary"
                loading={row.busy}
                onPress={() => onDownload(row)}
              >
                {GROUP_SIGN_OFF_TEXT.download}
              </Button>
            ) : null}
          </View>
          {row.error ? <Alert variant="error">{row.error}</Alert> : null}
        </View>
      ))}
    </View>
  )
}

function Submitted({
  screen,
  outputs,
  outputActions,
  acting,
  actionError,
  onRetry,
  onDownload,
  onCopy,
  onOpenRun,
  loom,
  submittedLayout = GROUP_SIGN_OFF_SUBMITTED_DEFAULT_LAYOUT,
}: GroupSignOffProps) {
  const { theme } = useNativeTheme()
  const pullRequests = (
    <Card title={GROUP_SIGN_OFF_TEXT.pullRequests}>
      <RepoRows repos={screen.repos} onOpenRun={onOpenRun} />
      {screen.goingLive ? <GoingLive words={screen.goingLive} /> : null}
      {screen.canRetry ? (
        <View style={{ gap: 6 }}>
          <Button
            size="sm"
            variant="primary"
            loading={acting === 'retry'}
            onPress={() => void onRetry()}
          >
            {GROUP_SIGN_OFF_TEXT.retry}
          </Button>
          <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>
            {GROUP_SIGN_OFF_TEXT.retryLine}
          </Text>
        </View>
      ) : null}
      {actionError ? <Alert variant="error">{actionError}</Alert> : null}
    </Card>
  )
  const post = outputs
    .filter((o) => !o.panel.perRepo)
    .map((output) => (
      <Card key={output.key} title={output.panel.label}>
        <SignOffOutputPanel
          view={output.panel}
          actions={outputActions}
          {...(onCopy ? { onCopy } : {})}
        />
      </Card>
    ))
  const postFirst = submittedLayout === 'post-first'
  return (
    <View style={{ gap: nativeSpace[4] }}>
      <View style={{ gap: nativeSpace[2], alignItems: 'flex-start' }}>
        <ToneBadge tone={screen.badge.tone} label={screen.badge.label} />
        <Head screen={screen} />
      </View>
      {postFirst ? post : pullRequests}
      {postFirst ? pullRequests : post}
      {loom ? <Card title={GROUP_SIGN_OFF_TEXT.record}>{loom}</Card> : null}
      <Card title={GROUP_SIGN_OFF_TEXT.attach}>
        <Attachments rows={screen.attachments} onDownload={onDownload} />
      </Card>
    </View>
  )
}

function RepoFold({
  repo,
  open,
  onToggle,
  children,
}: {
  repo: GroupSignOffRepoRow
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  const { theme } = useNativeTheme()
  const Chevron = open ? IconChevronDown : IconChevronRight
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border.subtle,
        borderRadius: nativeRadii[3],
        backgroundColor: theme.surface.raised,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={{ flexDirection: 'row', gap: nativeSpace[2], padding: nativeSpace[3] }}
      >
        <Chevron size={14} color={theme.text.muted} />
        <View style={{ flex: 1, gap: 4 }}>
          <RepoHead repo={repo} />
          <RepoFacts repo={repo} plain />
        </View>
      </Pressable>
      {repo.error ? (
        <View style={{ paddingHorizontal: nativeSpace[3], paddingBottom: nativeSpace[2] }}>
          <Alert variant="error">{repo.error}</Alert>
        </View>
      ) : null}
      {repo.ticketPost ? (
        <View style={{ paddingHorizontal: nativeSpace[3], paddingBottom: nativeSpace[2] }}>
          <TicketPostNote view={repo.ticketPost} />
        </View>
      ) : null}
      {open ? <View style={{ padding: nativeSpace[3], paddingTop: 0 }}>{children}</View> : null}
    </View>
  )
}

function Evidence({
  screen,
  outputs,
  outputActions,
  outputLayout,
  onCopy,
  renderEvidence,
  layout,
}: Pick<
  GroupSignOffProps,
  'screen' | 'outputs' | 'outputActions' | 'outputLayout' | 'onCopy' | 'renderEvidence'
> & { layout: GroupSignOffLayout }) {
  const { repos } = screen
  const [picked, setPicked] = useState<string | undefined>(undefined)
  const shown = repos.find((r) => r.legId === picked) ?? repos[0]
  const chips: StorySignoffExtraChip[] = outputs.map((chip) => ({
    key: chip.key,
    row: chip.row,
    content: (
      <SignOffOutputPanel
        view={chip.panel}
        actions={outputActions}
        {...(onCopy ? { onCopy } : {})}
        {...(outputLayout ? { layout: outputLayout } : {})}
      />
    ),
  }))
  if (!shown) return null
  if (layout === 'decision-first') {
    return (
      <View style={{ gap: 10 }}>
        {repos.length > 1 ? (
          <SegmentedControl
            size="sm"
            ariaLabel={GROUP_SIGN_OFF_TEXT.repos}
            value={shown.legId}
            onChange={setPicked}
            options={repos.map((r) => ({ value: r.legId, label: r.name }))}
          />
        ) : null}
        {renderEvidence(shown, chips)}
      </View>
    )
  }
  return (
    <View style={{ gap: nativeSpace[2] }}>
      {repos.map((repo) => (
        <RepoFold
          key={repo.legId}
          repo={repo}
          open={repo.legId === shown.legId}
          onToggle={() => setPicked(repo.legId)}
        >
          {repo.legId === shown.legId ? renderEvidence(repo, chips) : null}
        </RepoFold>
      ))}
    </View>
  )
}

/**
 * Native peer of web's `GroupSignOff`: the decision, with which repos get a pull
 * request and why any are left out, and every repo's evidence behind the same
 * chips as a run's, the group's outputs beside them. Once approved it shows what
 * came of it and what is left to do by hand. Side by side is the folds on a phone.
 */
export default function GroupSignOff(props: GroupSignOffProps) {
  const { theme } = useNativeTheme()
  const {
    screen,
    outputs,
    outputActions,
    acting,
    actionError,
    onDecide,
    onCopy,
    onOpenRun,
    renderEvidence,
    layout = GROUP_SIGN_OFF_DEFAULT_LAYOUT,
    outputLayout,
  } = props
  const evidence = (
    <View accessibilityLabel={GROUP_SIGN_OFF_TEXT.evidence} style={{ gap: nativeSpace[2] }}>
      <Heading>{GROUP_SIGN_OFF_TEXT.evidence}</Heading>
      <Evidence
        screen={screen}
        outputs={outputs}
        outputActions={outputActions}
        {...(outputLayout ? { outputLayout } : {})}
        {...(onCopy ? { onCopy } : {})}
        renderEvidence={renderEvidence}
        layout={layout}
      />
    </View>
  )
  if (screen.phase === 'building' || screen.phase === 'ended') {
    return (
      <View
        style={{
          gap: 4,
          padding: 10,
          borderWidth: 1,
          borderColor: theme.border.subtle,
          borderRadius: nativeRadii[2],
          backgroundColor: theme.surface.raised,
        }}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <ToneBadge tone={screen.badge.tone} label={screen.badge.label} />
          {screen.tickets.map((ticket) => (
            <TicketChip key={ticket.key} view={ticket} />
          ))}
        </View>
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>{screen.line}</Text>
      </View>
    )
  }
  if (screen.phase === 'submitted') {
    return (
      <View style={{ gap: nativeSpace[4] }}>
        <Submitted {...props} />
        {evidence}
      </View>
    )
  }
  return (
    <View style={{ gap: nativeSpace[4] }}>
      <Decision
        screen={screen}
        acting={acting}
        actionError={actionError ?? null}
        onDecide={onDecide}
        repoRows={
          layout === 'decision-first' ? (
            <RepoRows repos={screen.repos} onOpenRun={onOpenRun} />
          ) : null
        }
      />
      {evidence}
    </View>
  )
}
