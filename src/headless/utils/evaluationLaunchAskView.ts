/** The card for an evaluation launch, read from the launch the host resolved and dry-ran before asking. Pure. */

import {
  EVALUATION_LAUNCH_ASK,
  EVALUATION_LAUNCH_SHORT_SHA,
  EVALUATION_LAUNCH_SOURCE,
} from './evaluationLaunchAskViewConstants'
import type {
  EvaluationLaunchAskBodyView,
  EvaluationLaunchBuildLine,
  EvaluationLaunchCapabilityRow,
  EvaluationLaunchPreviewView,
  EvaluationLaunchSettingRow,
} from './evaluationLaunchAskViewTypes'
import {
  KNOWLEDGE_EVALUATION_BUILD_MODE_LABEL,
  KNOWLEDGE_EVALUATION_CAPABILITIES,
  KNOWLEDGE_EVALUATION_FIXTURES,
  KNOWLEDGE_EVALUATION_PROMPT_MODE_LABEL,
  KNOWLEDGE_EVALUATION_SETTING_LABEL,
  KNOWLEDGE_EVALUATION_STAGE_LABEL,
} from './knowledgeEvaluationConstants'
import type { ToolAskCardView } from './toolAskCardTypes'

const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}

const text = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined

const strings = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.filter((s): s is string => typeof s === 'string' && s.trim() !== '').map((s) => s.trim())
    : []

const count = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0

const figure = (n: number): string => n.toLocaleString('en-US')

const short = (sha: string): string => sha.slice(0, EVALUATION_LAUNCH_SHORT_SHA)

const labelOf = <K extends string>(labels: Record<K, string>, value: string): string =>
  (labels as Record<string, string>)[value] ?? value

type RowValue = { value: string; detail?: string; capped?: string }

type ConcurrencyCap = { requested: number; effective: number; cappedBy?: string }

const runs = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : undefined

/** The host's word that the launch runs at another concurrency than was asked, when it can be read. */
function concurrencyCapOf(raw: unknown): ConcurrencyCap | undefined {
  const cap = record(raw)
  const requested = runs(cap.requested)
  const effective = runs(cap.effective)
  if (requested === undefined || effective === undefined || requested === effective)
    return undefined
  const cappedBy = text(cap.cappedBy)
  return { requested, effective, ...(cappedBy ? { cappedBy } : {}) }
}

function concurrencyValue(
  concurrency: number | undefined,
  cap: ConcurrencyCap | undefined,
): RowValue | undefined {
  if (cap) {
    return {
      value: figure(cap.effective),
      capped: EVALUATION_LAUNCH_ASK.concurrencyCapped(figure(cap.requested), cap.cappedBy),
    }
  }
  return concurrency !== undefined ? { value: figure(concurrency) } : undefined
}

function namesValue(names: string[], counted: (n: number) => string): RowValue | undefined {
  if (names.length === 0) return undefined
  return names.length <= 2
    ? { value: names.join(', ') }
    : { value: counted(names.length), detail: names.join(', ') }
}

function settingRows(
  params: Record<string, unknown>,
  sources: Record<string, unknown>,
  model: string | undefined,
  cap: ConcurrencyCap | undefined,
): EvaluationLaunchSettingRow[] {
  const L = KNOWLEDGE_EVALUATION_SETTING_LABEL
  const stage = text(params.stage)
  const promptMode = text(params.promptMode)
  const buildMode = text(params.buildMode)
  const concurrency = typeof params.concurrency === 'number' ? params.concurrency : undefined
  const omitTools = strings(params.omitTools)
  const values: Array<[keyof typeof L, RowValue | undefined]> = [
    ['stage', stage ? { value: labelOf(KNOWLEDGE_EVALUATION_STAGE_LABEL, stage) } : undefined],
    ['preset', text(params.preset) ? { value: text(params.preset)! } : undefined],
    ['model', model ? { value: model } : undefined],
    [
      'focusCapabilities',
      namesValue(strings(params.focusCapabilities), KNOWLEDGE_EVALUATION_CAPABILITIES),
    ],
    ['focusFixtures', namesValue(strings(params.focusFixtures), KNOWLEDGE_EVALUATION_FIXTURES)],
    [
      'focusExcludeCapabilities',
      namesValue(strings(params.focusExcludeCapabilities), KNOWLEDGE_EVALUATION_CAPABILITIES),
    ],
    ['llmFixtures', namesValue(strings(params.llmFixtures), KNOWLEDGE_EVALUATION_FIXTURES)],
    ['omitTools', omitTools.length > 0 ? { value: omitTools.join(', ') } : undefined],
    [
      'promptMode',
      promptMode
        ? { value: labelOf(KNOWLEDGE_EVALUATION_PROMPT_MODE_LABEL, promptMode) }
        : undefined,
    ],
    [
      'buildMode',
      buildMode ? { value: labelOf(KNOWLEDGE_EVALUATION_BUILD_MODE_LABEL, buildMode) } : undefined,
    ],
    ['concurrency', concurrencyValue(concurrency, cap)],
    [
      'ablateRawSource',
      params.ablateRawSource === true
        ? { value: EVALUATION_LAUNCH_ASK.withoutRawSource }
        : undefined,
    ],
    [
      'comparePromptGenerations',
      params.comparePromptGenerations === true
        ? { value: EVALUATION_LAUNCH_ASK.compared }
        : undefined,
    ],
    ['codeRef', text(params.codeRef) ? { value: text(params.codeRef)! } : undefined],
    ['reset', params.reset === true ? { value: EVALUATION_LAUNCH_ASK.resetValue } : undefined],
  ]
  return values.flatMap(([key, shown]) => {
    if (!shown) return []
    const source = EVALUATION_LAUNCH_SOURCE[text(sources[key]) ?? '']
    return [{ key, label: L[key], ...shown, ...(source ? { source } : {}) }]
  })
}

