import { describe, expect, it } from 'vitest'
import type { CliRun, ModelSpend, ProcessEntryCost } from 'thefactory-tools/types'
import {
  processEntryCostFromSpends,
  roundMoneyUSD,
  sumProcessEntryCosts,
} from 'thefactory-tools/utils'

import {
  addCost,
  cliRunCost,
  cliRunMessageUsage,
  cliRunSpendRecord,
  costChipLabel,
  costDetailsView,
  formatCostUSD,
  isListPartial,
  isUnreported,
  messageUsageCost,
  notReportedBy,
  pickCost,
  reportingToolOf,
} from './costDetails'
import {
  COST_NOTE_AUTO,
  COST_NOTE_NO_MODELS,
  COST_NOTE_OVERAGE,
  COST_NOTE_PENDING,
  COST_NOTE_UNPRICED,
  COST_NOTE_UNRECORDED_BILLING,
} from './costDetailsConstants'
import type { CliRunCostSource, CliRunSpendRecord, CostSource, CostSpend } from './costDetailsTypes'

/** A run record as the API returns it: the cost fields, and the charge it recorded beside them. */
type RunRecord = CliRunCostSource & Partial<Pick<CliRun, 'costUSD' | 'durationMs'>>

/**
 * Fixtures are real run records from `.factory/cli-runs`, as they sit on disk:
 * a Cursor run orphaned mid-flight (thefactory-templates-plasticfree/3a93ae9a),
 * a Cursor run asked for Auto (covision-android/19ca191b, whose recorded $0
 * meant "no price found") and a Claude Code run on a claude.ai login
 * (covision-android/88342735, whose recorded $0.32 is Claude Code's list-price
 * estimate). Then the shapes the runner writes now that billing and per-model
 * spend are kept: a stamped subscription run, a Cursor ACP turn that reported
 * no tokens, and a metered run still in flight. Composer 2.5's list price is
 * Cursor's published $0.50 in / $0.20 cache read / $2.50 out per 1M.
 */
const cursorOnDisk: RunRecord = {
  cli: { tool: 'cursor-agent', version: '' },
  status: 'paused',
  modelId: 'composer-2.5',
  usage: { tokensIn: 5825, tokensOut: 860, cacheReadTokens: 8016, cacheCreationTokens: 0 },
}

const cursorAutoOnDisk: RunRecord = {
  cli: { tool: 'cursor-agent', version: '' },
  status: 'succeeded',
  modelId: 'auto',
  usage: { tokensIn: 28_394, tokensOut: 1346, cacheReadTokens: 57_856, cacheCreationTokens: 0 },
  costUSD: 0,
  durationMs: 22_307,
}

const claudeOnDisk: RunRecord = {
  cli: { tool: 'claude-code', version: '2.1.258' },
  status: 'succeeded',
  usage: { tokensIn: 36, tokensOut: 6623, cacheReadTokens: 1_248_888, cacheCreationTokens: 52_624 },
  costUSD: 0.3160796,
  durationMs: 109_508,
}

const composerSpend: ModelSpend = {
  provider: 'cursor',
  model: 'composer-2.5',
  label: 'Composer 2.5',
  billing: 'subscription',
  inputTokens: 5825,
  outputTokens: 860,
  cacheReadTokens: 8016,
  cacheWriteTokens: 0,
  costUsd: 0,
  listCostUsd: 0.0066657,
}

const cursorRun: RunRecord = {
  ...cursorOnDisk,
  status: 'succeeded',
  durationMs: 21_852,
  costUSD: 0,
  billing: 'subscription',
  reportedModel: 'Composer 2.5',
  modelUsage: [composerSpend],
}

const sonnetSpend: ModelSpend = {
  provider: 'anthropic',
  model: 'claude-sonnet-5',
  billing: 'subscription',
  inputTokens: 36,
  outputTokens: 6623,
  cacheReadTokens: 1_248_888,
  cacheWriteTokens: 52_624,
  costUsd: 0,
  listCostUsd: 0.5265756,
}

const claudeRun: RunRecord = {
  ...claudeOnDisk,
  costUSD: 0,
  billing: 'subscription',
  reportedModel: 'claude-sonnet-5',
  modelUsage: [sonnetSpend],
}

const codexUnpriced: ModelSpend = {
  provider: 'openai',
  model: 'gpt-5.5-codex',
  billing: 'metered',
  inputTokens: 40_120,
  outputTokens: 3_010,
  cacheReadTokens: 88_064,
  cacheWriteTokens: 0,
}

const sonnetMetered: ModelSpend = {
  ...sonnetSpend,
  billing: 'metered',
  costUsd: 0.5265756,
}

/** A resident Cursor ACP turn, as the runner stamps it: the model and billing, no token counts. */
const cursorAcpTurn: RunRecord = {
  cli: { tool: 'cursor-agent', version: '' },
  status: 'succeeded',
  modelId: 'auto',
  reportedModel: 'Auto',
  billing: 'subscription',
  tokensNotReported: true,
  costUSD: 0,
  durationMs: 4_210,
}

/** A metered Claude Code run mid-flight: its record carries tokens and billing, its charge lands at the end. */
const claudeInFlight: RunRecord = {
  cli: { tool: 'claude-code', version: '2.1.258' },
  status: 'running',
  billing: 'metered',
  reportedModel: 'claude-sonnet-5',
  usage: { tokensIn: 36, tokensOut: 6623, cacheReadTokens: 1_248_888, cacheCreationTokens: 52_624 },
}

/**
 * Run 88342735's first message, cut off before Claude Code's `result` line and
 * stamped at a restart: its input and cache counts are real, its output count
 * a placeholder the runner does not report.
 */
const claudeCutShortSpend: ModelSpend = {
  provider: 'anthropic',
  model: 'claude-sonnet-5',
  billing: 'subscription',
  inputTokens: 2,
  outputTokens: 0,
  cacheReadTokens: 30_935,
  cacheWriteTokens: 10_995,
  costUsd: 0,
  outputTokensNotReported: true,
}

const claudeCutShort: RunRecord = {
  cli: { tool: 'claude-code', version: '2.1.258' },
  status: 'paused',
  billing: 'subscription',
  reportedModel: 'claude-sonnet-5',
  usage: {
    tokensIn: 2,
    tokensOut: 0,
    cacheReadTokens: 30_935,
    cacheCreationTokens: 10_995,
    outputTokensNotReported: true,
  },
  costUSD: 0,
  modelUsage: [claudeCutShortSpend],
}

/**
 * The same turn while it still streams, as the runner keeps its record before
 * the `result` line (`ClaudeStreamedUsage`): the input and cache counts it has
 * read so far, its output a zero placeholder marked as not reported YET.
 */
const claudeStreaming: RunRecord = {
  cli: { tool: 'claude-code', version: '2.1.258' },
  status: 'running',
  billing: 'metered',
  reportedModel: 'claude-sonnet-5',
  usage: {
    tokensIn: 2,
    tokensOut: 0,
    cacheReadTokens: 30_935,
    cacheCreationTokens: 10_995,
    outputTokensNotReported: true,
  },
}

const CLAUDE_OUTPUT_PENDING = 'Claude Code has not reported how many output tokens it used yet.'

const { costUsd: _charged, ...claudeCutShortUncharged } = claudeCutShortSpend

