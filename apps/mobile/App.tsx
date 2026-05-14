/**
 * PlayUP mobile entry point.
 *
 * Pulls catalog data through the shared SDK (`@playup/sdk-core`),
 * drives playback with the native (`expo-av`) implementation, and attaches
 * both the CarPlay and Android Auto bridges so the same playback engine
 * powers all three surfaces.
 */
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, SafeAreaView, Text, View } from 'react-native';
import {
  fetchGalaxyRubric,
  loadSmartConfig,
  buildRemoteSurface,
  recordPlay,
  type GalaxyEnv,
  type GalaxyResponse,
  type QueueItem,
} from '../../src/sdk';
import {
  PlayUpAndroidAuto,
  PlayUpCarPlay,
  getNativePlayback,
} from '@playup/sdk-react-native';

const env: GalaxyEnv = {
  smartConfigUrl: process.env.EXPO_PUBLIC_SMARTCONFIG_URL,
  smartConfigLogin: process.env.EXPO_PUBLIC_SMARTCONFIG_LOGIN,
  smartConfigPass: process.env.EXPO_PUBLIC_SMARTCONFIG_PASS,
  smartConfigApplicationId: process.env.EXPO_PUBLIC_SMARTCONFIG_APPLICATION_ID,
  smartConfigWantedVersion: process.env.EXPO_PUBLIC_SMARTCONFIG_WANTED_VERSION,
  apiKey: process.env.EXPO_PUBLIC_GALAXY_API_KEY,
  apiSecretKey: process.env.EXPO_PUBLIC_GALAXY_API_SECRET_KEY,
};

export default function App() {
  const [data, setData] = useState<GalaxyResponse | null>(null);
  const playback = useMemo(() => getNativePlayback(), []);

  useEffect(() => {
    (async () => {
      const cfg = await loadSmartConfig(env);
      const res = await fetchGalaxyRubric(env, cfg);
      setData(res);
    })().catch(() => { /* shown via UI in production */ });
  }, []);

  useEffect(() => {
    if (!data) return;
    const surface = buildRemoteSurface(data, true);
    void playback.setQueue(surface.queue);
    void PlayUpCarPlay.attach(playback, surface);
    void PlayUpAndroidAuto.attach(playback, surface);
    return () => {
      PlayUpCarPlay.detach();
      PlayUpAndroidAuto.detach();
    };
  }, [data, playback]);

  const queue: QueueItem[] = useMemo(() => {
    if (!data) return [];
    return buildRemoteSurface(data, true).queue;
  }, [data]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0b0d10' }}>
      <Text style={{ color: '#fff', fontSize: 24, padding: 16 }}>
        {data?.rubric ?? 'Loading…'}
      </Text>
      <FlatList
        data={queue}
        keyExtractor={(it) => it.id}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={async () => {
              await playback.playItemAt(index);
              void recordPlay(item);
            }}
            style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#1a1d21' }}
          >
            <Text style={{ color: '#fff', fontSize: 16 }}>{item.title}</Text>
            <Text style={{ color: '#9aa0a6', fontSize: 13, marginTop: 4 }}>{item.artist}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
