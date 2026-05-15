import {
  IconFileAdded,
  IconFileDeleted,
  IconFileModified,
  IconWarningTriangle,
} from '../../../icons'

export type GitFileStatusIconProps = {
  status?: string
  isConflicted?: boolean
  className?: string
}

export default function GitFileStatusIcon({
  status,
  isConflicted,
  className = 'w-4 h-4 flex-none',
}: GitFileStatusIconProps) {
  if (isConflicted)
    return <IconWarningTriangle className={`text-red-600 dark:text-red-400 ${className}`} />
  if (status === 'A') return <IconFileAdded className={className} />
  if (status === 'D') return <IconFileDeleted className={className} />
  return <IconFileModified className={className} />
}
