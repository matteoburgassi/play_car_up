# Android Auto roadmap

This POC ships only foreground/lockscreen playback via `MediaSession`. Browse-in-car is intentionally deferred.

When adding Android Auto:

1. Add `MediaLibraryService` + `MediaLibrarySession` in the **same** Gradle module as `PlayUpPlaybackModule`.
2. Reuse the existing queue/metadata DTOs - do not fork a parallel model.
3. Build the browse tree from the same Galaxy rubric source used by the RN list screen.
4. Register the service in `AndroidManifest.xml` with `foregroundServiceType="mediaPlayback"` and the `androidx.media3.session.MediaLibraryService` intent filter.
5. Add `automotiveApp` resource (`res/xml/automotive_app_desc.xml`) declaring `media` capability for AAOS.

Do **not** implement the browse tree in this POC.
