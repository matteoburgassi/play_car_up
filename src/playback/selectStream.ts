import type { Media, StreamDelivery } from '@/galaxy/types';

function flatten(media: Media): StreamDelivery[] {
  const out = [...media.deliveries];
  if (media.streamUrl && !out.some((d) => d.url === media.streamUrl)) {
    out.push({ url: media.streamUrl, kind: 'full' });
  }
  return out;
}

export function selectAudioStream(media: Media, allowFull: boolean): StreamDelivery | null {
  const list = flatten(media);
  if (list.length === 0) return null;
  if (allowFull) {
    return (
      list.find((d) => d.kind === 'full') ??
      list.find((d) => d.kind === 'preview') ??
      list[0]
    );
  }
  return list.find((d) => d.kind === 'preview') ?? null;
}

export function selectAutomotiveStream(media: Media, allowFull: boolean): StreamDelivery | null {
  const list = flatten(media);
  if (list.length === 0) return null;
  const auto = list.find((d) => d.kind === 'automotive');
  if (auto) return auto;
  if (media.type === 'video') {
    return list.find((d) => d.kind === 'preview' || d.kind === 'full') ?? null;
  }
  return selectAudioStream(media, allowFull);
}
