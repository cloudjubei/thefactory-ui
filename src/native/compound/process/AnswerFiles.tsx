import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { attachmentDisplayName } from 'thefactory-tools/utils'

import {
  ANSWER_FILES_COPY,
  ANSWER_FILES_MAX,
  addAnswerFiles,
  type AnswerFilesSource,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconClose } from '../../icons'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import type { UikitFileMeta } from '../files/FileDisplay'
import FileSelector from '../files/FileSelector'
import type { PickedAnswerFile } from './answerFilesNativeTypes'

/**
 * The files an answer hands the waiting agent: attached from this device —
 * through the app's own picker — or picked from the project, each a chip that
 * can be taken off again.
 */
export default function AnswerFiles({
  source,
  pickDeviceFiles,
  files,
  onChange,
}: {
  source: AnswerFilesSource
  /** The app's file picker; without it only project files can be handed over. */
  pickDeviceFiles?: () => Promise<PickedAnswerFile[]>
  files: readonly string[]
  onChange: (files: string[]) => void
}) {
  const { theme, status } = useNativeTheme()
  const [uploading, setUploading] = useState<string[]>([])
  const [error, setError] = useState<string | undefined>()
  const [projectFiles, setProjectFiles] = useState<string[] | undefined>()
  const [picking, setPicking] = useState(false)
  const full = files.length + uploading.length >= ANSWER_FILES_MAX
  const metas = useMemo<UikitFileMeta[]>(
    () =>
      (projectFiles ?? []).map((path) => ({
        name: path.split('/').pop() ?? path,
        relativePath: path,
      })),
    [projectFiles],
  )

  const attach = async () => {
    if (!pickDeviceFiles) return
    setError(undefined)
    const picked = await pickDeviceFiles().catch(() => [])
    const taken = picked.slice(0, Math.max(0, ANSWER_FILES_MAX - files.length - uploading.length))
    setUploading((names) => [...names, ...taken.map((f) => f.name)])
    const uploaded: string[] = []
    for (const file of taken) {
      try {
        uploaded.push(await source.upload(file.name, file.contentBase64))
      } catch {
        setError(ANSWER_FILES_COPY.uploadFailed(file.name))
      }
    }
    setUploading((names) => names.filter((n) => !taken.some((f) => f.name === n)))
    onChange(addAnswerFiles(files, uploaded))
  }

  const pickFromProject = async () => {
    setError(undefined)
    setPicking(true)
    const load = source.loadProjectFiles
    if (projectFiles === undefined && load) setProjectFiles(await load().catch(() => []))
  }

  const chip = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    borderWidth: 1,
    borderRadius: nativeRadii[2],
    paddingHorizontal: 8,
    paddingVertical: 2,
  }

  return (
    <View style={{ gap: nativeSpace[2] }}>
      {files.length > 0 || uploading.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[1] }}>
          {files.map((path) => (
            <View
              key={path}
              style={{
                ...chip,
                borderColor: theme.border.default,
                backgroundColor: theme.surface.raised,
              }}
            >
              <Text
                numberOfLines={1}
                style={{ maxWidth: 180, fontSize: 12, color: theme.text.primary }}
              >
                {attachmentDisplayName(path)}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={ANSWER_FILES_COPY.remove(attachmentDisplayName(path))}
                hitSlop={8}
                onPress={() => onChange(files.filter((f) => f !== path))}
              >
                <IconClose size={12} color={theme.text.muted} />
              </Pressable>
            </View>
          ))}
          {uploading.map((name) => (
            <View
              key={`uploading-${name}`}
              style={{ ...chip, borderStyle: 'dashed', borderColor: theme.border.default }}
            >
              <Text style={{ fontSize: 12, color: theme.text.muted }}>
                {ANSWER_FILES_COPY.uploading(name)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: nativeSpace[2],
        }}
      >
        {pickDeviceFiles ? (
          <Button size="sm" variant="secondary" disabled={full} onPress={() => void attach()}>
            {ANSWER_FILES_COPY.attach}
          </Button>
        ) : null}
        {source.loadProjectFiles ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={full}
            onPress={() => void pickFromProject()}
          >
            {ANSWER_FILES_COPY.fromProject}
          </Button>
        ) : null}
        {full ? (
          <Text style={{ fontSize: 11, color: theme.text.muted }}>{ANSWER_FILES_COPY.full}</Text>
        ) : null}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={{ fontSize: 11, color: status.stuck.softFg }}>
          {error}
        </Text>
      ) : null}
      <Modal
        isOpen={picking}
        onClose={() => setPicking(false)}
        title={ANSWER_FILES_COPY.pickerTitle}
        size="lg"
      >
        <FileSelector
          files={metas}
          allowMultiple
          initialSelected={files.filter((f) => projectFiles?.includes(f))}
          onConfirm={(paths) => {
            setPicking(false)
            onChange(addAnswerFiles(files, paths))
          }}
        />
      </Modal>
    </View>
  )
}