/** The same cut-off turn on an API key: with its output unknown, its charge is unknown too. */
const claudeCutShortMetered: ModelSpend = { ...claudeCutShortUncharged, billing: 'metered' }

const CURSOR_TURN_NOT_REPORTED =
  'Cursor did not report token counts for this turn: they are unknown, not zero, and left out of the totals.'

const CLAUDE_OUTPUT_NOT_REPORTED =
  'Claude Code stopped before reporting how many output tokens it used: that output is unknown, not zero, and has no list value.'

describe('formatCostUSD', () => {
  it('drops out when unrecorded or nonsensical', () => {
    expect(formatCostUSD(undefined)).toBeUndefined()
    expect(formatCostUSD(Number.NaN)).toBeUndefined()
    expect(formatCostUSD(Number.POSITIVE_INFINITY)).toBeUndefined()
    expect(formatCostUSD(-1)).toBeUndefined()
  })

  it('keeps four decimals under a cent so sub-cent runs stay visible', () => {
    expect(formatCostUSD(0.0012)).toBe('$0.0012')
    expect(formatCostUSD(0.009)).toBe('$0.0090')
  })

  it('uses two decimals from a cent up', () => {
    expect(formatCostUSD(0)).toBe('$0.00')
    expect(formatCostUSD(0.01)).toBe('$0.01')
    expect(formatCostUSD(1.234)).toBe('$1.23')
  })
})

describe('reportingToolOf', () => {
  it('names the CLI that ran a model, from the price provider or the CLI a row is listed under', () => {
    expect(reportingToolOf('cursor')).toBe('Cursor')
    expect(reportingToolOf('cursor-agent')).toBe('Cursor')
    expect(reportingToolOf('anthropic')).toBe('Claude Code')
    expect(reportingToolOf('claude-code')).toBe('Claude Code')
    expect(reportingToolOf('openai')).toBe('Codex')
    expect(reportingToolOf('codex')).toBe('Codex')
  })

  it('names the CLI plainly when the row names no provider a CLI is priced under', () => {
    expect(reportingToolOf('unknown')).toBe('the CLI')
  })
})

describe('notReportedBy', () => {
  it('names one tool, two joined by "and", and a list with a final "and"', () => {
    expect(notReportedBy(['Cursor'])).toBe('Not reported by Cursor')
    expect(notReportedBy(['Cursor', 'Codex'])).toBe('Not reported by Cursor and Codex')
    expect(notReportedBy(['Cursor', 'Codex', 'Claude Code'])).toBe(
      'Not reported by Cursor, Codex and Claude Code',
    )
  })

  it('reads as a sentence when the tool is unnamed', () => {
    expect(notReportedBy(['the CLI'])).toBe('Not reported by the CLI')
  })
})

describe('isUnreported', () => {
  it('is true only for a row standing for turns that reported no counts', () => {
    const acpRow = cliRunCost(cursorAcpTurn)!.byModel![0]
    expect(isUnreported(acpRow)).toBe(true)
    expect(isUnreported(composerSpend)).toBe(false)
    expect(isUnreported({ ...composerSpend, unreportedTurns: 2 })).toBe(false)
  })
})

describe('costChipLabel', () => {
  it('shows the charge in dollars — a subscription run is a real $0.00', () => {
    expect(costChipLabel({ costUsd: 0, includedTokens: 14_701 })).toBe('$0.00')
    expect(costChipLabel({ costUsd: 1.25 })).toBe('$1.25')
  })

  it('keeps sub-cent spend visible', () => {
    expect(costChipLabel({ costUsd: 0.0012 })).toBe('$0.0012')
  })

  it('never puts a token count on the chip, however many went unpriced', () => {
    const label = costChipLabel({ costUsd: 3, unpricedTokens: 2_500_000, includedTokens: 9_000 })
    expect(label).toBe('$3.00')
    expect(label).not.toMatch(/token/i)
  })

  it('says no price is known when nothing was charged that can be priced', () => {
    expect(costChipLabel({ unpricedTokens: 131_194 })).toBe('No known price')
  })

  it('says a run still in flight has a charge still to come, not an unknown one', () => {
    expect(costChipLabel(cliRunCost(claudeInFlight))).toBe('Charge pending')
  })

  it('says the tokens were not reported when a metered run reported none', () => {
    const codexTurn: RunRecord = {
      cli: { tool: 'codex', version: '0.130.0' },
      status: 'succeeded',
      modelId: 'gpt-5.5-codex',
      billing: 'metered',
      tokensNotReported: true,
    }
    expect(costChipLabel(cliRunCost(codexTurn))).toBe('Not reported')
  })

  it('says the output was not reported, not that no price is known, when a metered run stopped before reporting it', () => {
    const cost = cliRunCost({
      ...claudeCutShort,
      billing: 'metered',
      modelUsage: [claudeCutShortMetered],
    })
    expect(cost?.unpricedTokens).toBe(41_932)
    expect(costChipLabel(cost)).toBe('Not reported')
  })

  it('says not reported when a metered turn that reported nothing sits beside one whose output went unreported', () => {
    const codexTurn: RunRecord = {
      cli: { tool: 'codex', version: '0.130.0' },
      status: 'aborted',
      modelId: 'gpt-5.5-codex',
      billing: 'metered',
      tokensNotReported: true,
    }
    const cost = addCost(
      cliRunCost({ ...claudeCutShort, billing: 'metered', modelUsage: [claudeCutShortMetered] }),
      cliRunCost(codexTurn),
    )
    expect(costChipLabel(cost)).toBe('Not reported')
    expect(costDetailsView(cost)?.notes).not.toContain(COST_NOTE_UNPRICED)
  })

  it('says the counts are still to come, not unreported, on a run in flight whose billing is not settled yet', () => {
    const { billing: _billing, ...unsettled } = claudeStreaming
    expect(costChipLabel(cliRunCost(unsettled))).toBe('Not reported yet')
    const cutOff = cliRunCost({ ...unsettled, status: 'paused' })
    expect(costChipLabel(cutOff)).toBe('Not reported')
    expect(costChipLabel(addCost(cutOff, cliRunCost(unsettled)))).toBe('Not reported')
  })

  it('still says no price is known when a model with no price ran beside one whose output went unreported', () => {
    const cost = cliRunCost({
      ...claudeCutShort,
      billing: 'metered',
      modelUsage: [claudeCutShortMetered, codexUnpriced],
    })
    expect(costChipLabel(cost)).toBe('No known price')
  })

  it('is undefined when nothing was measured', () => {
    expect(costChipLabel({})).toBeUndefined()
    expect(costChipLabel(undefined)).toBeUndefined()
  })
})

