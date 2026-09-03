import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, Text, View } from 'react-native'
import type { ListRenderItem, TextInput as RNTextInput } from 'react-native'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import FileDisplay, { type UikitFileMeta } from './FileDisplay'
import FileTypeIcon from './FileTypeIcon'

export interface FileSelectorProps {
  files: UikitFileMeta[]
  /** Initial selection (matches against `file.relativePath`). Subsequent prop changes are ignored. */
  initialSelected?: string[]
  onConfirm: (selected: string[]) => void
  allowMultiple?: boolean
  title?: string
}

function pathOf(file: UikitFileMeta): string {
  return file.relativePath ?? file.name
}

interface RowProps {
  file: UikitFileMeta
  isSelected: boolean
  onToggle: (path: string) => void
}

// `React.memo` so toggling one row's selection doesn't re-render the
// neighbours that FlatList currently keeps mounted. With `selected` as a Set
// only the rows whose `isSelected` actually flipped get a new prop.
const FileSelectorRow = memo(function FileSelectorRow({ file, isSelected, onToggle }: RowProps) {
  const { theme } = useNativeTheme()
  const path = pathOf(file)
  return (
    <View
      accessibilityRole="none"
      accessibilityState={{ selected: isSelected }}
      style={{
        borderRadius: nativeRadii[1],
        backgroundColor: isSelected ? theme.surface.muted : 'transparent',
        padding: nativeSpace[3],
      }}
    >
      <FileDisplay
        file={file}
        density="normal"
        interactive
        onPress={() => onToggle(path)}
        leadingVisual={
          <FileTypeIcon path={file.relativePath ?? file.name} type={file.type} size={18} />
        }
        trailing={
          <View
            style={{
              width: 20,
              height: 20,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: nativeRadii[1],
              borderWidth: 1,
              borderColor: isSelected ? theme.accent.primary : theme.border.subtle,
              backgroundColor: isSelected ? theme.accent.primary : 'transparent',
            }}
          >
            {isSelected && <Text style={{ fontSize: 10, color: theme.text.inverted }}>✓</Text>}
          </View>
        }
      />
    </View>
  )
})

export default function FileSelector({
  files,
  initialSelected,
  onConfirm,
  allowMultiple = true,
  title,
}: FileSelectorProps) {
  const { theme } = useNativeTheme()
  const [query, setQuery] = useState('')
  // `Set` for O(1) lookups during render — with hundreds of files the
  // previous `array.includes` made each toggle a quadratic re-render.
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelected ?? []))
  const inputRef = useRef<RNTextInput>(null)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? files.filter((p) => p.name.toLowerCase().includes(q)) : files
    return [...list].sort((a, b) => {
      if (q) {
        const aScore = a.name.toLowerCase().indexOf(q)
        const bScore = b.name.toLowerCase().indexOf(q)
        if (aScore !== bScore) return aScore - bScore
      }
      return a.name.localeCompare(b.name)
    })
  }, [files, query])

  const toggle = useCallback(
    (path: string) =>
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(path)) next.delete(path)
        else {
          if (!allowMultiple) next.clear()
          next.add(path)
        }
        return next
      }),
    [allowMultiple],
  )

  const keyExtractor = useCallback((file: UikitFileMeta) => pathOf(file), [])

  const renderItem = useCallback<ListRenderItem<UikitFileMeta>>(
    ({ item }) => (
      <FileSelectorRow file={item} isSelected={selected.has(pathOf(item))} onToggle={toggle} />
    ),
    [selected, toggle],
  )

  return (
    <View style={{ gap: nativeSpace[5] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[4] }}>
        <View style={{ flex: 1 }}>
          <Input
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search files by name or path"
            accessibilityLabel="Search files"
          />
        </View>
        <Text style={{ fontSize: 11, color: theme.text.muted }}>{filtered.length} files</Text>
      </View>

      <FlatList
        accessibilityRole="list"
        accessibilityLabel={title ?? 'Files'}
        style={{
          maxHeight: 360,
          borderWidth: 1,
          borderColor: theme.border.subtle,
          borderRadius: nativeRadii[2],
          backgroundColor: theme.surface.raised,
        }}
        contentContainerStyle={{ padding: nativeSpace[2] }}
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        // FlatList compares this by reference to decide whether to re-render
        // mounted rows; replacing the Set on every toggle is what makes
        // selection feel instant.
        extraData={selected}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={20}
        windowSize={5}
        removeClippedSubviews
        ListEmptyComponent={
          <Text
            style={{
              padding: nativeSpace[8],
              fontSize: 13,
              color: theme.text.muted,
            }}
          >
            No files match your search.
          </Text>
        }
      />

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[4] }}>
        {/* Per the user-policy: no Cancel here — close via the modal's X /
         *  overlay / back gesture. Only the primary confirm remains. */}
        <Button onPress={() => onConfirm(Array.from(selected))} disabled={selected.size === 0}>
          {selected.size ? `Confirm (${selected.size})` : 'Confirm'}
        </Button>
      </View>
    </View>
  )
}
