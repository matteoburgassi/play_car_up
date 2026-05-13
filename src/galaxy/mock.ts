import type { GalaxyResponse, SmartConfig } from './types';

export const MOCK_SMART_CONFIG: SmartConfig = {
  galaxyBaseUrl: 'https://mock.local/galaxy',
  authHeader: '',
  rubricPath: '/rubrics/featured',
};

const SAMPLE = 'https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Sevish_-__nbsp_.mp3';

export const MOCK_GALAXY: GalaxyResponse = {
  rubric: 'PlayUP Sampler',
  items: [
    {
      id: 't1',
      title: 'Drift Coastline',
      artist: 'Sevish',
      artworkUrl: 'https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg?auto=compress&cs=tinysrgb&w=400',
      type: 'audio',
      deliveries: [{ url: SAMPLE, mime: 'audio/mpeg', extension: 'mp3', kind: 'full' }],
    },
    {
      id: 't2',
      title: 'Night Transit',
      artist: 'Sevish',
      artworkUrl: 'https://images.pexels.com/photos/1626481/pexels-photo-1626481.jpeg?auto=compress&cs=tinysrgb&w=400',
      type: 'audio',
      deliveries: [{ url: SAMPLE, mime: 'audio/mpeg', extension: 'mp3', kind: 'full' }],
    },
    {
      id: 't3',
      title: 'Aurora Lines',
      artist: 'Sevish',
      artworkUrl: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=400',
      type: 'audio',
      deliveries: [{ url: SAMPLE, mime: 'audio/mpeg', extension: 'mp3', kind: 'full' }],
    },
    {
      id: 't4',
      title: 'Harbor Lights',
      artist: 'Sevish',
      artworkUrl: 'https://images.pexels.com/photos/417173/pexels-photo-417173.jpeg?auto=compress&cs=tinysrgb&w=400',
      type: 'audio',
      streamUrl: SAMPLE,
      deliveries: [],
    },
    {
      id: 't5',
      title: 'Granite Sky',
      artist: 'Sevish',
      artworkUrl: 'https://images.pexels.com/photos/1535162/pexels-photo-1535162.jpeg?auto=compress&cs=tinysrgb&w=400',
      type: 'audio',
      deliveries: [
        { url: SAMPLE, mime: 'audio/mpeg', extension: 'mp3', kind: 'preview' },
        { url: SAMPLE, mime: 'audio/mpeg', extension: 'mp3', kind: 'full' },
      ],
    },
  ],
};
