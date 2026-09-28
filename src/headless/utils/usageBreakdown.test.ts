import { describe, expect, it } from 'vitest'
import type { ModelSpend } from 'thefactory-tools/types'

import { cliRunMessageUsage } from './costDetails'
import type { CliRunCostSource } from './costDetailsTypes'
import {
  currentUsageRows,
  ledgerUsageRows,
  sourceUsageRows,
  unavailableLedgerRows,
  usagePriceKeys,
} from './usageBreakdown'
import { USAGE_TABLE_COLUMNS } from './usageBreakdownConstants'
import type {
  UsageModalCostAggregate,
  UsageModalMessage,
  UsageModalModelPrice,
} from './usageBreakdownTypes'

/**
 * CLI turns as their chat messages carry them (`cliRunMessageUsage`): a
 * resident Cursor ACP turn, which reports a stop reason and no token counts;
 * the same on a Codex API key; and Claude Code run 88342735's first message,
 * cut off before its `result` line, so its output was never reported.
 */
const cursorAcpTurn: CliRunCostSource = {
  cli: { tool: 'cursor-agent', version: '' },
  status: 'succeeded',
  modelId: 'auto',
  reportedModel: 'Auto',
  billing: 'subscription',
  tokensNotReported: true,
}

const codexMeteredTurn: CliRunCostSource = {
  cli: { tool: 'codex', version: '0.130.0' },
  status: 'aborted',
  modelId: 'gpt-5.5-codex',
  billing: 'metered',
  tokensNotReported: true,
}

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

const cliTurn = (
  run: CliRunCostSource,
  model: { provider: string; model: string },
): UsageModalMessage => ({ role: 'assistant', model, usage: cliRunMessageUsage(run) })

/**
 * A project ledger in the costs endpoint's shape, holding the three kinds of
 * call a chat mixes: a Cursor run on a login (the real 3a93ae9a run's tokens,
 * $0 charged, Composer 2.5 at Cursor's list price), a metered API turn on
 * gpt-5.5, and a metered Codex run on a model with no known price. Keys and
 * fields are the tools' own (`costBreakdownKey`): a metered row keeps its
 * `provider:model` key, any other basis gets its own `… (billing)` row, and
 * every row names its model in fields.
 */
const aggregate: UsageModalCostAggregate = {
  chatKey: 'PROJECT:thefactory-templates-plasticfree',
  totalCostUSD: 0.0102,
  totalPromptTokens: 47_145,
  totalCompletionTokens: 4_170,
  totalCachedReadInputTokens: 96_880,
  totalCacheWriteInputTokens: 0,
  totalUnpricedTokens: 131_194,
  totalIncludedTokens: 14_701,
  totalListCostUSD: 0.0168657,
  breakdown: {
    'cursor:composer-2.5 (subscription)': {
      provider: 'cursor',
      model: 'composer-2.5',
      label: 'Composer 2.5',
      billing: 'subscription',
      costUSD: 0,
      promptTokens: 5825,
      completionTokens: 860,
      cachedReadInputTokens: 8016,
      cacheWriteInputTokens: 0,
      count: 1,
      includedTokens: 14_701,
      listCostUSD: 0.0066657,
    },
    'openai:gpt-5.5': {
      provider: 'openai',
      model: 'gpt-5.5',
      billing: 'metered',
      costUSD: 0.0102,
      promptTokens: 1200,
      completionTokens: 300,
      cachedReadInputTokens: 800,
      count: 1,
      listCostUSD: 0.0102,
    },
    'openai:gpt-5.5-codex': {
      provider: 'openai',
      model: 'gpt-5.5-codex',
      billing: 'metered',
      costUSD: 0,
      promptTokens: 40_120,
      completionTokens: 3_010,
      cachedReadInputTokens: 88_064,
      count: 1,
      unpricedTokens: 131_194,
    },
  },
  bySource: {
    api: {
      costUSD: 0.0102,
      promptTokens: 1200,
      completionTokens: 300,
      cachedReadInputTokens: 800,
      count: 1,
      listCostUSD: 0.0102,
    },
    cli: {
      costUSD: 0,
      promptTokens: 45_945,
      completionTokens: 3_870,
      cachedReadInputTokens: 96_080,
      count: 2,
      unpricedTokens: 131_194,
      includedTokens: 14_701,
      listCostUSD: 0.0066657,
    },
  },
}