describe('cliRunCost', () => {
  it('reads a subscription run as $0 charged with every token included, and its list value', () => {
    expect(cliRunCost(cursorRun)).toEqual({
      costUsd: 0,
      includedTokens: 14_701,
      listCostUsd: 0.0066657,
      byModel: [composerSpend],
    })
  })

  it('counts metered tokens with no price as unpriced, never as $0', () => {
    const cost = cliRunCost({
      cli: { tool: 'codex', version: '0.130.0' },
      status: 'succeeded',
      billing: 'metered',
      modelUsage: [codexUnpriced],
    })
    expect(cost).toEqual({ unpricedTokens: 131_194, byModel: [codexUnpriced] })
  })

  it('keeps a metered run charged at its price', () => {
    const stamped: RunRecord = {
      ...claudeOnDisk,
      billing: 'metered',
      costUSD: 0.5265756,
      modelUsage: [sonnetMetered],
    }
    const cost = cliRunCost(stamped)
    expect(cost?.costUsd).toBe(0.5265756)
    expect(cost?.unpricedTokens).toBeUndefined()
    expect(cost?.includedTokens).toBeUndefined()
    expect(cost?.listCostUsd).toBe(0.5265756)
  })

  it("charges a run what its priced models cost, when another of its models has no price — the runner's own charge is then unknown", () => {
    const haiku: ModelSpend = {
      provider: 'anthropic',
      model: 'claude-haiku-9',
      billing: 'metered',
      inputTokens: 1200,
      outputTokens: 300,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    }
    const sonnet: ModelSpend = { ...sonnetMetered, costUsd: 5, listCostUsd: 5 }
    const { costUSD: _estimate, ...stamped } = claudeOnDisk
    const mixed: RunRecord = { ...stamped, billing: 'metered', modelUsage: [sonnet, haiku] }
    expect(cliRunCost(mixed)).toEqual({
      costUsd: 5,
      unpricedTokens: 1500,
      listCostUsd: 5,
      byModel: [sonnet, haiku],
    })
  })

  it('never reads the charge an older run recorded before billing was kept — it was a list-price estimate', () => {
    const cost = cliRunCost(claudeOnDisk)
    expect(cost).toEqual({
      unpricedTokens: 1_308_171,
      byModel: [
        {
          provider: 'anthropic',
          model: 'unknown',
          inputTokens: 36,
          outputTokens: 6623,
          cacheReadTokens: 1_248_888,
          cacheWriteTokens: 52_624,
        },
      ],
    })
    expect(costChipLabel(cost)).toBe('No known price')
  })

  it("never reads an older Cursor run's recorded $0 as a charge — it meant no price was found", () => {
    const cost = cliRunCost(cursorAutoOnDisk)
    expect(cost?.costUsd).toBeUndefined()
    expect(cost?.unpricedTokens).toBe(87_596)
    expect(cost?.byModel?.[0]).toMatchObject({ provider: 'cursor', model: 'auto' })
    expect(cost?.byModel?.[0].billing).toBeUndefined()
  })

  it('names an older Cursor row by the model the CLI reported, priced under its catalogue id', () => {
    const cost = cliRunCost({ ...cursorOnDisk, modelId: 'auto', reportedModel: 'Composer 2.5' })
    expect(cost?.byModel?.[0]).toMatchObject({
      provider: 'cursor',
      model: 'composer-2.5',
      label: 'Composer 2.5',
    })
  })

  it('reads a subscription run still in flight as $0 charged, its tokens so far included', () => {
    const cost = cliRunCost({
      ...cursorOnDisk,
      status: 'running',
      billing: 'subscription',
      reportedModel: 'Composer 2.5',
    })
    expect(cost).toEqual({
      costUsd: 0,
      includedTokens: 14_701,
      byModel: [
        {
          provider: 'cursor',
          model: 'composer-2.5',
          label: 'Composer 2.5',
          billing: 'subscription',
          inputTokens: 5825,
          outputTokens: 860,
          cacheReadTokens: 8016,
          cacheWriteTokens: 0,
          costUsd: 0,
        },
      ],
    })
  })

  it('leaves the charge of a metered run in flight to its terminal write: pending, not unpriced', () => {
    const cost = cliRunCost(claudeInFlight)
    expect(cost?.costUsd).toBeUndefined()
    expect(cost?.unpricedTokens).toBeUndefined()
    expect(cost?.byModel).toEqual([
      {
        provider: 'anthropic',
        model: 'claude-sonnet-5',
        billing: 'metered',
        inputTokens: 36,
        outputTokens: 6623,
        cacheReadTokens: 1_248_888,
        cacheWriteTokens: 52_624,
        chargePending: true,
      },
    ])
  })

  it('keeps a run blocked on an approval pending: it is still going', () => {
    const blocked = cliRunCost({ ...claudeInFlight, status: 'awaiting-approval' })
    expect(blocked?.byModel?.[0].chargePending).toBe(true)
    expect(costChipLabel(blocked)).toBe('Charge pending')
  })

  it('never calls a run pending whose billing was never settled — its runner will not price it', () => {
    const { billing: _billing, ...unsettled } = claudeInFlight
    const cost = cliRunCost(unsettled)
    expect(cost?.unpricedTokens).toBe(1_308_171)
    expect(cost?.byModel?.[0].chargePending).toBeUndefined()
    expect(cost?.byModel?.[0].billing).toBeUndefined()
  })

  it('reads a run orphaned mid-flight as settled: its charge is unknown, not still to come', () => {
    const cost = cliRunCost({ ...claudeInFlight, status: 'paused' })
    expect(cost?.unpricedTokens).toBe(1_308_171)
    expect(cost?.byModel?.[0].chargePending).toBeUndefined()
  })

  it('reads a turn whose CLI reported no tokens as its model and billing, its tokens not reported — never zero', () => {
    const cost = cliRunCost(cursorAcpTurn)
    expect(cost).toEqual({
      costUsd: 0,
      byModel: [
        {
          provider: 'cursor',
          model: 'auto',
          label: 'Auto',
          billing: 'subscription',
          inputTokens: 0,
          outputTokens: 0,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          costUsd: 0,
          tokensNotReported: true,
        },
      ],
    })
    expect(cost?.includedTokens).toBeUndefined()
  })

  it('reads a subscription turn whose output went unreported as $0 charged, its reported tokens included', () => {
    expect(cliRunCost(claudeCutShort)).toEqual({
      costUsd: 0,
      includedTokens: 41_932,
      byModel: [claudeCutShortSpend],
    })
  })

  it('marks the output of a streaming Claude Code run as still to come, and its charge as pending', () => {
    expect(cliRunCost(claudeStreaming)?.byModel).toEqual([
      {
        provider: 'anthropic',
        model: 'claude-sonnet-5',
        billing: 'metered',
        inputTokens: 2,
        outputTokens: 0,
        cacheReadTokens: 30_935,
        cacheWriteTokens: 10_995,
        outputTokensNotReported: true,
        countsPending: true,
        chargePending: true,
      },
    ])
  })

  it('reads the same streamed usage on a run cut off mid-flight as output never reported', () => {
    const [row] = cliRunCost({ ...claudeStreaming, status: 'paused' })?.byModel ?? []
    expect(row.outputTokensNotReported).toBe(true)
    expect(row.countsPending).toBeUndefined()
  })

  it('keeps the mark on a run still going whose output is not reported yet, and states no list value for it', () => {
    const cost = cliRunCost({
      ...claudeCutShort,
      status: 'running',
      modelUsage: undefined,
    })
    expect(cost?.byModel?.[0]).toMatchObject({ outputTokensNotReported: true, outputTokens: 0 })
    expect(cost?.byModel?.[0].listCostUsd).toBeUndefined()
    expect(cost?.listCostUsd).toBeUndefined()
  })

  it('is undefined for a run that recorded neither tokens nor a charge it can stand behind', () => {
    expect(cliRunCost({ cli: { tool: 'cursor-agent', version: '' } })).toBeUndefined()
    expect(cliRunCost({ usage: { tokensIn: 0, tokensOut: 0, cacheReadTokens: 0 } })).toBeUndefined()
    const chargeOnly: RunRecord = { cli: { tool: 'claude-code', version: '' }, costUSD: 0.42 }
    expect(cliRunCost(chargeOnly)).toBeUndefined()
  })
})

