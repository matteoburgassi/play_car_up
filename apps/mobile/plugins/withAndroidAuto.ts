/**
 * Expo config plugin: registers the PlayUP MediaBrowserService for Android
 * Auto and writes the required automotive_app_desc.xml resource.
 */
import type { ConfigPlugin } from 'expo/config-plugins';
import {
  withAndroidManifest,
  withDangerousMod,
  AndroidConfig,
} from 'expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

const SERVICE_NAME = 'com.playup.sdk.PlayUpMediaBrowserService';

const withAndroidAuto: ConfigPlugin = (config) => {
  config = withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.service = app.service ?? [];
    if (!app.service.some((s) => s.$['android:name'] === SERVICE_NAME)) {
      app.service.push({
        $: {
          'android:name': SERVICE_NAME,
          'android:exported': 'true',
          'android:foregroundServiceType': 'mediaPlayback',
        },
        'intent-filter': [
          { action: [{ $: { 'android:name': 'android.media.browse.MediaBrowserService' } }] },
        ],
      } as never);
    }

    app['meta-data'] = app['meta-data'] ?? [];
    if (!app['meta-data'].some((m) => m.$['android:name'] === 'com.google.android.gms.car.application')) {
      app['meta-data'].push({
        $: {
          'android:name': 'com.google.android.gms.car.application',
          'android:resource': '@xml/automotive_app_desc',
        },
      });
    }
    return cfg;
  });

  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const xmlDir = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res/xml');
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(
        path.join(xmlDir, 'automotive_app_desc.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<automotiveApp>
  <uses name="media" />
</automotiveApp>
`,
      );
      return cfg;
    },
  ]);

  return config;
};

export default withAndroidAuto;
