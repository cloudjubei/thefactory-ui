import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Animated,
  BackHandler,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import {
  nativeMotion,
  nativePalette,
  nativeRadii,
  nativeShadows,
  nativeSpace,
  nativeZIndex,
} from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import SpinnerWithDot from '../../primitives/SpinnerWithDot'
import NotificationBadge, {
  getNotificationBadgeColor,
  type NotificationBadgeColor,
} from '../NotificationBadge'
import { formatBadgeCount } from '../../../headless/utils/badgeAggregation'
import {
  IconChevronDown,
  IconChevronRight,
  IconFolder,
  IconFolderOpen,
  IconPause,
} from '../../icons'

export interface NavDrawerItem {
  key: string
  label: string
  /** Pre-resolved icon node — the host maps `NavIconKey` to its icon set. */
  icon?: ReactNode
  active?: boolean
  /** Numeric badge; `0` / `undefined` renders nothing. */
  badgeCount?: number
  /** Badge / dot colour — matches the per-category palette the user picks in
   *  notification settings. Falls back to red, mirroring the web `NavRow`. */
  badgeColor?: NotificationBadgeColor
  /** Renders a small dot instead of a count (e.g. "thinking"). */
  showDot?: boolean
  /** Renders a spinner (with a dot) — the chat "thinking" affordance. Takes
   *  precedence over `showDot`; a numeric `badgeCount` still wins over both. */
  thinking?: boolean
  /** Renders a pause icon — an orphaned activity that resumes when opened.
   *  `thinking` and a numeric `badgeCount` both win over it. */
  paused?: boolean
  /** Stable handle for UI-test tooling (Android resource-id / iOS accessibilityIdentifier). */
  testID?: string
  onPress: () => void
}

export interface NavDrawerGroup {
  key: string
  label: string
  icon?: ReactNode
  active?: boolean
  /** Selecting the group itself (navigates to the group). */
  onPress: () => void
  /** Member projects; when non-empty the row becomes an expandable folder. */
  projects: NavDrawerItem[]
  /** Chat unread shown when the row is flat (SCOPE) or the folder is
   *  COLLAPSED — typically the aggregate of the group + its member projects. */
  badgeCount?: number
  badgeColor?: NotificationBadgeColor
  /** Spinner affordance when the collapsed/flat badge is streaming. */
  thinking?: boolean
  /** Pause affordance when a collapsed member's activity is orphaned (resumes when opened). */
  paused?: boolean
  /** Chat unread shown when an expandable folder is OPEN — typically the
   *  group's OWN chats only (member projects show their own rows). */
  openBadgeCount?: number
  openThinking?: boolean
}

export interface NavDrawerProps {
  open: boolean
  onClose: () => void
  /** Brand / title shown at the top of the drawer. */
  title?: string
  /** Optional brand mark rendered left of the title (the app icon). */
  logo?: ReactNode
  /** Pinned nav section (shell tabs or group tabs). */
  navItems?: NavDrawerItem[]
  /** Ungrouped projects, listed above the groups. */
  projects?: NavDrawerItem[]
  /** Project groups, rendered as expandable folders. */
  groups?: NavDrawerGroup[]
  /** Section label above the projects list. Default `"Projects"`. */
  projectsLabel?: string
  /** Optional action in the projects section header (e.g. a "Manage" button). */
  projectsHeaderAction?: ReactNode
  /** Shown when there are no projects and no groups. */
  projectsEmptyLabel?: string
  /** Pinned bottom row — typically Settings. */
  footerItem?: NavDrawerItem
  /** Extra pinned rows rendered above {@link footerItem} (e.g. an account-global Background Tasks entry). */
  footerItemsExtra?: NavDrawerItem[]
  /** Safe-area insets supplied by the host (avoids a safe-area dependency here). */
  topInset?: number
  bottomInset?: number
}

const MAX_WIDTH = 320
const WIDTH_FRACTION = 0.86

/**
 * Left-sliding navigation drawer — the native peer of the web `Sidebar`. The
 * structural model (`SHELL_TAB_DEFS`, `splitGroupsAndProjects`, …) lives in
 * `thefactory-ui/headless`; this component is pure presentation and receives
 * pre-resolved rows + callbacks from the host.
 */
