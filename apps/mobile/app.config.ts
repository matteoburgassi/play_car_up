import type { ExpoConfig } from 'expo/config';

/**
 * Expo configuration for the PlayUP mobile host. The CarPlay and
 * Android Auto config plugins inject the native scene delegate, browse
 * service, manifest entries, and entitlements at prebuild time.
 */
const config: ExpoConfig = {
  name: 'PlayUP',
  slug: 'playup-mobile',
  version: '0.1.0',
  scheme: 'playup',
  orientation: 'portrait',
  ios: {
    bundleIdentifier: 'com.playup.mobile',
    supportsTablet: true,
    infoPlist: {
      UIBackgroundModes: ['audio'],
    },
  },
  android: {
    package: 'com.playup.mobile',
    permissions: ['FOREGROUND_SERVICE', 'FOREGROUND_SERVICE_MEDIA_PLAYBACK'],
  },
  plugins: [
    './plugins/withCarPlay',
    './plugins/withAndroidAuto',
  ],
};

export default config;
