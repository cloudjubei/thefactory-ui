import { useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import type { TextInput as RNTextInput } from 'react-native'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import { nativeLightTheme, nativeRadii, nativeSpace } from '../../../tokens/native'
import FileDisplay, { type UikitFileMeta } from './FileDisplay'

export interface FileSelectorProps {
  files: UikitFileMeta[]
  /** Initial selection (matches against `file.relativePath`). Subsequent prop changes are ignored. */
  initialSelected?: string[]
  onConfirm: (selected: string[]) => void
  onCancel?: () => void
  allowMultiple?: boolean
  title?: string
}

export default function FileSelector({
  files,
  initialSelected,
  onConfirm,
  onCancel,
  allowMultiple = true,
  title,
}: FileSelectorProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>(() => initialSelected ?? [])
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

  const toggle = (path: string) =>
    setSelected((prev) => {
      if (prev.includes(path)) return prev.filter((p) => p !== path)
      return allowMultiple ? [...prev, path] : [path]
    })

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
        <Text style={{ fontSize: 11, color: nativeLightTheme.text.muted }}>
          {filtered.length} files
        </Text>
      </View>

      <ScrollView
        accessibilityRole="list"
        accessibilityLabel={title ?? 'Files'}
        style={{
          maxHeight: 360,
          borderWidth: 1,
          borderColor: nativeLightTheme.border.subtle,
          borderRadius: nativeRadii[2],
          backgroundColor: nativeLightTheme.surface.raised,
        }}
        contentContainerStyle={{ padding: nativeSpace[2] }}
      >
        {filtered.map((file) => {
          const path = file.relativePath ?? file.name
          const isSelected = selected.includes(path)
          return (
            <View
              key={path}
              accessibilityRole="none"
              accessibilityState={{ selected: isSelected }}
              style={{
                borderRadius: nativeRadii[1],
                backgroundColor: isSelected ? nativeLightTheme.surface.muted : 'transparent',
                padding: nativeSpace[3],
              }}
            >
              <FileDisplay
                file={file}
                density="normal"
                interactive
                onPress={() => toggle(path)}
                trailing={
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: nativeRadii[1],
                      borderWidth: 1,
                      borderColor: isSelected
                        ? nativeLightTheme.accent.primary
                        : nativeLightTheme.border.subtle,
                      backgroundColor: isSelected
                        ? nativeLightTheme.accent.primary
                        : 'transparent',
                    }}
                  >
                    {isSelected && (
                      <Text style={{ fontSize: 10, color: nativeLightTheme.text.inverted }}>✓</Text>
                    )}
                  </View>
                }
              />
            </View>
          )
        })}
        {filtered.length === 0 && (
          <Text
            style={{
              padding: nativeSpace[8],
              fontSize: 13,
              color: nativeLightTheme.text.muted,
            }}
          >
            No files match your search.
          </Text>
        )}
      </ScrollView>

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[4] }}>
        {onCancel && (
          <Button variant="secondary" onPress={onCancel}>
            Cancel
          </Button>
        )}
        <Button onPress={() => onConfirm(selected)} disabled={selected.length === 0}>
          {selected.length ? `Confirm (${selected.length})` : 'Confirm'}
        </Button>
      </View>
    </View>
  )
}