export default function NavDrawer({
  open,
  onClose,
  title,
  logo,
  navItems,
  projects,
  groups,
  projectsLabel = 'Projects',
  projectsHeaderAction,
  projectsEmptyLabel = 'No projects yet.',
  footerItem,
  footerItemsExtra,
  topInset = 0,
  bottomInset = 0,
}: NavDrawerProps) {
  const { theme } = useNativeTheme()
  const { width: screenWidth } = useWindowDimensions()
  const panelWidth = Math.min(MAX_WIDTH, Math.round(screenWidth * WIDTH_FRACTION))
  const anim = useRef(new Animated.Value(0)).current
  // Two-step mount: the drawer stays rendered through its close animation so
  // it slides out smoothly. An RNModal unmounts on `visible=false` and
  // vanishes in a single frame (the flash); an in-tree overlay also avoids
  // the native modal present/dismiss cost that stutters against a screen
  // push. Mirrors web `Sidebar`'s `drawerRender` / `drawerShown` pair.
  const [rendered, setRendered] = useState(open)

  useEffect(() => {
    if (open) setRendered(true)
  }, [open])

  useEffect(() => {
    if (!rendered) return
    Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: open ? nativeMotion.normal : nativeMotion.fast,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !open) setRendered(false)
    })
  }, [open, rendered, anim])

  // Android hardware back closes the drawer instead of popping a screen.
  useEffect(() => {
    if (!rendered) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!open) return false
      onClose()
      return true
    })
    return () => sub.remove()
  }, [rendered, open, onClose])

  const hasProjects = (projects?.length ?? 0) > 0 || (groups?.length ?? 0) > 0

  if (!rendered) return null

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: nativeZIndex.modal,
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#000',
          opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }),
        }}
      />
      <Pressable
        accessibilityLabel="Dismiss menu"
        onPress={onClose}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <Animated.View
        style={{
          width: panelWidth,
          height: '100%',
          backgroundColor: theme.surface.base,
          borderRightWidth: 1,
          borderRightColor: theme.border.subtle,
          ...nativeShadows[3],
          transform: [
            {
              translateX: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [-panelWidth, 0],
              }),
            },
          ],
        }}
      >
        <View
          style={{
            paddingTop: topInset + nativeSpace[3],
            paddingBottom: nativeSpace[3],
            paddingHorizontal: nativeSpace[4],
            borderBottomWidth: 1,
            borderBottomColor: theme.border.subtle,
            flexDirection: 'row',
            alignItems: 'center',
            gap: nativeSpace[3],
          }}
        >
          {logo}
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 17,
              fontWeight: '700',
              color: theme.text.primary,
            }}
          >
            {title ?? 'Overseer'}
          </Text>
        </View>

        {/* Fixed nav section — only the projects list below scrolls, matching
            web's `Sidebar` (nav rows `shrink-0`, projects `overflow-auto`). */}
        {navItems && navItems.length > 0 ? (
          <View style={{ paddingHorizontal: nativeSpace[2], paddingTop: nativeSpace[2] }}>
            {navItems.map((item) => (
              <Row key={item.key} item={item} />
            ))}
          </View>
        ) : null}

        {(navItems?.length ?? 0) > 0 ? <Divider /> : null}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: nativeSpace[4],
            paddingTop: (navItems?.length ?? 0) > 0 ? nativeSpace[1] : nativeSpace[3],
            paddingBottom: nativeSpace[1],
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: theme.text.muted,
            }}
          >
            {projectsLabel}
          </Text>
          {projectsHeaderAction}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: nativeSpace[2],
            paddingBottom: nativeSpace[2],
          }}
          showsVerticalScrollIndicator={false}
        >
          {!hasProjects ? (
            <Text
              style={{
                paddingHorizontal: nativeSpace[2],
                paddingVertical: nativeSpace[2],
                fontSize: 14,
                color: theme.text.muted,
              }}
            >
              {projectsEmptyLabel}
            </Text>
          ) : null}
          {projects?.map((item) => (
            <Row key={item.key} item={item} />
          ))}
          {groups?.map((group) => (
            <GroupFolder key={group.key} group={group} />
          ))}
        </ScrollView>

        {footerItem || (footerItemsExtra?.length ?? 0) > 0 ? (
          <View
            style={{
              paddingHorizontal: nativeSpace[2],
              paddingTop: nativeSpace[1],
              paddingBottom: bottomInset + nativeSpace[1],
              borderTopWidth: 1,
              borderTopColor: theme.border.subtle,
            }}
          >
            {footerItemsExtra?.map((item) => (
              <Row key={item.key} item={item} />
            ))}
            {footerItem ? <Row item={footerItem} /> : null}
          </View>
        ) : null}
      </Animated.View>
    </View>
  )
}

function Divider() {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        height: 1,
        backgroundColor: theme.border.subtle,
        marginVertical: nativeSpace[2],
        marginHorizontal: nativeSpace[4],
      }}
    />
  )
}

