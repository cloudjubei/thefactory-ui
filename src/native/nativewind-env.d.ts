// Type augmentation: NativeWind v4 reads `className` off React Native core
// components. We declare the minimal `className` surface here so consumers of
// `thefactory-ui/native` get `className` props without needing the
// `nativewind/types` reference in their tsconfig — and so this package's
// own primitives typecheck without depending on nativewind being installed
// at consumer build time.
//
// If a consumer also pulls in `nativewind/types`, TS merges these
// declarations (NativeWind's surface is a structural superset).

declare module 'react-native' {
  interface ViewProps {
    className?: string
  }
  interface TextProps {
    className?: string
  }
  interface TextInputProps {
    className?: string
    placeholderClassName?: string
  }
  interface ImageProps {
    className?: string
  }
  interface ImagePropsBase {
    className?: string
  }
  interface PressableProps {
    className?: string
  }
  interface SwitchProps {
    className?: string
  }
  interface ScrollViewProps {
    className?: string
    contentContainerClassName?: string
    indicatorClassName?: string
  }
}

export {}
