import { useState } from 'react'
import { designCompareRows } from 'thefactory-tools/utils'
import {
  DESIGN_COMPARE_MARK_LABELS,
  DESIGN_PROPOSAL_STATUS_LABELS,
  DESIGN_TEXT,
  designCaseMatrix,
  designFileTargets,
  designOriginText,
  designProposalGroups,
  designShownOfEntry,
  designShownOfVersion,
  formatDateShort,
  type DesignFileTarget,
  type DesignShown,
} from '../../../headless'
import type {
  DesignCompareRow,
  DesignEntryTarget,
  DesignIndex,
  DesignProposal,
  DesignProposalEntry,
} from '../../../headless/api'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import { NativeSelect } from '../../primitives/NativeSelect'
import SegmentedControl from '../../primitives/SegmentedControl'
import { Textarea } from '../../primitives/Textarea'
import DesignFileThumb from './DesignFileThumb'
import DesignPill, { MARK_TONES, PROPOSAL_TONES } from './DesignPill'

export type DesignProposalsProps = {
  index: DesignIndex
  appId: string
  proposal: DesignProposal | undefined
  onSelect: (proposalId: string) => void
  srcOf: (shown: DesignShown) => string | undefined
  onOpen: (shown: DesignShown) => void
  onCompare: (current: DesignShown, proposed: DesignShown) => void
  onAccept: (proposalId: string) => Promise<unknown>
  onKeep: (proposalId: string) => Promise<unknown>
  onChoose: (proposalId: string) => Promise<unknown>
  onSendBack: (proposalId: string, note: string) => Promise<unknown>
  onFile: (proposalId: string, entryId: string, target: DesignEntryTarget) => Promise<unknown>
  /** How the open proposal is shown first: compared with what is current, or clicked through. */
  initialView?: 'compare' | 'flow'
  /** A shared piece highlighted from the start. */
  initialPiece?: string
}

const NEW = '__new__'

/** Where an unfiled image goes: one of the app's screens or a new one, and a state of it or a new one. */
function FileForm({
  targets,
  onFile,
}: {
  targets: DesignFileTarget[]
  onFile: (target: DesignEntryTarget) => Promise<unknown>
}) {
  const [screenId, setScreenId] = useState('')
  const [screenName, setScreenName] = useState('')
  const [stateId, setStateId] = useState(NEW)
  const [stateName, setStateName] = useState('')
  const [busy, setBusy] = useState(false)
  const screen = targets.find((t) => t.screenId === screenId)
  const newScreen = screenId === NEW
  const ready =
    (newScreen ? screenName.trim() !== '' : !!screen) &&
    (stateId !== NEW || stateName.trim() !== '' || newScreen)
  return (
    <form
      className="flex flex-col gap-1.5"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!ready) return
        setBusy(true)
        try {
          await onFile({
            ...(newScreen ? { screenName: screenName.trim() } : { screenId }),
            ...(stateId !== NEW && !newScreen ? { stateId } : {}),
            ...((stateId === NEW || newScreen) && stateName.trim()
              ? { stateName: stateName.trim() }
              : {}),
          })
        } finally {
          setBusy(false)
        }
      }}
    >
      <NativeSelect
        size="sm"
        aria-label={DESIGN_TEXT.fileAs}
        value={screenId}
        onChange={(e) => {
          setScreenId(e.target.value)
          setStateId(NEW)
        }}
      >
        <option value="" disabled>
          {DESIGN_TEXT.fileAs}…
        </option>
        {targets.map((t) => (
          <option key={t.screenId} value={t.screenId}>
            {t.screenName}
          </option>
        ))}
        <option value={NEW}>{DESIGN_TEXT.newScreen}</option>
      </NativeSelect>
      {newScreen ? (
        <Input
          size="sm"
          aria-label="New screen name"
          placeholder="Screen name"
          value={screenName}
          onChange={(e) => setScreenName(e.target.value)}
        />
      ) : null}
      {screen && screen.states.length > 0 ? (
        <NativeSelect
          size="sm"
          aria-label="State"
          value={stateId}
          onChange={(e) => setStateId(e.target.value)}
        >
          {screen.states.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
          <option value={NEW}>{DESIGN_TEXT.newState}</option>
        </NativeSelect>
      ) : null}
      {(screen || newScreen) && (stateId === NEW || newScreen) ? (
        <Input
          size="sm"
          aria-label="State name"
          placeholder="State name, e.g. Empty"
          value={stateName}
          onChange={(e) => setStateName(e.target.value)}
        />
      ) : null}
      <Button
        type="submit"
        size="sm"
        variant="secondary"
        disabled={!ready}
        loading={busy}
        className="self-start"
      >
        File it
      </Button>
    </form>
  )
}

