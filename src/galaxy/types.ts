import { z } from 'zod';

export const SmartConfigSchema = z.object({
  galaxyBaseUrl: z.string().url(),
  rubricPath: z.string().default('/publishing-rubric-list'),
  campaignId: z.string(),
  languageCode: z.string(),
  countryCode: z.string(),
  rubricId: z.string(),
});
export type SmartConfig = z.infer<typeof SmartConfigSchema>;

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
  artworkUrl: z.string().url().optional().default(''),
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
    title: z.string().optional(),
    name: z.string().optional(),
    artist: z.string().optional(),
    author: z.string().optional(),
    artwork_url: z.string().optional(),
    image_url: z.string().optional(),
    thumbnail: z.string().optional(),
    duration: z.number().optional(),
    duration_ms: z.number().optional(),
    media_type: z.string().optional(),
    type: z.string().optional(),
    stream_url: z.string().optional(),
    url: z.string().optional(),
    deliveries: z
      .array(
        z.object({
          url: z.string(),
          mime: z.string().optional(),
          extension: z.string().optional(),
          kind: z.string().optional(),
        }),
      )
      .optional(),
  })
  .passthrough();
export type GalaxyRawItem = z.infer<typeof GalaxyRawItemSchema>;

export const GalaxyRawResponseSchema = z
  .object({
    rubric_name: z.string().optional(),
    rubric_label: z.string().optional(),
    name: z.string().optional(),
    items: z.array(GalaxyRawItemSchema).optional(),
    medias: z.array(GalaxyRawItemSchema).optional(),
    data: z.array(GalaxyRawItemSchema).optional(),
  })
  .passthrough();
export type GalaxyRawResponse = z.infer<typeof GalaxyRawResponseSchema>;
