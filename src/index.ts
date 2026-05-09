// Root barrel — re-exports the web platform layer plus tokens + headless hooks.
// For platform-specific imports (e.g. `react-native` consumers), import the
// subpath entries directly: `thefactory-ui/web`, `thefactory-ui/headless`,
// `thefactory-ui/tokens`.
export * from './web'
export * from './headless'
export * from './tokens'
