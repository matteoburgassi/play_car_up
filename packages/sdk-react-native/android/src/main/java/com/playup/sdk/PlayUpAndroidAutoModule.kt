package com.playup.sdk

/**
 * React Native bridge module for the Android Auto MediaBrowserService.
 *
 * Receives the browse tree and now-playing snapshots from JS and forwards
 * them to [PlayUpMediaBrowserService], which exposes them to Android Auto.
 * Transport callbacks from the head unit are emitted back to JS as
 * `PlayUpAndroidAutoCommand` events.
 */
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class PlayUpAndroidAutoModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    init { instance = this }

    override fun getName(): String = "PlayUpAndroidAuto"

    @ReactMethod
    fun setBrowseTree(payload: ReadableMap, promise: Promise) {
        try {
            PlayUpMediaBrowserService.publishBrowseTree(payload)
            promise.resolve(null)
        } catch (e: Throwable) {
            promise.reject("E_BROWSE_TREE", e)
        }
    }

    @ReactMethod
    fun setPlaybackState(payload: ReadableMap, promise: Promise) {
        try {
            PlayUpMediaBrowserService.publishPlaybackState(payload)
            promise.resolve(null)
        } catch (e: Throwable) {
            promise.reject("E_PLAYBACK_STATE", e)
        }
    }

    @ReactMethod fun addListener(@Suppress("UNUSED_PARAMETER") eventName: String) { /* RN required */ }
    @ReactMethod fun removeListeners(@Suppress("UNUSED_PARAMETER") count: Int) { /* RN required */ }

    fun emitCommand(type: String, extras: Map<String, Any?> = emptyMap()) {
        val map = Arguments.createMap()
        map.putString("type", type)
        for ((k, v) in extras) {
            when (v) {
                is String -> map.putString(k, v)
                is Int -> map.putInt(k, v)
                is Double -> map.putDouble(k, v)
                is Boolean -> map.putBoolean(k, v)
                null -> map.putNull(k)
            }
        }
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("PlayUpAndroidAutoCommand", map)
    }

    companion object {
        @Volatile var instance: PlayUpAndroidAutoModule? = null
            private set
    }
}
