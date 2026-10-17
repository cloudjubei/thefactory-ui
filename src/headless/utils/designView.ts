import {
  currentDesignVersion,
  designCompareRows,
  designScreenGrid,
  formatReference,
} from 'thefactory-tools/utils'
import type {
  DesignCompareRow,
  DesignIndex,
  DesignOrigin,
  DesignProposal,
  DesignTidyMove,
  GetProjectStorageUsageResponse,
  ProjectStorageUsage,
  StorageUsageStanding,
} from '../api'
import { designShownOfVersion, findDesignScreen, findDesignState } from './design'
import type { DesignShown } from './designTypes'
import {
  DESIGN_TEXT,
  DESIGN_TIDY_KIND_LABELS,
  STORAGE_WARNING_TAG,
  STORAGE_WARNING_TEXT,
} from './designViewConstants'
import type {
  DesignAppNav,
  DesignAskSummary,
  DesignCaseMatrix,
  DesignDeleteTarget,
  DesignFileTarget,
  DesignHistoryScreen,
  DesignNavScreen,
  DesignProposalGroup,
  DesignProposalListItem,
  DesignSelection,
  DesignSelectionParams,
  DesignTab,
  DesignTidyMoveView,
  StorageUsageRow,
  StorageWarningNotification,
} from './designViewTypes'
import type { DesignAskEntry } from './toolAskCardTypes'
import { formatBytes } from './path'

const TABS: readonly DesignTab[] = ['current', 'proposals', 'history', 'tidy', 'playground']

/**
 * What the Design tab shows for a link: a proposal opens its app's proposals,
 * a state or screen its app's current design; otherwise the app named, else
 * the first app. Pure.
 */
export function designSelection(
  index: DesignIndex,
  params: DesignSelectionParams,
): DesignSelection {
  const tab = TABS.includes(params.tab as DesignTab) ? (params.tab as DesignTab) : 'current'
  const proposal = params.proposal
    ? index.proposals.find((p) => p.id === params.proposal)
    : undefined
  if (proposal) return { appId: proposal.appId, tab: 'proposals', proposalId: proposal.id }
  const state = params.state ? findDesignState(index, params.state) : undefined
  if (state) {
    return {
      appId: state.app.id,
      tab: 'current',
      screenId: state.screen.id,
      stateId: state.state.id,
      ...(params.variant ? { variant: params.variant } : {}),
    }
  }
  const screen = params.screen ? findDesignScreen(index, params.screen) : undefined
  if (screen) return { appId: screen.app.id, tab, screenId: screen.screen.id }
  const app = index.apps.find((a) => a.id === params.app) ?? index.apps[0]
  return app ? { appId: app.id, tab } : { tab }
}

function navScreen(index: DesignIndex, screenId: string, name: string): DesignNavScreen {
  const grid = designScreenGrid(index, screenId)
  return {
    id: screenId,
    name,
    states: grid.rows.filter((r) => r.stateId).length,
    waiting: grid.rows.reduce(
      (n, r) => n + r.cells.filter((c) => c.status === 'new' || c.status === 'changed').length,
      0,
    ),
  }
}

/** An app's screens, its components by group, and how many proposals and versions it has. Pure. */
export function designAppNav(index: DesignIndex, appId: string): DesignAppNav | undefined {
  const app = index.apps.find((a) => a.id === appId)
  if (!app) return undefined
  const screens = index.screens.filter((s) => s.appId === appId)
  const groups = new Map<string, DesignNavScreen[]>()
  for (const c of screens.filter((s) => s.kind === 'component')) {
    const group = c.group ?? DESIGN_TEXT.components
    groups.set(group, [...(groups.get(group) ?? []), navScreen(index, c.id, c.name)])
  }
  const stateIds = new Set(
    index.states.filter((s) => screens.some((sc) => sc.id === s.screenId)).map((s) => s.id),
  )
  return {
    app,
    screens: screens.filter((s) => s.kind === 'screen').map((s) => navScreen(index, s.id, s.name)),
    componentGroups: [...groups].map(([group, components]) => ({ group, components })),
    openProposals: index.proposals.filter((p) => p.appId === appId && p.status === 'open').length,
    versions: index.versions.filter((v) => stateIds.has(v.stateId)).length,
  }
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}

