# iOS / CarPlay roadmap

This POC has no iOS native playback. The RN UI works on iOS but the playback module is intentionally stubbed - any call into `PlayUpPlaybackModule` on iOS should resolve a "not implemented" error from the delegate.

When adding iOS:

1. Implement a Swift `PlayUpPlaybackModule` exposing the same JS surface (`setQueue`, `playItemAt`, `play`, `pause`, `seekTo`, `skipToNext`, `skipToPrevious`, events).
2. Use `AVPlayer` + `MPRemoteCommandCenter` + `MPNowPlayingInfoCenter` for lock screen.
3. CarPlay: add the CarPlay entitlement, implement `CPTemplateApplicationSceneDelegate`, build a `CPListTemplate` from the Galaxy rubric (mirroring the Android Auto browse tree).
4. Keep TS bridge contract identical so RN screens remain unchanged.