describe('cliRunSpendRecord', () => {
  /**
   * An isolated Cursor implement step as it lands: the runner's own record
   * (ad277190) stamped with its spend, and the review record the orchestrator
   * lands for the step (0278444d) — a copy of its transcript, marked a mirror of
   * it, with no tokens, charge or duration of its own. The step's chat anchors
   * on the landed record.
   */
  type SpendRecord = RunRecord & CliRunSpendRecord
  const workRun: SpendRecord = { ...cursorRun, id: 'ad277190-54b1-4f3c-9d2e-0d6e1a8f3b21' }
  const landed: SpendRecord = {
    id: '0278444d-7c0e-4f8a-b1a4-3e9d52c6a7f0',
    cli: { tool: 'cursor-agent', version: '' },
    status: 'succeeded',
    modelId: 'auto',
    reportedModel: 'Composer 2.5',
    mirrorOf: workRun.id,
  }
  const verifier: SpendRecord = { ...claudeRun, id: '5f1c2a9e-0b7d-4e63-8a15-c4d9e2f7a6b0' }

  it("reads a landed record's spend off the run it mirrors — the mirror carries none of its own", () => {
    const source = cliRunSpendRecord(landed, [verifier, landed, workRun])
    expect(source).toBe(workRun)
    expect(costChipLabel(cliRunCost(source!))).toBe('$0.00')
    expect(source?.durationMs).toBe(21_852)
    expect(cliRunCost(landed)).toBeUndefined()
  })

  it("is undefined for a mirror whose run is not at hand — never the mirror's own nothing, read as no cost", () => {
    expect(cliRunSpendRecord(landed, [verifier, landed])).toBeUndefined()
    expect(cliRunSpendRecord(landed, [])).toBeUndefined()
  })

  it('reads any other run off itself, whatever runs are at hand', () => {
    expect(cliRunSpendRecord(workRun, [verifier, landed])).toBe(workRun)
    expect(cliRunSpendRecord(verifier, [])).toBe(verifier)
  })
})

describe('isListPartial', () => {
  it('is partial when a row beside the listed ones has no list value', () => {
    const cost = { costUsd: 0, byModel: [composerSpend, claudeCutShortSpend] }
    expect(isListPartial(cost, cost.byModel)).toBe(true)
  })

  it('is whole when every row states its list value', () => {
    const cost = { costUsd: 0, byModel: [composerSpend, sonnetSpend] }
    expect(isListPartial(cost, cost.byModel)).toBe(false)
  })

  it('reads a cost kept before per-model rows as partial only when some of it went unpriced', () => {
    expect(isListPartial({ costUsd: 1.25, unpricedTokens: 4_000, listCostUsd: 1.25 }, [])).toBe(
      true,
    )
    expect(isListPartial({ costUsd: 1.25, listCostUsd: 1.25 }, [])).toBe(false)
  })
})

describe('addCost', () => {
  it('sums charges, included and unpriced tokens, and list values', () => {
    const sum = addCost(cliRunCost(cursorRun), {
      costUsd: 0.5,
      unpricedTokens: 100,
      listCostUsd: 0.5,
    })
    expect(sum).toMatchObject({
      costUsd: 0.5,
      includedTokens: 14_701,
      unpricedTokens: 100,
      listCostUsd: 0.5066657,
    })
  })

  it('merges rows for the same model under the same billing, and keeps different billing apart', () => {
    const sum = addCost(
      { costUsd: 0, byModel: [composerSpend] },
      { costUsd: 0.5265756, byModel: [composerSpend, sonnetMetered] },
    )
    expect(sum?.byModel).toEqual([
      {
        ...composerSpend,
        inputTokens: 11_650,
        outputTokens: 1720,
        cacheReadTokens: 16_032,
        cacheWriteTokens: 0,
        costUsd: 0,
        listCostUsd: 0.0133314,
      },
      sonnetMetered,
    ])
  })

  it('keeps one model used on a plan and on a key as two rows: they were paid for differently', () => {
    const onKey: ModelSpend = { ...composerSpend, billing: 'metered', costUsd: 0.0066657 }
    const sum = addCost({ byModel: [composerSpend] }, { byModel: [onKey] })
    expect(sum?.byModel).toEqual([composerSpend, onKey])
  })

  it('never folds tokens nobody priced into a priced row of the same model', () => {
    const priced: ModelSpend = { ...codexUnpriced, costUsd: 0.1, listCostUsd: 0.1 }
    const sum = addCost({ byModel: [priced] }, { byModel: [codexUnpriced] })
    expect(sum?.byModel).toEqual([priced, codexUnpriced])
    const [pricedRow, unpricedRow] = costDetailsView(sum)!.rows
    expect(pricedRow.charged).toBe('$0.10')
    expect(unpricedRow.charged).toBe('Unknown')
    expect(unpricedRow.listValue).toBe('No known price')
  })

  it('keeps the same model under two names as two rows', () => {
    const { listCostUsd: _list, label: _label, ...unnamed } = composerSpend
    const auto: ModelSpend = { ...unnamed, model: 'auto', label: 'Auto' }
    const sum = addCost({ byModel: [auto] }, { byModel: [{ ...unnamed, model: 'auto' }] })
    expect(sum?.byModel).toHaveLength(2)
  })

  it('keeps a turn whose tokens were not reported apart from one that reported them, so they are never counted', () => {
    const { listCostUsd: _list, ...unlisted } = composerSpend
    const reported: CostSpend = { ...unlisted, model: 'auto', label: 'Auto' }
    const sum = addCost(cliRunCost(cursorAcpTurn), { costUsd: 0, byModel: [reported] })
    expect(sum?.byModel).toHaveLength(2)
    expect(sum?.byModel?.[0].tokensNotReported).toBe(true)
    expect(sum?.byModel?.[1].inputTokens).toBe(5825)
  })

  it('counts how many turns of a model reported no tokens', () => {
    const sum = addCost(cliRunCost(cursorAcpTurn), cliRunCost(cursorAcpTurn))
    expect(sum?.byModel).toHaveLength(1)
    expect(sum?.byModel?.[0].unreportedTurns).toBe(2)
  })

  it('never folds a row whose output went unreported into one that reported it', () => {
    const { outputTokensNotReported: _mark, ...reported } = claudeCutShortSpend
    const sum = addCost(
      { costUsd: 0, byModel: [claudeCutShortSpend] },
      { costUsd: 0, byModel: [reported] },
    )
    expect(sum?.byModel).toEqual([claudeCutShortSpend, reported])
  })

  it('is the other side when one side is absent, and undefined when both are', () => {
    expect(addCost(undefined, { costUsd: 1 })).toEqual({ costUsd: 1 })
    expect(addCost({ costUsd: 1 }, undefined)).toEqual({ costUsd: 1 })
    expect(addCost(undefined, undefined)).toBeUndefined()
  })
})

