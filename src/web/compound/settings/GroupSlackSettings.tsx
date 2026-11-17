import { useState, type ReactNode } from 'react'
import {
  SLACK_SETTINGS_DEFAULT_LAYOUT,
  SLACK_SETTINGS_TEXT as TEXT,
  slackClientIdProblem,
  slackThreadLinkProblem,
  useGroupSlackSettings,
  type SlackReviewSettingsState,
  type SlackSettingsLayout,
} from '../../../headless'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { ConfirmDialog } from '../../primitives/Modal'
import { Switch } from '../../primitives/Switch'
import ToneBadge from '../chips/ToneBadge'
import { CopyButton } from '../CopyButton'
import { openInBrowser } from './openInBrowser'
import ProviderOAuthWaiting from './ProviderOAuthWaiting'

export type SlackReviewSettingsActions = {
  onClientIdChange: (clientId: string) => void
  /** Start the sign-in; the page opens in the browser. */
  onSignIn: () => void
  onSignInAgain: () => void
  /** Open the sign-in page again, for a browser that was closed. */
  onOpenAgain: () => void
  onBackOut: () => void
  onWatch: (permalink: string, offerExistingReplies: boolean) => void
  onClear: () => void
}

export type SlackReviewSettingsPanelProps = SlackReviewSettingsActions & {
  state: SlackReviewSettingsState
  layout?: SlackSettingsLayout
  /** Start with the thread link being changed — for a fixed showcase state. */
  editingThread?: boolean
  /** Start with this link typed — for a fixed showcase state. */
  typedLink?: string
  /** Start with Clear's confirm open — for a fixed showcase state. */
  confirmingClear?: boolean
}

const MUTED = 'm-0 text-[12.5px] text-(--text-secondary)'
const LABEL = 'text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)'

/**
 * The group's Slack in its Settings: the person's own Slack app signed in
 * through the browser, then the review thread the group watches — its link,
 * whether it brings updates, and its last read. Three layouts to pick from;
 * Two steps ships.
 */