function buildAt(branch: unknown, head: unknown): string {
  const sha = text(head)
  return [text(branch), sha ? short(sha) : undefined].filter(Boolean).join(' · ')
}

function namedBuild(name: string, version: unknown): string {
  const v = text(version)
  return v ? `${name} ${v}` : name
}

function buildLines(preview: Record<string, unknown>): {
  heading?: string
  builds: EvaluationLaunchBuildLine[]
} {
  const measured = record(preview.measuredCode)
  const ref = text(measured.ref)
  const sha = text(measured.sha)
  if (ref || sha) {
    return {
      heading: EVALUATION_LAUNCH_ASK.measured,
      builds: [{ name: ref ?? short(sha!), at: sha ? short(sha) : '', dirty: false }],
    }
  }
  const build = record(preview.build)
  if (Object.keys(build).length === 0) return { builds: [] }
  const linked = Array.isArray(build.linked) ? build.linked.map(record) : []
  return {
    heading: EVALUATION_LAUNCH_ASK.build,
    builds: [
      {
        name: namedBuild(EVALUATION_LAUNCH_ASK.thisBuild, build.packageVersion),
        at: buildAt(build.gitBranch, build.gitHead),
        dirty: build.gitDirty === true,
      },
      ...linked.flatMap((l) => {
        const name = text(l.name)
        return name
          ? [
              {
                name: namedBuild(name, l.packageVersion),
                at: buildAt(l.gitBranch, l.gitHead),
                dirty: l.gitDirty === true,
              },
            ]
          : []
      }),
    ],
  }
}

function ledgerLine(ledger: Record<string, unknown>): { line: string; rewrites: boolean } {
  const copy = EVALUATION_LAUNCH_ASK.ledger
  const action = text(ledger.action)
  if (action === 'replace' || action === 'reset') {
    return {
      line: `${copy[action]}${ledger.snapshotsPrevious === true ? copy.keepsCopy : ''}`,
      rewrites: true,
    }
  }
  return { line: action === 'fresh' ? copy.fresh : copy.resume, rewrites: false }
}

function mixedBuilds(
  ledger: Record<string, unknown>,
): EvaluationLaunchPreviewView['mixedBuilds'] | undefined {
  if (ledger.mixedBuilds !== true) return undefined
  const prior = record(ledger.priorBuilds)
  const unstamped = count(prior.unstampedRuns)
  const parts = [
    ...strings(prior.builds).map(short),
    ...(unstamped > 0 ? [EVALUATION_LAUNCH_ASK.unstamped(unstamped)] : []),
  ]
  return {
    title: EVALUATION_LAUNCH_ASK.mixedTitle,
    detail: EVALUATION_LAUNCH_ASK.mixedDetail(
      parts.length > 0 ? parts.join(', ') : EVALUATION_LAUNCH_ASK.otherBuilds,
    ),
  }
}

function workLine(scenarios: number, agentRuns: number): string {
  return `${EVALUATION_LAUNCH_ASK.scenarios(figure(scenarios), scenarios === 1)} · ${EVALUATION_LAUNCH_ASK.agentRuns(figure(agentRuns), agentRuns === 1)}`
}

