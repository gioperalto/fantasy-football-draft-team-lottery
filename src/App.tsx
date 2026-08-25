import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Trophy, ChevronLeft, ChevronRight, Settings, Users, Copy, Check, Link } from 'lucide-react';
import type { Team } from './interfaces/Team';
import DraftSetup from './components/DraftSetup';
import DraftMusic from './components/DraftMusic';
import { useWebSocket } from './contexts/WebSocketContext';
import './App.css';

interface DraftedTeam extends Team {
  pick: number;
}

interface LotteryOdds {
  team: Team;
  odds: number;
  drawings: number;
}

interface DraftConfig {
  teams: Team[];
  totalTeams: number;
  lotteryTeams: number;
  draftName: string;
  pickCountdown: number;
  startDelayMinutes: number;
  reservedNames: string[];
}

interface DraftState {
  draftConfig: DraftConfig | null;
  drafted: DraftedTeam[];
  current: Team | null;
  isDrafting: boolean;
  showCurrent: boolean;
  countdown: number | null;
  lotteryOdds: LotteryOdds[];
  totalDrawings: number;
  preDraftCountdown: number | null;
}

export default function NFLDraftAnimator() {
  const { code } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const {
    isHost,
    roomCode,
    viewerCount,
    remoteState,
    error: wsError,
    createRoom,
    joinRoom,
    broadcastState,
    sendIdentity
  } = useWebSocket();

  const [page, setPage] = useState<'setup' | 'draft'>('setup');
  const [draftConfig, setDraftConfig] = useState<DraftConfig | null>(null);
  const [drafted, setDrafted] = useState<DraftedTeam[]>([]);
  const [current, setCurrent] = useState<Team | null>(null);
  const [isDrafting, setIsDrafting] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [lotteryOdds, setLotteryOdds] = useState<LotteryOdds[]>([]);
  const [totalDrawings, setTotalDrawings] = useState(0);
  const [preDraftCountdown, setPreDraftCountdown] = useState<number | null>(null);
  const [identityName, setIdentityName] = useState('');
  const [identityTeam, setIdentityTeam] = useState('');
  const [hasJoinedRoom, setHasJoinedRoom] = useState(!code);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [savedResultUrl, setSavedResultUrl] = useState<string | null>(null);
  const [savingResult, setSavingResult] = useState(false);
  const [resultSaveError, setResultSaveError] = useState<string | null>(null);
  const [showRedraftWarning, setShowRedraftWarning] = useState(false);
  const [victoryTrigger, setVictoryTrigger] = useState(0);
  const lastSavedResult = useRef<string | null>(null);
  const lastLuckyReceipt = useRef<string | null>(null);

  // Determine if we're in viewer mode (joined via URL with code)
  const isViewer = !!code && !isHost;

  // Join room if we have a code in URL
  useEffect(() => {
    if (code && !roomCode) {
      joinRoom(code);
    }
  }, [code, roomCode, joinRoom]);

  useEffect(() => {
    if (!code) return;
    const nameFromUrl = new URLSearchParams(window.location.search).get('name');
    if (nameFromUrl) setIdentityName(nameFromUrl.slice(0, 40));
  }, [code]);

  // Sync remote state for viewers
  useEffect(() => {
    if (isViewer && remoteState) {
      setDraftConfig(remoteState.draftConfig);
      setDrafted(remoteState.drafted);
      setCurrent(remoteState.current);
      setIsDrafting(remoteState.isDrafting);
      setShowCurrent(remoteState.showCurrent);
      setCountdown(remoteState.countdown);
      setLotteryOdds(remoteState.lotteryOdds);
      setTotalDrawings(remoteState.totalDrawings);
      setPreDraftCountdown(remoteState.preDraftCountdown ?? null);
      if (remoteState.draftConfig) {
        setPage('draft');
      }
    }
  }, [isViewer, remoteState]);

  // Broadcast state changes for host
  useEffect(() => {
    if (isHost && roomCode && page === 'draft') {
      const state: DraftState = {
        draftConfig,
        drafted,
        current,
        isDrafting,
        showCurrent,
        countdown,
        lotteryOdds,
        totalDrawings,
        preDraftCountdown
      };
      broadcastState(state);
    }
  }, [isHost, roomCode, page, draftConfig, drafted, current, isDrafting, showCurrent, countdown, lotteryOdds, totalDrawings, preDraftCountdown, broadcastState]);

  // Persist the completed result to the Railway-backed API. The room code is the
  // stable result ID, so a later completed redraft intentionally overwrites it.
  useEffect(() => {
    if (!isHost || !roomCode || !draftConfig || isDrafting || drafted.length !== draftConfig.lotteryTeams) {
      return;
    }

    const reservedSpots = draftConfig.totalTeams - draftConfig.lotteryTeams;
    const reservedPicks: DraftedTeam[] = Array.from({ length: reservedSpots }, (_, index) => ({
      name: draftConfig.reservedNames?.[index] || `Reserved spot ${index + 1}`,
      icon: '👤',
      color: '#64748b',
      pick: index + 1,
      standing: 0,
    }));
    const picks = [...drafted, ...reservedPicks].sort((a, b) => a.pick - b.pick);
    const signature = JSON.stringify({ draftConfig, picks });
    if (signature === lastSavedResult.current) return;

    setSavingResult(true);
    setResultSaveError(null);
    fetch(`/api/results/${encodeURIComponent(roomCode)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draftName: draftConfig.draftName, picks }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not save the draft result.');
        return response.json();
      })
      .then(() => {
        lastSavedResult.current = signature;
        setSavedResultUrl(`/results/${roomCode}`);
      })
      .catch((error: unknown) => {
        setResultSaveError(error instanceof Error ? error.message : 'Could not save the draft result.');
      })
      .finally(() => setSavingResult(false));
  }, [isHost, roomCode, draftConfig, drafted, isDrafting]);

  // Navigate to draft URL when room is created
  useEffect(() => {
    if (roomCode && isHost && !code) {
      navigate(`/draft/${roomCode}`, { replace: true });
    }
  }, [roomCode, isHost, code, navigate]);

  const handleStartDraft = (
    teams: Team[],
    totalTeams: number,
    lotteryTeams: number,
    draftName: string,
    pickCountdown: number,
    startDelayMinutes: number,
    reservedNames: string[],
  ) => {
    const config = { teams, totalTeams, lotteryTeams, draftName, pickCountdown, startDelayMinutes, reservedNames };
    setDraftConfig(config);
    setPage('draft');
    setDrafted([]);
    setCurrent(null);
    setIsDrafting(false);
    setShowCurrent(false);
    setCountdown(null);
    setPreDraftCountdown(null);
    setLotteryOdds([]);
    setTotalDrawings(0);
    setCarouselIndex(0);
    setHasJoinedRoom(false);
    lastLuckyReceipt.current = null;

    // Create WebSocket room
    const initialState: DraftState = {
      draftConfig: config,
      drafted: [],
      current: null,
      isDrafting: false,
      showCurrent: false,
      countdown: null,
      lotteryOdds: [],
      totalDrawings: 0,
      preDraftCountdown: null
    };
    createRoom(initialState);
  };

  const goToSetup = () => {
    setPage('setup');
    setDrafted([]);
    setCurrent(null);
    setIsDrafting(false);
    setShowCurrent(false);
    setCountdown(null);
    setPreDraftCountdown(null);
    setLotteryOdds([]);
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}/draft/${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyResultLink = async () => {
    if (!savedResultUrl) return;
    await navigator.clipboard.writeText(`${window.location.origin}${savedResultUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const standingToString = (place: number): string => {
    if (place === 1) return '1st';
    if (place === 2) return '2nd';
    if (place === 3) return '3rd';
    return `${place}th`;
  };

  const drawingsToString = (drawings: number): string => {
    if (drawings === 1) return '1 drawing';
    return `${drawings} drawings`;
  };

  const calculateLotteryOdds = (remainingTeams: Team[]): LotteryOdds[] => {
    const total = remainingTeams.reduce((sum, team) => sum + team.standing, 0);
    return remainingTeams.map(team => ({
      team,
      drawings: team.standing,
      odds: (team.standing / total) * 100
    })).sort((a, b) => b.odds - a.odds);
  };

  const weightedRandomPick = (remainingTeams: Team[]): Team => {
    const totalWeight = remainingTeams.reduce((sum, team) => sum + team.standing, 0);
    let random = Math.random() * totalWeight;

    for (const team of remainingTeams) {
      random -= team.standing;
      if (random <= 0) {
        return team;
      }
    }

    return remainingTeams[remainingTeams.length - 1];
  };

  const startDraft = () => {
    if (!draftConfig || isViewer) return;

    const { teams, totalTeams, lotteryTeams, pickCountdown } = draftConfig;
    const reservedSpots = totalTeams - lotteryTeams;
    const firstPick = reservedSpots + 1;
    const lastPick = totalTeams;

    setDrafted([]);
    setCurrent(null);
    setIsDrafting(true);
    setShowCurrent(false);
    setCountdown(null);
    setPreDraftCountdown(null);
    setCarouselIndex(0);

    let remainingTeams = [...teams];
    const initialTotal = remainingTeams.reduce((sum, team) => sum + team.standing, 0);
    setTotalDrawings(initialTotal);
    setLotteryOdds(calculateLotteryOdds(remainingTeams));

    let delay = 0;
    const COUNTDOWN = pickCountdown;
    const secondToLastPick = lastPick - 1;

    for (let pickNum = firstPick; pickNum <= secondToLastPick; pickNum++) {
      setTimeout(() => {
        const currentRemaining = remainingTeams;
        const odds = calculateLotteryOdds(currentRemaining);
        const currentTotal = currentRemaining.reduce((sum, team) => sum + team.standing, 0);

        setLotteryOdds(odds);
        setTotalDrawings(currentTotal);

        for (let i = COUNTDOWN; i >= 1; i--) {
          setTimeout(() => {
            setCountdown(i);
          }, (COUNTDOWN - i) * 1000);
        }

        if (pickNum === secondToLastPick) {
          setTimeout(() => {
            setCountdown(null);
            const firstPickTeam = weightedRandomPick(currentRemaining);
            let secondPickTeam: Team;
            do {
              secondPickTeam = weightedRandomPick(currentRemaining);
            } while (secondPickTeam.name === firstPickTeam.name);

            setCurrent(null);
            setShowCurrent(true);

            setTimeout(() => {
              setDrafted(prev => [
                { ...secondPickTeam, pick: lastPick },
                { ...firstPickTeam, pick: secondToLastPick },
                ...prev
              ]);
              remainingTeams = remainingTeams.filter(t => t.name !== firstPickTeam.name && t.name !== secondPickTeam.name);

              const updatedOdds = calculateLotteryOdds(remainingTeams);
              const updatedTotal = remainingTeams.reduce((sum, team) => sum + team.standing, 0);
              setLotteryOdds(updatedOdds);
              setTotalDrawings(updatedTotal);
            }, 2000);

          }, COUNTDOWN * 1000);
          return;
        }
        setTimeout(() => {
          setCountdown(null);
          const selectedTeam = weightedRandomPick(currentRemaining);

          setCurrent(selectedTeam);
          setShowCurrent(true);

          setTimeout(() => {
            setDrafted(prev => [{ ...selectedTeam, pick: pickNum }, ...prev]);
            setShowCurrent(false);
            remainingTeams = remainingTeams.filter(t => t.name !== selectedTeam.name);

            const updatedOdds = calculateLotteryOdds(remainingTeams);
            const updatedTotal = remainingTeams.reduce((sum, team) => sum + team.standing, 0);
            setLotteryOdds(updatedOdds);
            setTotalDrawings(updatedTotal);
          }, 2000);

        }, COUNTDOWN * 1000);

      }, delay);
      delay += (COUNTDOWN * 1000) + 3000;
    }

    setTimeout(() => {
      setIsDrafting(false);
      setLotteryOdds([]);
    }, delay + 2000);
  };

  const beginDraft = () => {
    if (!draftConfig || isViewer || isDrafting) return;
    if ((draftConfig.startDelayMinutes ?? 0) === 0) {
      startDraft();
      return;
    }
    setPreDraftCountdown((draftConfig.startDelayMinutes ?? 0) * 60);
  };

  useEffect(() => {
    if (preDraftCountdown === null) return;
    if (preDraftCountdown <= 0) {
      setPreDraftCountdown(null);
      startDraft();
      return;
    }
    const timer = window.setTimeout(() => {
      setPreDraftCountdown((value) => value === null ? null : Math.max(0, value - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [preDraftCountdown]);

  useEffect(() => {
    if (!draftConfig || isDrafting || drafted.length !== draftConfig.lotteryTeams || !identityTeam) return;

    const reservedSpots = draftConfig.totalTeams - draftConfig.lotteryTeams;
    const yourTeam = draftConfig.teams.find((team) => team.name === identityTeam);
    const yourPick = drafted.find((team) => team.name === identityTeam)?.pick;
    if (!yourTeam || !yourPick) return;

    const expectedPick = reservedSpots + Math.max(1, Math.round((yourTeam.standing / (draftConfig.lotteryTeams + 1)) * draftConfig.lotteryTeams));
    const receiptKey = JSON.stringify({ draftName: draftConfig.draftName, identityTeam, drafted });
    if (yourPick < expectedPick && lastLuckyReceipt.current !== receiptKey) {
      lastLuckyReceipt.current = receiptKey;
      setVictoryTrigger((trigger) => trigger + 1);
    }
  }, [draftConfig, drafted, identityTeam, isDrafting]);

  // Show error if WebSocket connection failed for viewers
  if (isViewer && wsError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 flex items-center justify-center">
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700 text-center max-w-md">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold mb-2">Unable to Join Draft</h2>
          <p className="text-slate-400 mb-6">{wsError}</p>
          <a
            href="/"
            className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold"
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }

  // Show loading for viewers waiting for state
  if (isViewer && !draftConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 flex items-center justify-center">
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700 text-center">
          <div className="text-6xl mb-4 animate-pulse">🎲</div>
          <h2 className="text-2xl font-bold mb-2">Joining Draft...</h2>
          <p className="text-slate-400">Waiting for host to start the draft</p>
          <p className="text-sm text-slate-500 mt-4">Room Code: {code}</p>
        </div>
      </div>
    );
  }

  if (page === 'setup' && !isViewer) {
    return <DraftSetup onStartDraft={handleStartDraft} />;
  }

  if (!draftConfig) {
    return <DraftSetup onStartDraft={handleStartDraft} />;
  }

  const { totalTeams, lotteryTeams, draftName, reservedNames } = draftConfig;
  const reservedSpots = totalTeams - lotteryTeams;

  const reservedTeams: DraftedTeam[] = Array.from({ length: reservedSpots }, (_, index) => ({
    name: reservedNames[index] || `Reserved spot ${index + 1}`,
    icon: '👤',
    color: '#64748b',
    pick: index + 1,
    standing: 0,
  }));

  const allDraftedWithReserved = [
    ...drafted,
    ...reservedTeams
  ].sort((a, b) => b.pick - a.pick);

  const itemsPerPage = 6;
  const maxIndex = Math.max(0, Math.ceil(allDraftedWithReserved.length / itemsPerPage) - 1);
  const visibleItems = allDraftedWithReserved.slice(
    carouselIndex * itemsPerPage,
    (carouselIndex + 1) * itemsPerPage
  );
  const completedBoardItems = [...allDraftedWithReserved].sort((a, b) => a.pick - b.pick);
  const isDraftComplete = !isDrafting && drafted.length === lotteryTeams;
  const yourTeam = draftConfig.teams.find((team) => team.name === identityTeam);
  const yourPick = drafted.find((team) => team.name === identityTeam)?.pick;
  const expectedPick = yourTeam ? reservedSpots + Math.max(1, Math.round((yourTeam.standing / (lotteryTeams + 1)) * lotteryTeams)) : null;
  const receiptLabel = yourPick && expectedPick
    ? yourPick < expectedPick ? 'LUCKY' : yourPick > expectedPick ? 'UNLUCKY' : 'ON EXPECTATION'
    : null;
  const receiptCopy = receiptLabel === 'LUCKY'
    ? 'The lottery gods just winked at you. Frame this receipt.'
    : receiptLabel === 'UNLUCKY'
      ? 'That pick hurt. Rage responsibly, then start plotting the comeback.'
      : 'No miracles, no disasters. You drafted almost exactly on schedule.';

  if (!hasJoinedRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 flex items-center justify-center">
        <form
          className="w-full max-w-lg bg-slate-800/70 rounded-2xl p-6 sm:p-8 border border-slate-700 shadow-2xl"
          onSubmit={(event) => {
            event.preventDefault();
            const name = identityName.trim();
            if (!name || !identityTeam) return;
            sendIdentity({ name, teamName: identityTeam });
            setHasJoinedRoom(true);
          }}
        >
          <div className="text-5xl mb-4 text-center">🏈</div>
          <h2 className="text-3xl font-bold text-center mb-2">Claim your seat</h2>
          <p className="text-slate-300 text-center mb-6">Pick a name and manager identity. When the lottery lands, we’ll tell you exactly where you stand.</p>
          <label className="block text-sm text-slate-300 mb-2">Your name</label>
          <input value={identityName} onChange={(event) => setIdentityName(event.target.value)} maxLength={40} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 mb-4 text-white" placeholder="e.g. Giovanni" autoFocus />
          <label className="block text-sm text-slate-300 mb-2">Join as manager</label>
          <select value={identityTeam} onChange={(event) => setIdentityTeam(event.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 mb-6 text-white">
            <option value="">Choose a manager</option>
            {draftConfig.teams.map((team) => <option key={team.name} value={team.name}>{team.manager || team.name} · {team.name}</option>)}
          </select>
          <button type="submit" disabled={!identityName.trim() || !identityTeam} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 disabled:from-slate-600 disabled:to-slate-700 rounded-xl px-5 py-4 font-bold text-lg">Join the draft</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          <div className="flex-1">
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4">
                <Trophy className="hidden sm:block w-10 h-10 text-yellow-400" />
                <h1 className="text-2xl sm:text-5xl font-bold break-words max-w-full">{draftName}</h1>
                <Trophy className="hidden sm:block w-10 h-10 text-yellow-400" />
              </div>
              <h3 className="text-2xl text-slate-400 mt-2 font-bold">2026 Draft</h3>
              <p className="text-blue-300 text-lg">Weighted lottery based on standings!</p>
              <DraftMusic victoryTrigger={victoryTrigger} />

              {/* Room info for host */}
              {isHost && roomCode && (
                <div className="mt-4 w-full flex flex-col sm:flex-row sm:inline-flex items-stretch sm:items-center gap-3 sm:gap-4 bg-slate-800/70 rounded-xl px-4 sm:px-6 py-3 border border-slate-600">
                  <div className="flex items-center gap-2">
                    <Link className="w-4 h-4 text-blue-400" />
                    <span className="text-slate-400">Room:</span>
                    <span className="font-mono font-bold text-xl tracking-wider">{roomCode}</span>
                  </div>
                  <button
                    onClick={copyShareLink}
                    className="w-full sm:w-auto justify-center flex items-center gap-1 bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                  <div className="flex items-center gap-1 text-slate-400">
                    <Users className="w-4 h-4" />
                    <span>{viewerCount} watching</span>
                  </div>
                </div>
              )}

              {/* Viewer badge */}
              {isViewer && (
                <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2 bg-purple-900/50 rounded-xl px-4 py-2 border border-purple-600">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span className="text-purple-300">{identityName} · {yourTeam?.manager || yourTeam?.name || 'Joined live'}</span>
                  <span className="text-purple-200 text-sm">{viewerCount} watching</span>
                </div>
              )}

              {!isDrafting && !isViewer && (
                <button
                  onClick={goToSetup}
                  className="mt-2 text-slate-400 hover:text-white transition-colors flex items-center gap-2 mx-auto"
                >
                  <Settings className="w-4 h-4" />
                  Edit Draft Settings
                </button>
              )}
            </div>
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 min-h-[200px] flex flex-col items-center justify-center border border-slate-700">
              {!isDrafting && preDraftCountdown === null && drafted.length === 0 && !isViewer && (
                <button
                  onClick={beginDraft}
                  className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-12 py-6 rounded-xl text-2xl font-bold transition-all transform hover:scale-105 shadow-2xl flex items-center gap-4"
                >
                  <Play className="w-8 h-8 group-hover:translate-x-1 transition-transform" />
                  Begin Draft
                </button>
              )}

              {!isDrafting && drafted.length === 0 && isViewer && (
                <div className="text-center">
                  <div className="text-6xl mb-4">⏳</div>
                  <h2 className="text-2xl font-bold mb-2">Waiting for Host</h2>
                  <p className="text-slate-400">The draft will begin shortly...</p>
                </div>
              )}

              {preDraftCountdown !== null && (
                <div className="text-center">
                  <div className="text-6xl mb-4">⏱️</div>
                  <div className="text-5xl font-bold text-amber-300">
                    {Math.floor(preDraftCountdown / 60).toString().padStart(2, '0')}:{(preDraftCountdown % 60).toString().padStart(2, '0')}
                  </div>
                  <p className="text-xl text-slate-300 mt-4">The chaos begins soon. Get your bragging rights ready.</p>
                </div>
              )}

              {countdown !== null && preDraftCountdown === null && (
                <div className="text-center">
                  <div className="relative">
                    <div className="inset-0 flex items-center justify-center">
                      <span className="text-5xl font-bold text-white">{countdown}</span>
                    </div>
                  </div>
                  <p className="text-xl text-slate-300 mt-4">Drawing next pick...</p>
                </div>
              )}

              {current && showCurrent && (
                <div className="text-center animate-in fade-in zoom-in duration-500">
                  <div className="text-9xl mb-6 animate-bounce">{current.image ? <img src={current.image} alt="" className="h-24 w-24 object-cover rounded-full mx-auto" /> : current.icon}</div>
                  <h2 className="text-4xl font-bold mb-2">{current.name}</h2>
                  <p className="text-xl text-blue-300">Selected!</p>
                </div>
              )}

              {showCurrent && !current && (
                <div className="text-center animate-in fade-in zoom-in duration-500">
                  <div className="text-6xl mb-6">🎲🎲</div>
                  <h2 className="text-3xl font-bold mb-4">Double Selection!</h2>
                  <p className="text-xl text-blue-300">Picks #{totalTeams - 1} and #{totalTeams} selected simultaneously</p>
                </div>
              )}

              {!isDrafting && drafted.length === lotteryTeams && (
                <div className="text-center animate-in fade-in zoom-in duration-500">
                  <div className="text-6xl mb-6">🎉</div>
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Draft Complete!</h2>
                  {savingResult && <p className="text-blue-300 mb-4">Saving your results...</p>}
                  {resultSaveError && <p className="text-red-300 mb-4">{resultSaveError}</p>}
                  {savedResultUrl && (
                    <div className="mb-5 rounded-xl bg-slate-900/60 border border-green-700/60 p-3 max-w-xl mx-auto">
                      <p className="text-sm text-green-300 mb-2">Persistent results link</p>
                      <a href={savedResultUrl} className="block text-blue-300 underline truncate mb-3">
                        {window.location.origin}{savedResultUrl}
                      </a>
                      <button
                        onClick={copyResultLink}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-semibold"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copied' : 'Copy Results Link'}
                      </button>
                    </div>
                  )}
                  {!isViewer && (
                    <button
                      onClick={() => setShowRedraftWarning(true)}
                      className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white px-8 py-4 rounded-xl text-xl font-bold transition-all transform hover:scale-105"
                    >
                      Draft Again?
                    </button>
                  )}
                </div>
              )}
            </div>

            {!isDraftComplete && (drafted.length > 0 || isDrafting) && (
              <div className="mt-4 bg-slate-800/50 backdrop-blur rounded-2xl p-4 sm:p-6 border border-slate-700">
                <h3 className="text-xl sm:text-2xl font-bold mb-4 text-center">Draft Board</h3>

                <div className="relative">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                    {visibleItems.map((team, idx) => (
                      <div
                        key={`${team.pick}-${idx}`}
                        className={`${
                          team.standing === 0
                            ? 'bg-slate-700/30 border-2 border-dashed border-slate-600'
                            : 'bg-slate-700/50'
                        } rounded-lg p-4 flex flex-col items-center gap-2`}
                        style={{
                          borderLeft: team.standing !== 0 ? `4px solid ${team.color}` : undefined
                        }}
                      >
                        <div className={`text-4xl ${team.standing === 0 ? 'opacity-30' : ''}`}>
                          {team.image ? <img src={team.image} alt="" className="h-full w-full object-cover rounded-full" /> : team.icon}
                        </div>
                        <div className="text-center">
                          <div className={`font-semibold text-xs ${team.standing === 0 ? 'text-slate-400' : ''}`}>
                            {team.name}
                          </div>
                          <div className="text-xs text-slate-400">Pick #{team.pick}</div>
                        </div>
                        <div className={`text-2xl font-bold ${team.standing === 0 ? 'text-slate-600' : 'text-slate-500'}`}>
                          {team.pick}
                        </div>
                      </div>
                    ))}
                  </div>

                  {maxIndex > 0 && (
                    <div className="flex justify-center items-center gap-4 mt-4">
                      <button
                        onClick={() => setCarouselIndex(Math.max(0, carouselIndex - 1))}
                        disabled={carouselIndex === 0}
                        className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>

                      <div className="flex gap-2">
                        {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCarouselIndex(idx)}
                            className={`w-2 h-2 rounded-full transition-all ${
                              idx === carouselIndex ? 'bg-blue-400 w-6' : 'bg-slate-600'
                            }`}
                          />
                        ))}
                      </div>

                      <button
                        onClick={() => setCarouselIndex(Math.min(maxIndex, carouselIndex + 1))}
                        disabled={carouselIndex === maxIndex}
                        className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isDraftComplete && receiptLabel && (
              <div className="mt-4 rounded-2xl border border-amber-500/60 bg-gradient-to-r from-amber-950/70 to-slate-800/70 p-5 text-center">
                <p className="text-sm uppercase tracking-[0.25em] text-amber-300">Your draft receipt</p>
                <h3 className="mt-2 text-3xl font-black text-white">You are #{yourPick}</h3>
                <p className="mt-2 text-xl font-bold text-amber-200">{receiptLabel}</p>
                <p className="mt-2 text-slate-300">{receiptCopy}</p>
              </div>
            )}

            {isDraftComplete && (
              <div className="mt-4 bg-slate-800/50 backdrop-blur rounded-2xl p-4 sm:p-6 border border-slate-700">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h3 className="text-xl sm:text-2xl font-bold">Final Draft Board</h3>
                  <span className="text-sm text-green-300">{completedBoardItems.length} picks</span>
                </div>

                <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                  {completedBoardItems.map((team) => (
                    <div
                      key={`completed-grid-${team.pick}`}
                      className={`${team.standing === 0 ? 'bg-slate-700/30 border-2 border-dashed border-slate-600' : 'bg-slate-700/50'} rounded-lg p-4 flex flex-col items-center gap-2`}
                      style={{ borderLeft: team.standing !== 0 ? `4px solid ${team.color}` : undefined }}
                    >
                      <div className={`text-4xl ${team.standing === 0 ? 'opacity-30' : ''}`}>{team.image ? <img src={team.image} alt="" className="h-full w-full object-cover rounded-full" /> : team.icon}</div>
                      <div className="text-center min-w-0 w-full">
                        <div className={`font-semibold text-sm truncate ${team.standing === 0 ? 'text-slate-400' : ''}`} title={team.name}>
                          {team.name}
                        </div>
                        <div className="text-xs text-slate-400">Pick #{team.pick}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="sm:hidden space-y-2">
                  {completedBoardItems.map((team) => (
                    <div
                      key={`completed-list-${team.pick}`}
                      className={`${team.standing === 0 ? 'bg-slate-700/30 border-dashed' : 'bg-slate-700/50'} border border-slate-600 rounded-lg px-3 py-2 flex items-center gap-3`}
                      style={{ borderLeft: team.standing !== 0 ? `4px solid ${team.color}` : undefined }}
                    >
                      <div className="w-10 text-center text-lg font-bold text-slate-400">{team.pick}</div>
                      <div className={`text-2xl ${team.standing === 0 ? 'opacity-40' : ''}`}>{team.image ? <img src={team.image} alt="" className="h-full w-full object-cover rounded-full" /> : team.icon}</div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">{team.name}</div>
                        <div className="text-xs text-slate-400">Draft position {team.pick}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-full lg:w-80 max-h-none lg:max-h-dvh overflow-visible lg:overflow-y-scroll">
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 sm:p-6 border border-slate-700 lg:sticky lg:top-8">
              <h3 className="text-2xl font-bold mb-4 text-center">
                Lottery Odds
                <span className="text-sm text-slate-400 block mt-1">
                  ({totalDrawings} total drawings)
                </span>
              </h3>
              <div className="space-y-3">
                {lotteryOdds.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-700/50 rounded-lg p-3 flex items-center gap-2"
                    style={{ borderLeft: `4px solid ${item.team.color}` }}
                  >
                    <div className="text-3xl">{item.team.image ? <img src={item.team.image} alt="" className="h-10 w-10 object-cover rounded-full" /> : item.team.icon}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{item.team.name} ({standingToString(item.team.standing)})</div>
                      <div className="text-xs text-blue-300 font-semibold mt-1">
                        {drawingsToString(item.drawings)} • {item.odds.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showRedraftWarning && (
        <div className="fixed inset-0 z-50 bg-black/70 p-4 flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-amber-600/70 p-5 sm:p-6 shadow-2xl">
            <h2 className="text-xl sm:text-2xl font-bold mb-3">Replace the saved results?</h2>
            <p className="text-slate-300 mb-6">
              Starting a redraft will keep this share URL, but completing the redraft will overwrite the previous results at that link.
            </p>
            <div className="flex flex-col sm:flex-row-reverse gap-3">
              <button
                onClick={() => {
                  setShowRedraftWarning(false);
                  startDraft();
                }}
                className="bg-amber-600 hover:bg-amber-500 px-4 py-3 rounded-xl font-bold"
              >
                Start Redraft
              </button>
              <button
                onClick={() => setShowRedraftWarning(false)}
                className="bg-slate-700 hover:bg-slate-600 px-4 py-3 rounded-xl font-semibold"
              >
                Keep Current Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
