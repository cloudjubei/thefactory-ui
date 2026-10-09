import { useMemo, useState } from 'react'

import { useProjects } from '../../../headless/contexts/ProjectsContext'
import { useActionRules } from '../../../headless/hooks/useActionRules'
import {
  actionRuleFilterOptions,
  actionRuleRowView,
  groupActionRules,
} from '../../../headless/utils/actionRules'
import {
  RULES_GIVEN_ON_FILTER_LABEL,
  SAVED_RULES_EMPTY,
} from '../../../headless/utils/actionRulesConstants'
import type { ActionRuleView } from '../../../headless/utils/actionRulesTypes'
import { NativeSelect } from '../../primitives/NativeSelect'
import ActionRuleRow from './ActionRuleRow'

export type SavedRulesSettingsProps = {
  /** Open a chat from its rules' heading. Without it the heading is plain text. */
  onOpenChat?: (chatContextId: string) => void
}

const ALL = ''

/**
 * Settings → Saved rules: every "always allow" rule — everywhere rules first,
 * then each project's chats with their own rules (the same ones each chat
 * lists in its settings) — each removable, narrowed by project or sign-in.
 */
export default function SavedRulesSettings({ onOpenChat }: SavedRulesSettingsProps) {
  const { rules, loading, error, remove } = useActionRules()
  const { projects } = useProjects()
  const [projectId, setProjectId] = useState(ALL)
  const [credentialId, setCredentialId] = useState(ALL)
  const projectTitle = useMemo(() => {
    const titles = new Map(projects.map((p) => [p.id, p.title]))
    return (id: string) => titles.get(id)
  }, [projects])
  const options = useMemo(
    () => actionRuleFilterOptions(rules, { projectTitle }),
    [rules, projectTitle],
  )
  const grouped = useMemo(
    () =>
      groupActionRules(rules, {
        projectTitle,
        ...(projectId ? { projectId } : {}),
        ...(credentialId ? { credentialId } : {}),
      }),
    [rules, projectTitle, projectId, credentialId],
  )
  const now = Date.now()
  const row = (rule: ActionRuleView, inChat: boolean) => (
    <ActionRuleRow
      key={rule.id}
      rule={rule}
      view={actionRuleRowView(rule, { now, inChat, projectTitle })}
      onRemove={remove}
    />
  )
  const nothing = grouped.everywhere.length === 0 && grouped.projects.length === 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-xl font-semibold">Saved rules</h2>
        <p className="text-sm text-(--text-secondary)">
          Tool calls you chose to always allow. A rule for one chat also shows in that chat’s
          settings; a rule for everywhere applies to every chat that uses its sign-in.
        </p>
      </div>

      {options.projects.length > 0 || options.signIns.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium">
            <span>Project</span>
            <NativeSelect value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value={ALL}>All projects and everywhere</option>
              {options.projects.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="space-y-1 text-sm font-medium">
            <span>{RULES_GIVEN_ON_FILTER_LABEL}</span>
            <NativeSelect value={credentialId} onChange={(e) => setCredentialId(e.target.value)}>
              <option value={ALL}>Every sign-in</option>
              {options.signIns.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          </label>
        </div>
      ) : null}

      {error ? <p className="text-sm text-(--color-red-600)">{error}</p> : null}
      {!loading && nothing ? (
        <p className="text-sm text-(--text-secondary)">{SAVED_RULES_EMPTY}</p>
      ) : null}

      {grouped.everywhere.length > 0 ? (
        <section className="space-y-2" aria-label="Everywhere">
          <h3 className="text-sm font-semibold text-(--text-primary)">Everywhere</h3>
          <ul className="flex flex-col gap-1.5">{grouped.everywhere.map((r) => row(r, false))}</ul>
        </section>
      ) : null}

      {grouped.projects.map((project) => (
        <section
          key={project.projectId ?? 'other'}
          className="space-y-3"
          aria-label={project.title}
        >
          <h3 className="text-sm font-semibold text-(--text-primary)">{project.title}</h3>
          {project.chats.map((chat) => (
            <div key={chat.chatContextId} className="space-y-1.5 pl-3">
              {onOpenChat ? (
                <button
                  type="button"
                  className="text-[13px] font-medium text-(--accent-primary) hover:underline"
                  onClick={() => onOpenChat(chat.chatContextId)}
                >
                  {chat.title}
                </button>
              ) : (
                <div className="text-[13px] font-medium text-(--text-primary)">{chat.title}</div>
              )}
              <ul className="flex flex-col gap-1.5">{chat.rules.map((r) => row(r, true))}</ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