function capabilityRows(work: Record<string, unknown>): EvaluationLaunchCapabilityRow[] {
  const rows = Array.isArray(work.capabilities) ? work.capabilities.map(record) : []
  return rows.flatMap((c) => {
    const capability = text(c.capability)
    const scenarios = count(c.scenarios)
    const agentRuns = count(c.agentRuns)
    return capability
      ? [
          {
            capability,
            label: text(c.label) ?? capability,
            scenarios,
            agentRuns,
            work: workLine(scenarios, agentRuns),
          },
        ]
      : []
  })
}

function previewView(raw: unknown): EvaluationLaunchPreviewView | undefined {
  const preview = record(raw)
  if (Object.keys(preview).length === 0) return undefined
  const ledger = record(preview.ledger)
  const work = record(preview.work)
  const { line, rewrites } = ledgerLine(ledger)
  const scenarios = count(work.scenarios)
  const agentRuns = count(work.agentRuns)
  const mixed = mixedBuilds(ledger)
  const unavailable = strings(preview.unavailableTargets)
  const unknown = record(preview.unknownFocus)
  const unknownNames = [
    ...strings(unknown.capabilities),
    ...strings(unknown.fixtures),
    ...strings(unknown.excludeCapabilities),
  ]
  const { heading, builds } = buildLines(preview)
  const error = text(preview.error)
  return {
    ledger: line,
    rewritesLedger: rewrites,
    ...(mixed ? { mixedBuilds: mixed } : {}),
    totals: workLine(scenarios, agentRuns),
    ...(work.alreadyCovered === true ? { covered: EVALUATION_LAUNCH_ASK.covered } : {}),
    capabilities: capabilityRows(work),
    ...(unavailable.length > 0
      ? { unavailable: EVALUATION_LAUNCH_ASK.unavailable(unavailable.join(', ')) }
      : {}),
    ...(unknownNames.length > 0
      ? { unknownFocus: EVALUATION_LAUNCH_ASK.unknownFocus(unknownNames.join(', ')) }
      : {}),
    ...(heading ? { buildHeading: heading } : {}),
    builds,
    ...(error ? { error: EVALUATION_LAUNCH_ASK.previewError(error) } : {}),
  }
}

/**
 * The card for an `evaluateKnowledge` launch: every setting it resolved and where each came from —
 * the concurrency as it runs, with a short line saying what capped it when the host capped it —
 * the model, the earlier run it matched, and what its dry run says it would do — the ledger, the
 * work, the build. Read from the host's detail, never trusted for shape; without one, the agent's
 * own arguments. Resetting or replacing a ledger is a danger card. Pure.
 */
export function evaluationLaunchAskView(
  detail: unknown,
  args: Record<string, unknown>,
): Omit<ToolAskCardView, 'why'> {
  const card = record(detail)
  const hasParams = Object.keys(record(card.params)).length > 0
  const params = hasParams ? record(card.params) : args
  const sources = record(card.sources)
  const model = text(record(card.model).label)
  const matchActivityId = text(card.matchActivityId) ?? text(args.matchActivityId)
  const preview = previewView(card.preview)
  const previewError = text(card.previewError)
  const stage = text(params.stage)
  const stageLabel = stage
    ? labelOf(KNOWLEDGE_EVALUATION_STAGE_LABEL, stage)
    : EVALUATION_LAUNCH_ASK.fallbackStage
  const work = record(record(card.preview).work)
  const covered = preview?.covered !== undefined
  const agentRuns = preview && !covered ? count(work.agentRuns) : undefined
  const body: EvaluationLaunchAskBodyView = {
    settings: settingRows(params, sources, model, concurrencyCapOf(card.concurrencyCap)),
    ...(model ? { model } : {}),
    ...(matchActivityId ? { matchActivityId } : {}),
    ...(preview
      ? { preview }
      : { previewUnavailable: EVALUATION_LAUNCH_ASK.previewUnavailable(previewError) }),
  }
  const danger = preview ? preview.rewritesLedger : params.reset === true
  return {
    icon: 'run',
    tone: danger ? 'danger' : 'ask',
    ask: EVALUATION_LAUNCH_ASK.ask,
    tag: EVALUATION_LAUNCH_ASK.tag,
    headline: EVALUATION_LAUNCH_ASK.headline(
      stageLabel,
      agentRuns !== undefined
        ? EVALUATION_LAUNCH_ASK.agentRuns(figure(agentRuns), agentRuns === 1)
        : covered
          ? EVALUATION_LAUNCH_ASK.coveredShort
          : undefined,
    ),
    consequence: covered
      ? EVALUATION_LAUNCH_ASK.coveredConsequence
      : EVALUATION_LAUNCH_ASK.consequence(model),
    verb: EVALUATION_LAUNCH_ASK.verb,
    body: { kind: 'evaluation-launch', ...body },
  }
}
