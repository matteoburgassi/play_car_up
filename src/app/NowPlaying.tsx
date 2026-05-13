import type { PlayerState, QueueItem } from '@/playback/PlayUpPlaybackModule';

type Props = {
  item: QueueItem;
  state: PlayerState;
  positionMs: number;
  durationMs: number;
  onClose: () => void;
  onToggle: () => void;
  onSeek: (ms: number) => void;
  onNext: () => void;
  onPrev: () => void;
};

function fmt(ms: number): string {
  if (!isFinite(ms) || ms <= 0) return '0:00';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function NowPlaying({
  item, state, positionMs, durationMs, onClose, onToggle, onSeek, onNext, onPrev,
}: Props) {
  const playing = state === 'ready' || state === 'buffering';
  const max = Math.max(durationMs, 1);
  return (
    <div className="np-overlay" role="dialog" aria-modal="true">
      <div className="np-card">
        <img className="np-art" src={item.artworkUrl} alt="" />
        <h2 className="np-title">{item.title}</h2>
        <p className="np-sub">{item.artist}</p>
        <div className="np-row">
          <span className="np-time">{fmt(positionMs)}</span>
          <input
            className="np-scrub"
            type="range"
            min={0}
            max={max}
            value={Math.min(positionMs, max)}
            onChange={(e) => onSeek(Number(e.target.value))}
            aria-label="Seek"
          />
          <span className="np-time">{fmt(durationMs)}</span>
        </div>
        <div className="np-controls">
          <button className="icon-btn ghost" onClick={onPrev} aria-label="Previous">{'\u23EE'}</button>
          <button className="icon-btn" onClick={onToggle} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? '\u2225' : '\u25B6'}
          </button>
          <button className="icon-btn ghost" onClick={onNext} aria-label="Next">{'\u23ED'}</button>
        </div>
        <button className="np-close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
