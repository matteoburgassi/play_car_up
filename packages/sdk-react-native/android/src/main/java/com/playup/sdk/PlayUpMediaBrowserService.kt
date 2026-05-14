package com.playup.sdk

/**
 * MediaBrowserService that publishes the SDK browse tree to Android Auto and
 * mirrors playback state on a MediaSession. Transport callbacks are routed
 * back to JS through [PlayUpAndroidAutoModule] so the JS-owned playback
 * engine remains the single source of truth.
 *
 * Wire-up (added by the Expo `withAndroidAuto` config plugin):
 *   - <service android:name="com.playup.sdk.PlayUpMediaBrowserService"
 *       android:exported="true">
 *       <intent-filter>
 *         <action android:name="android.media.browse.MediaBrowserService" />
 *       </intent-filter>
 *     </service>
 *   - <meta-data android:name="com.google.android.gms.car.application"
 *       android:resource="@xml/automotive_app_desc" />
 */
import android.content.Intent
import android.os.Bundle
import android.support.v4.media.MediaBrowserCompat
import android.support.v4.media.MediaDescriptionCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import androidx.media.MediaBrowserServiceCompat
import com.facebook.react.bridge.ReadableMap

class PlayUpMediaBrowserService : MediaBrowserServiceCompat() {

    private lateinit var session: MediaSessionCompat

    override fun onCreate() {
        super.onCreate()
        session = MediaSessionCompat(this, "PlayUpSession").apply {
            setCallback(object : MediaSessionCompat.Callback() {
                override fun onPlay() = emit("play")
                override fun onPause() = emit("pause")
                override fun onSkipToNext() = emit("next")
                override fun onSkipToPrevious() = emit("previous")
                override fun onSeekTo(pos: Long) = emit("seek", mapOf("positionMs" to pos.toInt()))
                override fun onPlayFromMediaId(mediaId: String?, extras: Bundle?) {
                    if (mediaId != null) emit("playId", mapOf("id" to mediaId))
                }
            })
            isActive = true
        }
        sessionToken = session.sessionToken
        instance = this
    }

    override fun onDestroy() {
        instance = null
        session.release()
        super.onDestroy()
    }

    override fun onGetRoot(
        clientPackageName: String,
        clientUid: Int,
        rootHints: Bundle?,
    ): BrowserRoot = BrowserRoot(ROOT_ID, null)

    override fun onLoadChildren(
        parentId: String,
        result: Result<MutableList<MediaBrowserCompat.MediaItem>>,
    ) {
        result.sendResult(currentChildren.toMutableList())
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

    private fun emit(type: String, extras: Map<String, Any?> = emptyMap()) {
        PlayUpAndroidAutoModule.instance?.emitCommand(type, extras)
    }

    companion object {
        private const val ROOT_ID = "root"

        @Volatile private var instance: PlayUpMediaBrowserService? = null
        private var currentChildren: List<MediaBrowserCompat.MediaItem> = emptyList()

        fun publishBrowseTree(payload: ReadableMap) {
            val items = payload.getArray("items") ?: return
            val list = mutableListOf<MediaBrowserCompat.MediaItem>()
            for (i in 0 until items.size()) {
                val it = items.getMap(i) ?: continue
                val desc = MediaDescriptionCompat.Builder()
                    .setMediaId(it.getString("id"))
                    .setTitle(it.getString("title"))
                    .setSubtitle(it.getString("subtitle"))
                    .build()
                val flag =
                    if (it.hasKey("playable") && it.getBoolean("playable"))
                        MediaBrowserCompat.MediaItem.FLAG_PLAYABLE
                    else MediaBrowserCompat.MediaItem.FLAG_BROWSABLE
                list.add(MediaBrowserCompat.MediaItem(desc, flag))
            }
            currentChildren = list
            instance?.notifyChildrenChanged(ROOT_ID)
        }

        fun publishPlaybackState(payload: ReadableMap) {
            val svc = instance ?: return
            val playing = payload.getBoolean("playing")
            val position = if (payload.hasKey("positionMs")) payload.getDouble("positionMs").toLong() else 0L
            val state = PlaybackStateCompat.Builder()
                .setActions(
                    PlaybackStateCompat.ACTION_PLAY or
                        PlaybackStateCompat.ACTION_PAUSE or
                        PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
                        PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
                        PlaybackStateCompat.ACTION_SEEK_TO or
                        PlaybackStateCompat.ACTION_PLAY_FROM_MEDIA_ID,
                )
                .setState(
                    if (playing) PlaybackStateCompat.STATE_PLAYING
                    else PlaybackStateCompat.STATE_PAUSED,
                    position,
                    if (playing) 1.0f else 0.0f,
                )
                .build()
            svc.session.setPlaybackState(state)
        }
    }
}