/** What a proposal would change, in a few words: "2 changed · 1 new · 1 not filed". Pure. */
export function designProposalSummary(rows: readonly DesignCompareRow[]): string {
  const count = (marks: DesignCompareRow['mark'][]) =>
    rows.filter((r) => marks.includes(r.mark)).length
  const parts = [
    [count(['changed']), 'changed'],
    [count(['new', 'new-screen']), 'new'],
    [count(['unchanged']), 'unchanged'],
    [count(['unfiled']), 'not filed'],
  ] as const
  const said = parts.filter(([n]) => n > 0).map(([n, label]) => `${n} ${label}`)
  return said.length ? said.join(' · ') : plural(rows.length, 'image')
}

function listItem(index: DesignIndex, proposal: DesignProposal): DesignProposalListItem {
  const rows = designCompareRows(index, proposal)
  return { proposal, rows, summary: designProposalSummary(rows) }
}

/**
 * An app's proposals as the list groups them: those waiting for a decision,
 * then the answers to each question (alternatives together, whatever was
 * decided), then the rest that are decided — each newest first. Pure.
 */
export function designProposalGroups(index: DesignIndex, appId: string): DesignProposalGroup[] {
  const proposals = index.proposals
    .filter((p) => p.appId === appId)
    .sort((a, b) => b.createdAt - a.createdAt)
  const waiting = proposals.filter((p) => !p.question && p.status === 'open')
  const decided = proposals.filter((p) => !p.question && p.status !== 'open')
  const questions = [...new Set(proposals.flatMap((p) => (p.question ? [p.question] : [])))]
  return [
    ...(waiting.length
      ? [
          {
            key: 'waiting',
            title: DESIGN_TEXT.waitingForYou,
            items: waiting.map((p) => listItem(index, p)),
          },
        ]
      : []),
    ...questions.map((question) => ({
      key: `q:${question}`,
      title: DESIGN_TEXT.answersTo(question),
      question,
      items: proposals.filter((p) => p.question === question).map((p) => listItem(index, p)),
    })),
    ...(decided.length
      ? [
          {
            key: 'decided',
            title: DESIGN_TEXT.decided,
            items: decided.map((p) => listItem(index, p)),
          },
        ]
      : []),
  ]
}

/** The proposal to show first: the one asked for, else the newest open one, else the newest. Pure. */
export function designFirstProposal(
  index: DesignIndex,
  appId: string,
  proposalId?: string,
): DesignProposal | undefined {
  const own = index.proposals
    .filter((p) => p.appId === appId)
    .sort((a, b) => b.createdAt - a.createdAt)
  return own.find((p) => p.id === proposalId) ?? own.find((p) => p.status === 'open') ?? own[0]
}

/**
 * The answers to one question laid out like a draft's cases — a row per
 * choice, a column per variant — when more than one answers it. Pure.
 */
export function designCaseMatrix(
  index: DesignIndex,
  appId: string,
  question: string,
): DesignCaseMatrix | undefined {
  const proposals = index.proposals
    .filter((p) => p.appId === appId && p.question === question)
    .sort((a, b) => a.createdAt - b.createdAt)
  if (proposals.length < 2) return undefined
  const variants: string[] = []
  for (const p of proposals)
    for (const e of p.entries) if (!variants.includes(e.variant)) variants.push(e.variant)
  return {
    variants,
    rows: proposals.map((proposal) => ({
      proposal,
      cells: variants.map((v) => proposal.entries.find((e) => e.variant === v)),
    })),
  }
}

/** Who a proposal or version came from, as its row says. Pure. */
export function designOriginText(origin: DesignOrigin): string {
  if (origin.by === 'run') return 'From a run'
  if (origin.by === 'agent') return 'From an agent'
  return 'From you'
}

/**
 * An app's history: each screen that has versions, each state's versions
 * newest first, the current ones marked, and where each came from. Pure.
 */
export function designHistory(index: DesignIndex, appId: string): DesignHistoryScreen[] {
  const proposalTitle = (id: string | undefined) => index.proposals.find((p) => p.id === id)?.title
  return index.screens
    .filter((s) => s.appId === appId)
    .map((screen) => ({
      screen,
      states: index.states
        .filter((s) => s.screenId === screen.id)
        .map((state) => ({
          state,
          versions: index.versions
            .filter((v) => v.stateId === state.id)
            .sort((a, b) => b.createdAt - a.createdAt || b.number - a.number)
            .map((version) => ({
              version,
              current: currentDesignVersion(index, state.id, version.variant)?.id === version.id,
              from: proposalTitle(version.proposalId) ?? designOriginText(version.origin),
            })),
        }))
        .filter((s) => s.versions.length > 0),
    }))
    .filter((s) => s.states.length > 0)
}

