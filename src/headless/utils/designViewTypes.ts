import type { DesignAppTree, DesignItem, DesignScreenTree } from '../api'

/** What the Design tab has selected: a screen, and an item open in the viewer. */
export type DesignSelection = { screenId?: string; itemId?: string }

/** What a `?screen=&item=` link asks the Design tab to show. */
export type DesignSelectionParams = { screen?: string | null; item?: string | null }

/** Something a person can delete from a project's design. */
export type DesignDeleteTarget =
  | { kind: 'app'; app: DesignAppTree }
  | { kind: 'screen'; screen: DesignScreenTree }
  | { kind: 'item'; item: DesignItem }

/** What a built version is compared with, and how the compare names it. */
export type DesignCompareBaseline = { item: DesignItem; label: string }

/** One store of a project's usage, as the breakdown lists it. */
export type StorageUsageRow = {
  key: 'design' | 'evidence' | 'ui-test' | 'mobile-test'
  label: string
  bytes: number
  size: string
}

/** The OS notification for a storage warning. */
export type StorageWarningNotification = { title: string; body: string; tag: string }
