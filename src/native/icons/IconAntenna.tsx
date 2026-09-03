import Svg, { Circle, Path } from 'react-native-svg'

export function IconAntenna({ size = 24, color }: { size?: number; color?: string }) {
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
      <Circle cx="12" cy="7" r="2" stroke="#F59E0B" strokeWidth="2" />
      <Path d="M12 9v12" stroke="#10B981" strokeWidth="2" />
      <Path d="M8 13a6 6 0 0 1 8 0" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M5.5 10.5a9 9 0 0 1 13 0" stroke="#60A5FA" strokeWidth="2" />
    </Svg>
  )
}
