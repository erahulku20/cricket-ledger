import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { teamsAPI, backupAPI, isReadOnly } from '../api';

export default function Teams() {
  const readOnly = isReadOnly;
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

  const load = () => teamsAPI.getAll().then(d => { setTeams(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editId) {
        await teamsAPI.update(editId, { name });
      } else {
        await teamsAPI.create({ name });
      }
      setName(''); setEditId(null); setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    }
  };

  const deleteTeam = async (id) => {
    if (!window.confirm('Delete this team and all its data?')) return;
    await teamsAPI.delete(id);
    load();
  };

  const exportBackup = async () => {
    try {
      const blob = await backupAPI.download();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cricket-backup-${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Backup export failed', err);
      alert('Unable to export backup. Please try again.');
    }
  };

  const startEdit = (team) => { setEditId(team.id); setName(team.name); setShowForm(true); };
  const cancelForm = () => { setShowForm(false); setName(''); setEditId(null); setError(''); };

  if (loading) return <div className="flex justify-center py-20 text-emerald-700/70">Loading...</div>;

  return (
    <div className="space-y-6">
      <section className="section-panel p-6 fade-in">
        <div className="section-header">
          <div>
            <h1 className="section-title">Teams</h1>
            <p className="section-note">
              Create and manage squads with a clearer team overview and activity quick links.
            </p>
            {readOnly && (
              <p className="mt-2 text-sm text-rose-700">Read-only mode is active. Create, edit, and delete actions are disabled.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {!readOnly && (
              <button onClick={() => setShowForm(true)} className="btn-primary px-5 py-3 text-sm shadow-lg">
                + New Team
              </button>
            )}
            <button onClick={exportBackup} className="btn-muted px-5 py-3 text-sm shadow-lg">
              Export Backup
            </button>
          </div>
        </div>
      </section>

      {showForm && !readOnly && (
        <div className="form-card p-6 fade-in">
          <div className="section-header mb-5">
            <div>
              <h2 className="section-title text-lg">{editId ? 'Edit Team' : 'New Team'}</h2>
              <p className="section-note">Add a squad and start assigning players to it.</p>
            </div>
            <button type="button" onClick={cancelForm} className="btn-muted px-4 py-2 text-sm">
              Cancel
            </button>
          </div>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <label className="block text-sm text-emerald-900/80 mb-2">Team Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full field text-sm"
                placeholder="e.g. Team Alpha"
                autoFocus
                required
              />
              {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
            </div>
            <button type="submit" className="btn-primary px-6 py-3 text-sm">
              {editId ? 'Update Team' : 'Create Team'}
            </button>
          </form>
        </div>
      )}

      {teams.length === 0 ? (
        <div className="panel card-hero text-center py-16 text-emerald-800/70">
          <p className="text-5xl mb-4">👥</p>
          <p className="text-lg font-semibold">No teams yet.</p>
          <p className="mt-2 text-sm text-emerald-900/70">Start by adding your first squad and assigning players.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teams.map(team => (
            <div key={team.id} className="panel card-elevated overflow-hidden transition-all duration-200 hover:-translate-y-1">
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-emerald-700/70 mb-2">Team</p>
                    <h3 className="font-bold text-emerald-950 text-xl">{team.name}</h3>
                    <p className="mt-2 text-sm text-emerald-900/70">
                      {team.player_count} player{team.player_count !== 1 ? 's' : ''}
                    </p>
                    <p className="mt-2 text-xs text-emerald-900/50">Created {new Date(team.created_at).toLocaleDateString()}</p>
                  </div>
                  {!readOnly && (
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(team)} className="text-emerald-700 hover:text-emerald-900 text-lg p-2 rounded-full bg-emerald-50 transition">
                        ✏️
                      </button>
                      <button onClick={() => deleteTeam(team.id)} className="text-rose-500 hover:text-rose-700 text-lg p-2 rounded-full bg-rose-50 transition">
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="border-t border-emerald-100 bg-emerald-50/70 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link to={`/teams/${team.id}/dashboard`} className="text-sm text-emerald-700 font-medium hover:text-emerald-900 hover:underline">
                    📊 Dashboard
                  </Link>
                  <Link to={`/teams/${team.id}`} className="text-sm text-emerald-700 font-medium hover:text-emerald-900 hover:underline">
                    👥 Manage Players
                  </Link>
                </div>
                <Link to={`/matches?team_id=${team.id}`} className="text-sm text-emerald-800 font-medium hover:text-emerald-900 hover:underline">
                  View Matches
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