describe('ledgerUsageRows', () => {
  it('leads with TOTALS, including what a plan covered, what has no price and the list value', () => {
    const [totals] = ledgerUsageRows(aggregate)
    expect(totals).toEqual({
      key: 'ledger:TOTALS',
      label: 'TOTALS',
      total: true,
      charged: '$0.0102',
      tokens: '148,195',
      prompt: '47,145',
      completion: '4,170',
      cachedRead: '96,880',
      cacheRatio: '(67%)',
      cacheWrite: '0',
      included: '14,701',
      unpriced: '131,194',
      listValue: '$0.0169 (known prices only)',
      notReportedBy: '',
    })
  })

  it('states a whole list value plainly', () => {
    const { 'openai:gpt-5.5-codex': _codex, ...priced } = aggregate.breakdown
    const [totals] = ledgerUsageRows({
      ...aggregate,
      totalUnpricedTokens: undefined,
      breakdown: priced,
    })
    expect(totals.listValue).toBe('$0.0169')
  })

  it('says a list value is partial when the ledger counted tokens it has no list value for', () => {
    const composer = aggregate.breakdown['cursor:composer-2.5 (subscription)']
    const rows = ledgerUsageRows({
      ...aggregate,
      totalUnpricedTokens: undefined,
      totalUnlistedTokens: 87_596,
      breakdown: {
        'cursor:composer-2.5 (subscription)': { ...composer, unlistedTokens: 87_596 },
      },
    })
    expect(rows.map((r) => r.listValue)).toEqual([
      '$0.0169 (known prices only)',
      '$0.0067 (known prices only)',
    ])
  })

  it('names the tool behind calls that reported no counts, or no output, in the ledger rows and TOTALS', () => {
    const rows = ledgerUsageRows({
      chatKey: 'CHAT:resident',
      totalCostUSD: 0,
      totalPromptTokens: 5827,
      totalCompletionTokens: 860,
      totalCachedReadInputTokens: 38_951,
      totalCacheWriteInputTokens: 10_995,
      totalIncludedTokens: 56_633,
      totalListCostUSD: 0.0066657,
      totalUnlistedTokens: 41_932,
      breakdown: {
        'cursor:composer-2.5 (subscription)': {
          ...aggregate.breakdown['cursor:composer-2.5 (subscription)'],
          count: 3,
          tokensNotReported: true,
        },
        'anthropic:claude-sonnet-5 (subscription)': {
          provider: 'anthropic',
          model: 'claude-sonnet-5',
          billing: 'subscription',
          costUSD: 0,
          promptTokens: 2,
          completionTokens: 0,
          cachedReadInputTokens: 30_935,
          cacheWriteInputTokens: 10_995,
          count: 1,
          includedTokens: 41_932,
          unlistedTokens: 41_932,
          outputTokensNotReported: true,
        },
      },
    })
    const [totals] = rows
    const composer = rows.find((r) => r.label === 'Cursor · Composer 2.5 (subscription)')
    const claude = rows.find((r) => r.label === 'Anthropic · claude-sonnet-5 (subscription)')
    expect(composer).toMatchObject({
      label: 'Cursor · Composer 2.5 (subscription)',
      notReportedBy: 'Not reported by Cursor',
      tokens: '14,701 + not reported',
      prompt: '5,825 + not reported',
      included: '14,701 + not reported',
      unpriced: '0',
      listValue: '$0.0067 (known prices only)',
    })
    expect(claude).toMatchObject({
      notReportedBy: 'Not reported by Claude Code',
      prompt: '2',
      completion: 'Not reported',
      tokens: '41,932 + not reported',
      included: '41,932 + not reported',
      listValue: '—',
    })
    expect(totals).toMatchObject({
      notReportedBy: 'Not reported by Cursor and Claude Code',
      tokens: '56,633 + not reported',
      prompt: '5,827 + not reported',
      completion: '860 + not reported',
      included: '56,633 + not reported',
      listValue: '$0.0067 (known prices only)',
    })
  })

  it('reads a metered ledger row whose calls reported nothing as an unknown charge', () => {
    const [, codex] = ledgerUsageRows({
      ...aggregate,
      breakdown: {
        'openai:gpt-5.5-codex': {
          provider: 'openai',
          model: 'gpt-5.5-codex',
          billing: 'metered',
          costUSD: 0,
          promptTokens: 0,
          completionTokens: 0,
          cachedReadInputTokens: 0,
          count: 1,
          tokensNotReported: true,
        },
      },
    })
    expect(codex).toMatchObject({
      notReportedBy: 'Not reported by Codex',
      charged: '—',
      tokens: 'Not reported',
      included: '0',
      unpriced: 'Not reported',
    })
  })

  it("names no billing for an executor's calls that reported no counts — a split sums every basis", () => {
    const rows = sourceUsageRows({
      ...aggregate,
      bySource: { cli: { ...aggregate.bySource!.cli!, tokensNotReported: true } },
    })
    expect(rows?.[0]).toMatchObject({
      label: 'CLI',
      notReportedBy: 'Not reported by the CLI',
      tokens: '145,895 + not reported',
      included: '14,701',
      unpriced: '131,194',
    })
  })

  it("says a row's list value covers only its priced calls when some of its calls had no price", () => {
    const rows = ledgerUsageRows({
      ...aggregate,
      breakdown: {
        'openai:gpt-5.5': {
          ...aggregate.breakdown['openai:gpt-5.5'],
          promptTokens: 2200,
          completionTokens: 500,
          count: 2,
          unpricedTokens: 1200,
        },
      },
    })
    expect(rows[1].listValue).toBe('$0.0102 (known prices only)')
  })

  it('gives each model a row, most charged first, named by its fields as the cost details name it', () => {
    const rows = ledgerUsageRows(aggregate)
    expect(rows.map((r) => r.label)).toEqual([
      'TOTALS',
      'OpenAI · gpt-5.5',
      'OpenAI · gpt-5.5-codex',
      'Cursor · Composer 2.5 (subscription)',
    ])
  })

  it('keeps one model on a plan and on a key as two rows a person can tell apart', () => {
    const rows = ledgerUsageRows({
      ...aggregate,
      breakdown: {
        'cursor:composer-2.5 (subscription)':
          aggregate.breakdown['cursor:composer-2.5 (subscription)'],
        'cursor:composer-2.5': {
          ...aggregate.breakdown['openai:gpt-5.5'],
          provider: 'cursor',
          model: 'composer-2.5',
          label: 'Composer 2.5',
        },
      },
    })
    expect(rows.map((r) => r.label)).toEqual([
      'TOTALS',
      'Cursor · Composer 2.5',
      'Cursor · Composer 2.5 (subscription)',
    ])
  })

  it('tells a subscription $0 apart from a model with no price', () => {
    const rows = ledgerUsageRows(aggregate)
    const composer = rows.find((r) => r.label === 'Cursor · Composer 2.5 (subscription)')
    const codex = rows.find((r) => r.label === 'OpenAI · gpt-5.5-codex')
    expect(composer).toMatchObject({ charged: '$0.0000', included: '14,701', unpriced: '0' })
    expect(composer?.listValue).toBe('$0.0067')
    expect(codex).toMatchObject({ charged: '—', included: '0', unpriced: '131,194' })
    expect(codex?.listValue).toBe('—')
  })

  it('shows what a metered ledger was charged even when part of it had no price', () => {
    const { 'cursor:composer-2.5 (subscription)': _plan, ...metered } = aggregate.breakdown
    const [totals] = ledgerUsageRows({
      ...aggregate,
      totalIncludedTokens: undefined,
      totalListCostUSD: 0.0102,
      breakdown: metered,
    })
    expect(totals).toMatchObject({ charged: '$0.0102', included: '0', unpriced: '131,194' })
  })

  it('names a row persisted before its model was kept by its key, split on the first colon only', () => {
    const rows = ledgerUsageRows({
      ...aggregate,
      breakdown: {
        'bedrock:mistral.mistral-7b-instruct-v0:2': {
          costUSD: 0.001,
          promptTokens: 1,
          completionTokens: 1,
          cachedReadInputTokens: 0,
        },
      },
    })
    expect(rows[1].label).toBe('bedrock · mistral.mistral-7b-instruct-v0:2')
    const older = ledgerUsageRows({
      ...aggregate,
      breakdown: {
        'openai:gpt-5': {
          costUSD: 0.02,
          promptTokens: 2344,
          completionTokens: 2333,
          cachedReadInputTokens: 0,
        },
      },
    })
    expect(older[1].label).toBe('OpenAI · gpt-5')
  })

  it('reads a ledger kept before billing as nothing included and nothing known at list price', () => {
    const [totals] = ledgerUsageRows({
      chatKey: 'k',
      totalCostUSD: 1.5,
      totalPromptTokens: 10,
      totalCompletionTokens: 5,
      totalCachedReadInputTokens: 0,
      breakdown: {},
    })
    expect(totals).toMatchObject({ charged: '$1.5000', included: '0', listValue: '—' })
  })
})

