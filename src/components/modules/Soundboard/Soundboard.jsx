import { useEffect, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useApp } from '../../../context/AppContext';
import { usePersistedState } from '../../../hooks/usePersistedState';
import { extractYouTubeId, loadYouTubeIframeApi } from '../../../services/youtube';
import './Soundboard.css';

export default function Soundboard({ instanceId }) {
  const { syncOptions, t } = useApp();
  const [clips, setClips] = usePersistedState(`soundboard:${instanceId}`, [], syncOptions);

  const [urlInput, setUrlInput] = useState('');
  const [startInput, setStartInput] = useState(0);
  const [endInput, setEndInput] = useState(5);
  const [emojiInput, setEmojiInput] = useState('🔊');
  const [error, setError] = useState('');

  const [activeClipId, setActiveClipId] = useState(null);
  const [playerState, setPlayerState] = useState(-1);

  const playerContainerRef = useRef(null);
  const playerRef = useRef(null);
  const pendingClipRef = useRef(null);
  const activeEndRef = useRef(null);
  const watchIntervalRef = useRef(null);

  const stopWatching = () => {
    if (watchIntervalRef.current) {
      clearInterval(watchIntervalRef.current);
      watchIntervalRef.current = null;
    }
  };

  useEffect(() => {
    let cancelled = false;
    loadYouTubeIframeApi().then((YT) => {
      if (cancelled || !playerContainerRef.current) return;
      playerRef.current = new YT.Player(playerContainerRef.current, {
        height: '1',
        width: '1',
        events: {
          onReady: () => {
            if (pendingClipRef.current) {
              const clip = pendingClipRef.current;
              pendingClipRef.current = null;
              activeEndRef.current = clip.end;
              playerRef.current.loadVideoById({ videoId: clip.videoId, startSeconds: clip.start });
            }
          },
          onStateChange: (event) => {
            setPlayerState(event.data);
            if (event.data === 1) {
              stopWatching();
              watchIntervalRef.current = setInterval(() => {
                const current = playerRef.current?.getCurrentTime?.() ?? 0;
                if (activeEndRef.current != null && current >= activeEndRef.current) {
                  playerRef.current.pauseVideo();
                }
              }, 200);
            } else {
              stopWatching();
            }
          },
        },
      });
    });
    return () => {
      cancelled = true;
      stopWatching();
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
      }
    };
  }, []);

  const playClip = (clip) => {
    setActiveClipId(clip.id);
    activeEndRef.current = clip.end;
    if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
      playerRef.current.loadVideoById({ videoId: clip.videoId, startSeconds: clip.start });
    } else {
      pendingClipRef.current = clip;
    }
  };

  const handleClipClick = (clip) => {
    if (clip.id === activeClipId && playerState === 1) {
      playerRef.current?.pauseVideo?.();
    } else {
      playClip(clip);
    }
  };

  const handleRemove = (clip) => {
    if (clip.id === activeClipId) {
      playerRef.current?.stopVideo?.();
      setActiveClipId(null);
    }
    setClips((prev) => prev.filter((c) => c.id !== clip.id));
  };

  const handleAdd = (e) => {
    e.preventDefault();
    const videoId = extractYouTubeId(urlInput.trim());
    if (!videoId) {
      setError(t('soundboard.errorInvalidUrl'));
      return;
    }
    const start = Math.max(0, Number(startInput) || 0);
    const end = Math.max(start + 1, Number(endInput) || start + 1);
    setClips((prev) => [
      ...prev,
      { id: uuid(), videoId, start, end, emoji: emojiInput.trim() || '🔊', url: urlInput.trim() },
    ]);
    setUrlInput('');
    setError('');
  };

  return (
    <div className="soundboard">
      <form className="soundboard__form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder={t('soundboard.urlPlaceholder')}
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
        />
        <div className="soundboard__time-inputs">
          <label>
            {t('soundboard.startLabel')}
            <input type="number" min="0" value={startInput} onChange={(e) => setStartInput(e.target.value)} />
          </label>
          <label>
            {t('soundboard.endLabel')}
            <input type="number" min="1" value={endInput} onChange={(e) => setEndInput(e.target.value)} />
          </label>
          <label>
            {t('soundboard.emojiLabel')}
            <input
              type="text"
              maxLength="4"
              value={emojiInput}
              onChange={(e) => setEmojiInput(e.target.value)}
            />
          </label>
        </div>
        <button type="submit">{t('soundboard.addClipButton')}</button>
      </form>
      {error && <p className="soundboard__error">{error}</p>}

      <div className="soundboard__hidden-player">
        <div ref={playerContainerRef} />
      </div>

      <div className="soundboard__grid">
        {clips.length === 0 && <p className="soundboard__empty">{t('soundboard.emptyClips')}</p>}
        {clips.map((clip) => {
          const isPlaying = clip.id === activeClipId && playerState === 1;
          return (
            <div key={clip.id} className="soundboard__clip-wrapper">
              <button
                type="button"
                className={`soundboard__clip ${isPlaying ? 'is-playing' : ''}`}
                onClick={() => handleClipClick(clip)}
                title={`${clip.start}s - ${clip.end}s`}
              >
                {clip.emoji}
              </button>
              <button
                type="button"
                className="soundboard__remove"
                onClick={() => handleRemove(clip)}
                aria-label={t('soundboard.removeClipAria')}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
