import { z } from 'zod';

export const SmartConfigSchema = z.object({
  galaxyBaseUrl: z.string(),
  rubricPath: z.string().default('/publishing-rubric-list'),
  campaignId: z.string(),
  languageCode: z.string(),
  countryCode: z.string(),
  rubricId: z.string(),
});
export type SmartConfig = z.infer<typeof SmartConfigSchema>;

/** Raw SmartConfig response is opaque; we extract known fields. */
export const SmartConfigRawSchema = z.record(z.unknown());
export type SmartConfigRaw = z.infer<typeof SmartConfigRawSchema>;

export const StreamDeliverySchema = z.object({
  url: z.string().url(),
  mime: z.string().optional(),
  extension: z.string().optional(),
  kind: z.enum(['preview', 'full', 'automotive']).default('full'),
});
export type StreamDelivery = z.infer<typeof StreamDeliverySchema>;

export const MediaSchema = z.object({
  id: z.string(),
  title: z.string(),
  artist: z.string().default(''),
  artworkUrl: z
    .string()
    .optional()
    .default('')
    .transform((v) => (v && /^https?:\/\//i.test(v) ? v : '')),
  durationMs: z.number().int().nonnegative().optional(),
  type: z.enum(['audio', 'video']).default('audio'),
  deliveries: z.array(StreamDeliverySchema).default([]),
  streamUrl: z.string().url().optional(),
});
export type Media = z.infer<typeof MediaSchema>;

export const GalaxyResponseSchema = z.object({
  rubric: z.string().default('Featured'),
  items: z.array(MediaSchema),
});
export type GalaxyResponse = z.infer<typeof GalaxyResponseSchema>;

export const GalaxyRawItemSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    media_id: z.union([z.string(), z.number()]).optional(),
    rubric_id: z.union([z.string(), z.number(), z.array(z.union([z.string(), z.number()]))]).optional(),
    title: z.string().optional(),
    name: z.string().optional(),
    rubric_label: z.string().optional(),
    rubric_title: z.string().nullable().optional(),
    artist: z.string().optional(),
    author: z.string().optional(),
    artwork_url: z.string().optional(),
    image_url: z.string().optional(),
    thumbnail: z.string().optional(),
    preview_medium: z.string().nullable().optional(),
    preview_large: z.string().nullable().optional(),
    preview_small: z.string().nullable().optional(),
    duration: z.number().optional(),
    duration_ms: z.number().optional(),
    media_type: z.string().optional(),
    type: z.string().optional(),
    stream_url: z.string().optional(),
    url: z.string().optional(),
    rubric_content_type: z.array(z.string()).optional(),
    content_id: z.union([z.string(), z.number()]).optional(),
    content_type: z.string().optional(),
    content_type_tech_label: z.string().optional(),
    provider_label: z.string().optional(),
    editor_label: z.string().optional(),
    artist_label: z.string().optional(),
    authors: z.unknown().optional(),
    author_list: z.unknown().optional(),
    artists: z.unknown().optional(),
    /**
     * Deliveries can be:
     *  - an array of `{ url, mime?, extension?, kind? }` (legacy shape), or
     *  - an object `{ download: {default: [...]}, preview: {default: [...]}, mainDelivery: {...}, additionalDeliveries: [...] }`
     * We accept anything and resolve the shape in the normalizer.
     */
    deliveries: z.unknown().optional(),
    assets: z.unknown().optional(),
  })
  .passthrough();
export type GalaxyRawItem = z.infer<typeof GalaxyRawItemSchema>;

/**
 * Galaxy responses come wrapped in `{ code, error, data: { data: [...] } }`.
 * Older shapes use a flat `items`/`medias`/`data: [...]` array; we accept both.
 */
export const GalaxyRawResponseSchema = z
  .object({
    code: z.number().optional(),
    error: z.union([z.number(), z.string()]).optional(),
    rubric_name: z.string().optional(),
    rubric_label: z.string().optional(),
    name: z.string().optional(),
    items: z.array(GalaxyRawItemSchema).optional(),
    medias: z.array(GalaxyRawItemSchema).optional(),
    data: z
      .union([
        z.array(GalaxyRawItemSchema),
        z
          .object({
            data: z.array(GalaxyRawItemSchema).optional(),
            items: z.array(GalaxyRawItemSchema).optional(),
            total_items: z.number().optional(),
            page: z.number().optional(),
          })
          .passthrough(),
      ])
      .optional(),
  })
  .passthrough();
export type GalaxyRawResponse = z.infer<typeof GalaxyRawResponseSchema>;
