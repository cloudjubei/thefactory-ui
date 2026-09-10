import Svg, { Path } from 'react-native-svg'

export function IconDownload({ size = 24, color }: { size?: number; color?: string }) {
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
      <Path d="M12 4v11" stroke="currentColor" strokeWidth="2" />
      <Path d="M7.5 11L12 15.5 16.5 11" stroke="currentColor" strokeWidth="2" />
      <Path d="M4.5 19.5h15" stroke="currentColor" strokeWidth="2" />
    </Svg>
  )
}
