import Tooltip from '../../primitives/Tooltip'
import { CHIP_PILL_NEUTRAL } from './pillStyles'

export type CostChipProps = {
  provider: string
  model: string
  price?: {
    inputPerMTokensUSD: number
    outputPerMTokensUSD: number
  }
  costUSD?: number
  /** Executor that produced this cost — renders a small API/CLI pill when set. */
  source?: 'api' | 'cli'
}

function formatUSD(n?: number) {
  if (n == null) return '—'
  return `$${n.toFixed(4)}`
}

export default function CostChip({ provider, model, price, costUSD, source }: CostChipProps) {
  const content = (
    <div className="text-xs">
      <div className="font-semibold mb-1">
        {provider || 'Unknown'} · {model || 'Unknown'}
        {source ? ` · ${source.toUpperCase()}` : ''}
      </div>
      {price ? (
        <div className="space-y-0.5">
          <div>
            <span className="text-neutral-400">Input:</span> {`$${price.inputPerMTokensUSD}`} per 1M
            tokens
          </div>
          <div>
            <span className="text-neutral-400">Output:</span> {`$${price.outputPerMTokensUSD}`} per
            1M tokens
          </div>
        </div>
      ) : (
        <div className="text-neutral-400">Pricing unavailable</div>
      )}
    </div>
  )

  return (
    <Tooltip content={content} placement="top">
      <span className={`inline-flex items-center gap-1 ${CHIP_PILL_NEUTRAL}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden />
        <span>{formatUSD(costUSD)}</span>
        {source ? (
          <span
            className={`text-[9px] font-semibold uppercase ${source === 'cli' ? 'text-violet-500' : 'text-neutral-400'}`}
          >
            {source}
          </span>
        ) : null}
      </span>
    </Tooltip>
  )
}
