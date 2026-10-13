import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

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
  TRUST_SITE_BUTTON,
  TRUST_SITE_HINT,
  TRUST_SITE_LABEL,
  TRUST_SITE_PLACEHOLDER,
} from '../../../headless/utils/actionRulesConstants'
import type { ActionRuleView } from '../../../headless/utils/actionRulesTypes'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/Select'
import ActionRuleRow from './ActionRuleRow'

export type SavedRulesSettingsProps = {
  /** Open a chat from its rules' heading. Without it the heading is plain text. */
  onOpenChat?: (chatContextId: string) => void
}

const ALL = '__all'

/**
 * Native peer of web's `SavedRulesSettings`: every "always allow" rule —
 * everywhere rules first, then each project's chats — removable, narrowed by
 * project or sign-in.
 */
export default function SavedRulesSettings({ onOpenChat }: SavedRulesSettingsProps) {
  const { theme } = useNativeTheme()
  const { rules, loading, error, remove, trustSite } = useActionRules()
  const [site, setSite] = useState('')
  const [trusting, setTrusting] = useState(false)
  const submitSite = async () => {
    if (!site.trim() || trusting) return
    setTrusting(true)
    if (await trustSite(site.trim())) setSite('')
    setTrusting(false)
  }
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
        ...(projectId !== ALL ? { projectId } : {}),
        ...(credentialId !== ALL ? { credentialId } : {}),
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
  const heading = (text: string) => (
    <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>{text}</Text>
  )
  const nothing = grouped.everywhere.length === 0 && grouped.projects.length === 0

  return (
    <View style={{ gap: nativeSpace[4], padding: nativeSpace[4] }}>
      <Text style={{ fontSize: 13, color: theme.text.secondary }}>
        Tool calls you chose to always allow. A rule for one chat also shows in that chat’s
        settings; a rule for everywhere applies to every chat that uses its sign-in.
      </Text>

      <View style={{ gap: nativeSpace[1] }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
          {TRUST_SITE_LABEL}
        </Text>
        <View style={{ flexDirection: 'row', gap: nativeSpace[2], alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Input
              size="sm"
              value={site}
              onChangeText={setSite}
              placeholder={TRUST_SITE_PLACEHOLDER}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              disabled={trusting}
              onSubmitEditing={() => void submitSite()}
            />
          </View>
          <Button
            size="sm"
            loading={trusting}
            disabled={!site.trim() || trusting}
            onPress={() => void submitSite()}
          >
            {TRUST_SITE_BUTTON}
          </Button>
        </View>
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{TRUST_SITE_HINT}</Text>
      </View>

      {options.projects.length > 0 ? (
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger>
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All projects and everywhere</SelectItem>
            {options.projects.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      {options.signIns.length > 0 ? (
        <Select value={credentialId} onValueChange={setCredentialId}>
          <SelectTrigger>
            <SelectValue placeholder={RULES_GIVEN_ON_FILTER_LABEL} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Every sign-in</SelectItem>
            {options.signIns.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {error ? <Text style={{ fontSize: 12, color: '#dc2626' }}>{error}</Text> : null}
      {!loading && nothing ? (
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>{SAVED_RULES_EMPTY}</Text>
      ) : null}

      {grouped.everywhere.length > 0 ? (
        <View style={{ gap: nativeSpace[2] }}>
          {heading('Everywhere')}
          {grouped.everywhere.map((r) => row(r, false))}
        </View>
      ) : null}

      {grouped.projects.map((project) => (
        <View key={project.projectId ?? 'other'} style={{ gap: nativeSpace[2] }}>
          {heading(project.title)}
          {project.chats.map((chat) => (
            <View
              key={chat.chatContextId}
              style={{ gap: nativeSpace[2], paddingLeft: nativeSpace[3] }}
            >
              {onOpenChat ? (
                <Pressable
                  accessibilityRole="link"
                  onPress={() => onOpenChat(chat.chatContextId)}
                  hitSlop={6}
                >
                  <Text style={{ fontSize: 13, fontWeight: '500', color: theme.accent.primary }}>
                    {chat.title}
                  </Text>
                </Pressable>
              ) : (
                <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.primary }}>
                  {chat.title}
                </Text>
              )}
              {chat.rules.map((r) => row(r, true))}
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}