/**
 * The UI reads a cost with the tools' rules — `processEntryCostFromSpends` for
 * a set of rows, `sumProcessEntryCosts` for a sum — extended only by states the
 * tools never write: a row whose record kept no billing, a run still going, and
 * how many unreported turns a merged row stands for. On the rows the tools do
 * write, the two must read alike, or a run's chip and its process attempt's
 * chip disagree. Each set is a shape the runner stamps.
 */
describe('parity with the tools', () => {
  const round = (n: number | undefined) => (n === undefined ? undefined : roundMoneyUSD(n))
  const comparable = (cost: CostSource | undefined) =>
    cost && {
      ...cost,
      costUsd: round(cost.costUsd),
      listCostUsd: round(cost.listCostUsd),
      byModel: cost.byModel?.map(({ unreportedTurns: _turns, ...row }) => ({
        ...row,
        costUsd: round(row.costUsd),
        listCostUsd: round(row.listCostUsd),
      })),
    }
  const { listCostUsd: _acpList, ...composerUnlisted } = composerSpend
  const acpRow: ModelSpend = {
    ...composerUnlisted,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    tokensNotReported: true,
  }
  const rowSets: Record<string, ModelSpend[]> = {
    'a priced model beside one with no price': [sonnetMetered, codexUnpriced],
    'one model priced in one run and not in another': [
      { ...codexUnpriced, costUsd: 0.1, listCostUsd: 0.1 },
      codexUnpriced,
    ],
    'two models on plans': [composerSpend, sonnetSpend],
    'a retried turn: cut off, then completed': [claudeCutShortMetered, sonnetMetered],
    'one model twice, to merge': [composerSpend, composerSpend, sonnetMetered],
    'turns that reported no counts beside one that did': [acpRow, acpRow, composerSpend],
    'a metered turn that reported no counts beside a priced one': [
      {
        ...codexUnpriced,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        tokensNotReported: true,
      },
      sonnetMetered,
    ],
    'a row that spent nothing': [{ ...acpRow, tokensNotReported: undefined }, sonnetMetered],
  }

  for (const [shape, rows] of Object.entries(rowSets)) {
    it(`reads ${shape} as processEntryCostFromSpends does`, () => {
      const ui = messageUsageCost({ byModel: rows }, undefined)
      expect(ui).toBeDefined()
      expect(comparable(ui)).toEqual(comparable(processEntryCostFromSpends(rows)))
    })
  }

  it('sums two costs as sumProcessEntryCosts does', () => {
    const sets = Object.values(rowSets).map((rows) => processEntryCostFromSpends(rows))
    for (const a of sets) {
      for (const b of sets) {
        expect(comparable(addCost(a, b))).toEqual(comparable(sumProcessEntryCosts([a, b])))
      }
    }
  })
})

describe('pickCost', () => {
  it('keeps only the cost of a totals record, not the bookkeeping beside it', () => {
    const totals = {
      workMs: 60_000,
      entryId: 'e1',
      costUsd: 0,
      includedTokens: 14_701,
      listCostUsd: 0.0066657,
      byModel: [composerSpend],
    }
    expect(pickCost(totals)).toEqual({
      costUsd: 0,
      includedTokens: 14_701,
      listCostUsd: 0.0066657,
      byModel: [composerSpend],
    })
  })

  it('keeps unpriced tokens, and is undefined when the record measured no cost', () => {
    expect(pickCost({ unpricedTokens: 4_000 })).toEqual({ unpricedTokens: 4_000 })
    expect(pickCost({})).toBeUndefined()
    expect(pickCost({ byModel: [] })).toBeUndefined()
  })
})

