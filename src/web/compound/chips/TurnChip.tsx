import { CHIP_PILL_NEUTRAL } from './pillStyles'

export default function TurnChip({ turn }: { turn: number }) {
  return (
    <span className={`inline-flex items-center gap-1 ${CHIP_PILL_NEUTRAL}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500" aria-hidden />
      <span>T{turn}</span>
    </span>
  )
}
