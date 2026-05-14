import {
  GalaxyRawResponseSchema,
  GalaxyResponseSchema,
  SmartConfigSchema,
} from './types';
import type {
  GalaxyRawItem,
  GalaxyRawResponse,
  GalaxyResponse,
  Media,
  SmartConfig,
  StreamDelivery,
} from './types';
import { MOCK_GALAXY, MOCK_SMART_CONFIG } from './mock';

export type GalaxyMode = 'mock' | 'live';

/**
 * Credentials live in `.env`. Targeting parameters (campaign, language,
 * country, rubric) come from SmartConfig at runtime.
 */
export interface GalaxyEnv {
  smartConfigUrl?: string;
  apiKey?: string;
  apiSecretKey?: string;
}

export function resolveMode(env: GalaxyEnv): GalaxyMode {
  return env.apiKey && env.apiSecretKey ? 'live' : 'mock';
}

export async function loadSmartConfig(env: GalaxyEnv): Promise<SmartConfig> {
  if (resolveMode(env) === 'mock') return MOCK_SMART_CONFIG;
  if (!env.smartConfigUrl) {
    throw new Error('VITE_SMARTCONFIG_URL is required in live mode');
  }
  const res = await fetch(env.smartConfigUrl, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`SmartConfig failed: ${res.status}`);
  return SmartConfigSchema.parse(await res.json());
}

export function buildRubricUrl(env: GalaxyEnv, config: SmartConfig): string {
  const base = `${config.galaxyBaseUrl.replace(/\/$/, '')}${config.rubricPath}`;
  const params = new URLSearchParams({
    api_key: env.apiKey ?? '',
    api_secret_key: env.apiSecretKey ?? '',
    campaign_id: config.campaignId,
    language_code: config.languageCode,
    country_code: config.countryCode,
    rubric_id: config.rubricId,
  });
  return `${base}?${params.toString()}`;
}

export async function fetchGalaxyRubric(
  env: GalaxyEnv,
  config: SmartConfig,
): Promise<GalaxyResponse> {
  if (resolveMode(env) === 'mock') return MOCK_GALAXY;
  const url = buildRubricUrl(env, config);
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Galaxy rubric failed: ${res.status}`);
  const raw = GalaxyRawResponseSchema.parse(await res.json());
  return GalaxyResponseSchema.parse(normalizeGalaxy(raw));
}

function normalizeGalaxy(raw: GalaxyRawResponse): GalaxyResponse {
  const list = raw.items ?? raw.medias ?? raw.data ?? [];
  const items: Media[] = list.map(toMedia).filter((m): m is Media => !!m);
  const rubric = raw.rubric_label ?? raw.rubric_name ?? raw.name ?? 'Featured';
  return { rubric, items };
}

function toMedia(r: GalaxyRawItem): Media | null {
  const id = String(r.id ?? r.media_id ?? '');
  const title = r.title ?? r.name ?? '';
  if (!id || !title) return null;
  const deliveries: StreamDelivery[] = (r.deliveries ?? []).map((d) => ({
    url: d.url,
    mime: d.mime,
    extension: d.extension,
    kind: normalizeKind(d.kind),
  }));
  const streamUrl = r.stream_url ?? r.url;
  const typeRaw = (r.media_type ?? r.type ?? 'audio').toLowerCase();
  const type: Media['type'] = typeRaw.includes('video') ? 'video' : 'audio';
  const durationMs =
    typeof r.duration_ms === 'number'
      ? r.duration_ms
      : typeof r.duration === 'number'
        ? Math.round(r.duration * 1000)
        : undefined;
  return {
    id,
    title,
    artist: r.artist ?? r.author ?? '',
    artworkUrl: r.artwork_url ?? r.image_url ?? r.thumbnail ?? '',
    durationMs,
    type,
    deliveries,
    streamUrl,
  };
}

function normalizeKind(k?: string): StreamDelivery['kind'] {
  const v = (k ?? '').toLowerCase();
  if (v === 'preview') return 'preview';
  if (v === 'automotive' || v === 'auto') return 'automotive';
  return 'full';
}