export function SlackReviewSettingsPanel({
  state,
  layout = SLACK_SETTINGS_DEFAULT_LAYOUT,
  editingThread = false,
  typedLink = '',
  confirmingClear = false,
  ...actions
}: SlackReviewSettingsPanelProps) {
  const { view } = state
  const connection = <ConnectionPart state={state} actions={actions} />
  const thread = view.canWatch ? (
    <ThreadPart
      state={state}
      actions={actions}
      editingThread={editingThread}
      typedLink={typedLink}
      confirmingClear={confirmingClear}
    />
  ) : (
    <p className={MUTED}>{TEXT.connectFirst}</p>
  )
  const notes = (
    <>
      {view.readError ? <Alert>{view.readError}</Alert> : null}
      {view.actionError ? <Alert>{view.actionError}</Alert> : null}
    </>
  )

  if (layout === 'card') {
    return (
      <section aria-label={TEXT.heading} className="flex max-w-2xl flex-col gap-3">
        <Heading />
        {notes}
        <div className="flex flex-col overflow-hidden rounded-lg border border-(--border-subtle) bg-(--surface-raised)">
          <div className="px-4 py-3">{connection}</div>
          <div className="border-t border-(--border-subtle) px-4 py-3">
            <div className="flex flex-col gap-2">
              <span className={LABEL}>{TEXT.threadStep}</span>
              {thread}
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (layout === 'rows') {
    return (
      <section aria-label={TEXT.heading} className="@container flex max-w-2xl flex-col gap-3">
        <Heading />
        {notes}
        <div className="flex flex-col divide-y divide-(--border-subtle) rounded-md border border-(--border-subtle)">
          <Row label={TEXT.heading}>{connection}</Row>
          <Row label={TEXT.threadLink}>{thread}</Row>
        </div>
      </section>
    )
  }

  return (
    <section aria-label={TEXT.heading} className="flex max-w-2xl flex-col gap-4">
      <Heading />
      {notes}
      <Step n={1} title={TEXT.connectStep}>
        {connection}
      </Step>
      <Step n={2} title={TEXT.threadStep} muted={!view.canWatch}>
        {thread}
      </Step>
    </section>
  )
}

function Heading() {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="m-0 text-base font-semibold">{TEXT.heading}</h3>
      <p className="m-0 text-sm text-(--text-secondary)">{TEXT.intro}</p>
    </div>
  )
}

function Step({
  n,
  title,
  muted = false,
  children,
}: {
  n: number
  title: string
  muted?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 gap-3">
      <span
        aria-hidden
        className={`mt-px flex size-6 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold ${
          muted
            ? 'border-(--border-subtle) text-(--text-muted)'
            : 'border-(--accent-primary) text-(--accent-primary)'
        }`}
      >
        {n}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h4 className="m-0 text-sm font-medium">{title}</h4>
        {children}
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3 @lg:flex-row @lg:gap-4">
      <span className="shrink-0 text-sm font-medium @lg:w-32">{label}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">{children}</div>
    </div>
  )
}

type PartProps = { state: SlackReviewSettingsState; actions: SlackReviewSettingsActions }

function ConnectionPart({ state, actions }: PartProps) {
  const { view, clientId, signIn } = state
  const { connection } = view
  if (signIn.step === 'waiting') {
    return (
      <ProviderOAuthWaiting
        error={signIn.error}
        onOpenAgain={actions.onOpenAgain}
        onBackOut={actions.onBackOut}
      />
    )
  }
  if (connection.kind === 'connected') {
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <ToneBadge tone="done">{TEXT.connected}</ToneBadge>
        <span className="min-w-0 truncate text-sm font-medium">{connection.workspace}</span>
      </div>
    )
  }
  if (connection.kind === 'sign-in-again') {
    return (
      <div className="flex min-w-0 flex-col gap-2">
        {signIn.error ? <Alert>{signIn.error}</Alert> : null}
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <ToneBadge tone="stuck">{TEXT.needsSignIn}</ToneBadge>
          <span className="min-w-0 truncate text-sm font-medium">{connection.workspace}</span>
          <Button
            size="sm"
            variant="primary"
            className="ml-auto"
            loading={signIn.step === 'opening'}
            onClick={actions.onSignInAgain}
          >
            {TEXT.signInAgain}
          </Button>
        </div>
        <p className={MUTED}>{TEXT.signInAgainWhy}</p>
      </div>
    )
  }
  const typed = clientId.trim() !== ''
  const clientIdProblem = slackClientIdProblem(clientId)
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className={MUTED}>{TEXT.why}</p>
      {signIn.error ? <Alert>{signIn.error}</Alert> : null}
      <Field
        label={TEXT.clientId}
        hint={TEXT.clientIdHint}
        error={typed ? clientIdProblem : undefined}
      >
        <Input
          value={clientId}
          onChange={(e) => actions.onClientIdChange(e.target.value)}
          placeholder={TEXT.clientIdPlaceholder}
          autoComplete="off"
          spellCheck={false}
        />
      </Field>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-sm font-medium">{TEXT.redirectUrl}</span>
        <div className="flex min-w-0 items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-md border border-(--border-subtle) bg-(--surface-muted) px-2 py-1.5 font-mono text-[12px]">
            {view.redirectUrl}
          </code>
          <CopyButton text={view.redirectUrl} label={TEXT.copy} title={TEXT.copy} />
        </div>
        <span className="text-xs opacity-60">{TEXT.redirectUrlHint}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          disabled={!connection.canSignIn || clientIdProblem !== undefined}
          loading={signIn.step === 'opening'}
          onClick={actions.onSignIn}
        >
          {TEXT.signIn}
        </Button>
        {!connection.canSignIn ? (
          <span className="text-[12px] text-(--text-muted)">{TEXT.cannotSignIn}</span>
        ) : null}
      </div>
    </div>
  )
}

