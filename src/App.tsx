import { useState } from 'react';
import { Play, Trophy } from 'lucide-react';
import './App.css';

interface Team {
  name: string;
  icon: string;
  color: string;
  standing: number;
}

const teams: Team[] = [
  { name: 'Team 1', icon: '🎩', color: '#E31837', standing: 10 },
  { name: 'Team 2', icon: '🍻', color: '#00338D', standing: 4 },
  { name: 'Team 3', icon: '🚂', color: '#AA0000', standing: 7 },
  { name: 'Team 4', icon: '🏈', color: '#004C54', standing: 5},
  { name: 'Team 5', icon: '🐭', color: '#041E42', standing: 2 },
  { name: 'Team 6', icon: '🏆', color: '#008E97', standing: 1 },
  { name: 'Team 7', icon: '⭐', color: '#0076B6', standing: 3 },
  { name: 'Team 8', icon: '💰', color: '#241773', standing: 11 },
  { name: 'Team 9', icon: '🐱', color: '#203731', standing: 8 },
  { name: 'Team 10', icon: '💵', color: '#FB4F14', standing: 6 },
];

export default function NFLDraftAnimator() {
  const [drafted, setDrafted] = useState<(Team & { pick: number })[]>([]);
  const [current, setCurrent] = useState<Team | null>(null);
  const [isDrafting, setIsDrafting] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);

  const startDraft = () => {
    setDrafted([]);
    setCurrent(null);
    setIsDrafting(true);
    setShowCurrent(false);

    // Shuffle teams for picks 3-12
    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    const draftOrder = shuffled.slice(0, 10);

    // Draft in reverse order (12 to 3, then 2, then 1)
    let delay = 0;
    for (let i = 9; i >= 0; i--) {
      setTimeout(() => {
        const pick = i + 3;
        const team = draftOrder[i];
        
        setCurrent(team);
        setShowCurrent(true);

        setTimeout(() => {
          setDrafted(prev => [...prev, { ...team, pick }]);
          setShowCurrent(false);
        }, 1500);

      }, delay);
      delay += 2000;
    }
    setTimeout(() => {
      setIsDrafting(false);
    }, 17000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="w-10 h-10 text-yellow-400" />
            <h1 className="text-5xl font-bold">NFL Fantasy Draft</h1>
            <Trophy className="w-10 h-10 text-yellow-400" />
          </div>
          <p className="text-blue-300 text-lg">Watch the draft unfold in real-time!</p>
        </div>

        <div className="flex gap-8">
          {/* Main draft area */}
          <div className="flex-1">
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-12 min-h-[500px] flex flex-col items-center justify-center border border-slate-700">
              {!isDrafting && drafted.length === 0 && (
                <button
                  onClick={startDraft}
                  className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-12 py-6 rounded-xl text-2xl font-bold transition-all transform hover:scale-105 shadow-2xl flex items-center gap-4"
                >
                  <Play className="w-8 h-8 group-hover:translate-x-1 transition-transform" />
                  Start Draft
                </button>
              )}

              {current && showCurrent && (
                <div className="text-center animate-in fade-in zoom-in duration-500">
                  <div className="text-9xl mb-6 animate-bounce">{current.icon}</div>
                  <h2 className="text-4xl font-bold mb-2">{current.name}</h2>
                </div>
              )}

              {!isDrafting && drafted.length === 10 && (
                <div className="text-center animate-in fade-in zoom-in duration-500">
                  <div className="text-6xl mb-6">🎉</div>
                  <h2 className="text-4xl font-bold mb-4">Draft Complete!</h2>
                  <button
                    onClick={startDraft}
                    className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white px-8 py-4 rounded-xl text-xl font-bold transition-all transform hover:scale-105"
                  >
                    Draft Again
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Draft board */}
          <div className="w-80">
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700 sticky top-8">
              <h3 className="text-2xl font-bold mb-6 text-center">Draft Board</h3>
              <div className="space-y-3">
                
                  {drafted.length === 0 && (
                    <div className="text-center text-slate-500 py-8">
                      Awaiting draft...
                    </div>
                  )}

                  {drafted.map((team, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-700/50 rounded-lg p-4 flex items-center gap-4 animate-in slide-in-from-right duration-500"
                    style={{ 
                      animationDelay: `${idx * 50}ms`,
                      borderLeft: `4px solid ${team.color}`
                    }}
                  >
                    <div className="text-4xl">{team.icon}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{team.name}</div>
                      <div className="text-xs text-slate-400">Pick #{team.pick}</div>
                    </div>
                    <div className="text-2xl font-bold text-slate-500">
                      {team.pick}
                    </div>
                  </div>
                ))}

                {/* Reserved Pick 2 */}
                <div className="bg-slate-700/30 rounded-lg p-4 flex items-center gap-4 border-2 border-dashed border-slate-600">
                  <div className="text-4xl opacity-30">👤</div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-slate-400">Reserved</div>
                    <div className="text-xs text-slate-500">Pick #2</div>
                  </div>
                  <div className="text-2xl font-bold text-slate-600">2</div>
                </div>

                {/* Reserved Pick 1 */}
                <div className="bg-slate-700/30 rounded-lg p-4 flex items-center gap-4 border-2 border-dashed border-slate-600">
                  <div className="text-4xl opacity-30">👤</div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-slate-400">Reserved</div>
                    <div className="text-xs text-slate-500">Pick #1</div>
                  </div>
                  <div className="text-2xl font-bold text-slate-600">1</div>
                </div>
               
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}