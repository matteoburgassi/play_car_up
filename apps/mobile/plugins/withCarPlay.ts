/**
 * Expo config plugin: injects CarPlay support during `expo prebuild`.
 *
 *  - adds the `com.apple.developer.carplay-audio` entitlement
 *  - declares a `CPTemplateApplicationSceneSessionRoleApplication` scene
 *    pointing at `PlayUpCarPlaySceneDelegate`
 *  - keeps `audio` in `UIBackgroundModes`
 */
import type { ConfigPlugin } from 'expo/config-plugins';
import { withEntitlementsPlist, withInfoPlist } from 'expo/config-plugins';

const SCENE_DELEGATE = 'PlayUpCarPlaySceneDelegate';

const withCarPlay: ConfigPlugin = (config) => {
  config = withEntitlementsPlist(config, (cfg) => {
    cfg.modResults['com.apple.developer.carplay-audio'] = true;
    return cfg;
  });

  config = withInfoPlist(config, (cfg) => {
    const plist = cfg.modResults as Record<string, unknown>;
    const manifest = (plist.UIApplicationSceneManifest as Record<string, unknown>) ?? {};
    const sessionRole = (manifest.UISceneConfigurations as Record<string, unknown>) ?? {};
    sessionRole.CPTemplateApplicationSceneSessionRoleApplication = [
      {
        UISceneConfigurationName: 'PlayUpCarPlay',
        UISceneDelegateClassName: `$(PRODUCT_MODULE_NAME).${SCENE_DELEGATE}`,
      },
    ];
    manifest.UISceneConfigurations = sessionRole;
    plist.UIApplicationSceneManifest = manifest;

    const modes = new Set((plist.UIBackgroundModes as string[]) ?? []);
    modes.add('audio');
    plist.UIBackgroundModes = Array.from(modes);
    return cfg;
  });

  return config;
};

export default withCarPlay;
