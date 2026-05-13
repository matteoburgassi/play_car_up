import { GalaxyResponseSchema, SmartConfigSchema } from './types';
import type { GalaxyResponse, SmartConfig } from './types';
import { MOCK_GALAXY, MOCK_SMART_CONFIG } from './mock';

export type GalaxyMode = 'mock' | 'live';

export interface GalaxyEnv {
  smartConfigUrl?: string;
  galaxyBaseUrl?: string;
  authHeader?: string;
}

export function resolveMode(env: GalaxyEnv): GalaxyMode {
  return env.smartConfigUrl || env.galaxyBaseUrl ? 'live' : 'mock';
}

export async function loadSmartConfig(env: GalaxyEnv): Promise<SmartConfig> {
  if (resolveMode(env) === 'mock') return MOCK_SMART_CONFIG;
  if (env.smartConfigUrl) {
    const res = await fetch(env.smartConfigUrl, { headers: authHeaders(env) });
    if (!res.ok) throw new Error(`SmartConfig failed: ${res.status}`);
    return SmartConfigSchema.parse(await res.json());
  }
  return SmartConfigSchema.parse({
    galaxyBaseUrl: env.galaxyBaseUrl!,
    authHeader: env.authHeader ?? '',
  });
}

export async function fetchGalaxyRubric(
  env: GalaxyEnv,
  config: SmartConfig,
): Promise<GalaxyResponse> {
  if (resolveMode(env) === 'mock') return MOCK_GALAXY;
  const url = `${config.galaxyBaseUrl.replace(/\/$/, '')}${config.rubricPath}`;
  const res = await fetch(url, { headers: authHeaders(env, config) });
  if (!res.ok) throw new Error(`Galaxy rubric failed: ${res.status}`);
  return GalaxyResponseSchema.parse(await res.json());
}

function authHeaders(env: GalaxyEnv, config?: SmartConfig): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' };
  const auth = env.authHeader ?? config?.authHeader;
  if (auth) h.Authorization = auth;
  return h;
}