describe('unavailableLedgerRows', () => {
  it('is one empty TOTALS row that says it is unavailable', () => {
    expect(unavailableLedgerRows()).toEqual([
      expect.objectContaining({ label: 'TOTALS (unavailable)', total: true, charged: '$0.0000' }),
    ])
  })
})

describe('sourceUsageRows', () => {
  it('splits the ledger by executor, API first', () => {
    const rows = sourceUsageRows(aggregate)
    expect(rows?.map((r) => [r.label, r.charged, r.included, r.unpriced, r.listValue])).toEqual([
      ['API', '$0.0102', '0', '0', '$0.0102'],
      ['CLI', '$0.0000', '14,701', '131,194', '$0.0067 (known prices only)'],
    ])
  })

  it('is undefined for a ledger with no executor split', () => {
    expect(sourceUsageRows({ ...aggregate, bySource: undefined })).toBeUndefined()
    expect(sourceUsageRows({ ...aggregate, bySource: {} })).toBeUndefined()
  })
})

describe('currentUsageRows', () => {
  const gpt: UsageModalModelPrice = {
    provider: 'openai',
    model: 'gpt-5.5',
    inputPerMTokensUSD: 5,
    outputPerMTokensUSD: 30,
    cacheReadInputPerMTokensUSD: 0.5,
  }
  const prices = { 'openai::gpt-5.5': gpt }
  const messages: UsageModalMessage[] = [
    { role: 'user' },
    {
      role: 'assistant',
      model: { provider: 'openai', model: 'gpt-5.5' },
      usage: {
        promptTokens: 1200,
        completionTokens: 300,
        cachedReadInputTokens: 800,
        cost: 0.0102,
      },
    },
    {
      role: 'assistant',
      model: { provider: 'openai', model: 'gpt-5.5' },
      usage: { promptTokens: 1000, completionTokens: 200 },
    },
    {
      role: 'assistant',
      model: { provider: 'cursor', model: 'composer-2.5' },
      usage: {
        promptTokens: 5825,
        completionTokens: 860,
        cachedReadInputTokens: 8016,
        cost: 0,
        billing: 'subscription',
        listCostUsd: 0.0066657,
      },
    },
    {
      role: 'assistant',
      model: { provider: 'openai', model: 'o9-preview' },
      usage: { promptTokens: 100, completionTokens: 50 },
    },
    { role: 'assistant', model: { provider: 'openai', model: 'gpt-5.5' } },
  ]

  it('estimates a metered turn with no stored charge from its current price, and says so', () => {
    const rows = currentUsageRows(messages, prices)
    const row = rows.find((r) => r.label === 'OpenAI · gpt-5.5')
    expect(row).toMatchObject({ charged: '≈ $0.0212', tokens: '3,500', listValue: '$0.0212' })
  })

  it('counts a subscription turn as included, charged $0, worth its list value', () => {
    const row = currentUsageRows(messages, prices).find(
      (r) => r.label === 'Cursor · composer-2.5 (subscription)',
    )
    expect(row).toMatchObject({
      charged: '$0.0000',
      included: '14,701',
      unpriced: '0',
      listValue: '$0.0067',
    })
  })

  it('never estimates a charge for a subscription turn that stored none, only its list value', () => {
    const rows = currentUsageRows(
      [
        {
          role: 'assistant',
          model: { provider: 'openai', model: 'gpt-5.5' },
          usage: { promptTokens: 1000, completionTokens: 200, billing: 'subscription' },
        },
      ],
      prices,
    )
    expect(rows[0]).toMatchObject({ charged: '$0.0000', included: '1,200', listValue: '$0.0110' })
  })

  it('values a $0 subscription turn at its list price, not at the $0 it was charged', () => {
    const rows = currentUsageRows(
      [
        {
          role: 'assistant',
          model: { provider: 'openai', model: 'gpt-5.5' },
          usage: { promptTokens: 1000, completionTokens: 200, cost: 0, billing: 'subscription' },
        },
      ],
      prices,
    )
    expect(rows[0]).toMatchObject({ charged: '$0.0000', listValue: '$0.0110' })
  })

  it('keeps one model on a plan and on a key as two rows, named as the ledger names them', () => {
    const onPlan: UsageModalMessage = {
      role: 'assistant',
      model: { provider: 'openai', model: 'gpt-5.5' },
      usage: { promptTokens: 1000, completionTokens: 200, cost: 0, billing: 'subscription' },
    }
    const rows = currentUsageRows([messages[1], onPlan], prices)
    expect(rows.map((r) => r.label)).toEqual([
      'TOTALS',
      'OpenAI · gpt-5.5',
      'OpenAI · gpt-5.5 (subscription)',
    ])
    expect(rows[2]).toMatchObject({ charged: '$0.0000', included: '1,200' })
    expect(ledgerUsageRows(aggregate).map((r) => r.label)).toContain(
      'Cursor · Composer 2.5 (subscription)',
    )
  })

  it('never estimates a model with no price as $0', () => {
    const row = currentUsageRows(messages, prices).find((r) => r.label === 'OpenAI · o9-preview')
    expect(row).toMatchObject({ charged: '—', unpriced: '150', listValue: '—' })
  })

  it('totals every model, most charged first', () => {
    const rows = currentUsageRows(messages, prices)
    expect(rows.map((r) => r.label)).toEqual([
      'TOTALS',
      'OpenAI · gpt-5.5',
      'Cursor · composer-2.5 (subscription)',
      'OpenAI · o9-preview',
    ])
    expect(rows[0]).toMatchObject({
      charged: '≈ $0.0212',
      included: '14,701',
      unpriced: '150',
      listValue: '$0.0279 (known prices only)',
    })
  })

  it("counts a Cursor resident turn that reported no tokens: 'not reported by Cursor' on its row, 'Not reported' where its counts would be — never 0", () => {
    const rows = currentUsageRows(
      [cliTurn(cursorAcpTurn, { provider: 'cursor', model: 'auto' })],
      prices,
    )
    expect(rows).toEqual([
      {
        key: 'current:TOTALS',
        label: 'TOTALS',
        total: true,
        charged: '$0.0000',
        tokens: 'Not reported',
        prompt: 'Not reported',
        completion: 'Not reported',
        cachedRead: 'Not reported',
        cacheRatio: '',
        cacheWrite: 'Not reported',
        included: 'Not reported',
        unpriced: '0',
        listValue: '—',
        notReportedBy: 'Not reported by Cursor',
      },
    ])
  })

  it('adds what a tool left out to the counts the other turns of its model reported', () => {
    const composer = { provider: 'cursor', model: 'composer-2.5' }
    const { reportedModel: _named, ...unnamedAcpTurn } = cursorAcpTurn
    const rows = currentUsageRows(
      [messages[3], cliTurn({ ...unnamedAcpTurn, modelId: 'composer-2.5' }, composer)],
      prices,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      notReportedBy: 'Not reported by Cursor',
      tokens: '14,701 + not reported',
      prompt: '5,825 + not reported',
      completion: '860 + not reported',
      included: '14,701 + not reported',
      unpriced: '0',
      cacheRatio: '(58%)',
      listValue: '$0.0067 (known prices only)',
    })
  })

  it('says the output of a turn cut off before reporting it is not reported, and counts the rest', () => {
    const [row] = currentUsageRows(
      [
        cliTurn(
          {
            cli: { tool: 'claude-code', version: '2.1.258' },
            status: 'paused',
            billing: 'subscription',
            modelUsage: [claudeCutShortSpend],
          },
          { provider: 'anthropic', model: 'claude-sonnet-5' },
        ),
      ],
      prices,
    )
    expect(row).toMatchObject({
      notReportedBy: 'Not reported by Claude Code',
      charged: '$0.0000',
      tokens: '41,932 + not reported',
      prompt: '2',
      completion: 'Not reported',
      cachedRead: '30,935',
      cacheWrite: '10,995',
      included: '41,932 + not reported',
      listValue: '—',
    })
  })

  it('never prices a metered turn from a placeholder output count', () => {
    const sonnet: UsageModalModelPrice = {
      provider: 'anthropic',
      model: 'claude-sonnet-5',
      inputPerMTokensUSD: 3,
      outputPerMTokensUSD: 15,
      cacheReadInputPerMTokensUSD: 0.3,
    }
    const { costUsd: _charged, ...uncharged } = claudeCutShortSpend
    const [row] = currentUsageRows(
      [
        cliTurn(
          {
            cli: { tool: 'claude-code', version: '2.1.258' },
            status: 'paused',
            billing: 'metered',
            modelUsage: [{ ...uncharged, billing: 'metered' }],
          },
          { provider: 'anthropic', model: 'claude-sonnet-5' },
        ),
      ],
      { 'anthropic::claude-sonnet-5': sonnet },
    )
    expect(row).toMatchObject({
      charged: '—',
      unpriced: '41,932 + not reported',
      listValue: '—',
    })
  })

  /**
   * CLI turns as the tools store them on a chat message (`agentRunnerCliDispatch`
   * `cliRunMessageUsage`): every count summed across the rows, `cost` only when
   * every row states a charge, `listCostUsd` only when every row has a list
   * value, and the rows beside them. A retried Claude Code run keeps its first
   * attempt, cut off before its output was reported, apart from the attempt
   * that completed; a Cursor run can mix a priced model with one the catalogue
   * has no price for.
   */
  const sonnetCompleted: ModelSpend = {
    provider: 'anthropic',
    model: 'claude-sonnet-5',
    billing: 'metered',
    inputTokens: 36,
    outputTokens: 6623,
    cacheReadTokens: 1_248_888,
    cacheWriteTokens: 52_624,
    costUsd: 0.5265756,
    listCostUsd: 0.5265756,
  }
  const { costUsd: _cutShortCharge, ...sonnetCutShortMetered } = {
    ...claudeCutShortSpend,
    billing: 'metered' as const,
  }
  const retriedClaudeTurn: UsageModalMessage = {
    role: 'assistant',
    model: { provider: 'custom', model: 'cli-agent/claude-code/claude-sonnet-5' },
    usage: {
      promptTokens: 38,
      completionTokens: 6623,
      cachedReadInputTokens: 1_279_823,
      cacheWriteInputTokens: 63_619,
      billing: 'metered',
      byModel: [sonnetCutShortMetered, sonnetCompleted],
    },
  }
  const composerMetered: ModelSpend = {
    provider: 'cursor',
    model: 'composer-2.5',
    label: 'Composer 2.5',
    billing: 'metered',
    inputTokens: 5825,
    outputTokens: 860,
    cacheReadTokens: 8016,
    cacheWriteTokens: 0,
    costUsd: 0.0066657,
    listCostUsd: 0.0066657,
  }
  const grokUnpriced: ModelSpend = {
    provider: 'cursor',
    model: 'cursor-grok-4.5-high',
    label: 'Grok 4.5',
    billing: 'metered',
    inputTokens: 40_120,
    outputTokens: 3010,
    cacheReadTokens: 88_064,
    cacheWriteTokens: 0,
  }
  const mixedCursorTurn: UsageModalMessage = {
    role: 'assistant',
    model: { provider: 'custom', model: 'cli-agent/cursor-agent/composer-2.5' },
    usage: {
      promptTokens: 45_945,
      completionTokens: 3870,
      cachedReadInputTokens: 96_080,
      cacheWriteInputTokens: 0,
      billing: 'metered',
      byModel: [composerMetered, grokUnpriced],
    },
  }

  /**
   * Cursor run 3a93ae9a's turn as the tools store it on the chat message: the
   * message names the CLI and the model it was asked for in the internal
   * `cli-agent/<cli>/<model>` tag, and its row names the model that ran.
   */
  const composerIncluded: ModelSpend = { ...composerMetered, billing: 'subscription', costUsd: 0 }
  const storedCursorTurn: UsageModalMessage = {
    role: 'assistant',
    model: { provider: 'custom', model: 'cli-agent/cursor-agent/auto' },
    usage: {
      promptTokens: 5825,
      completionTokens: 860,
      cachedReadInputTokens: 8016,
      cacheWriteInputTokens: 0,
      cost: 0,
      billing: 'subscription',
      listCostUsd: 0.0066657,
      byModel: [composerIncluded],
    },
  }

  it('names a CLI turn by the model that ran and how it was paid for, as the ledger does — never by its internal tag', () => {
    const rows = currentUsageRows([messages[1], storedCursorTurn], prices)
    expect(rows.map((r) => r.label)).toEqual([
      'TOTALS',
      'OpenAI · gpt-5.5',
      'Cursor · Composer 2.5 (subscription)',
    ])
    expect(rows[2]).toMatchObject({
      key: 'current:Cursor · Composer 2.5 (subscription)',
      charged: '$0.0000',
      tokens: '14,701',
      included: '14,701',
      unpriced: '0',
      listValue: '$0.0067',
    })
  })

  it('gives no row to a model a CLI turn listed but spent nothing on', () => {
    const idleHaiku: ModelSpend = {
      provider: 'anthropic',
      model: 'claude-haiku-4-5',
      billing: 'subscription',
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      costUsd: 0,
      listCostUsd: 0,
    }
    const turn: UsageModalMessage = {
      ...storedCursorTurn,
      usage: { ...storedCursorTurn.usage, byModel: [composerIncluded, idleHaiku] },
    }
    expect(currentUsageRows([messages[1], turn], prices).map((r) => r.label)).toEqual([
      'TOTALS',
      'OpenAI · gpt-5.5',
      'Cursor · Composer 2.5 (subscription)',
    ])
  })

  it('gives each model a CLI turn ran its own row, with its own counts, charge and list value', () => {
    const rows = currentUsageRows([messages[1], mixedCursorTurn], prices)
    expect(rows.map((r) => r.label)).toEqual([
      'TOTALS',
      'OpenAI · gpt-5.5',
      'Cursor · Composer 2.5',
      'Cursor · Grok 4.5',
    ])
    expect(rows.find((r) => r.label === 'Cursor · Composer 2.5')).toMatchObject({
      charged: '$0.0067',
      tokens: '14,701',
      prompt: '5,825',
      completion: '860',
      cachedRead: '8,016',
      unpriced: '0',
      listValue: '$0.0067',
    })
    expect(rows.find((r) => r.label === 'Cursor · Grok 4.5')).toMatchObject({
      charged: '—',
      tokens: '131,194',
      prompt: '40,120',
      completion: '3,010',
      unpriced: '131,194',
      listValue: '—',
    })
  })

  it('counts the output a retried CLI turn did report, marked as only part when its last attempt was cut off', () => {
    const retriedOnDisk: ModelSpend = {
      ...sonnetCutShortMetered,
      inputTokens: 38,
      outputTokens: 6623,
      cacheReadTokens: 1_279_823,
      cacheWriteTokens: 63_619,
    }
    const rows = currentUsageRows(
      [
        messages[1],
        { ...retriedClaudeTurn, usage: { ...retriedClaudeTurn.usage, byModel: [retriedOnDisk] } },
      ],
      prices,
    )
    expect(rows.find((r) => r.label === 'Anthropic · claude-sonnet-5')).toMatchObject({
      notReportedBy: 'Not reported by Claude Code',
      completion: '6,623 + not reported',
      tokens: '1,350,103 + not reported',
      charged: '—',
      unpriced: '1,350,103 + not reported',
    })
  })

  it("keeps a CLI turn's output that was never reported out of its row's count, and names the tool", () => {
    const rows = currentUsageRows([messages[1], retriedClaudeTurn], prices)
    expect(rows.find((r) => r.label === 'Anthropic · claude-sonnet-5')).toMatchObject({
      notReportedBy: 'Not reported by Claude Code',
      tokens: '1,350,103 + not reported',
      completion: '6,623 + not reported',
      charged: '$0.5266',
      unpriced: '41,932 + not reported',
    })
  })

  it('reads a CLI turn by its rows: the charge its priced rows state, and only its unpriced rows as unpriced', () => {
    const [row] = currentUsageRows([mixedCursorTurn], {})
    expect(row).toMatchObject({
      charged: '$0.0067',
      tokens: '145,895',
      included: '0',
      unpriced: '131,194',
      listValue: '$0.0067 (known prices only)',
    })
  })

  it("reads a retried CLI turn by its rows: the completed attempt's charge, the cut-off one's tokens unpriced and its output not reported", () => {
    const [row] = currentUsageRows([retriedClaudeTurn], {})
    expect(row).toMatchObject({
      notReportedBy: 'Not reported by Claude Code',
      charged: '$0.5266',
      tokens: '1,350,103 + not reported',
      completion: '6,623 + not reported',
      included: '0',
      unpriced: '41,932 + not reported',
      listValue: '$0.5266 (known prices only)',
    })
  })

  it('values a subscription CLI turn at the list value its listed rows state, marked as only part', () => {
    const [row] = currentUsageRows(
      [
        {
          ...mixedCursorTurn,
          usage: {
            ...mixedCursorTurn.usage,
            cost: 0,
            billing: 'subscription',
            byModel: [
              { ...composerMetered, billing: 'subscription', costUsd: 0 },
              { ...grokUnpriced, billing: 'subscription', costUsd: 0 },
            ],
          },
        },
      ],
      {},
    )
    expect(row).toMatchObject({
      charged: '$0.0000',
      included: '145,895',
      unpriced: '0',
      listValue: '$0.0067 (known prices only)',
    })
  })

  it('reads a CLI turn every row of which states its charge and list value as whole', () => {
    const [row] = currentUsageRows(
      [
        {
          ...mixedCursorTurn,
          usage: {
            promptTokens: 5825,
            completionTokens: 860,
            cachedReadInputTokens: 8016,
            cacheWriteInputTokens: 0,
            cost: 0.0066657,
            listCostUsd: 0.0066657,
            billing: 'metered',
            byModel: [composerMetered],
          },
        },
      ],
      {},
    )
    expect(row).toMatchObject({ charged: '$0.0067', unpriced: '0', listValue: '$0.0067' })
  })

  it('reads a metered turn that reported nothing as an unknown charge, never $0', () => {
    const [row] = currentUsageRows(
      [cliTurn(codexMeteredTurn, { provider: 'openai', model: 'gpt-5.5-codex' })],
      prices,
    )
    expect(row).toMatchObject({
      notReportedBy: 'Not reported by Codex',
      charged: '—',
      included: '0',
      unpriced: 'Not reported',
      tokens: 'Not reported',
    })
  })

  it('carries every tool that left counts out into TOTALS', () => {
    const rows = currentUsageRows(
      [
        messages[1],
        cliTurn(cursorAcpTurn, { provider: 'cursor', model: 'auto' }),
        cliTurn(codexMeteredTurn, { provider: 'openai', model: 'gpt-5.5-codex' }),
      ],
      prices,
    )
    expect(rows[0]).toMatchObject({
      label: 'TOTALS',
      notReportedBy: 'Not reported by Cursor and Codex',
      charged: '$0.0102',
      tokens: '2,300 + not reported',
      included: 'Not reported',
      unpriced: 'Not reported',
    })
  })

  it('shows TOTALS alone when one model did all the work', () => {
    const rows = currentUsageRows(messages.slice(0, 3), prices)
    expect(rows.map((r) => r.label)).toEqual(['TOTALS'])
  })

  it('counts an older API turn by the model it kept on its usage — the message named none', () => {
    // projects/osc-compass-website: 48 assistant turns keep `provider`/`model` on their usage.
    const rows = currentUsageRows(
      [
        {
          role: 'assistant',
          usage: { promptTokens: 2344, completionTokens: 2333, provider: 'openai', model: 'gpt-5' },
        },
        {
          role: 'assistant',
          usage: { promptTokens: 3094, completionTokens: 6124, provider: 'openai', model: 'gpt-5' },
        },
        messages[1],
      ],
      prices,
    )
    expect(rows.map((r) => r.label)).toEqual(['TOTALS', 'OpenAI · gpt-5.5', 'OpenAI · gpt-5'])
    expect(rows.find((r) => r.label === 'OpenAI · gpt-5')).toMatchObject({
      tokens: '13,895',
      unpriced: '13,895',
      charged: '—',
    })
  })

  it('counts a turn that names no model at all under that, rather than dropping its tokens', () => {
    const rows = currentUsageRows(
      [{ role: 'assistant', usage: { promptTokens: 700, completionTokens: 90 } }],
      prices,
    )
    expect(rows).toEqual([
      expect.objectContaining({ label: 'TOTALS', tokens: '790', unpriced: '790' }),
    ])
    expect(
      currentUsageRows(
        [messages[1], { role: 'assistant', usage: { promptTokens: 700, completionTokens: 90 } }],
        prices,
      ).map((r) => r.label),
    ).toEqual(['TOTALS', 'OpenAI · gpt-5.5', 'Model not recorded'])
  })

  it("leaves out a stored CLI turn's placeholder: zero tokens and a $0 that measured nothing", () => {
    const placeholder: UsageModalMessage = {
      role: 'assistant',
      model: { provider: 'custom', model: 'cli-agent/cursor-agent/auto' },
      usage: { promptTokens: 0, completionTokens: 0, cachedReadInputTokens: 0, cost: 0 },
    }
    expect(currentUsageRows([placeholder], prices)).toEqual([])
    expect(currentUsageRows([messages[1], placeholder], prices).map((r) => r.label)).toEqual([
      'TOTALS',
    ])
    expect(usagePriceKeys([placeholder])).toEqual([])
  })

  it('is empty when no message carries usage', () => {
    expect(currentUsageRows([{ role: 'user' }], prices)).toEqual([])
  })
})