function Row({
  item,
  indent = false,
  trailing,
}: {
  item: NavDrawerItem
  indent?: boolean
  trailing?: ReactNode
}) {
  const { theme } = useNativeTheme()
  return (
    <Pressable
      onPress={item.onPress}
      testID={item.testID}
      accessibilityRole="button"
      accessibilityState={{ selected: !!item.active }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: nativeSpace[3],
        minHeight: 44,
        paddingVertical: nativeSpace[2],
        paddingRight: nativeSpace[2],
        paddingLeft: indent ? nativeSpace[10] : nativeSpace[3],
        borderRadius: nativeRadii[2],
        backgroundColor: item.active
          ? nativePalette.brand[50]
          : pressed
            ? theme.surface.hover
            : 'transparent',
      })}
    >
      <View style={{ width: 22, alignItems: 'center' }}>{item.icon}</View>
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          fontSize: 15,
          fontWeight: item.active ? '600' : '400',
          color: item.active ? nativePalette.brand[700] : theme.text.primary,
        }}
      >
        {item.label}
      </Text>
      {item.badgeCount && item.badgeCount > 0 ? (
        <NotificationBadge
          text={formatBadgeCount(item.badgeCount)}
          color={item.badgeColor}
          tooltipLabel={item.label}
        />
      ) : item.thinking ? (
        <SpinnerWithDot size={14} showDot dotColor={getNotificationBadgeColor(item.badgeColor)} />
      ) : item.paused ? (
        <IconPause size={14} color={nativePalette.brand[500]} />
      ) : item.showDot ? (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: getNotificationBadgeColor(item.badgeColor),
          }}
        />
      ) : null}
      {trailing}
    </Pressable>
  )
}

function GroupFolder({ group }: { group: NavDrawerGroup }) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(() => group.projects.some((p) => p.active))

  // SCOPE groups (and any group with no member projects) are flat rows — no
  // expander, nothing to expand into.
  if (group.projects.length === 0) {
    return (
      <Row
        item={{
          key: group.key,
          label: group.label,
          icon: group.icon,
          active: group.active,
          onPress: group.onPress,
          badgeCount: group.badgeCount,
          badgeColor: group.badgeColor,
          thinking: group.thinking,
        }}
      />
    )
  }

  const toggle = () => setOpen((v) => !v)
  // Open folders show the group's own chats; collapsed folders show the
  // aggregate. The parent supplies both; we pick by the current open state.
  const headerBadgeCount = open ? (group.openBadgeCount ?? 0) : (group.badgeCount ?? 0)
  const headerThinking = open ? !!group.openThinking : !!group.thinking
  const headerPaused = !open && !!group.paused
  const showHeaderBadge = headerBadgeCount > 0 || headerThinking || headerPaused
  return (
    <View>
      {/* The folder icon and the right-hand chevron both toggle open/closed;
          the label selects (navigates to) the group. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 44,
          borderRadius: nativeRadii[2],
          backgroundColor: group.active ? nativePalette.brand[50] : 'transparent',
        }}
      >
        <Pressable
          onPress={toggle}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={open ? `Collapse ${group.label}` : `Expand ${group.label}`}
          style={{
            paddingLeft: nativeSpace[3],
            paddingRight: nativeSpace[2],
            paddingVertical: nativeSpace[2],
          }}
        >
          {open ? (
            <IconFolderOpen size={22} color={theme.text.secondary} />
          ) : (
            <IconFolder size={22} color={theme.text.secondary} />
          )}
        </Pressable>
        <Pressable
          onPress={group.onPress}
          accessibilityRole="button"
          accessibilityState={{ selected: !!group.active }}
          style={{ flex: 1, paddingVertical: nativeSpace[2] }}
        >
          <Text
            numberOfLines={1}
            style={{
              fontSize: 15,
              fontWeight: group.active ? '600' : '400',
              color: group.active ? nativePalette.brand[700] : theme.text.primary,
            }}
          >
            {group.label}
          </Text>
        </Pressable>
        {showHeaderBadge ? (
          <View style={{ paddingHorizontal: nativeSpace[1] }}>
            {headerBadgeCount > 0 ? (
              <NotificationBadge
                text={formatBadgeCount(headerBadgeCount)}
                color={group.badgeColor}
                tooltipLabel={group.label}
              />
            ) : headerThinking ? (
              <SpinnerWithDot
                size={14}
                showDot
                dotColor={getNotificationBadgeColor(group.badgeColor)}
              />
            ) : (
              <IconPause size={14} color={nativePalette.brand[500]} />
            )}
          </View>
        ) : null}
        <Pressable
          onPress={toggle}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={open ? `Collapse ${group.label}` : `Expand ${group.label}`}
          style={{ paddingHorizontal: nativeSpace[3], paddingVertical: nativeSpace[2] }}
        >
          {open ? (
            <IconChevronDown size={16} color={theme.text.muted} />
          ) : (
            <IconChevronRight size={16} color={theme.text.muted} />
          )}
        </Pressable>
      </View>
      {open
        ? group.projects.map((project) => <Row key={project.key} item={project} indent />)
        : null}
    </View>
  )
}