function ThreadPart({
  state,
  actions,
  editingThread,
  typedLink,
  confirmingClear,
}: PartProps & { editingThread: boolean; typedLink: string; confirmingClear: boolean }) {
  const { thread } = state.view
  const [editing, setEditing] = useState(editingThread)
  const [confirming, setConfirming] = useState(confirmingClear)
  const [tried, setTried] = useState(typedLink)
  if (thread.kind === 'none' || editing) {
    return (
      <ThreadLinkForm
        initial={tried || (thread.kind === 'watching' ? thread.permalink : '')}
        onWatch={(link, existing) => {
          setEditing(false)
          setTried(link)
          actions.onWatch(link, existing)
        }}
        {...(thread.kind === 'watching' ? { onCancel: () => setEditing(false) } : {})}
      />
    )
  }
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${thread.saving ? 'opacity-70' : ''}`}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <ToneBadge tone={thread.tone}>{thread.saving ? TEXT.saving : thread.label}</ToneBadge>
        {thread.permalink ? (
          <a
            href={thread.permalink}
            target="_blank"
            rel="noreferrer noopener"
            title={thread.permalink}
            className="min-w-0 flex-1 basis-[180px] truncate text-[12.5px] text-(--accent-primary) hover:underline"
          >
            {thread.permalink}
          </a>
        ) : (
          <span className="min-w-0 flex-1" />
        )}
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            disabled={thread.saving}
            onClick={() => setEditing(true)}
          >
            {TEXT.change}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={thread.saving}
            onClick={() => setConfirming(true)}
          >
            {TEXT.clear}
          </Button>
        </span>
      </div>
      {thread.why ? <p className={MUTED}>{thread.why}</p> : null}
      <p className="m-0 text-[12px] text-(--text-muted)">{thread.lastRead}</p>
      {thread.offers ? (
        <p className="m-0 text-[12px] text-(--text-muted)">{TEXT.updatesLine(thread.offers)}</p>
      ) : null}
      {thread.lastReadError ? (
        <p className="m-0 break-words font-mono text-[11.5px] text-(--status-stuck-soft-fg)">
          {thread.lastReadError}
        </p>
      ) : null}
      <ConfirmDialog
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={actions.onClear}
        title={TEXT.clearTitle}
        description={TEXT.clearBody}
        confirmLabel={TEXT.clearConfirm}
        cancelLabel={TEXT.cancel}
        destructive
      />
    </div>
  )
}

function ThreadLinkForm({
  initial,
  onWatch,
  onCancel,
}: {
  initial: string
  onWatch: (permalink: string, offerExistingReplies: boolean) => void
  onCancel?: () => void
}) {
  const [link, setLink] = useState(initial)
  const [existing, setExisting] = useState(false)
  const problem = slackThreadLinkProblem(link)
  const watch = () => {
    if (!problem) onWatch(link, existing)
  }
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Field
        label={TEXT.threadLink}
        hint={TEXT.threadLinkHint}
        error={link.trim() !== '' ? problem : undefined}
      >
        <Input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') watch()
          }}
          placeholder={TEXT.threadPlaceholder}
          autoComplete="off"
          spellCheck={false}
        />
      </Field>
      <Switch checked={existing} onCheckedChange={setExisting} label={TEXT.existingReplies} />
      <div className="flex items-center gap-2">
        <Button size="sm" variant="primary" disabled={problem !== undefined} onClick={watch}>
          {TEXT.watch}
        </Button>
        {onCancel ? (
          <Button size="sm" variant="secondary" onClick={onCancel}>
            {TEXT.cancel}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export type GroupSlackSettingsProps = {
  groupId: string
  layout?: SlackSettingsLayout
}

/** {@link SlackReviewSettingsPanel} on the group's live data, placed in Settings → Group. */
export default function GroupSlackSettings({ groupId, layout }: GroupSlackSettingsProps) {
  const slack = useGroupSlackSettings(groupId)
  const open = (going: Promise<string | undefined>) => {
    void going.then((page) => {
      if (page) openInBrowser(page)
    })
  }
  const { signIn } = slack
  return (
    <SlackReviewSettingsPanel
      state={slack}
      {...(layout ? { layout } : {})}
      onClientIdChange={slack.setClientId}
      onSignIn={() => open(slack.startSignIn())}
      onSignInAgain={() => open(slack.signInAgain())}
      onOpenAgain={() => {
        if (signIn.step === 'waiting') openInBrowser(signIn.page)
      }}
      onBackOut={slack.backOut}
      onWatch={slack.watch}
      onClear={slack.clear}
    />
  )
}