describe('usagePriceKeys', () => {
  it('names each model a message with usage ran on, once', () => {
    const used = { promptTokens: 10, completionTokens: 2 }
    expect(
      usagePriceKeys([
        { role: 'assistant', model: { provider: 'openai', model: 'gpt-5.5' }, usage: used },
        { role: 'assistant', model: { provider: 'openai', model: 'gpt-5.5' }, usage: used },
        { role: 'assistant', model: { provider: 'cursor', model: 'composer-2.5' }, usage: used },
        { role: 'assistant', usage: { ...used, provider: 'openai', model: 'gpt-5' } },
        { role: 'assistant', usage: used },
        { role: 'user', model: { provider: 'x', model: 'y' }, usage: used },
      ]),
    ).toEqual([
      { key: 'openai::gpt-5.5', provider: 'openai', model: 'gpt-5.5' },
      { key: 'cursor::composer-2.5', provider: 'cursor', model: 'composer-2.5' },
      { key: 'openai::gpt-5', provider: 'openai', model: 'gpt-5' },
    ])
  })

  it('fetches no price for a CLI turn: its rows state their own charges and list values', () => {
    const cliTurnWithRows: UsageModalMessage = {
      role: 'assistant',
      model: { provider: 'custom', model: 'cli-agent/cursor-agent/auto' },
      usage: {
        promptTokens: 10,
        completionTokens: 2,
        billing: 'subscription',
        byModel: [
          {
            provider: 'cursor',
            model: 'composer-2.5',
            billing: 'subscription',
            inputTokens: 10,
            outputTokens: 2,
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
            costUsd: 0,
          },
        ],
      },
    }
    expect(usagePriceKeys([cliTurnWithRows])).toEqual([])
  })
})

describe('USAGE_TABLE_COLUMNS', () => {
  it('shows every cell a row words, once, leading with the charge and what it did not cover', () => {
    const [row] = ledgerUsageRows(aggregate)
    const shown = USAGE_TABLE_COLUMNS.map((c) => c.cell)
    const worded = Object.keys(row).filter(
      (k) => !['key', 'total', 'cacheRatio', 'notReportedBy'].includes(k),
    )
    expect([...shown].sort()).toEqual([...worded].sort())
    expect(new Set(shown).size).toBe(shown.length)
    expect(shown.slice(0, 5)).toEqual(['label', 'charged', 'included', 'unpriced', 'listValue'])
  })
})