/** An image with the shared pieces it marks drawn over it. */
function Marked({
  shown,
  entry,
  piece,
  srcOf,
  width,
  onOpen,
}: {
  shown: DesignShown
  entry: DesignProposalEntry
  piece: string | undefined
  srcOf: (shown: DesignShown) => string | undefined
  width: number
  onOpen: (shown: DesignShown) => void
}) {
  const marks = piece ? entry.pieces.filter((m) => m.pieceId === piece) : []
  return (
    <button type="button" className="relative self-start" onClick={() => onOpen(shown)}>
      <DesignFileThumb shown={shown} src={srcOf(shown)} width={width} />
      {marks.map((m, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="pointer-events-none absolute rounded border-2"
          style={{
            left: `${m.x * 100}%`,
            top: `${m.y * 100}%`,
            width: `${m.w * 100}%`,
            height: `${m.h * 100}%`,
            borderColor: 'var(--status-working-soft-fg)',
            boxShadow: '0 0 0 3px var(--status-working-soft-bg)',
          }}
        />
      ))}
    </button>
  )
}

function CompareRow({
  index,
  proposal,
  row,
  entry,
  piece,
  props,
  targets,
}: {
  index: DesignIndex
  proposal: DesignProposal
  row: DesignCompareRow
  entry: DesignProposalEntry
  piece: string | undefined
  props: DesignProposalsProps
  targets: DesignFileTarget[]
}) {
  const where = [row.screenName, row.stateName].filter(Boolean).join(' › ')
  const proposed = designShownOfEntry(proposal, entry, where)
  const current = row.current ? designShownOfVersion(index, row.current) : undefined
  const decidable = proposal.status === 'open' || proposal.status === 'alternative'
  return (
    <div className="grid grid-cols-1 gap-3 border-b border-(--border-subtle) pb-3 @2xl:grid-cols-[minmax(130px,180px)_1fr_1fr] @2xl:items-start">
      <div className="flex flex-col gap-1">
        <span className="text-[13px] font-semibold text-(--text-primary)">{where || '—'}</span>
        <span className="text-[12px] text-(--text-secondary)">{entry.variant}</span>
        <DesignPill tone={MARK_TONES[row.mark]}>{DESIGN_COMPARE_MARK_LABELS[row.mark]}</DesignPill>
        {entry.accepted ? (
          <DesignPill tone="done">{DESIGN_PROPOSAL_STATUS_LABELS.accepted}</DesignPill>
        ) : null}
        {row.mark === 'unfiled' && decidable ? (
          <FileForm
            targets={targets}
            onFile={(target) => props.onFile(proposal.id, entry.id, target)}
          />
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-(--text-muted)">
          {DESIGN_TEXT.current}
          {row.current ? ` · v${row.current.number}` : ''}
        </span>
        {current ? (
          <button type="button" className="self-start" onClick={() => props.onOpen(current)}>
            <DesignFileThumb shown={current} src={props.srcOf(current)} width={208} />
          </button>
        ) : (
          <div
            className="flex items-center justify-center rounded-md border border-dashed border-(--border-default) text-[12px] text-(--text-muted)"
            style={{ width: 208, height: 156 }}
          >
            {row.mark === 'new-screen' || row.mark === 'unfiled' ? DESIGN_TEXT.noCurrent : '—'}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-2 text-[11px] text-(--text-muted)">
          {DESIGN_TEXT.proposed}
          {current ? (
            <button
              type="button"
              className="text-(--accent-primary) underline"
              onClick={() => props.onCompare(current, proposed)}
            >
              {DESIGN_TEXT.compareWithCurrent}
            </button>
          ) : null}
        </span>
        <Marked
          shown={proposed}
          entry={entry}
          piece={piece}
          srcOf={props.srcOf}
          width={208}
          onOpen={props.onOpen}
        />
      </div>
    </div>
  )
}

/** Following a proposal's links from image to image, as the person would through the screens. */
function ClickThrough({
  proposal,
  rows,
  piece,
  props,
}: {
  proposal: DesignProposal
  rows: DesignCompareRow[]
  piece: string | undefined
  props: DesignProposalsProps
}) {
  const [at, setAt] = useState(proposal.entries[0]?.id)
  const [trail, setTrail] = useState<string[]>([])
  const entry = proposal.entries.find((e) => e.id === at) ?? proposal.entries[0]
  if (!entry) return null
  const label = (id: string) => {
    const row = rows.find((r) => r.entryId === id)
    return [row?.screenName, row?.stateName].filter(Boolean).join(' › ') || id
  }
  const shown = designShownOfEntry(proposal, entry, label(entry.id))
  const width = 560
  const marks = piece ? entry.pieces.filter((m) => m.pieceId === piece) : []
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        {trail.map((id) => (
          <span key={id} className="text-(--text-secondary)">
            {label(id)} ›
          </span>
        ))}
        <span className="font-semibold text-(--status-running-soft-fg)">{label(entry.id)}</span>
        <Button
          size="sm"
          variant="secondary"
          className="ml-auto"
          disabled={trail.length === 0}
          onClick={() => {
            setAt(trail[trail.length - 1])
            setTrail(trail.slice(0, -1))
          }}
        >
          ← {DESIGN_TEXT.back}
        </Button>
      </div>
      <div className="relative self-start">
        <DesignFileThumb shown={shown} src={props.srcOf(shown)} width={width} />
        {marks.map((m, i) => (
          <span
            key={`m${i}`}
            aria-hidden="true"
            className="pointer-events-none absolute rounded border-2"
            style={{
              left: `${m.x * 100}%`,
              top: `${m.y * 100}%`,
              width: `${m.w * 100}%`,
              height: `${m.h * 100}%`,
              borderColor: 'var(--status-working-soft-fg)',
            }}
          />
        ))}
        {entry.links.map((l, i) => (
          <button
            key={i}
            type="button"
            title={l.label}
            aria-label={l.label}
            onClick={() => {
              setTrail([...trail, entry.id])
              setAt(l.toEntryId)
            }}
            className="absolute rounded-md border-2"
            style={{
              left: `${l.x * 100}%`,
              top: `${l.y * 100}%`,
              width: `${l.w * 100}%`,
              height: `${l.h * 100}%`,
              borderColor: 'var(--status-running-soft-fg)',
              background: 'var(--status-running-soft-bg)',
            }}
          >
            <span
              className="absolute -top-5 left-0 rounded px-1.5 text-[11px] font-semibold whitespace-nowrap text-white"
              style={{ background: 'var(--status-running-soft-fg)' }}
            >
              {l.label}
            </span>
          </button>
        ))}
      </div>
      <span className="text-[12px] text-(--text-secondary)">{DESIGN_TEXT.clickThroughHint}</span>
    </div>
  )
}

/** The answers to the proposal's question as a draft's cases: a row per choice, a column per variant. */
function Cases({
  index,
  proposal,
  props,
}: {
  index: DesignIndex
  proposal: DesignProposal
  props: DesignProposalsProps
}) {
  const matrix = proposal.question
    ? designCaseMatrix(index, proposal.appId, proposal.question)
    : undefined
  if (!matrix) return null
  const chosen = matrix.rows.find(
    (r) => r.proposal.status === 'open' || r.proposal.status === 'accepted',
  )
  const settled =
    matrix.rows.filter((r) => r.proposal.status === 'alternative').length === matrix.rows.length - 1
  return (
    <div className="overflow-x-auto rounded-lg border border-(--border-subtle) p-2">
      <table className="border-separate border-spacing-2">
        <thead>
          <tr>
            <th />
            {matrix.variants.map((v) => (
              <th key={v} className="text-left text-[12px] font-medium text-(--text-secondary)">
                {v}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((r) => {
            const isChosen = settled && chosen?.proposal.id === r.proposal.id
            const kept = settled && r.proposal.status === 'alternative'
            return (
              <tr key={r.proposal.id} style={kept ? { opacity: 0.55 } : undefined}>
                <td className="max-w-48 align-top">
                  <button
                    type="button"
                    onClick={() => props.onSelect(r.proposal.id)}
                    className="text-left text-[13px] font-semibold text-(--text-primary) hover:underline"
                  >
                    {r.proposal.title}
                  </button>
                  <div className="mt-1">
                    {r.proposal.status === 'accepted' ? (
                      <DesignPill tone="done">{DESIGN_PROPOSAL_STATUS_LABELS.accepted}</DesignPill>
                    ) : isChosen ? (
                      <DesignPill tone="done">✓ {DESIGN_TEXT.chosen}</DesignPill>
                    ) : kept ? (
                      <DesignPill tone="empty">{DESIGN_TEXT.keptAsAlternative}</DesignPill>
                    ) : r.proposal.status === 'sent-back' ? (
                      <DesignPill tone="on_hold">
                        {DESIGN_PROPOSAL_STATUS_LABELS['sent-back']}
                      </DesignPill>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void props.onChoose(r.proposal.id)}
                      >
                        {DESIGN_TEXT.chooseDirection}
                      </Button>
                    )}
                  </div>
                </td>
                {r.cells.map((e, i) => (
                  <td key={i} className="align-top">
                    {e ? (
                      <button
                        type="button"
                        onClick={() => props.onOpen(designShownOfEntry(r.proposal, e))}
                      >
                        <DesignFileThumb
                          shown={designShownOfEntry(r.proposal, e)}
                          src={props.srcOf(designShownOfEntry(r.proposal, e))}
                          width={160}
                        />
                      </button>
                    ) : (
                      <span className="text-[12px] text-(--text-muted)">—</span>
                    )}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** The decision a person makes on an open proposal, or what was decided. */
function Decide({
  proposal,
  props,
  unfiled,
}: {
  proposal: DesignProposal
  props: DesignProposalsProps
  unfiled: number
}) {
  const [noting, setNoting] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<string | undefined>(undefined)
  const act = async (key: string, call: () => Promise<unknown>) => {
    setBusy(key)
    try {
      await call()
    } finally {
      setBusy(undefined)
    }
  }
  if (proposal.status === 'accepted') {
    return (
      <p
        className="rounded-md border px-3 py-2 text-[13px]"
        style={{
          background: 'var(--status-done-soft-bg)',
          borderColor: 'var(--status-done-soft-border)',
        }}
      >
        {DESIGN_TEXT.accepted}
      </p>
    )
  }
  if (proposal.status === 'sent-back') {
    return (
      <p
        className="rounded-md border px-3 py-2 text-[13px]"
        style={{
          background: 'var(--status-on_hold-soft-bg)',
          borderColor: 'var(--status-on_hold-soft-border)',
        }}
      >
        {DESIGN_TEXT.sentBack}
        {proposal.note ? (
          <span className="mt-1 block text-(--text-secondary)">“{proposal.note}”</span>
        ) : null}
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          disabled={unfiled > 0}
          title={unfiled > 0 ? DESIGN_TEXT.notFiled : undefined}
          loading={busy === 'accept'}
          onClick={() => void act('accept', () => props.onAccept(proposal.id))}
        >
          {DESIGN_TEXT.acceptAll}
        </Button>
        {proposal.status === 'open' ? (
          <Button
            variant="secondary"
            loading={busy === 'keep'}
            onClick={() => void act('keep', () => props.onKeep(proposal.id))}
          >
            {DESIGN_TEXT.keepAlternative}
          </Button>
        ) : null}
        <Button variant="secondary" onClick={() => setNoting((n) => !n)} aria-expanded={noting}>
          {DESIGN_TEXT.sendBack}
        </Button>
      </div>
      {noting ? (
        <form
          className="flex flex-col gap-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            if (!note.trim()) return
            void act('send', () => props.onSendBack(proposal.id, note.trim()))
          }}
        >
          <label
            className="text-[12px] font-medium text-(--text-secondary)"
            htmlFor={`note-${proposal.id}`}
          >
            {DESIGN_TEXT.sendBackLabel}
          </label>
          <Textarea
            id={`note-${proposal.id}`}
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            disabled={!note.trim()}
            loading={busy === 'send'}
            className="self-start"
          >
            {DESIGN_TEXT.sendBackSubmit}
          </Button>
        </form>
      ) : null}
    </div>
  )
}

/**
 * An app's proposals: everything not accepted yet — agents' images, HTML
 * drafts, run captures, earlier versions brought back — grouped as waiting,
 * answers to one question, or decided. The one open is compared with what is
 * current screen by screen, or followed through its links; it is accepted,
 * kept as an alternative, or sent back with a note.
 */
export default function DesignProposals(props: DesignProposalsProps) {
  const { index, appId, proposal } = props
  const [view, setView] = useState<'compare' | 'flow'>(props.initialView ?? 'compare')
  const [piece, setPiece] = useState<string | undefined>(props.initialPiece)
  const groups = designProposalGroups(index, appId)
  if (groups.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-(--border-default) px-3 py-8 text-center text-[13px] text-(--text-muted)">
        {DESIGN_TEXT.proposalsEmpty}
      </p>
    )
  }
  const rows = proposal ? designCompareRows(index, proposal) : []
  const targets = designFileTargets(index, appId)
  const linked = !!proposal?.entries.some((e) => e.links.length > 0)
  const unfiled = rows.filter((r) => r.mark === 'unfiled').length
  return (
    <div className="flex flex-col gap-4 @4xl:flex-row @4xl:items-start">
      <nav
        aria-label={DESIGN_TEXT.propose}
        className="flex w-full shrink-0 flex-col gap-2 @4xl:w-72"
      >
        {groups.map((g) => (
          <section key={g.key} className="flex flex-col gap-1.5">
            <h4 className="pt-1 text-[11px] font-semibold tracking-wide text-(--text-muted) uppercase">
              {g.title}
            </h4>
            {g.items.map(({ proposal: p, summary }) => (
              <button
                key={p.id}
                type="button"
                aria-current={p.id === proposal?.id ? 'true' : undefined}
                onClick={() => props.onSelect(p.id)}
                className={[
                  'flex flex-col gap-1 rounded-lg border px-3 py-2 text-left',
                  p.id === proposal?.id
                    ? 'border-(--accent-primary) bg-(--surface-hover)'
                    : 'border-(--border-subtle) hover:border-(--border-default)',
                ].join(' ')}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="text-[13px] font-semibold text-(--text-primary)">{p.title}</span>
                  <DesignPill tone={PROPOSAL_TONES[p.status]}>
                    {DESIGN_PROPOSAL_STATUS_LABELS[p.status]}
                  </DesignPill>
                </span>
                <span className="text-[12px] text-(--text-secondary)">
                  {designOriginText(p.origin)} · {formatDateShort(new Date(p.createdAt))}
                </span>
                <span className="text-[12px] text-(--text-primary)">{summary}</span>
              </button>
            ))}
          </section>
        ))}
      </nav>

      {proposal ? (
        <section
          className="@container flex min-w-0 flex-1 flex-col gap-4 rounded-lg border border-(--border-subtle) p-4"
          style={{ background: 'var(--surface-raised)' }}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <h3 className="text-[16px] font-semibold text-(--text-primary)">{proposal.title}</h3>
              <span className="text-[12px] text-(--text-secondary)">
                {designOriginText(proposal.origin)} ·{' '}
                {formatDateShort(new Date(proposal.createdAt))}
              </span>
            </div>
            {linked ? (
              <SegmentedControl
                size="sm"
                ariaLabel="View"
                value={view}
                onChange={(v) => setView(v as 'compare' | 'flow')}
                options={[
                  { value: 'compare', label: DESIGN_TEXT.compareWithCurrent },
                  { value: 'flow', label: DESIGN_TEXT.clickThrough },
                ]}
              />
            ) : null}
          </div>

          {proposal.question && proposal.status === 'alternative' ? (
            <p className="rounded-md border border-(--border-subtle) bg-(--surface-muted) px-3 py-2 text-[12.5px] text-(--text-secondary)">
              {DESIGN_TEXT.alternativeNote(proposal.question)}
            </p>
          ) : null}

          <Cases index={index} proposal={proposal} props={props} />

          {proposal.pieces.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[12px] text-(--text-muted)">{DESIGN_TEXT.sharedPieces}</span>
              {proposal.pieces.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={piece === p.id}
                  onClick={() => setPiece(piece === p.id ? undefined : p.id)}
                  className="rounded-full border px-2.5 py-0.5 text-[12px]"
                  style={
                    piece === p.id
                      ? {
                          borderColor: 'var(--status-working-soft-border)',
                          background: 'var(--status-working-soft-bg)',
                          color: 'var(--status-working-soft-fg)',
                        }
                      : { borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
          ) : null}

          {view === 'flow' && linked ? (
            <ClickThrough
              key={proposal.id}
              proposal={proposal}
              rows={rows}
              piece={piece}
              props={props}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {rows.map((row) => {
                const entry = proposal.entries.find((e) => e.id === row.entryId)!
                return (
                  <CompareRow
                    key={row.entryId}
                    index={index}
                    proposal={proposal}
                    row={row}
                    entry={entry}
                    piece={piece}
                    props={props}
                    targets={targets}
                  />
                )
              })}
            </div>
          )}

          <Decide key={proposal.id} proposal={proposal} props={props} unfiled={unfiled} />
        </section>
      ) : null}
    </div>
  )
}
