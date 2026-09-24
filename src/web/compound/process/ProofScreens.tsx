import { useEffect } from 'react'

import type {
  EvidenceTile,
  ProofPairView,
  ProofScreenView,
  ProofUnpairedView,
  VerifyProofTone,
  VerifyProofView,
} from '../../../headless'
import { IconCheck } from '../../icons'

export type ProofScreensProps = {
  view: VerifyProofView
  /** Opens the comparison overlay on a pair or new screen, by its key. */
  onOpen: (key: string) => void
  onRequestImage: (id: string, mediaType: string) => void
}

const SUMMARY_TONE: Record<VerifyProofTone, string> = {
  done: 'text-(--status-done-soft-fg)',
  working: 'text-(--status-working-soft-fg)',
  stuck: 'text-(--status-stuck-soft-fg)',
  empty: 'text-(--text-secondary)',
}

/**
 * One capture, or what stands in its place — a pulse while its bytes decode,
 * and otherwise the headless word for why it is absent: still loading, a
 * listing that failed, or genuinely not in the store.
 */
function Frame({
  tile,
  absent,
  label,
  className,
}: {
  tile: EvidenceTile | undefined
  absent: string | undefined
  label: string
  className: string
}) {
  return (
    <span
      className={`relative block shrink-0 overflow-hidden rounded-md border border-(--border-default) bg-(--surface-muted) ${className}`}
    >
      {tile?.dataUri ? (
        <img
          src={tile.dataUri}
          alt={label}
          className="block h-full w-full object-cover object-top"
        />
      ) : tile ? (
        <span className="block h-full w-full animate-pulse bg-(--surface-muted)" />
      ) : (
        <span className="flex h-full w-full items-center justify-center border border-dashed border-(--border-default) p-1 text-center text-[9.5px] text-(--text-muted)">
          {absent}
        </span>
      )}
    </span>
  )
}

function FrameCaption({ word }: { word: string }) {
  return (
    <span className="text-center text-[10px] font-medium uppercase tracking-wide text-(--text-muted)">
      {word}
    </span>
  )
}

function GroupHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
        {title}
      </span>
      {hint ? <span className="text-[11.5px] text-(--text-secondary)">{hint}</span> : null}
    </div>
  )
}

/** A pair the pass rested on: both frames side by side, big enough to judge, one tap from the diff. */
function CountedPair({ pair, onOpen }: { pair: ProofPairView; onOpen: (key: string) => void }) {
  return (
    <div className="flex w-[292px] max-w-full flex-col gap-2 rounded-lg border border-(--status-done-soft-border) bg-(--surface-raised) p-2.5">
      <button
        type="button"
        onClick={() => onOpen(pair.key)}
        aria-label={`Compare ${pair.subject}`}
        className="flex gap-2 rounded-md text-left hover:opacity-90"
      >
        <span className="flex flex-col gap-1">
          <Frame
            tile={pair.before}
            absent={pair.beforeAbsent}
            label={`${pair.subject} — before`}
            className="h-[236px] w-[132px]"
          />
          <FrameCaption word="Before" />
        </span>
        <span className="flex flex-col gap-1">
          <Frame
            tile={pair.after}
            absent={pair.afterAbsent}
            label={`${pair.subject} — after`}
            className="h-[236px] w-[132px]"
          />
          <FrameCaption word="After" />
        </span>
      </button>
      <span
        className="truncate text-[12.5px] font-semibold text-(--text-primary)"
        title={pair.subject}
      >
        {pair.subject}
      </span>
      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-(--status-done-soft-fg)">
        <IconCheck className="size-3.5" />
        {pair.verdict}
      </span>
      <span className="text-[11px] text-(--text-secondary)">
        {pair.change}
        {pair.sameScreen ? ` · ${pair.sameScreen}` : ''}
      </span>
      <button
        type="button"
        onClick={() => onOpen(pair.key)}
        className="self-start text-[11.5px] font-medium text-(--accent-primary) hover:underline"
      >
        Compare and see the diff
      </button>
    </div>
  )
}

/** A pair that did not count: small, muted, with the gate's reason — secondary to the proof. */
function UncountedPair({ pair, onOpen }: { pair: ProofPairView; onOpen: (key: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(pair.key)}
      aria-label={`Compare ${pair.subject} — did not count`}
      className="flex w-full items-start gap-2.5 rounded-md border border-(--border-subtle) bg-(--surface-base) p-2 text-left hover:border-(--border-default)"
    >
      <span className="flex shrink-0 gap-1 opacity-75">
        <Frame
          tile={pair.before}
          absent={pair.beforeAbsent}
          label={`${pair.subject} — before`}
          className="h-[80px] w-[45px]"
        />
        <Frame
          tile={pair.after}
          absent={pair.afterAbsent}
          label={`${pair.subject} — after`}
          className="h-[80px] w-[45px]"
        />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span
          className="truncate text-[12px] font-medium text-(--text-secondary)"
          title={pair.subject}
        >
          {pair.subject}
        </span>
        <span className="inline-flex items-start gap-1.5 text-[11.5px] text-(--text-secondary)">
          <span
            aria-hidden
            className="mt-1 size-2 shrink-0 rounded-full border-[1.5px] border-(--text-muted)"
          />
          <span>{pair.verdict}</span>
        </span>
        <span className="text-[10.5px] text-(--text-muted)">
          {pair.change}
          {pair.sameScreen ? ` · ${pair.sameScreen}` : ''}
        </span>
      </span>
    </button>
  )
}

