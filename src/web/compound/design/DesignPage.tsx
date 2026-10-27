import type { ReactNode } from 'react'
import {
  DESIGN_TAB_LABELS,
  DESIGN_TEXT,
  designAppNav,
  designComponentUsers,
  designFirstProposal,
  findDesignScreen,
  type DesignActions,
  type DesignSelection,
  type DesignShown,
  type DesignTab,
} from '../../../headless'
import type { DesignIndex } from '../../../headless/api'
import DesignCurrentOverview from './DesignCurrentOverview'
import DesignHistory from './DesignHistory'
import DesignProposals from './DesignProposals'
import DesignScreenGrid, { type DesignCellRef } from './DesignScreenGrid'
import DesignSidebar from './DesignSidebar'
import DesignTidy from './DesignTidy'

/** Where the Design tab goes next; a field left out is cleared. */
export type DesignNavigation = {
  app?: string
  tab?: DesignTab
  screen?: string
  proposal?: string
}

export type DesignPageProps = {
  index: DesignIndex
  selection: DesignSelection
  cell: DesignCellRef | undefined
  onCell: (cell: DesignCellRef) => void
  onNavigate: (to: DesignNavigation) => void
  srcOf: (shown: DesignShown) => string | undefined
  actions: DesignActions
  /** Runs a change, showing its refusal; resolves `true` when it went through. */
  run: (change: () => Promise<unknown>) => Promise<boolean>
  onOpen: (shown: DesignShown) => void
  onCompare: (current: DesignShown, proposed: DesignShown) => void
  onDiscuss: (ref: { screenId: string; stateId?: string }) => void
  /** Shown at the right of the tabs: the ways to propose a design. */
  proposeSlot?: ReactNode
  /** The project's design playground, given when its web app declares one: its tab shows it. */
  playgroundSlot?: ReactNode
}

/**
 * An app's design: its screens and components at the side; on the right its
 * current design, the proposals waiting to change it, every version it had, and
 * a tidy-up plan when an agent proposed one. Draws only what it is given, so it
 * shows the same in the app and in the showcase.
 */
