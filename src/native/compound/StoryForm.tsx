import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react'
import { Text, View } from 'react-native'
import type { TextInput as RNTextInput } from 'react-native'
import {
  useStoryForm,
  type StoryFormValues,
} from '../../headless/hooks/useStoryForm'
import { nativeLightStatus, nativeSpace } from '../../tokens/native'
import Field from '../primitives/Field'
import { Input } from '../primitives/Input'
import { Textarea } from '../primitives/Textarea'
import StatusControl from './StatusControl'

export type { StoryFormValues }

export interface StoryFormHandle {
  submit: () => void
}

export interface StoryFormProps {
  initialValues?: Partial<StoryFormValues>
  onSubmit: (values: StoryFormValues) => void | Promise<void>
  submitting?: boolean
  isCreate?: boolean
  titleRef?: RefObject<RNTextInput | null>
  onDirtyChange?: (dirty: boolean) => void
  /** Slot for the host's `ProjectChip` (or other context chip). */
  renderProjectChip?: () => ReactNode
}

const StoryForm = forwardRef<StoryFormHandle, StoryFormProps>(function StoryForm(
  { initialValues, onSubmit, submitting = false, titleRef, onDirtyChange, renderProjectChip },
  ref,
) {
  const form = useStoryForm({ initialValues, onSubmit, onDirty: onDirtyChange })
  const localTitleRef = useRef<RNTextInput>(null)
  const titleInputRef = titleRef ?? localTitleRef

  useImperativeHandle(ref, () => ({ submit: () => void form.handleSubmit() }), [form])

  useEffect(() => {
    titleInputRef.current?.focus()
  }, [titleInputRef])

  return (
    <View accessibilityLabel="Story form" style={{ gap: nativeSpace[6] }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <StatusControl status={form.values.status} onChange={form.setStatus} />
        {renderProjectChip ? renderProjectChip() : null}
      </View>

      <Field label="Title">
        <Input
          ref={titleInputRef}
          value={form.values.title}
          placeholder="Give your story a clear title"
          onChangeText={form.setTitle}
          disabled={submitting}
          invalid={!!form.errors.title}
          returnKeyType="next"
          accessibilityLabel="Story title"
        />
        {form.errors.title && (
          <Text style={{ fontSize: 12, color: nativeLightStatus.stuck.bg }}>
            {form.errors.title}
          </Text>
        )}
      </Field>

      <Field label="Description">
        <Textarea
          value={form.values.description}
          placeholder="Optional description or details"
          onChangeText={form.setDescription}
          disabled={submitting}
          rows={4}
          accessibilityLabel="Story description"
        />
      </Field>
    </View>
  )
})

export default StoryForm
