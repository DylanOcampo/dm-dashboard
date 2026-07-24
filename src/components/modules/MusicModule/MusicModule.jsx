import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useApp } from '../../../context/AppContext';
import { usePersistedState } from '../../../hooks/usePersistedState';
import { extractYouTubeId, loadYouTubeIframeApi } from '../../../services/youtube';
import './MusicModule.css';

const VIDEO_MIN_WIDTH = 260;
const VIDEO_MIN_HEIGHT = 220;

export default function MusicModule({ instanceId }) {
  const { syncOptions } = useApp();
  const [musicPlaylist, setMusicPlaylist] = usePersistedState(`musicPlaylist:${instanceId}`, [], syncOptions);
  const [urlInput, setUrlInput] = useState('');
  const [error, setError] = useState('');
  const [activeTrackId, setActiveTrackId] = useState(null);
  const [playerState, setPlayerState] = useState(-1);
  const [showVideo, setShowVideo] = useState(false);

  const rootRef = useRef(null);
  const playerContainerRef = useRef(null);
  const playerRef = useRef(null);
  const pendingVideoIdRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    loadYouTubeIframeApi().then((YT) => {
      if (cancelled || !playerContainerRef.current) return;
      playerRef.current = new YT.Player(playerContainerRef.current, {
        height: '100%',
        width: '100%',
        events: {
          onReady: () => {
            if (pendingVideoIdRef.current) {
              playerRef.current.loadVideoById(pendingVideoIdRef.current);
              pendingVideoIdRef.current = null;
            }
          },
          onStateChange: (event) => setPlayerState(event.data),
        },
      });
    });
    return () => {
      cancelled = true;
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setShowVideo(width >= VIDEO_MIN_WIDTH && height >= VIDEO_MIN_HEIGHT);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const playTrack = useCallback((track) => {
    setActiveTrackId(track.id);
    if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
      playerRef.current.loadVideoById(track.videoId);
    } else {
      pendingVideoIdRef.current = track.videoId;
    }
  }, []);

  const handleToggle = (track) => {
    if (track.id === activeTrackId) {
      if (playerState === 1) {
        playerRef.current?.pauseVideo?.();
      } else {
        playerRef.current?.playVideo?.();
      }
    } else {
      playTrack(track);
    }
  };

  const handleRemove = (track) => {
    if (track.id === activeTrackId) {
      playerRef.current?.stopVideo?.();
      setActiveTrackId(null);
    }
    setMusicPlaylist((prev) => prev.filter((t) => t.id !== track.id));
  };

  const handleAdd = (e) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    const videoId = extractYouTubeId(trimmed);
    if (!videoId) {
      setError('Ese no parece un link válido de YouTube.');
      return;
    }
    setMusicPlaylist((prev) => [...prev, { id: uuid(), videoId, url: trimmed, title: trimmed }]);
    setUrlInput('');
    setError('');
  };

  return (
    <div className="music-module" ref={rootRef}>
      <form className="music-module__form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder="Pega un link de YouTube..."
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
        />
        <button type="submit">Agregar</button>
      </form>
      {error && <p className="music-module__error">{error}</p>}

      <div className={`music-module__player ${showVideo ? '' : 'music-module__player--collapsed'}`}>
        <div ref={playerContainerRef} className="music-module__iframe-target" />
      </div>

      <ul className="music-module__list">
        {musicPlaylist.length === 0 && <li className="music-module__empty">Sin canciones agregadas.</li>}
        {musicPlaylist.map((track) => {
          const isActive = track.id === activeTrackId;
          const isPlaying = isActive && playerState === 1;
          return (
            <li key={track.id} className={`music-module__track ${isActive ? 'is-active' : ''}`}>
              <button type="button" className="music-module__play-btn" onClick={() => handleToggle(track)}>
                {isPlaying ? '⏸' : '▶'}
              </button>
              <span className="music-module__track-title" title={track.url}>
                {track.title}
              </span>
              <button
                type="button"
                className="music-module__remove-btn"
                onClick={() => handleRemove(track)}
                aria-label="Eliminar canción"
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
