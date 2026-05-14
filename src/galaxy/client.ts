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

const AUDIO_CONTENT_TYPES = new Set(['audio single', 'audio track']);

function galaxyEndpoint(config: SmartConfig, path: string): string {
  const galaxyBase = viaDevProxy(config.galaxyBaseUrl, '/galaxy-proxy').replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${galaxyBase}${suffix}`;
}

function commonGalaxyParams(env: GalaxyEnv, config: SmartConfig): URLSearchParams {
  return new URLSearchParams({
    api_key: env.apiKey ?? '',
    api_secret_key: env.apiSecretKey ?? '',
    campaign_id: config.campaignId,
    language_code: config.languageCode,
    country_code: config.countryCode,
  });
}

export function buildRubricUrl(env: GalaxyEnv, config: SmartConfig): string {
  const params = commonGalaxyParams(env, config);
  params.set('rubric_id', config.rubricId);
  return `${galaxyEndpoint(config, config.rubricPath)}?${params.toString()}`;
}

export function buildContentListUrl(
  env: GalaxyEnv,
  config: SmartConfig,
  rubricId: string,
): string {
  const params = commonGalaxyParams(env, config);
  params.set('rubric_id', rubricId);
  params.set('delivery', 'true');
  params.set('asset', 'true');
  params.set('asset_signed_url', 'true');
  return `${galaxyEndpoint(config, '/publishing-content-list')}?${params.toString()}`;
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

  const rubricList = extractItemList(raw);
  const audioRubrics = rubricList.filter(isAudioRubric);

  const contentLists = await Promise.all(
    audioRubrics.map(async (r) => {
      const rubricId = String(r.rubric_id ?? r.id ?? '');
      if (!rubricId) return [] as GalaxyRawItem[];
      try {
        const cRes = await fetch(buildContentListUrl(env, config, rubricId), {
          headers: { Accept: 'application/json' },
        });
        if (!cRes.ok) return [];
        const cRaw = GalaxyRawResponseSchema.parse(await cRes.json());
        return extractItemList(cRaw);
      } catch {
        return [];
      }
    }),
  );

  const items: Media[] = contentLists
    .flat()
    .map(toMedia)
    .filter((m): m is Media => !!m);

  const rubric = raw.rubric_label ?? raw.rubric_name ?? raw.name ?? 'Featured';
  return GalaxyResponseSchema.parse({ rubric, items });
}

function isAudioRubric(r: GalaxyRawItem): boolean {
  const types = r.rubric_content_type ?? [];
  return types.some((t) => AUDIO_CONTENT_TYPES.has(t.trim().toLowerCase()));
}

function extractItemList(raw: GalaxyRawResponse): GalaxyRawItem[] {
  if (raw.items?.length) return raw.items;
  if (raw.medias?.length) return raw.medias;
  const d = raw.data;
  if (Array.isArray(d)) return d;
  if (d && typeof d === 'object') return d.data ?? d.items ?? [];
  return [];
}

function toMedia(r: GalaxyRawItem): Media | null {
  const rubricIdScalar =
    Array.isArray(r.rubric_id) ? undefined : (r.rubric_id as string | number | undefined);
  const id = String(r.content_id ?? r.id ?? r.media_id ?? rubricIdScalar ?? '');
  const title = r.title ?? r.name ?? r.rubric_label ?? r.rubric_title ?? '';
  if (!id || !title) return null;
  const deliveries: StreamDelivery[] = extractDeliveries(r.deliveries);
  const streamUrl = r.stream_url ?? r.url ?? deliveries.find((d) => d.kind === 'full')?.url;
  const typeRaw = (
    r.media_type ??
    r.type ??
    r.content_type_tech_label ??
    r.content_type ??
    'audio'
  ).toLowerCase();
  const type: Media['type'] = typeRaw.includes('video') ? 'video' : 'audio';
  const durationMs =
    typeof r.duration_ms === 'number'
      ? r.duration_ms
      : typeof r.duration === 'number'
        ? Math.round(r.duration * 1000)
        : undefined;
  const artworkUrl =
    r.artwork_url ??
    r.image_url ??
    r.thumbnail ??
    extractCoverUrl(r.assets) ??
    r.preview_large ??
    r.preview_medium ??
    r.preview_small ??
    '';
  const firstArtist =
    extractFirstName(r.artists) ??
    extractFirstName(r.authors) ??
    extractFirstName(r.author_list);
  const artist =
    firstArtist ??
    r.artist ??
    r.author ??
    r.artist_label ??
    r.editor_label ??
    r.provider_label ??
    (r.rubric_content_type?.filter(Boolean).join(', ') ?? '');
  return {
    id,
    title,
    artist,
    artworkUrl,
    durationMs,
    type,
    deliveries,
    streamUrl,
  };
}

interface DeliveryEntry {
  url?: unknown;
  mime?: unknown;
  extension?: unknown;
  type?: unknown;
  preview?: unknown;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function extractDeliveries(raw: unknown): StreamDelivery[] {
  if (!raw) return [];
  const collected: DeliveryEntry[] = [];

  if (Array.isArray(raw)) {
    for (const e of raw) if (isObject(e)) collected.push(e as DeliveryEntry);
  } else if (isObject(raw)) {
    if (isObject(raw.mainDelivery)) collected.push(raw.mainDelivery as DeliveryEntry);
    if (Array.isArray(raw.additionalDeliveries)) {
      for (const e of raw.additionalDeliveries) if (isObject(e)) collected.push(e as DeliveryEntry);
    }
    for (const [bucket, value] of Object.entries(raw)) {
      if (bucket === 'mainDelivery' || bucket === 'additionalDeliveries') continue;
      if (isObject(value)) {
        for (const list of Object.values(value)) {
          if (Array.isArray(list)) {
            for (const e of list) if (isObject(e)) collected.push(e as DeliveryEntry);
          }
        }
      }
    }
  }

  const seen = new Set<string>();
  const out: StreamDelivery[] = [];
  for (const e of collected) {
    if (typeof e.url !== 'string' || !e.url) continue;
    if (seen.has(e.url)) continue;
    seen.add(e.url);
    const ext = typeof e.extension === 'string' ? e.extension : undefined;
    const mime = typeof e.mime === 'string' ? e.mime : undefined;
    const kindHint =
      e.preview === true
        ? 'preview'
        : typeof e.type === 'string'
          ? e.type
          : undefined;
    out.push({ url: e.url, mime, extension: ext, kind: normalizeKind(kindHint) });
  }
  return out;
}

function extractFirstName(raw: unknown): string | undefined {
  if (!raw) return undefined;
  if (typeof raw === 'string') return raw.trim() || undefined;
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const first = raw[0];
  if (typeof first === 'string') return first.trim() || undefined;
  if (isObject(first)) {
    for (const key of ['label', 'name', 'full_name', 'fullname', 'title']) {
      const v = first[key];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    const fn = typeof first.first_name === 'string' ? first.first_name.trim() : '';
    const ln = typeof first.last_name === 'string' ? first.last_name.trim() : '';
    const combined = [fn, ln].filter(Boolean).join(' ').trim();
    if (combined) return combined;
  }
  return undefined;
}

function extractCoverUrl(assets: unknown): string | undefined {
  if (!isObject(assets)) return undefined;
  const cover = assets.cover;
  if (!Array.isArray(cover)) return undefined;
  for (const c of cover) {
    if (isObject(c) && typeof c.url === 'string' && c.url) return c.url;
  }
  return undefined;
}

function normalizeKind(k?: string): StreamDelivery['kind'] {
  const v = (k ?? '').toLowerCase();
  if (v === 'preview') return 'preview';
  if (v === 'automotive' || v === 'auto') return 'automotive';
  return 'full';
}
