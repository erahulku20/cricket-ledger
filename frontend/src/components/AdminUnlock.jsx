import { useState } from 'react';
import { useAuth } from '../auth';

export default function AdminUnlock() {
  const { unlockAdminWrite, isAdmin } = useAuth();
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(!isAdmin);

  const handleUnlock = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await unlockAdminWrite(secret);
      setSecret('');
      setShowModal(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to unlock admin access');
    } finally {
      setLoading(false);
    }
  };

  if (isAdmin) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="btn-primary px-4 py-2 text-sm"
      >
        🔓 Admin Write Access
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="panel-soft max-w-md p-8 rounded-[32px] shadow-xl">
            <h2 className="title-xl mb-4">Unlock Admin Write Access</h2>
            <p className="text-sm text-slate-600 mb-6">
              Enter the admin secret to enable create, edit, and delete operations.
            </p>

            <form onSubmit={handleUnlock} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-700 mb-2">Admin Secret</label>
                <input
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  className="w-full field text-sm"
                  placeholder="Enter secret"
                  required
                  autoFocus
                />
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setError('');
                    setSecret('');
                  }}
                  className="btn-muted flex-1 py-3 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !secret.trim()}
                  className="btn-primary flex-1 py-3 text-sm disabled:opacity-50"
                >
                  {loading ? 'Unlocking...' : 'Unlock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
