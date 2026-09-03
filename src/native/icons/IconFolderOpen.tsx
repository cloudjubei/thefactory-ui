import Svg, { Path } from 'react-native-svg'

export function IconFolderOpen({ size = 24, color }: { size?: number; color?: string }) {
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
      <Path d="M3 8a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1" stroke="#F59E0B" strokeWidth="2" />
      <Path
        d="M3 10h17a2 2 0 0 1 1.94 2.47l-1.2 4.2A2 2 0 0 1 18.8 18H6.2a2 2 0 0 1-1.94-1.33L2.5 12.5A2 2 0 0 1 3 10z"
        stroke="#FB923C"
        strokeWidth="2"
      />
    </Svg>
  )
}