describe('costDetailsView', () => {
  it('opens a subscription run as $0 charged, its tokens included, and its list value', () => {
    const view = costDetailsView(cliRunCost(cursorRun))
    expect(view?.charged).toBe('$0.00')
    expect(view?.summary).toEqual([
      { label: 'Charged', value: '$0.00' },
      { label: 'Included tokens', value: '14,701' },
      { label: 'At list price', value: '≈ $0.0067' },
      { label: 'Total tokens', value: '14,701' },
    ])
    expect(view?.rows).toEqual([
      {
        key: '["cursor","composer-2.5","Composer 2.5","subscription",true,true,false,false,false,false]',
        model: 'Composer 2.5',
        modelId: 'composer-2.5',
        provider: 'Cursor',
        billing: 'subscription',
        billingLabel: 'Included in your Cursor subscription',
        inputTokens: 5825,
        outputTokens: 860,
        cacheReadTokens: 8016,
        cacheWriteTokens: 0,
        tokens: [
          { label: 'Input', value: '5,825' },
          { label: 'Output', value: '860' },
          { label: 'Cache read', value: '8,016' },
          { label: 'Cache write', value: '0' },
        ],
        chargedUsd: 0,
        charged: '$0.00',
        listCostUsd: 0.0066657,
        listValue: '≈ $0.0067 at list price',
      },
    ])
    expect(view?.notes).toEqual([COST_NOTE_OVERAGE])
  })

  it("names a Claude login's plan, not the provider", () => {
    const view = costDetailsView(cliRunCost(claudeRun))
    expect(view?.rows[0].billingLabel).toBe('Included in your Claude subscription')
    expect(view?.rows[0].modelId).toBeUndefined()
    expect(view?.rows[0].listValue).toBe('≈ $0.53 at list price')
  })

  it('does not repeat a model id that is its own name', () => {
    const view = costDetailsView({
      costUsd: 0,
      byModel: [{ ...composerSpend, label: 'composer-2.5' }],
    })
    expect(view?.rows[0].model).toBe('composer-2.5')
    expect(view?.rows[0].modelId).toBeUndefined()
  })

  it('tells a metered model with no price apart from an included one', () => {
    const view = costDetailsView({
      costUsd: 0,
      includedTokens: 14_701,
      unpricedTokens: 131_194,
      listCostUsd: 0.0066657,
      byModel: [composerSpend, codexUnpriced],
    })
    expect(view?.summary).toContainEqual({ label: 'Unpriced tokens', value: '131,194' })
    const [included, unpriced] = view!.rows
    expect(included.charged).toBe('$0.00')
    expect(unpriced.billingLabel).toBe('API key — billed per token')
    expect(unpriced.charged).toBe('Unknown')
    expect(unpriced.listValue).toBe('No known price')
    expect(view?.notes).toEqual([COST_NOTE_OVERAGE, COST_NOTE_UNPRICED])
  })

  it('says Cursor never names the model Auto used, and prices nothing it cannot', () => {
    const auto: ModelSpend = {
      provider: 'cursor',
      model: 'auto',
      label: 'Auto',
      billing: 'subscription',
      inputTokens: 1200,
      outputTokens: 300,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      costUsd: 0,
    }
    const view = costDetailsView({ costUsd: 0, includedTokens: 1500, byModel: [auto] })
    expect(view?.rows[0].listValue).toBe('No known price')
    expect(view?.summary.map((l) => l.label)).not.toContain('At list price')
    expect(view?.notes).toContain(COST_NOTE_AUTO)
  })

  it('says so for Auto however the record names Cursor and Auto — the backend lists an older run under its CLI and the name it reported', () => {
    const legacyAttempt: ModelSpend = {
      provider: 'cursor-agent',
      model: 'Auto',
      billing: 'metered',
      inputTokens: 28_394,
      outputTokens: 1346,
      cacheReadTokens: 57_856,
      cacheWriteTokens: 0,
    }
    expect(costDetailsView({ unpricedTokens: 87_596, byModel: [legacyAttempt] })?.notes).toContain(
      COST_NOTE_AUTO,
    )
    expect(costDetailsView(cliRunCost(cursorAutoOnDisk))?.notes).toContain(COST_NOTE_AUTO)
  })

  it("keeps the Auto note to Cursor: another provider's router is not Cursor's", () => {
    const router: ModelSpend = {
      provider: 'openrouter',
      model: 'auto',
      billing: 'metered',
      inputTokens: 900,
      outputTokens: 100,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      costUsd: 0.002,
      listCostUsd: 0.002,
    }
    expect(costDetailsView({ costUsd: 0.002, byModel: [router] })?.notes).not.toContain(
      COST_NOTE_AUTO,
    )
  })

  it('labels a free model as free', () => {
    const local: ModelSpend = {
      provider: 'ollama',
      model: 'qwen3:32b',
      billing: 'free',
      inputTokens: 10,
      outputTokens: 5,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      costUsd: 0,
    }
    const view = costDetailsView({ costUsd: 0, includedTokens: 15, byModel: [local] })
    expect(view?.rows[0]).toMatchObject({ provider: 'ollama', billingLabel: 'Free' })
    expect(view?.notes).toEqual([])
  })

  it('says a row was recorded before billing or its model was kept, and that its charge is unknown', () => {
    const view = costDetailsView(cliRunCost(claudeOnDisk))
    expect(view?.charged).toBe('No known price')
    expect(view?.rows[0]).toMatchObject({
      model: 'Model not recorded',
      provider: 'Anthropic',
      billingLabel: 'Billing not recorded',
      charged: 'Unknown',
      listValue: 'No known price',
    })
    expect(view?.notes).toEqual([COST_NOTE_UNPRICED, COST_NOTE_UNRECORDED_BILLING])
  })

  it('opens a ledger cost kept before per-model rows with what it has', () => {
    const legacy: ProcessEntryCost = { costUsd: 1.25, unpricedTokens: 4_000 }
    const view = costDetailsView(legacy)
    expect(view?.charged).toBe('$1.25')
    expect(view?.rows).toEqual([])
    expect(view?.totalTokens).toBe(4_000)
    expect(view?.summary).toEqual([
      { label: 'Charged', value: '$1.25' },
      { label: 'Unpriced tokens', value: '4,000' },
    ])
    expect(view?.notes).toEqual([COST_NOTE_UNPRICED, COST_NOTE_NO_MODELS])
  })

  it('says the charge is unknown when none of it could be priced', () => {
    const view = costDetailsView({ unpricedTokens: 131_194, byModel: [codexUnpriced] })
    expect(view?.charged).toBe('No known price')
    expect(view?.summary[0]).toEqual({ label: 'Charged', value: 'Unknown' })
  })

  it("opens a Cursor resident turn that reported no tokens: its model, its plan, and 'not reported by Cursor' where the counts would be", () => {
    const view = costDetailsView(cliRunCost(cursorAcpTurn))
    expect(view?.charged).toBe('$0.00')
    expect(view?.summary).toEqual([
      { label: 'Charged', value: '$0.00' },
      { label: 'Total tokens', value: 'Not reported by Cursor' },
    ])
    expect(view?.rows).toEqual([
      {
        key: '["cursor","auto","Auto","subscription",true,false,true,false,false,false]',
        model: 'Auto',
        modelId: 'auto',
        provider: 'Cursor',
        billing: 'subscription',
        billingLabel: 'Included in your Cursor subscription',
        tokens: [{ label: 'Tokens', value: 'Not reported by Cursor' }],
        chargedUsd: 0,
        charged: '$0.00',
        listValue: 'Unknown: its tokens were not reported',
      },
    ])
    expect(view?.notes).toEqual([COST_NOTE_AUTO, COST_NOTE_OVERAGE, CURSOR_TURN_NOT_REPORTED])
    expect(view?.notes).not.toContain(COST_NOTE_NO_MODELS)
  })

  it('counts the tokens that were reported and says the rest were not', () => {
    const view = costDetailsView(addCost(cliRunCost(cursorRun), cliRunCost(cursorAcpTurn)))
    expect(view?.summary).toContainEqual({
      label: 'Total tokens',
      value: '14,701 + not reported by Cursor',
    })
    expect(view?.totalTokens).toBe(14_701)
    expect(view?.notes).toContain(CURSOR_TURN_NOT_REPORTED)
  })

  it("reads a not-reported row the tools stamped — a run's own rows, or a process attempt's — the same way", () => {
    const stampedAcpRow: ModelSpend = {
      provider: 'cursor',
      model: 'auto',
      label: 'Auto',
      billing: 'subscription',
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      costUsd: 0,
      tokensNotReported: true,
    }
    const fromRun = costDetailsView(cliRunCost({ ...cursorAcpTurn, modelUsage: [stampedAcpRow] }))
    const fromAttempt = costDetailsView({ costUsd: 0, byModel: [stampedAcpRow] })
    for (const view of [fromRun, fromAttempt]) {
      expect(view?.rows[0].tokens).toEqual([{ label: 'Tokens', value: 'Not reported by Cursor' }])
      expect(view?.notes).toContain(CURSOR_TURN_NOT_REPORTED)
    }
  })

  it('says how many turns went unreported when a sum holds several', () => {
    const view = costDetailsView(addCost(cliRunCost(cursorAcpTurn), cliRunCost(cursorAcpTurn)))
    expect(view?.notes).toContain(
      'Cursor did not report token counts for 2 turns: they are unknown, not zero, and left out of the totals.',
    )
  })

  it('reads a turn still going that has reported no counts yet as pending, not as one that never reported', () => {
    const streaming: RunRecord = {
      cli: { tool: 'claude-code', version: '2.1.258' },
      status: 'running',
      billing: 'subscription',
      reportedModel: 'claude-sonnet-5',
      tokensNotReported: true,
    }
    const cost = cliRunCost(streaming)
    expect(cost?.byModel?.[0]).toMatchObject({ tokensNotReported: true, countsPending: true })
    const view = costDetailsView(cost)
    expect(view?.rows[0].tokens).toEqual([{ label: 'Tokens', value: 'Not reported yet' }])
    expect(view?.rows[0].listValue).toBe('Not reported yet')
    expect(view?.summary).toContainEqual({ label: 'Total tokens', value: 'Not reported yet' })
    expect(view?.notes).toContain('Claude Code has not reported token counts for this turn yet.')
    expect(view?.notes.some((n) => n.includes('did not report'))).toBe(false)
  })

  it('keeps a pending turn apart from a settled one of the same model', () => {
    const streaming: RunRecord = { ...cursorAcpTurn, status: 'running' }
    const sum = addCost(cliRunCost(cursorAcpTurn), cliRunCost(streaming))
    expect(sum?.byModel).toHaveLength(2)
    const view = costDetailsView(sum)
    expect(view?.notes).toEqual(
      expect.arrayContaining([
        CURSOR_TURN_NOT_REPORTED,
        'Cursor has not reported token counts for this turn yet.',
      ]),
    )
  })

  it("counts one tool's unreported turns across its models in one note", () => {
    const composerTurn: RunRecord = {
      ...cursorAcpTurn,
      modelId: 'composer-2.5',
      reportedModel: 'Composer 2.5',
    }
    const view = costDetailsView(addCost(cliRunCost(cursorAcpTurn), cliRunCost(composerTurn)))
    expect(view?.rows).toHaveLength(2)
    expect(view?.notes.filter((n) => n.startsWith('Cursor did not report'))).toEqual([
      'Cursor did not report token counts for 2 turns: they are unknown, not zero, and left out of the totals.',
    ])
  })

  it('names every tool that left counts out, and the CLI when the record names none', () => {
    const codexTurn: RunRecord = {
      cli: { tool: 'codex', version: '0.130.0' },
      status: 'succeeded',
      modelId: 'gpt-5.5-codex',
      billing: 'subscription',
      tokensNotReported: true,
    }
    const both = costDetailsView(addCost(cliRunCost(cursorAcpTurn), cliRunCost(codexTurn)))
    expect(both?.summary).toContainEqual({
      label: 'Total tokens',
      value: 'Not reported by Cursor and Codex',
    })
    const toolless = costDetailsView(
      cliRunCost({ status: 'succeeded', billing: 'subscription', tokensNotReported: true }),
    )
    expect(toolless?.rows[0].tokens).toEqual([
      { label: 'Tokens', value: 'Not reported by the CLI' },
    ])
    expect(toolless?.notes).toContain(
      'The CLI did not report token counts for this turn: they are unknown, not zero, and left out of the totals.',
    )
  })

  it('opens a turn cut off before its output was reported: real input and cache counts, the output not reported — never 0', () => {
    const view = costDetailsView(cliRunCost(claudeCutShort))
    expect(view?.summary).toEqual([
      { label: 'Charged', value: '$0.00' },
      { label: 'Included tokens', value: '41,932' },
      { label: 'Total tokens', value: '41,932 + not reported by Claude Code' },
    ])
    const [row] = view!.rows
    expect(row.tokens).toEqual([
      { label: 'Input', value: '2' },
      { label: 'Output', value: 'Not reported by Claude Code' },
      { label: 'Cache read', value: '30,935' },
      { label: 'Cache write', value: '10,995' },
    ])
    expect(row).not.toHaveProperty('outputTokens')
    expect(row.inputTokens).toBe(2)
    expect(row.charged).toBe('$0.00')
    expect(row.listValue).toBe('Unknown: its output was not reported')
    expect(view?.notes).toEqual([COST_NOTE_OVERAGE, CLAUDE_OUTPUT_NOT_REPORTED])
  })

  it('opens a metered Claude Code run still streaming as a run still going — its output still to come, never stopped', () => {
    const view = costDetailsView(cliRunCost(claudeStreaming))
    expect(view?.charged).toBe('Charge pending')
    expect(view?.summary).toEqual([
      { label: 'Charged', value: 'Pending' },
      { label: 'Total tokens', value: '41,932 + not reported yet' },
    ])
    const [row] = view!.rows
    expect(row.tokens).toEqual([
      { label: 'Input', value: '2' },
      { label: 'Output', value: 'Not reported yet' },
      { label: 'Cache read', value: '30,935' },
      { label: 'Cache write', value: '10,995' },
    ])
    expect(row).not.toHaveProperty('outputTokens')
    expect(row).toMatchObject({ charged: 'Pending', listValue: 'Priced when the run ends' })
    expect(view?.notes).toEqual([COST_NOTE_PENDING, CLAUDE_OUTPUT_PENDING])
  })

  it('opens a subscription Claude Code run still streaming as $0 so far, its output still to come', () => {
    const view = costDetailsView(cliRunCost({ ...claudeStreaming, billing: 'subscription' }))
    expect(view?.charged).toBe('$0.00')
    expect(view?.summary).toEqual([
      { label: 'Charged', value: '$0.00' },
      { label: 'Included tokens', value: '41,932' },
      { label: 'Total tokens', value: '41,932 + not reported yet' },
    ])
    expect(view?.rows[0].tokens).toContainEqual({ label: 'Output', value: 'Not reported yet' })
    expect(view?.rows[0].listValue).toBe('Priced when the run ends')
    expect(view?.notes).toEqual([COST_NOTE_OVERAGE, CLAUDE_OUTPUT_PENDING])
  })

  it('keeps a streaming turn apart from one cut off before reporting its output, and says which is which', () => {
    const view = costDetailsView(
      addCost(cliRunCost({ ...claudeStreaming, status: 'paused' }), cliRunCost(claudeStreaming)),
    )
    expect(view?.rows.map((r) => r.listValue)).toEqual([
      'Unknown: its output was not reported',
      'Priced when the run ends',
    ])
    expect(view?.summary).toContainEqual({
      label: 'Total tokens',
      value: '83,864 + not reported by Claude Code + not reported yet',
    })
    expect(view?.notes).toEqual([
      COST_NOTE_PENDING,
      CLAUDE_OUTPUT_NOT_REPORTED,
      CLAUDE_OUTPUT_PENDING,
    ])
  })

  it('never calls a metered turn whose output went unreported unpriced for want of a price', () => {
    const view = costDetailsView(
      cliRunCost({ ...claudeCutShort, billing: 'metered', modelUsage: [claudeCutShortMetered] }),
    )
    expect(view?.charged).toBe('Not reported')
    expect(view?.rows[0].charged).toBe('Unknown')
    expect(view?.notes).toEqual([CLAUDE_OUTPUT_NOT_REPORTED])
  })

  it('states a list value that covers only part of the tokens as that part', () => {
    const auto: ModelSpend = {
      provider: 'cursor',
      model: 'auto',
      label: 'Auto',
      billing: 'subscription',
      inputTokens: 28_394,
      outputTokens: 1346,
      cacheReadTokens: 57_856,
      cacheWriteTokens: 0,
      costUsd: 0,
    }
    const view = costDetailsView(addCost(cliRunCost(cursorRun), { costUsd: 0, byModel: [auto] }))
    expect(view?.summary).toContainEqual({
      label: 'At list price',
      value: '≈ $0.0067 for the tokens with a known price',
    })
    const withUnreported = costDetailsView(
      addCost(cliRunCost(cursorRun), cliRunCost(cursorAcpTurn)),
    )
    expect(withUnreported?.summary).toContainEqual({
      label: 'At list price',
      value: '≈ $0.0067 for the tokens with a known price',
    })
  })

  it('states a whole list value plainly', () => {
    expect(costDetailsView(cliRunCost(cursorRun))?.summary).toContainEqual({
      label: 'At list price',
      value: '≈ $0.0067',
    })
  })

  it('reads a ledger cost with unpriced tokens beside a list value as a partial list value', () => {
    const view = costDetailsView({ costUsd: 1.25, unpricedTokens: 4_000, listCostUsd: 1.25 })
    expect(view?.summary).toContainEqual({
      label: 'At list price',
      value: '≈ $1.25 for the tokens with a known price',
    })
  })

  it('opens a metered run in flight as a charge still to come', () => {
    const view = costDetailsView(cliRunCost(claudeInFlight))
    expect(view?.charged).toBe('Charge pending')
    expect(view?.summary).toEqual([
      { label: 'Charged', value: 'Pending' },
      { label: 'Total tokens', value: '1,308,171' },
    ])
    expect(view?.rows[0]).toMatchObject({
      billingLabel: 'API key — billed per token',
      charged: 'Pending',
      listValue: 'Priced when the run ends',
    })
    expect(view?.notes).toEqual([COST_NOTE_PENDING])
  })

  it('keeps every row it lists under its own key, even two the record kept apart', () => {
    const priced: ModelSpend = { ...sonnetMetered, costUsd: 5, listCostUsd: 5 }
    const { costUsd: _cost, listCostUsd: _list, ...unpriced } = sonnetMetered
    const view = costDetailsView({
      costUsd: 5,
      unpricedTokens: 1_308_171,
      byModel: [priced, unpriced],
    })
    const keys = view!.rows.map((r) => r.key)
    expect(keys).toHaveLength(2)
    expect(new Set(keys).size).toBe(2)
  })

  it('lists rows the record repeated once, summed', () => {
    const view = costDetailsView({ costUsd: 0, byModel: [composerSpend, composerSpend] })
    expect(view?.rows).toHaveLength(1)
    expect(view?.rows[0].inputTokens).toBe(11_650)
  })

  it('is undefined when nothing was measured', () => {
    expect(costDetailsView(undefined)).toBeUndefined()
    expect(costDetailsView({})).toBeUndefined()
  })
})

