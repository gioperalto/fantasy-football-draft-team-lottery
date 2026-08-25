import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Music2, Volume2, VolumeX } from 'lucide-react';

interface DraftMusicProps {
  victoryTrigger?: number;
}

interface DraftTrack {
  id: string;
  name: string;
  description: string;
  src: string;
}

const tracks: DraftTrack[] = [
  {
    id: 'stadium-hype',
    name: 'Stadium Hype',
    description: 'Big sports-rock energy',
    src: '/audio/draft/stadium-hype.mp3',
  },
  {
    id: 'draft-tension',
    name: 'Draft Tension',
    description: 'A driving soundtrack for every pick',
    src: '/audio/draft/draft-tension.mp3',
  },
  {
    id: 'lofi-draft',
    name: 'Lo-fi Draft',
    description: 'A relaxed draft-room beat',
    src: '/audio/draft/lofi-draft.mp3',
  },
  {
    id: 'victory',
    name: 'Victory',
    description: 'A proud finish for the final pick',
    src: '/audio/draft/victory.mp3',
  },
];

const ENABLED_STORAGE_KEY = 'draft-music-enabled';
const TRACK_STORAGE_KEY = 'draft-music-track';
const VOLUME_STORAGE_KEY = 'draft-music-volume';

function readStoredVolume(): number {
  const storedValue = window.localStorage.getItem(VOLUME_STORAGE_KEY);
  if (storedValue === null) return 0.35;
  const stored = Number(storedValue);
  return Number.isFinite(stored) && stored >= 0 && stored <= 1 ? stored : 0.35;
}

export default function DraftMusic({ victoryTrigger = 0 }: DraftMusicProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const victoryAudioRef = useRef<HTMLAudioElement>(null);
  const [enabled, setEnabled] = useState(() => window.localStorage.getItem(ENABLED_STORAGE_KEY) === 'true');
  const [trackId, setTrackId] = useState(() => {
    const stored = window.localStorage.getItem(TRACK_STORAGE_KEY);
    return tracks.some((track) => track.id === stored) ? stored! : tracks[0].id;
  });
  const [volume, setVolume] = useState(readStoredVolume);
  const selectedTrack = tracks.find((track) => track.id === trackId) ?? tracks[0];

  useEffect(() => {
    window.localStorage.setItem(ENABLED_STORAGE_KEY, String(enabled));
    const audio = audioRef.current;
    if (!audio) return;

    audio.loop = true;
    audio.volume = volume;
    if (enabled) {
      void audio.play().catch(() => {
        // Browsers may still reject playback if the permission gesture expired.
      });
    } else {
      audio.pause();
    }
  }, [enabled, volume]);

  useEffect(() => {
    window.localStorage.setItem(TRACK_STORAGE_KEY, trackId);
    const audio = audioRef.current;
    if (!audio) return;

    audio.load();
    if (enabled) {
      void audio.play().catch(() => {
        // Playback can be retried with the next user interaction.
      });
    }
  }, [trackId, enabled]);

  useEffect(() => {
    if (victoryTrigger === 0 || !enabled) return;
    const victoryAudio = victoryAudioRef.current;
    if (!victoryAudio) return;

    victoryAudio.currentTime = 0;
    victoryAudio.volume = volume;
    void victoryAudio.play().catch(() => {
      // Playback can be blocked if the user has not interacted with the page.
    });
  }, [victoryTrigger, enabled, volume]);

  const toggleMusic = () => setEnabled((current) => !current);

  const handleTrackChange = (nextTrackId: string) => {
    setTrackId(nextTrackId);
    setEnabled(true);
  };

  const handleVolumeChange = (nextVolume: number) => {
    setVolume(nextVolume);
    window.localStorage.setItem(VOLUME_STORAGE_KEY, String(nextVolume));
  };

  return (
    <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-3 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm">
      <audio ref={audioRef} src={selectedTrack.src} loop preload="metadata" />
      <audio ref={victoryAudioRef} src="/audio/draft/victory.mp3" preload="auto" />
      <div className="flex items-center gap-2 text-slate-300">
        <Music2 className="h-4 w-4 text-amber-300" />
        <span className="font-semibold">Draft Music</span>
      </div>
      <button
        type="button"
        onClick={toggleMusic}
        aria-pressed={enabled}
        className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 font-semibold transition-colors ${
          enabled ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
        }`}
      >
        {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        {enabled ? 'On' : 'Off'}
      </button>
      <label className="relative flex min-w-0 items-center gap-2">
        <span className="sr-only">Choose draft music</span>
        <select
          value={trackId}
          onChange={(event) => handleTrackChange(event.target.value)}
          className="min-w-0 flex-1 appearance-none rounded-lg border border-slate-600 bg-slate-800 py-2 pl-3 pr-8 font-semibold text-white outline-none focus:border-amber-400"
        >
          {tracks.map((track) => (
            <option key={track.id} value={track.id}>
              {track.name} — {track.description}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 h-4 w-4 text-slate-400" />
      </label>
      <label className="flex items-center gap-2 text-slate-400" title={`Volume ${Math.round(volume * 100)}%`}>
        <Volume2 className="h-4 w-4" />
        <span className="sr-only">Music volume</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(event) => handleVolumeChange(Number(event.target.value))}
          aria-label="Music volume"
          className="w-full sm:w-20 accent-amber-400"
        />
      </label>
    </div>
  );
}
