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
 * Galaxy credentials live in `.env`. Targeting parameters (campaign, language,
 * country, rubric, base URL) come from SmartConfig at runtime.
 */
export interface GalaxyEnv {
  smartConfigUrl?: string;
  smartConfigLogin?: string;
  smartConfigPass?: string;
  smartConfigApplicationId?: string;
  smartConfigWantedVersion?: string;
  apiKey?: string;
  apiSecretKey?: string;
  /** Fallback targeting overrides if SmartConfig omits them. */
  campaignId?: string;
  languageCode?: string;
  countryCode?: string;
  rubricId?: string;
  rubricPath?: string;
}

export function resolveMode(env: GalaxyEnv): GalaxyMode {
  return env.apiKey && env.apiSecretKey && env.smartConfigUrl ? 'live' : 'mock';
}

/**
 * In dev, browsers can't reach SmartConfig / Galaxy directly because of CORS.
 * Rewrite absolute URLs to relative `/smartconfig-proxy/*` and `/galaxy-proxy/*`
 * paths so the Vite dev proxy handles the upstream call.
 */
function viaDevProxy(rawUrl: string, prefix: '/smartconfig-proxy' | '/galaxy-proxy'): string {
  if (!isDev()) return rawUrl;
  // In dev the proxy prefix already maps to the upstream host. For galaxy the
  // rubric path is appended later, so we always return just the prefix.
  if (prefix === '/galaxy-proxy') return prefix;
  if (rawUrl.startsWith('/')) return rawUrl;
  try {
    const u = new URL(rawUrl);
    return `${prefix}${u.pathname}${u.search}${u.hash}`;
  } catch {
    return rawUrl;
  }
}

function isDev(): boolean {
  return typeof import.meta !== 'undefined' && Boolean((import.meta as ImportMeta).env?.DEV);
}

export function buildSmartConfigUrl(env: GalaxyEnv): string {
  const params = new URLSearchParams({
    login: env.smartConfigLogin ?? '',
    pass: env.smartConfigPass ?? '',
    application_id: env.smartConfigApplicationId ?? '',
    wanted_version: env.smartConfigWantedVersion ?? '',
  });
  const base = viaDevProxy(env.smartConfigUrl ?? '', '/smartconfig-proxy');
  return `${base}?${params.toString()}`;
}

export async function loadSmartConfig(env: GalaxyEnv): Promise<SmartConfig> {
  if (resolveMode(env) === 'mock') return MOCK_SMART_CONFIG;
  const res = await fetch(buildSmartConfigUrl(env), {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`SmartConfig failed: ${res.status}`);
  const raw = (await res.json()) as Record<string, unknown>;
  return SmartConfigSchema.parse(applyEnvOverrides(extractSmartConfig(raw), env));
}

function applyEnvOverrides(cfg: SmartConfig, env: GalaxyEnv): SmartConfig {
  return {
    galaxyBaseUrl: cfg.galaxyBaseUrl,
    rubricPath: env.rubricPath || cfg.rubricPath,
    campaignId: cfg.campaignId || env.campaignId || '',
    languageCode: cfg.languageCode || env.languageCode || '',
    countryCode: cfg.countryCode || env.countryCode || '',
    rubricId: cfg.rubricId || env.rubricId || '',
  };
}

/**
 * SmartConfig response shape (relevant subset):
 *   { commonConfig: { galaxy: { campaignID, countryCode, languageCode?, baseUrl?,
 *                               rubrics: [{ name, id, type }] } } }
 * We pluck targeting fields from there, with tolerant fallbacks for older shapes.
 */
function extractSmartConfig(raw: Record<string, unknown>): SmartConfig {
  const root = pickObject(raw, ['configuration', 'config', 'data']) ?? raw;
  const common = pickObject(root, ['commonConfig', 'common_config']) ?? root;
  const galaxy = pickObject(common, ['galaxy', 'galaxy_api', 'publishing']) ?? common;
  const rubric = pickFirstRubric(galaxy);

  return {
    galaxyBaseUrl:
      pickString(galaxy, ['baseUrl', 'base_url', 'url', 'host']) ??
      pickString(common, ['galaxyBaseUrl']) ??
      '',
    rubricPath:
      pickString(galaxy, ['rubricPath', 'rubric_path']) ?? '/publishing-rubric-list',
    campaignId:
      pickString(galaxy, ['campaignID', 'campaignId', 'campaign_id']) ??
      pickString(root, ['campaign_id']) ??
      '',
    languageCode:
      pickString(galaxy, ['languageCode', 'language_code', 'language']) ??
      pickString(common, ['languageCode', 'language_code', 'language']) ??
      pickString(root, ['language_code']) ??
      '',
    countryCode:
      pickString(galaxy, ['countryCode', 'country_code', 'country']) ??
      pickString(common, ['countryCode', 'country_code', 'country']) ??
      pickString(root, ['country_code']) ??
      '',
    rubricId:
      (rubric ? pickString(rubric, ['id', 'rubric_id', 'rubricId']) : undefined) ?? '',
  };
}

function pickFirstRubric(galaxy: Record<string, unknown>): Record<string, unknown> | null {
  const rubrics = galaxy['rubrics'];
  if (!Array.isArray(rubrics) || rubrics.length === 0) return null;
  const home = rubrics.find(
    (r) => r && typeof r === 'object' && (r as Record<string, unknown>).name === 'home',
  );
  const chosen = (home ?? rubrics[0]) as unknown;
  return chosen && typeof chosen === 'object' ? (chosen as Record<string, unknown>) : null;
}

function pickObject(o: Record<string, unknown>, keys: string[]): Record<string, unknown> | null {
  for (const k of keys) {
    const v = o[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  }
  return null;
}

function pickString(o: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.length > 0) return v;
    if (typeof v === 'number') return String(v);
  }
  return undefined;
}

export function buildRubricUrl(env: GalaxyEnv, config: SmartConfig): string {
  const galaxyBase = viaDevProxy(config.galaxyBaseUrl, '/galaxy-proxy').replace(/\/+$/, '');
  const rubricPath = config.rubricPath.startsWith('/')
    ? config.rubricPath
    : `/${config.rubricPath}`;
  const base = `${galaxyBase}${rubricPath}`;
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
