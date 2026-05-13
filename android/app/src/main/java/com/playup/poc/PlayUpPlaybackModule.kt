package com.playup.poc

/*
 * Native Android playback module for PlayUP. NOT compiled in this web POC.
 * Drop into an Expo prebuild's android module after running `npx expo prebuild`.
 *
 * Owns:
 *  - androidx.media3.exoplayer.ExoPlayer
 *  - androidx.media3.session.MediaSession
 *  - Player.Listener that emits bridge events back to RN.
 *
 * The future Android Auto browse work adds MediaLibraryService +
 * MediaLibrarySession in this same Gradle module, reusing queue + metadata
 * types — see docs/android-auto-roadmap.md.
 */

import android.app.Application
import android.net.Uri
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.modules.core.DeviceEventManagerModule

class PlayUpPlaybackModule(private val ctx: ReactApplicationContext) :
    ReactContextBaseJavaModule(ctx) {

    private var player: ExoPlayer? = null
    private var session: MediaSession? = null

    override fun getName() = "PlayUpPlaybackModule"

    private fun ensurePlayer(): ExoPlayer {
        player?.let { return it }
        val app = ctx.applicationContext as Application
        val p = ExoPlayer.Builder(app).build()
        p.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(state: Int) {
                val s = when (state) {
                    Player.STATE_IDLE -> "idle"
                    Player.STATE_BUFFERING -> "buffering"
                    Player.STATE_READY -> "ready"
                    Player.STATE_ENDED -> "ended"
                    else -> "idle"
                }
                emit("state", s)
                emit("durationMs", p.duration.coerceAtLeast(0))
                emit("trackIndex", p.currentMediaItemIndex)
            }

            override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
                emit("error", error.message ?: "playback error")
                emit("state", "error")
            }
        })
        session = MediaSession.Builder(app, p).build()
        player = p
        return p
    }

    @ReactMethod
    fun setQueue(items: ReadableArray, promise: Promise) {
        try {
            val p = ensurePlayer()
            val list = (0 until items.size()).map { i ->
                val map = items.getMap(i)
                MediaItem.Builder()
                    .setMediaId(map.getString("id") ?: "")
                    .setUri(Uri.parse(map.getString("url")))
                    .setMediaMetadata(
                        MediaMetadata.Builder()
                            .setTitle(map.getString("title"))
                            .setArtist(map.getString("artist"))
                            .setArtworkUri(map.getString("artworkUrl")?.let(Uri::parse))
                            .build()
                    )
                    .build()
            }
            p.setMediaItems(list, true)
            p.prepare()
            promise.resolve(null)
        } catch (e: Exception) { promise.reject("queue_error", e) }
    }

    @ReactMethod fun playItemAt(index: Int, promise: Promise) {
        try { ensurePlayer().seekTo(index, 0); ensurePlayer().play(); promise.resolve(null) }
        catch (e: Exception) { promise.reject("play_error", e) }
    }
    @ReactMethod fun play(promise: Promise) { ensurePlayer().play(); promise.resolve(null) }
    @ReactMethod fun pause(promise: Promise) { ensurePlayer().pause(); promise.resolve(null) }
    @ReactMethod fun seekTo(ms: Double, promise: Promise) {
        ensurePlayer().seekTo(ms.toLong()); promise.resolve(null)
    }
    @ReactMethod fun skipToNext(promise: Promise) { ensurePlayer().seekToNext(); promise.resolve(null) }
    @ReactMethod fun skipToPrevious(promise: Promise) { promise.resolve(null) }
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    private fun emit(name: String, value: Any) {
        val payload = Arguments.createMap()
        when (value) {
            is String -> payload.putString("value", value)
            is Int -> payload.putInt("value", value)
            is Long -> payload.putDouble("value", value.toDouble())
            is Double -> payload.putDouble("value", value)
        }
        ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(name, payload)
    }
}
