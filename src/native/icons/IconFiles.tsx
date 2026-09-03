import Svg, { Path } from 'react-native-svg'

export function IconFiles({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      color={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path
        d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 4 2h8a2 2 0 0 0 2-2V7z"
        stroke="#6366F1"
        strokeWidth="2"
      />
      <Path d="M12 2v5h5" stroke="#93C5FD" strokeWidth="2" />
      <Path d="M8 12h6" stroke="#60A5FA" strokeWidth="2" />
      <Path d="M8 16h6" stroke="#60A5FA" strokeWidth="2" />
    </Svg>
  )
}
