/**
 * One step in a process step-chain: a name, and a dot that says whether a model
 * runs here. An agent step — the one place a run spends tokens — carries a
 * filled purple dot; every function step a hollow grey one. That single mark is
 * what makes the cost shape of a plan legible at a glance, and it is shared by
 * the launch dock (the proposal) and the Processes catalogue so the two cannot
 * draw the same chain two different ways.
 */
export type ChainChipItem = { name: string; agent: boolean }

export default function ChainChip({ chip }: { chip: ChainChipItem }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-(--border-default) bg-(--surface-base) px-2 py-px text-[11px] text-(--text-secondary)">
      <span
        aria-hidden
        className="inline-block size-1.5 shrink-0 rounded-full"
        style={{
          background: chip.agent ? 'var(--color-purple-650)' : 'transparent',
          border: chip.agent ? 'none' : '1.5px solid var(--text-muted)',
        }}
      />
      {chip.name}
    </span>
  )
}
