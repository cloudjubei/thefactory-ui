import type { ReactNode } from 'react'
import { Pressable, View } from 'react-native'

import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevronLeft, IconMenu } from '../../icons'
import AppHeader from './AppHeader'

export interface ScreenShellProps {
  /** Centred screen title. */
  title?: string
  /** Right-slot actions for the header. */
  right?: ReactNode
  /**
   * When provided, the left slot is a back button (detail screens) instead
   * of the hamburger (top-level screens).
   */
  onBack?: () => void
  /**
   * Drawer-open callback. When provided, the hamburger button is rendered
   * (always next to the back button on detail screens; alone on top-level
   * ones). Host wires this from its own nav-drawer state — keeps the shell
   * cross-platform without coupling to a specific drawer-context module.
   */
  onOpenDrawer?: () => void
  children: ReactNode
}

/**
 * Shared per-screen frame: the single `AppHeader` bar (hamburger / back +
 * title + actions) and the screen body. The host is responsible for the
 * outer safe-area wrapper — `thefactory-ui` deliberately does NOT depend
 * on `react-native-safe-area-context`, so the consumer either wraps this
 * in `<SafeAreaView>` directly or applies the inset via its own root
 * provider. Mobile's `src/ui/shell/ScreenShell.tsx` is the thin wrapper
 * that adds the `SafeAreaView` plus pulls the drawer-open callback from
 * `NavDrawerContext`.
 */
export default function ScreenShell({
  title,
  right,
  onBack,
  onOpenDrawer,
  children,
}: ScreenShellProps) {
  const { theme } = useNativeTheme()

  const backButton = onBack ? (
    <Pressable
      onPress={onBack}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Back"
      style={{ paddingHorizontal: 10, paddingVertical: 6 }}
    >
      <IconChevronLeft size={26} color={theme.accent.primary} />
    </Pressable>
  ) : null

  const menuButton = onOpenDrawer ? (
    <Pressable
      onPress={onOpenDrawer}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Open menu"
      style={{ paddingHorizontal: 10, paddingVertical: 6 }}
    >
      <IconMenu size={24} color={theme.text.primary} />
    </Pressable>
  ) : null

  // Detail screens (with a back button) still need access to the drawer, so
  // render BOTH affordances stacked horizontally: back chevron first, then
  // the hamburger separated by a small gap. Top-level screens (no `onBack`)
  // show just the hamburger.
  let left: ReactNode = null
  if (backButton && menuButton) {
    left = (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {backButton}
        {menuButton}
      </View>
    )
  } else if (backButton) {
    left = backButton
  } else if (menuButton) {
    left = menuButton
  }

  return (
    <>
      <AppHeader title={title} left={left} right={right} />
      {children}
    </>
  )
}
