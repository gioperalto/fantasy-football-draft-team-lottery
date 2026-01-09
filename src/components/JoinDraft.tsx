import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Users, ArrowRight } from 'lucide-react';

export default function JoinDraft() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (cleanCode.length !== 6) {
      setError('Please enter a valid 6-character code');
      return;
    }

    navigate(`/draft/${cleanCode}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="w-10 h-10 text-yellow-400" />
            <h1 className="text-4xl font-bold">Join Draft</h1>
            <Trophy className="w-10 h-10 text-yellow-400" />
          </div>
          <p className="text-blue-300 text-lg">Enter the code to watch a live draft</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700">
          <div className="flex items-center justify-center gap-2 mb-6 text-slate-400">
            <Users className="w-5 h-5" />
            <span>Spectator Mode</span>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Draft Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder="Enter 6-character code"
              maxLength={6}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-4 text-white text-2xl text-center tracking-widest placeholder-slate-500 focus:outline-none focus:border-blue-500 uppercase"
              autoFocus
            />

            {error && (
              <p className="text-red-400 text-sm mt-2 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={code.length < 6}
              className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl text-xl font-bold transition-all flex items-center justify-center gap-3"
            >
              Join Draft
              <ArrowRight className="w-6 h-6" />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700 text-center">
            <a
              href="/"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Or create your own draft
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
