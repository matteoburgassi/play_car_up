import type { QueueItem } from '@/playback/PlayUpPlaybackModule';

type Props = {
  items: QueueItem[];
  activeIndex: number;
  playing: boolean;
  onSelect: (index: number) => void;
};

export function TrackList({ items, activeIndex, playing, onSelect }: Props) {
  if (items.length === 0) {
    return <div className="banner">No tracks available.</div>;
  }
  return (
    <div className="list" role="list">
      {items.map((item, i) => {
        const active = i === activeIndex;
        return (
          <button
            key={item.id}
            className={`row ${active ? 'active' : ''}`}
            onClick={() => onSelect(i)}
            role="listitem"
          >
            <img className="row-art" src={item.artworkUrl} alt="" loading="lazy" />
            <div className="row-meta">
              <div className="row-title">{item.title}</div>
              <div className="row-sub">{item.artist}</div>
            </div>
            <div className="row-state">{active ? (playing ? 'Playing' : 'Paused') : 'Play'}</div>
          </button>
        );
      })}
    </div>
  );
}
