import { describe, it, expect } from 'vitest';
import { selectAudioStream, selectAutomotiveStream } from './selectStream';
import type { Media } from '@/galaxy/types';

const audio = (deliveries: Media['deliveries'], streamUrl?: string): Media => ({
  id: 'x', title: 't', artist: 'a', artworkUrl: '', type: 'audio', deliveries, streamUrl,
});

describe('selectAudioStream', () => {
  it('returns full when allowed', () => {
    const m = audio([
      { url: 'https://p/p.mp3', kind: 'preview' },
      { url: 'https://f/f.mp3', kind: 'full' },
    ]);
    expect(selectAudioStream(m, true)?.kind).toBe('full');
  });

  it('falls back to preview when full not allowed', () => {
    const m = audio([
      { url: 'https://p/p.mp3', kind: 'preview' },
      { url: 'https://f/f.mp3', kind: 'full' },
    ]);
    expect(selectAudioStream(m, false)?.kind).toBe('preview');
  });

  it('uses streamUrl fallback', () => {
    const m = audio([], 'https://s/s.mp3');
    expect(selectAudioStream(m, true)?.url).toBe('https://s/s.mp3');
  });

  it('returns null when no deliveries', () => {
    expect(selectAudioStream(audio([]), true)).toBeNull();
  });
});

describe('selectAutomotiveStream', () => {
  it('prefers automotive delivery', () => {
    const m = audio([
      { url: 'https://a/a.mp3', kind: 'automotive' },
      { url: 'https://f/f.mp3', kind: 'full' },
    ]);
    expect(selectAutomotiveStream(m, true)?.kind).toBe('automotive');
  });

  it('falls back to audio rules when not video', () => {
    const m = audio([{ url: 'https://f/f.mp3', kind: 'full' }]);
    expect(selectAutomotiveStream(m, true)?.kind).toBe('full');
  });

  it('handles video types', () => {
    const m: Media = {
      id: 'v', title: 'v', artist: '', artworkUrl: '', type: 'video',
      deliveries: [{ url: 'https://v/v.mp4', kind: 'full' }],
    };
    expect(selectAutomotiveStream(m, true)?.url).toBe('https://v/v.mp4');
  });
});