function nameOf(index: DesignIndex, id: string, kind: DesignTidyMove['kind']): string {
  if (kind === 'merge-apps') return index.apps.find((a) => a.id === id)?.name ?? id
  if (kind === 'merge-screens') {
    const found = findDesignScreen(index, id)
    return found ? `${found.app.name} › ${found.screen.name}` : id
  }
  if (kind === 'fold-history') {
    const found = findDesignState(index, id)
    return found ? `${found.screen.name} › ${found.state.name}` : id
  }
  const version = index.versions.find((v) => v.id === id)
  return version ? designShownOfVersion(index, version).name : id
}

/** A tidy-up move in names: what it moves, and where to. Pure. */
export function designTidyMoveView(index: DesignIndex, move: DesignTidyMove): DesignTidyMoveView {
  const to = move.to.id
    ? nameOf(index, move.to.id, move.kind)
    : move.kind === 'fold-history' && move.to.screenId
      ? `${findDesignScreen(index, move.to.screenId)?.screen.name ?? move.to.screenId} › ${move.to.name ?? ''}`
      : (move.to.name ?? '')
  return {
    move,
    kindLabel: DESIGN_TIDY_KIND_LABELS[move.kind],
    from: move.from.map((id) => nameOf(index, id, move.kind)),
    to,
  }
}

/** Where an image of an app can be filed: its screens and components, each with its states. Pure. */
export function designFileTargets(index: DesignIndex, appId: string): DesignFileTarget[] {
  return index.screens
    .filter((s) => s.appId === appId)
    .map((s) => ({
      screenId: s.id,
      screenName: s.name,
      kind: s.kind,
      states: index.states
        .filter((st) => st.screenId === s.id)
        .map((st) => ({ id: st.id, name: st.name })),
    }))
}

/** The screens that show a component. Pure. */
export function designComponentUsers(index: DesignIndex, componentId: string): string[] {
  return index.screens.filter((s) => s.uses.includes(componentId)).map((s) => s.name)
}

/** What stands for a screen in a miniature: its first state's current look in its first variant. Pure. */
export function designPreviewShown(index: DesignIndex, screenId: string): DesignShown | undefined {
  const { rows } = designScreenGrid(index, screenId)
  for (const row of rows) {
    const cell = row.cells.find((c) => c.current)
    if (cell?.current) return designShownOfVersion(index, cell.current)
  }
  return undefined
}

/** What a design reference's chip previews: the state it names, or what its screen shows. Pure. */
export function designReferencePreview(
  index: DesignIndex,
  link: { screenId?: string; stateId?: string },
): DesignShown | undefined {
  if (link.stateId) {
    const found = findDesignState(index, link.stateId)
    if (!found) return undefined
    const variants = designScreenGrid(index, found.screen.id).variants
    for (const variant of variants) {
      const version = currentDesignVersion(index, found.state.id, variant)
      if (version) return designShownOfVersion(index, version)
    }
    return undefined
  }
  return link.screenId ? designPreviewShown(index, link.screenId) : undefined
}

/**
 * What a design ask files, read against the design: each screen it names —
 * one the design has (found by id, name or a name it had) or a new one — with
 * the states it fills, replacing a current look or new; images naming no
 * screen; the variants, said once. Pure.
 */
export function designAskSummary(
  index: DesignIndex,
  entries: readonly DesignAskEntry[],
): DesignAskSummary {
  const screens: DesignAskSummary['screens'] = []
  const variants: string[] = []
  let unfiled = 0
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
  for (const e of entries) {
    if (e.variant && !variants.includes(e.variant)) variants.push(e.variant)
    const ref = e.screenId ?? e.screenName
    if (!ref) {
      unfiled += 1
      continue
    }
    const screen =
      index.screens.find((s) => s.id === ref) ??
      index.screens.find((s) => same(s.name, ref) || s.aliases.some((a) => same(a, ref)))
    const name = screen?.name ?? ref
    let row = screens.find((s) => same(s.name, name))
    if (!row) {
      const app = screen && index.apps.find((a) => a.id === screen.appId)
      const stateIds = screen
        ? index.states.filter((s) => s.screenId === screen.id).map((s) => s.id)
        : []
      row = {
        name,
        ...(screen && app
          ? {
              found: {
                app: app.name,
                versions: index.versions.filter((v) => stateIds.includes(v.stateId)).length,
              },
            }
          : {}),
        states: [],
      }
      screens.push(row)
    }
    const stateRef = e.stateId ?? e.stateName
    const state =
      screen && stateRef
        ? index.states.find(
            (s) => s.screenId === screen.id && (s.id === stateRef || same(s.name, stateRef)),
          )
        : undefined
    const stateName = state?.name ?? e.stateName ?? 'Default'
    const tag = state && index.versions.some((v) => v.stateId === state.id) ? 'replaces' : 'new'
    if (!row.states.some((s) => same(s.name, stateName))) row.states.push({ name: stateName, tag })
  }
  return { screens, unfiled, variants }
}