describe('cliRunMessageUsage', () => {
  it('attaches usage to a $0 subscription run: its tokens, charge, billing and rows', () => {
    expect(cliRunMessageUsage(cursorRun)).toEqual({
      promptTokens: 5825,
      completionTokens: 860,
      cachedReadInputTokens: 8016,
      cacheWriteInputTokens: 0,
      cost: 0,
      billing: 'subscription',
      listCostUsd: 0.0066657,
      byModel: [composerSpend],
    })
  })

  it("never names the model on the usage — the message's CLI tag names it, and the rows name what ran", () => {
    expect(cliRunMessageUsage(cursorRun)).not.toHaveProperty('model')
    expect(
      cliRunMessageUsage({ ...cursorAutoOnDisk, reportedModel: 'Composer 2.5' }),
    ).not.toHaveProperty('model')
  })

  it('attaches the tokens of an older run with no charge it can stand behind', () => {
    const usage = cliRunMessageUsage(cursorOnDisk)
    expect(usage?.promptTokens).toBe(5825)
    expect(usage?.cost).toBeUndefined()
    expect(usage?.billing).toBeUndefined()
  })

  it('attaches no token counts for a turn whose CLI reported none — only its charge, billing and model row', () => {
    const usage = cliRunMessageUsage(cursorAcpTurn)
    expect(usage).toEqual({
      cost: 0,
      billing: 'subscription',
      byModel: cliRunCost(cursorAcpTurn)?.byModel,
    })
    const view = costDetailsView(messageUsageCost(usage!, 'cli-agent/cursor-agent/auto'))
    expect(view?.rows[0]).toMatchObject({ model: 'Auto', provider: 'Cursor' })
    expect(view?.summary).toContainEqual({
      label: 'Total tokens',
      value: 'Not reported by Cursor',
    })
  })

  it('attaches no output count for a turn cut off before reporting it — the placeholder is never passed on as 0', () => {
    const usage = cliRunMessageUsage(claudeCutShort)
    expect(usage).toEqual({
      promptTokens: 2,
      cachedReadInputTokens: 30_935,
      cacheWriteInputTokens: 10_995,
      cost: 0,
      billing: 'subscription',
      byModel: [claudeCutShortSpend],
    })
  })

  it('attaches the output the models that reported it spent, beside one that did not', () => {
    const usage = cliRunMessageUsage({
      ...claudeCutShort,
      modelUsage: [claudeCutShortSpend, sonnetSpend],
    })
    expect(usage?.completionTokens).toBe(6623)
  })

  it('is undefined for a run that recorded nothing', () => {
    expect(cliRunMessageUsage({ cli: { tool: 'codex', version: '' } })).toBeUndefined()
  })
})

