import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useApp } from '../../../context/AppContext';
import { usePersistedState } from '../../../hooks/usePersistedState';
import { extractYouTubeId, fetchYouTubeTitle, loadYouTubeIframeApi } from '../../../services/youtube';
import VolumeControl from '../../common/VolumeControl/VolumeControl';
import './MusicModule.css';

const VIDEO_MIN_WIDTH = 260;
const VIDEO_MIN_HEIGHT = 220;

export default function MusicModule({ instanceId }) {
  const { syncOptions, t } = useApp();
  const [musicPlaylist, setMusicPlaylist] = usePersistedState(`musicPlaylist:${instanceId}`, [], syncOptions);
  const [volume, setVolume] = usePersistedState(`musicVolume:${instanceId}`, 100, syncOptions);
  const [urlInput, setUrlInput] = useState('');
  const [error, setError] = useState('');
  const [activeTrackId, setActiveTrackId] = useState(null);
  const [playerState, setPlayerState] = useState(-1);
  const [showVideo, setShowVideo] = useState(false);

  const rootRef = useRef(null);
  const playerContainerRef = useRef(null);
  const playerRef = useRef(null);
  const pendingVideoIdRef = useRef(null);
  const volumeRef = useRef(volume);

  useEffect(() => {
    volumeRef.current = volume;
    playerRef.current?.setVolume?.(volume);
  }, [volume]);

  useEffect(() => {
    let cancelled = false;
    loadYouTubeIframeApi().then((YT) => {
      if (cancelled || !playerContainerRef.current) return;
      playerRef.current = new YT.Player(playerContainerRef.current, {
        height: '100%',
        width: '100%',
        events: {
          onReady: () => {
            playerRef.current.setVolume(volumeRef.current);
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

  // Completa el título real de las canciones que ya estaban en la lista sin
  // uno (agregadas antes de que existiera esto, o si oEmbed falló en su
  // momento) — solo al montar, para no reintentar en cada render.
  useEffect(() => {
    musicPlaylist
      .filter((track) => track.title === track.url)
      .forEach((track) => {
        fetchYouTubeTitle(track.videoId).then((title) => {
          if (!title) return;
          setMusicPlaylist((prev) => prev.map((t) => (t.id === track.id ? { ...t, title } : t)));
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playTrack = useCallback((track) => {
    setActiveTrackId(track.id);
    if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
      playerRef.current.loadVideoById(track.videoId);
      playerRef.current.setVolume(volumeRef.current);
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
      setError(t('music.errorInvalidUrl'));
      return;
    }
    const id = uuid();
    setMusicPlaylist((prev) => [...prev, { id, videoId, url: trimmed, title: trimmed }]);
    setUrlInput('');
    setError('');

    // El título real llega asíncrono (oEmbed) — mientras tanto se ve el link,
    // así el agregado no se siente trabado esperando la red.
    fetchYouTubeTitle(videoId).then((title) => {
      if (!title) return;
      setMusicPlaylist((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)));
    });
  };

  return (
    <div className="music-module" ref={rootRef}>
      <form className="music-module__form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder={t('music.urlPlaceholder')}
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
        />
        <button type="submit">{t('music.addButton')}</button>
      </form>
      {error && <p className="music-module__error">{error}</p>}

      <div className="music-module__controls">
        <VolumeControl
          volume={volume}
          onChange={setVolume}
          label={t('volumeControl.toggleAria')}
          sliderLabel={t('volumeControl.sliderAria')}
        />
      </div>

      <div className={`music-module__player ${showVideo ? '' : 'music-module__player--collapsed'}`}>
        <div ref={playerContainerRef} className="music-module__iframe-target" />
      </div>

      <ul className="music-module__list">
        {musicPlaylist.length === 0 && <li className="music-module__empty">{t('music.emptyList')}</li>}
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
                aria-label={t('music.removeAria')}
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