/** The in-page question before a delete, saying what goes with it. Pure. */
export function designDeleteSummary(index: DesignIndex, target: DesignDeleteTarget): string {
  const versionsOf = (stateIds: string[]) =>
    index.versions.filter((v) => stateIds.includes(v.stateId)).length
  if (target.kind === 'proposal') return `Delete the proposal “${target.proposal.title}”?`
  if (target.kind === 'state') {
    const n = versionsOf([target.state.id])
    return n === 0
      ? `Delete “${target.state.name}”? It has no versions.`
      : `Delete “${target.state.name}”? Its ${plural(n, 'version')} go with it.`
  }
  if (target.kind === 'screen') {
    const states = index.states.filter((s) => s.screenId === target.screen.id).map((s) => s.id)
    return states.length === 0
      ? `Delete “${target.screen.name}”? It has nothing in it.`
      : `Delete “${target.screen.name}”? Its ${plural(states.length, 'state')} and ${plural(versionsOf(states), 'version')} go with it.`
  }
  const screens = index.screens.filter((s) => s.appId === target.app.id).map((s) => s.id)
  const states = index.states.filter((s) => screens.includes(s.screenId)).map((s) => s.id)
  const proposals = index.proposals.filter((p) => p.appId === target.app.id).length
  if (screens.length === 0 && proposals === 0)
    return `Delete “${target.app.name}”? It has nothing in it.`
  return `Delete “${target.app.name}”? Its ${plural(screens.length, 'screen')}, ${plural(versionsOf(states), 'version')} and ${plural(proposals, 'proposal')} go with it.`
}

/** A chat draft with a design reference added at its end, ready to type after. Pure. */
export function designDiscussDraft(
  draft: string,
  ref: { screenId: string; stateId?: string },
): string {
  const token = formatReference({
    kind: 'design',
    screenId: ref.screenId,
    ...(ref.stateId ? { stateId: ref.stateId } : {}),
  })
  const gap = draft === '' || /\s$/.test(draft) ? '' : ' '
  return `${draft}${gap}${token} `
}

function size(bytes: number): string {
  return formatBytes(bytes) ?? '0 B'
}

/** The Design tab's meter: the project's usage, then every project's against the threshold. Pure. */
export function storageUsageSummary(report: GetProjectStorageUsageResponse): string {
  return `${size(report.usage.totalBytes)} · all projects ${size(report.standing.totalBytes)} of ${size(report.standing.thresholdBytes)}`
}

/** A project's usage by store. Pure. */
export function storageUsageBreakdown(usage: ProjectStorageUsage): StorageUsageRow[] {
  return [
    { key: 'design', label: 'Design', bytes: usage.designBytes, size: size(usage.designBytes) },
    {
      key: 'evidence',
      label: 'Run proof',
      bytes: usage.evidenceBytes,
      size: size(usage.evidenceBytes),
    },
    { key: 'ui-test', label: 'UI tests', bytes: usage.uiTestBytes, size: size(usage.uiTestBytes) },
    {
      key: 'mobile-test',
      label: 'Mobile tests',
      bytes: usage.mobileTestBytes,
      size: size(usage.mobileTestBytes),
    },
  ]
}

/** The notification a `storage:usage-warning` posts. Pure. */
export function storageWarningNotification(
  warning: StorageUsageStanding & { projectId?: string },
): StorageWarningNotification {
  return {
    title: `Project files use ${size(warning.totalBytes)} of ${size(warning.thresholdBytes)}`,
    body: STORAGE_WARNING_TEXT.body,
    tag: STORAGE_WARNING_TAG,
  }
}
