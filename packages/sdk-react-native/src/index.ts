/**
 * @playup/sdk-react-native
 *
 * React Native + Expo bindings for the PlayUP SDK. Exposes:
 *  - `getNativePlayback()`   – `PlayUpPlaybackModule` backed by `expo-av`
 *  - `PlayUpCarPlay`         – CarPlay scene bridge (iOS only)
 *  - `PlayUpAndroidAuto`     – MediaBrowserService bridge (Android only)
 *
 * The audio engine is the single source of truth. CarPlay and Android Auto
 * surfaces subscribe to the same module via the shared event bus exposed by
 * `@playup/sdk-core`, so transport state stays consistent across surfaces.
 */
export { getNativePlayback } from './nativePlayback';
export { PlayUpCarPlay } from './carplay';
export { PlayUpAndroidAuto } from './androidAuto';
export { createSurfaceBridge } from './surfaceBridge';
export type { SurfaceBridge, SurfaceBridgeOptions } from './surfaceBridge';
