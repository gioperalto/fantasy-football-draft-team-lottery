import { useState, useEffect } from 'react';
import { Trophy, Plus, Minus, ArrowRight, Eye, X } from 'lucide-react';
import type { Team } from '../interfaces/Team';

const EMOJI_OPTIONS = [
  '🎩', '🍻', '🚂', '🏈', '🏭', '🏆', '⭐', '💰', '🐱', '💵',
  '🦁', '🐻', '🦅', '🐯', '🐺', '🦊', '🎯', '🔥', '⚡', '🌟',
  '👑', '🎪', '🎭', '🎨', '🎸', '🎮', '🃏', '🎲', '💎', '🚀'
];

const COLOR_OPTIONS = [
  '#E31837', '#00338D', '#AA0000', '#004C54', '#041E42',
  '#008E97', '#0076B6', '#241773', '#203731', '#FB4F14',
  '#9F8958', '#D50A0A', '#006778', '#0B162A', '#FFB612'
];

interface DraftSetupProps {
  onStartDraft: (teams: Team[], totalTeams: number, lotteryTeams: number, draftName: string, pickCountdown: number) => void;
}

export default function DraftSetup({ onStartDraft }: DraftSetupProps) {
  const [draftName, setDraftName] = useState('My Fantasy Draft');
  const [totalTeams, setTotalTeams] = useState(12);
  const [lotteryTeams, setLotteryTeams] = useState(10);
  const [pickCountdown, setPickCountdown] = useState(15);
  const [teams, setTeams] = useState<Team[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const currentCount = teams.length;
    if (lotteryTeams > currentCount) {
      const newTeams = [...teams];
      for (let i = currentCount; i < lotteryTeams; i++) {
        newTeams.push({
          name: `Team ${i + 1}`,
          icon: EMOJI_OPTIONS[i % EMOJI_OPTIONS.length],
          color: COLOR_OPTIONS[i % COLOR_OPTIONS.length],
          standing: i + 1
        });
      }
      setTeams(newTeams);
    } else if (lotteryTeams < currentCount) {
      setTeams(teams.slice(0, lotteryTeams));
    }
  }, [lotteryTeams]);

  const updateTeam = (index: number, field: keyof Team, value: string | number) => {
    const updated = [...teams];
    updated[index] = { ...updated[index], [field]: value };
    setTeams(updated);
  };

  const reservedSpots = totalTeams - lotteryTeams;

  const isValid = teams.every(t => t.name.trim() !== '') &&
    teams.every(t => t.standing >= 1) &&
    draftName.trim() !== '';

  const handleStartDraft = () => {
    if (isValid) {
      onStartDraft(teams, totalTeams, lotteryTeams, draftName, pickCountdown);
    }
  };

  const standingToString = (place: number): string => {
    if (place === 1) return '1st';
    if (place === 2) return '2nd';
    if (place === 3) return '3rd';
    return `${place}th`;
  };

  const sortedTeamsForPreview = [...teams].sort((a, b) => b.standing - a.standing);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="w-10 h-10 text-yellow-400" />
            <h1 className="text-5xl font-bold">Draft Setup</h1>
            <Trophy className="w-10 h-10 text-yellow-400" />
          </div>
          <p className="text-blue-300 text-lg">Configure your draft lottery</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700 mb-6">
          <h2 className="text-2xl font-bold mb-6">Draft Configuration</h2>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Draft Name
            </label>
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Enter draft name..."
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white text-lg placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Total Teams in Draft
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setTotalTeams(Math.max(lotteryTeams, totalTeams - 1))}
                  className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <span className="text-3xl font-bold w-16 text-center">{totalTeams}</span>
                <button
                  onClick={() => setTotalTeams(totalTeams + 1)}
                  className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Teams in Lottery
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setLotteryTeams(Math.max(2, lotteryTeams - 1))}
                  className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <span className="text-3xl font-bold w-16 text-center">{lotteryTeams}</span>
                <button
                  onClick={() => setLotteryTeams(Math.min(totalTeams, lotteryTeams + 1))}
                  className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Pick Countdown (seconds)
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPickCountdown(Math.max(5, pickCountdown - 5))}
                  className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <span className="text-3xl font-bold w-16 text-center">{pickCountdown}</span>
                <button
                  onClick={() => setPickCountdown(Math.min(60, pickCountdown + 5))}
                  className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {reservedSpots > 0 && (
            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
              <p className="text-blue-300">
                <strong>{reservedSpots} reserved spot{reservedSpots > 1 ? 's' : ''}</strong> (Pick{reservedSpots > 1 ? 's' : ''} 1{reservedSpots > 1 ? `-${reservedSpots}` : ''})
              </p>
              <p className="text-slate-400 text-sm mt-1">
                Lottery winners will be assigned picks {reservedSpots + 1} through {totalTeams}
              </p>
            </div>
          )}
        </div>

        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700 mb-6">
          <h2 className="text-2xl font-bold mb-6">Lottery Teams</h2>

          <div className="space-y-4">
            {teams.map((team, index) => (
              <div
                key={index}
                className="bg-slate-700/50 rounded-lg p-4 border border-slate-600"
                style={{ borderLeftColor: team.color, borderLeftWidth: '4px' }}
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-4">
                    <label className="block text-xs text-slate-400 mb-1">Team Name</label>
                    <input
                      type="text"
                      value={team.name}
                      onChange={(e) => updateTeam(index, 'name', e.target.value)}
                      placeholder="Enter team name..."
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Standing</label>
                    <input
                      type="number"
                      min={1}
                      value={team.standing}
                      onChange={(e) => updateTeam(index, 'standing', parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="col-span-3">
                    <label className="block text-xs text-slate-400 mb-1">Icon</label>
                    <div className="flex flex-wrap gap-1">
                      {EMOJI_OPTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => updateTeam(index, 'icon', emoji)}
                          className={`text-xl p-1 rounded ${team.icon === emoji ? 'bg-blue-600' : 'hover:bg-slate-600'}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-3">
                    <label className="block text-xs text-slate-400 mb-1">Color</label>
                    <div className="flex flex-wrap gap-1">
                      {COLOR_OPTIONS.map((color) => (
                        <button
                          key={color}
                          onClick={() => updateTeam(index, 'color', color)}
                          className={`w-6 h-6 rounded ${team.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-700' : ''}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={() => setShowPreview(true)}
            disabled={!isValid}
            className="group bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white px-8 py-6 rounded-xl text-xl font-bold transition-all transform hover:scale-105 disabled:hover:scale-100 shadow-xl flex items-center gap-3"
          >
            <Eye className="w-6 h-6" />
            Preview Draft
          </button>
          <button
            onClick={handleStartDraft}
            disabled={!isValid}
            className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white px-12 py-6 rounded-xl text-2xl font-bold transition-all transform hover:scale-105 disabled:hover:scale-100 shadow-2xl flex items-center gap-4"
          >
            Proceed to Draft
            <ArrowRight className="w-8 h-8 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {!isValid && (
          <p className="text-center text-red-400 mt-4">
            {draftName.trim() === '' ? 'Please enter a draft name' : 'Please fill in all team names'}
          </p>
        )}
      </div>

      {showPreview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Draft Preview</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <Trophy className="w-8 h-8 text-yellow-400" />
                  <h1 className="text-4xl font-bold">{draftName}</h1>
                  <Trophy className="w-8 h-8 text-yellow-400" />
                </div>
                <h3 className="text-xl text-slate-400 font-bold">2026 Draft</h3>
                <p className="text-blue-300">Weighted lottery based on standings!</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-xl font-bold mb-4 text-center">Draft Board Preview</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: totalTeams }).map((_, idx) => {
                      const pickNum = idx + 1;
                      const isReserved = pickNum <= reservedSpots;
                      return (
                        <div
                          key={idx}
                          className={`${
                            isReserved
                              ? 'bg-slate-700/30 border-2 border-dashed border-slate-600'
                              : 'bg-slate-700/50'
                          } rounded-lg p-3 flex flex-col items-center gap-1`}
                        >
                          <div className={`text-2xl ${isReserved ? 'opacity-30' : ''}`}>
                            {isReserved ? '👤' : '?'}
                          </div>
                          <div className="text-center">
                            <div className={`font-semibold text-xs ${isReserved ? 'text-slate-400' : 'text-slate-300'}`}>
                              {isReserved ? 'Reserved' : 'TBD'}
                            </div>
                            <div className="text-xs text-slate-400">Pick #{pickNum}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-xl font-bold mb-4 text-center">
                    Lottery Odds Preview
                    <span className="text-sm text-slate-400 block mt-1">
                      ({teams.reduce((sum, t) => sum + t.standing, 0)} total drawings)
                    </span>
                  </h3>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {sortedTeamsForPreview.map((team, idx) => {
                      const total = teams.reduce((sum, t) => sum + t.standing, 0);
                      const odds = (team.standing / total) * 100;
                      return (
                        <div
                          key={idx}
                          className="bg-slate-700/50 rounded-lg p-2 flex items-center gap-2"
                          style={{ borderLeft: `4px solid ${team.color}` }}
                        >
                          <div className="text-2xl">{team.icon}</div>
                          <div className="flex-1">
                            <div className="font-semibold text-sm">
                              {team.name || '(unnamed)'} ({standingToString(team.standing)})
                            </div>
                            <div className="text-xs text-blue-300 font-semibold">
                              {team.standing} drawing{team.standing !== 1 ? 's' : ''} • {odds.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-center gap-4">
                <button
                  onClick={() => setShowPreview(false)}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-3 rounded-xl font-bold transition-colors"
                >
                  Continue Editing
                </button>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    handleStartDraft();
                  }}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
                >
                  Proceed to Draft
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