/** A screen the change adds, beside the entry point on the base it opens from when the gate recorded one. */
function NewScreen({ screen, onOpen }: { screen: ProofScreenView; onOpen: (key: string) => void }) {
  const hasEntry = screen.entryPoint !== undefined || screen.entryPointAbsent !== undefined
  return (
    <button
      type="button"
      onClick={() => onOpen(screen.key)}
      aria-label={`Open ${screen.title}`}
      className="flex max-w-full shrink-0 flex-col gap-1 text-left"
    >
      <span className="flex items-end gap-1.5">
        {hasEntry ? (
          <span className="flex flex-col gap-1 opacity-80">
            <Frame
              tile={screen.entryPoint}
              absent={screen.entryPointAbsent}
              label={`${screen.title} — where it opens from on the base`}
              className="h-[140px] w-[79px]"
            />
            <FrameCaption word="Opens from" />
          </span>
        ) : null}
        <span className="flex flex-col gap-1">
          <Frame
            tile={screen.tile}
            absent={screen.absent}
            label={screen.title}
            className="h-[196px] w-[110px]"
          />
          {hasEntry ? <FrameCaption word="New screen" /> : null}
        </span>
      </span>
      <span
        className="max-w-[196px] truncate text-[10.5px] text-(--text-secondary)"
        title={screen.title}
      >
        {screen.title}
      </span>
    </button>
  )
}

/** An after filed with no before of its subject: shown with the gate's reason, never as proof. */
function UnpairedAfter({
  item,
  onOpen,
}: {
  item: ProofUnpairedView
  onOpen: (key: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item.key)}
      aria-label={`Open ${item.subject} — did not count`}
      className="flex w-full items-start gap-2.5 rounded-md border border-(--border-subtle) bg-(--surface-base) p-2 text-left hover:border-(--border-default)"
    >
      <span className="shrink-0 opacity-75">
        <Frame
          tile={item.after}
          absent={item.afterAbsent}
          label={`${item.subject} — after`}
          className="h-[80px] w-[45px]"
        />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span
          className="truncate text-[12px] font-medium text-(--text-secondary)"
          title={item.subject}
        >
          {item.subject}
        </span>
        <span className="inline-flex items-start gap-1.5 text-[11.5px] text-(--text-secondary)">
          <span
            aria-hidden
            className="mt-1 size-2 shrink-0 rounded-full border-[1.5px] border-(--text-muted)"
          />
          <span>{item.reason}</span>
        </span>
      </span>
    </button>
  )
}

/**
 * Exactly the screens a verify gate judged — never a regrouping of everything
 * filed. The pairs the pass rested on lead, side by side; the screens the change
 * adds follow, beside where they open from; the pairs and lone afters that did
 * not count come last, muted, each with the gate's own reason, so a reader sees
 * what was rejected and why without it reading as proof.
 */
export default function ProofScreens({ view, onOpen, onRequestImage }: ProofScreensProps) {
  useEffect(() => {
    for (const pair of view.pairs) {
      if (pair.before) onRequestImage(pair.before.ref.id, pair.before.ref.mediaType)
      if (pair.after) onRequestImage(pair.after.ref.id, pair.after.ref.mediaType)
    }
    for (const screen of view.newScreens) {
      if (screen.tile) onRequestImage(screen.tile.ref.id, screen.tile.ref.mediaType)
      if (screen.entryPoint)
        onRequestImage(screen.entryPoint.ref.id, screen.entryPoint.ref.mediaType)
    }
    for (const item of view.unpaired) {
      if (item.after) onRequestImage(item.after.ref.id, item.after.ref.mediaType)
    }
  }, [view, onRequestImage])

  const counted = view.pairs.filter((p) => p.counted)
  const uncounted = view.pairs.filter((p) => !p.counted)
  const notCounted = uncounted.length + view.unpaired.length

  return (
    <div className="flex flex-col gap-3">
      <span className={`text-[12.5px] font-semibold ${SUMMARY_TONE[view.summary.tone]}`}>
        {view.summary.text}
      </span>

      {counted.length > 0 ? (
        <div className="flex flex-col gap-2">
          <GroupHead title="Shows the change" hint="The pairs this verification rests on." />
          <div className="flex flex-wrap gap-3">
            {counted.map((p) => (
              <CountedPair key={p.key} pair={p} onOpen={onOpen} />
            ))}
          </div>
        </div>
      ) : null}

      {view.newScreens.length > 0 ? (
        <div className="flex flex-col gap-2">
          <GroupHead
            title="Screens the change adds"
            hint="These did not exist on the base, so each is shown beside where it opens from there, when that was captured — and counts on the reviewer’s approval of what it shows."
          />
          <div className="flex flex-wrap gap-3">
            {view.newScreens.map((s) => (
              <NewScreen key={s.key} screen={s} onOpen={onOpen} />
            ))}
          </div>
        </div>
      ) : null}

      {notCounted > 0 ? (
        <div className="flex flex-col gap-2">
          <GroupHead
            title={`Did not count (${notCounted})`}
            hint="Filed, but not proof of the change — the gate’s reason is under each."
          />
          <div className="flex flex-col gap-1.5">
            {uncounted.map((p) => (
              <UncountedPair key={p.key} pair={p} onOpen={onOpen} />
            ))}
            {view.unpaired.map((u) => (
              <UnpairedAfter key={u.key} item={u} onOpen={onOpen} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