export default function DesignPage({
  index,
  selection,
  cell,
  onCell,
  onNavigate,
  srcOf,
  actions,
  run,
  onOpen,
  onCompare,
  onDiscuss,
  proposeSlot,
  playgroundSlot,
}: DesignPageProps) {
  const appId = selection.appId
  const nav = appId ? designAppNav(index, appId) : undefined
  const plan = index.tidyPlans.find((p) => p.status === 'open')
  const tabs: DesignTab[] = [
    'current',
    'proposals',
    'history',
    ...(plan || selection.tab === 'tidy' ? (['tidy'] as const) : []),
    ...(playgroundSlot ? (['playground'] as const) : []),
  ]
  const screen = selection.screenId
    ? findDesignScreen(index, selection.screenId)?.screen
    : undefined
  const proposal = appId ? designFirstProposal(index, appId, selection.proposalId) : undefined
  const go = (tab: DesignTab) => onNavigate({ ...(appId ? { app: appId } : {}), tab })

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto md:flex-row md:overflow-visible">
      <aside className="shrink-0 border-b border-(--border-subtle) p-3 md:w-64 md:overflow-auto md:border-r md:border-b-0">
        <DesignSidebar
          index={index}
          appId={appId}
          selectedScreenId={selection.tab === 'current' ? selection.screenId : undefined}
          onSelectApp={(app) => onNavigate({ app, tab: 'current' })}
          onSelectScreen={(s) =>
            onNavigate({ ...(appId ? { app: appId } : {}), tab: 'current', screen: s })
          }
          actions={actions}
          run={run}
        />
      </aside>
      <main className="flex min-w-0 flex-col md:min-h-0 md:flex-1 md:overflow-auto">
        {nav ? (
          <>
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-(--border-subtle) px-4 py-2">
              <div
                role="tablist"
                aria-label={nav.app.name}
                className="flex flex-wrap gap-1 rounded-lg bg-(--surface-muted) p-0.5"
              >
                {tabs.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={selection.tab === t}
                    onClick={() => go(t)}
                    className={[
                      'flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-[13px]',
                      selection.tab === t
                        ? 'bg-(--surface-raised) font-semibold text-(--text-primary) shadow-sm'
                        : 'text-(--text-secondary) hover:text-(--text-primary)',
                    ].join(' ')}
                  >
                    {DESIGN_TAB_LABELS[t]}
                    {t === 'proposals' && nav.openProposals > 0 ? (
                      <span
                        className="rounded-full px-1.5 text-[11px] font-bold"
                        style={{
                          background: 'var(--status-review-soft-bg)',
                          color: 'var(--status-review-soft-fg)',
                        }}
                      >
                        {nav.openProposals}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
              {proposeSlot ? <div className="ml-auto">{proposeSlot}</div> : null}
            </div>
            <div className="@container min-h-0 flex-1 p-4">
              {selection.tab === 'current' ? (
                screen ? (
                  <DesignScreenGrid
                    index={index}
                    screen={screen}
                    appName={nav.app.name}
                    selected={cell}
                    onSelect={onCell}
                    srcOf={srcOf}
                    onOpen={onOpen}
                    onCompare={onCompare}
                    onAccept={(proposalId, entryId) =>
                      void run(() => actions.acceptProposal(proposalId, [entryId]))
                    }
                    onDiscuss={onDiscuss}
                    {...(screen.kind === 'component'
                      ? { usedIn: designComponentUsers(index, screen.id) }
                      : {})}
                  />
                ) : (
                  <DesignCurrentOverview
                    index={index}
                    appId={nav.app.id}
                    srcOf={srcOf}
                    onSelectScreen={(s) =>
                      onNavigate({ app: nav.app.id, tab: 'current', screen: s })
                    }
                    onOpenProposals={() => go('proposals')}
                  />
                )
              ) : selection.tab === 'proposals' ? (
                <DesignProposals
                  index={index}
                  appId={nav.app.id}
                  proposal={proposal}
                  onSelect={(p) => onNavigate({ app: nav.app.id, tab: 'proposals', proposal: p })}
                  srcOf={srcOf}
                  onOpen={onOpen}
                  onCompare={onCompare}
                  onAccept={(id) => run(() => actions.acceptProposal(id))}
                  onKeep={(id) => run(() => actions.keepProposal(id))}
                  onChoose={(id) => run(() => actions.chooseProposal(id))}
                  onSendBack={(id, note) => run(() => actions.sendBackProposal(id, note))}
                  onFile={(id, entryId, target) =>
                    run(() => actions.fileEntry(id, entryId, target))
                  }
                />
              ) : selection.tab === 'history' ? (
                <DesignHistory
                  index={index}
                  appId={nav.app.id}
                  srcOf={srcOf}
                  onOpen={onOpen}
                  onRestore={async (versionId) => {
                    let made: string | undefined
                    if (
                      await run(
                        async () => (made = (await actions.restoreVersions([versionId])).id),
                      )
                    ) {
                      onNavigate({
                        app: nav.app.id,
                        tab: 'proposals',
                        ...(made ? { proposal: made } : {}),
                      })
                    }
                  }}
                />
              ) : selection.tab === 'playground' ? (
                playgroundSlot
              ) : (
                <DesignTidy
                  index={index}
                  plan={plan}
                  onDecide={(planId, moveId, decision) =>
                    run(() => actions.decideTidyMove(planId, moveId, decision))
                  }
                  onApply={(planId) => run(() => actions.applyTidy(planId))}
                  onDismiss={(planId) => run(() => actions.dismissTidy(planId))}
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
            <div className="text-[15px] font-semibold text-(--text-primary)">
              {DESIGN_TEXT.emptyTitle}
            </div>
            <p className="max-w-md text-sm text-(--text-secondary)">{DESIGN_TEXT.emptyBody}</p>
          </div>
        )}
      </main>
    </div>
  )
}
