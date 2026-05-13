import { z } from 'zod';

export const SmartConfigSchema = z.object({
  galaxyBaseUrl: z.string().url(),
  authHeader: z.string().optional().default(''),
  rubricPath: z.string().default('/rubrics/featured'),
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
