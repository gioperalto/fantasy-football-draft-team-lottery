import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Trophy } from 'lucide-react';

interface ResultPick {
  name: string;
  icon: string;
  color: string;
  standing: number;
  pick: number;
}

interface DraftResultData {
  id: string;
  draftName: string;
  picks: ResultPick[];
  updatedAt: string;
}

export default function DraftResult() {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<DraftResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/results/${encodeURIComponent(id)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('This draft result could not be found.');
        return response.json() as Promise<DraftResultData>;
      })
      .then(setResult)
      .catch((fetchError: unknown) => {
        setError(fetchError instanceof Error ? fetchError.message : 'Unable to load this result.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <ResultShell><p className="text-center text-slate-300">Loading draft results...</p></ResultShell>;
  }

  if (error || !result) {
    return (
      <ResultShell>
        <div className="text-center">
          <p className="text-red-300 mb-6">{error || 'Draft result not found.'}</p>
          <Link to="/" className="inline-flex bg-blue-600 hover:bg-blue-500 px-5 py-3 rounded-xl font-bold">
            Create a Draft
          </Link>
        </div>
      </ResultShell>
    );
  }

  const sortedPicks = [...result.picks].sort((a, b) => a.pick - b.pick);

  return (
    <ResultShell>
      <div className="text-center mb-6">
        <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
        <p className="text-green-300 font-semibold mb-2">Draft Results</p>
        <h1 className="text-3xl sm:text-5xl font-bold break-words">{result.draftName}</h1>
        <p className="text-slate-400 mt-3">Last updated {new Date(result.updatedAt).toLocaleString()}</p>
      </div>

      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {sortedPicks.map((pick) => (
          <PickCard key={`grid-${pick.pick}`} pick={pick} />
        ))}
      </div>

      <div className="sm:hidden space-y-2">
        {sortedPicks.map((pick) => (
          <div
            key={`list-${pick.pick}`}
            className="bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-3 flex items-center gap-3"
            style={{ borderLeft: pick.standing !== 0 ? `4px solid ${pick.color}` : undefined }}
          >
            <span className="w-9 text-center font-bold text-slate-300">{pick.pick}</span>
            <span className="text-2xl">{pick.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold break-words">{pick.name}</span>
              <span className="block text-xs text-slate-400">Draft position {pick.pick}</span>
            </span>
          </div>
        ))}
      </div>

      <Link to="/" className="block text-center text-blue-300 hover:text-blue-200 mt-8">
        Create a new draft
      </Link>
    </ResultShell>
  );
}

function PickCard({ pick }: { pick: ResultPick }) {
  return (
    <div
      className="bg-slate-700/50 rounded-xl p-4 flex flex-col items-center gap-2 min-w-0"
      style={{ borderLeft: pick.standing !== 0 ? `4px solid ${pick.color}` : undefined }}
    >
      <div className="text-4xl">{pick.icon}</div>
      <div className="text-center min-w-0 w-full">
        <div className="font-semibold text-sm truncate" title={pick.name}>{pick.name}</div>
        <div className="text-xs text-slate-400">Pick #{pick.pick}</div>
      </div>
    </div>
  );
}

function ResultShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <section className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 sm:p-8 border border-slate-700">
          {children}
        </section>
      </div>
    </main>
  );
}
