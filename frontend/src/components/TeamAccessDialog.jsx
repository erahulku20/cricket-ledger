import { useState } from 'react';
import { useAuth } from '../auth';
import { teamsAPI } from '../api';

export default function TeamAccessDialog() {
  const { hasTeamAccess, setTeamCode, isAdmin } = useAuth();
  const [showModal, setShowModal] = useState(!hasTeamAccess && !isAdmin);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAccess = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await teamsAPI.getOneByCode({ code });
      setTeamCode(code);
      setCode('');
      setShowModal(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid team access code');
    } finally {
      setLoading(false);
    }
  };

  if (hasTeamAccess || isAdmin) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="btn-muted px-4 py-2 text-sm"
      >
        🔑 Access Team
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="panel-soft max-w-md p-8 rounded-[32px] shadow-xl">
            <h2 className="title-xl mb-4">Enter Team Access Code</h2>
            <p className="text-sm text-slate-600 mb-6">
              Ask your admin for the team access code to view and manage your team's data.
            </p>

            <form onSubmit={handleAccess} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-700 mb-2">Access Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full field text-sm uppercase"
                  placeholder="e.g. ABC123"
                  required
                  autoFocus
                  maxLength="6"
                />
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setError('');
                    setCode('');
                  }}
                  className="btn-muted flex-1 py-3 text-sm"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  disabled={loading || !code.trim()}
                  className="btn-primary flex-1 py-3 text-sm disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