describe('messageUsageCost', () => {
  it('reads an API turn as metered, charged what it stored', () => {
    const cost = messageUsageCost(
      { promptTokens: 1200, completionTokens: 300, cachedReadInputTokens: 800, cost: 0.0102 },
      { provider: 'openai', model: 'gpt-5.5' },
    )
    expect(cost).toEqual({
      costUsd: 0.0102,
      byModel: [
        {
          provider: 'openai',
          model: 'gpt-5.5',
          billing: 'metered',
          inputTokens: 1200,
          outputTokens: 300,
          cacheReadTokens: 800,
          cacheWriteTokens: 0,
          costUsd: 0.0102,
        },
      ],
    })
  })

  it('reads an API turn with no stored cost as unpriced', () => {
    const cost = messageUsageCost(
      { promptTokens: 1200, completionTokens: 300 },
      { provider: 'openai', model: 'gpt-5.5' },
    )
    expect(cost?.unpricedTokens).toBe(1500)
    expect(costDetailsView(cost)?.rows[0].charged).toBe('Unknown')
  })

  it('reads the billing an API turn stored over the metered default', () => {
    const cost = messageUsageCost(
      { promptTokens: 900, completionTokens: 100, cost: 0, billing: 'free' },
      { provider: 'ollama', model: 'qwen3:32b' },
    )
    expect(cost).toMatchObject({ costUsd: 0, includedTokens: 1000 })
    expect(costDetailsView(cost)?.rows[0].billingLabel).toBe('Free')
  })

  it('opens a CLI turn by its per-model rows, not one guessed row', () => {
    const usage = cliRunMessageUsage(cursorRun)!
    const view = costDetailsView(messageUsageCost(usage, 'cli-agent/cursor-agent/composer-2.5'))
    expect(view?.rows.map((r) => r.billingLabel)).toEqual(['Included in your Cursor subscription'])
    expect(view?.rows.map((r) => r.model)).toEqual(['Composer 2.5'])
    expect(view?.charged).toBe('$0.00')
  })

  it("names the row after the message's model over an older turn's model kept on its usage", () => {
    const cost = messageUsageCost(
      { promptTokens: 10, completionTokens: 2, cost: 0.001, model: 'gpt-5' },
      { provider: 'openai', model: 'gpt-5.5' },
    )
    expect(cost?.byModel?.[0].model).toBe('gpt-5.5')
  })

  it("reads an older API turn's model and provider off its usage when the message names none", () => {
    const cost = messageUsageCost(
      { promptTokens: 2344, completionTokens: 2333, provider: 'openai', model: 'gpt-5' },
      undefined,
    )
    expect(cost?.byModel?.[0]).toMatchObject({ provider: 'openai', model: 'gpt-5' })
  })

  it('takes a plain model string when the message names no provider', () => {
    const cost = messageUsageCost({ promptTokens: 10, completionTokens: 2, cost: 0 }, 'gpt-5.5')
    expect(cost?.byModel?.[0]).toMatchObject({ provider: '', model: 'gpt-5.5' })
  })

  it("is undefined for a stored CLI turn's placeholder: zero tokens and a $0 that measured nothing", () => {
    const placeholder = {
      promptTokens: 0,
      completionTokens: 0,
      cachedReadInputTokens: 0,
      cost: 0,
    }
    expect(
      messageUsageCost(placeholder, { provider: 'custom', model: 'cli-agent/cursor-agent/auto' }),
    ).toBeUndefined()
  })

  it('is undefined for usage with neither tokens nor a charge', () => {
    expect(messageUsageCost({}, undefined)).toBeUndefined()
  })
})
