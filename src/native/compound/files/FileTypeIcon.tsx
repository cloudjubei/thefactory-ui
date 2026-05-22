import type { ReactNode } from 'react'
import { View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'

import { extFromTypeOrName } from '../../../headless'
import {
  IconFileBadge,
  IconFileDefault,
  IconFileImage,
  IconFileJson,
  IconFileText,
  IconFileZip,
} from '../../icons/IconFileTypes'

export interface FileTypeIconProps {
  /** File path or name — drives extension resolution. */
  path?: string
  /** Optional MIME / extension hint. Takes precedence over `path`. */
  type?: string | null
  /** Icon square size in px. Defaults to 16 to match list rows. */
  size?: number
  style?: StyleProp<ViewStyle>
}

/**
 * Native peer of [web's `FileTypeIcon`](../../../web/compound/files/FileTypeIcon.tsx).
 * Branded badge SVG keyed off the file extension; classification logic
 * mirrors web's `iconForExt` 1:1 so the same files render with the same icon
 * on web and mobile.
 */
function iconForExt(ext: string | null, size: number): ReactNode {
  switch (ext) {
    case 'md':
    case 'markdown':
      return (
        <IconFileBadge
          size={size}
          badgeText="MD"
          fill="#e8eefc"
          stroke="#a7b7f9"
          textColor="#3b5bdb"
        />
      )
    case 'json':
      return <IconFileJson size={size} />
    case 'js':
    case 'cjs':
    case 'mjs':
      return (
        <IconFileBadge
          size={size}
          badgeText="JS"
          fill="#fffbe6"
          stroke="#ffe58f"
          textColor="#d4b106"
        />
      )
    case 'jsx':
      return (
        <IconFileBadge
          size={size}
          badgeText="JSX"
          fill="#fffbe6"
          stroke="#ffe58f"
          textColor="#d4b106"
        />
      )
    case 'ts':
    case 'tsx':
      return (
        <IconFileBadge
          size={size}
          badgeText="TS"
          fill="#e7f5ff"
          stroke="#a5d8ff"
          textColor="#1971c2"
        />
      )
    case 'css':
    case 'scss':
    case 'less':
      return (
        <IconFileBadge
          size={size}
          badgeText="CSS"
          fill="#f3f0ff"
          stroke="#d0bfff"
          textColor="#7048e8"
        />
      )
    case 'html':
    case 'htm':
      return (
        <IconFileBadge
          size={size}
          badgeText="HTML"
          fill="#fff0f0"
          stroke="#ffc9c9"
          textColor="#e03131"
        />
      )
    case 'py':
      return (
        <IconFileBadge
          size={size}
          badgeText="PY"
          fill="#ecfdf5"
          stroke="#a7e9c2"
          textColor="#0f8a4c"
        />
      )
    case 'rs':
      return (
        <IconFileBadge
          size={size}
          badgeText="RS"
          fill="#fff4e6"
          stroke="#ffd8a8"
          textColor="#d9480f"
        />
      )
    case 'go':
      return (
        <IconFileBadge
          size={size}
          badgeText="GO"
          fill="#e3fafc"
          stroke="#99e9f2"
          textColor="#0c8599"
        />
      )
    case 'java':
      return (
        <IconFileBadge
          size={size}
          badgeText="JAVA"
          fill="#fff4e6"
          stroke="#ffc078"
          textColor="#d9480f"
        />
      )
    case 'kt':
      return (
        <IconFileBadge
          size={size}
          badgeText="KT"
          fill="#f3f0ff"
          stroke="#d0bfff"
          textColor="#7048e8"
        />
      )
    case 'rb':
      return (
        <IconFileBadge
          size={size}
          badgeText="RB"
          fill="#fff5f5"
          stroke="#ffa8a8"
          textColor="#c92a2a"
        />
      )
    case 'php':
      return (
        <IconFileBadge
          size={size}
          badgeText="PHP"
          fill="#edf2ff"
          stroke="#bac8ff"
          textColor="#4263eb"
        />
      )
    case 'swift':
      return (
        <IconFileBadge
          size={size}
          badgeText="SW"
          fill="#fff4e6"
          stroke="#ffc078"
          textColor="#e8590c"
        />
      )
    case 'c':
    case 'h':
      return (
        <IconFileBadge
          size={size}
          badgeText="C"
          fill="#e7f5ff"
          stroke="#a5d8ff"
          textColor="#1864ab"
        />
      )
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'hpp':
    case 'hxx':
      return (
        <IconFileBadge
          size={size}
          badgeText="C++"
          fill="#e7f5ff"
          stroke="#a5d8ff"
          textColor="#1864ab"
        />
      )
    case 'sh':
    case 'bash':
    case 'zsh':
    case 'fish':
      return (
        <IconFileBadge
          size={size}
          badgeText="SH"
          fill="#f1f3f5"
          stroke="#ced4da"
          textColor="#343a40"
        />
      )
    case 'yml':
    case 'yaml':
      return (
        <IconFileBadge
          size={size}
          badgeText="YML"
          fill="#fff9db"
          stroke="#ffe8a1"
          textColor="#a37500"
        />
      )
    case 'xml':
      return (
        <IconFileBadge
          size={size}
          badgeText="XML"
          fill="#fff0f0"
          stroke="#ffc9c9"
          textColor="#c92a2a"
        />
      )
    case 'toml':
      return (
        <IconFileBadge
          size={size}
          badgeText="TOML"
          fill="#f8f0fc"
          stroke="#e599f7"
          textColor="#862e9c"
        />
      )
    case 'sql':
      return (
        <IconFileBadge
          size={size}
          badgeText="SQL"
          fill="#e3fafc"
          stroke="#99e9f2"
          textColor="#0c8599"
        />
      )
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'bmp':
    case 'svg':
    case 'webp':
    case 'ico':
      return <IconFileImage size={size} />
    case 'pdf':
      return (
        <IconFileBadge
          size={size}
          badgeText="PDF"
          fill="#fff5f5"
          stroke="#ffa8a8"
          textColor="#c92a2a"
        />
      )
    case 'zip':
    case 'tar':
    case 'gz':
    case 'tgz':
    case 'rar':
    case '7z':
      return <IconFileZip size={size} />
    case 'txt':
    case 'log':
    case 'text':
      return <IconFileText size={size} />
    default:
      return <IconFileDefault size={size} />
  }
}

export default function FileTypeIcon({ path, type, size = 16, style }: FileTypeIconProps) {
  const ext = extFromTypeOrName(type, path)
  return (
    <View
      accessibilityElementsHidden
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      {iconForExt(ext, size)}
    </View>
  )
}
