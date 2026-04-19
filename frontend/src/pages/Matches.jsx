import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { matchesAPI, teamsAPI, isReadOnly } from '../api';

const STATUS_COLORS = {
  upcoming: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function Matches() {
  const readOnly = isReadOnly;
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchParams] = useSearchParams();
  const filterTeamId = searchParams.get('team_id');

  const defaultForm = { team_id: filterTeamId || '', match_number: '', opponent: '', match_date: '', venue: '' };
  const [form, setForm] = useState(defaultForm);

  const load = () =>
    Promise.all([matchesAPI.getAll(filterTeamId), teamsAPI.getAll()])
      .then(([m, t]) => { setMatches(m); setTeams(t); setLoading(false); });

  useEffect(() => { load(); }, [filterTeamId]);

  const submit = async (e) => {
    e.preventDefault();
    await matchesAPI.create(form);
    setForm(defaultForm); setShowForm(false);
    load();
  };

  const deleteMatch = async (id) => {
    if (!window.confirm('Delete this match and all its data?')) return;
    await matchesAPI.delete(id);
    load();
  };

  if (loading) return <div className="flex justify-center py-20 text-emerald-700/70">Loading...</div>;

  return (
    <div className="space-y-6">
      <section className="section-panel p-6 fade-in">
        <div className="section-header">
          <div>
            <h1 className="section-title">Matches</h1>
            <p className="section-note">
              Plan fixtures, track attendance, and keep every match organized in a more visual workflow.
            </p>
            {readOnly && (
              <p className="mt-2 text-sm text-rose-700">Read-only mode is active. Creating and deleting matches is disabled.</p>
            )}
          </div>
          {!readOnly && (
            <button onClick={() => setShowForm(true)} disabled={teams.length === 0}
              className="btn-primary px-5 py-3 text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
              + New Match
            </button>
          )}
        </div>
      </section>

      {teams.length === 0 && (
        <div className="panel-soft p-5 rounded-[28px]">
          <p className="text-sm text-amber-900">
            ⚠️ You need to <Link to="/teams" className="underline font-semibold">create a team</Link> before adding matches.
          </p>
        </div>
      )}

      {showForm && !readOnly && (
        <div className="form-card p-6 fade-in">
          <div className="section-header mb-5">
            <div>
              <h2 className="section-title text-lg">New Match</h2>
              <p className="section-note">Add a fixture and assign it to your team instantly.</p>
            </div>
            <button type="button" onClick={() => setShowForm(false)} className="btn-muted px-4 py-2 text-sm">
              Cancel
            </button>
          </div>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm text-emerald-900/80 mb-2">Team *</label>
              <select value={form.team_id} onChange={e => setForm(f => ({ ...f, team_id: e.target.value }))} required
                className="w-full field text-sm">
                <option value="">Select team...</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-emerald-900/80 mb-2">Match Number *</label>
              <input type="number" value={form.match_number} onChange={e => setForm(f => ({ ...f, match_number: e.target.value }))} required min="1"
                className="w-full field text-sm"
                placeholder="e.g. 1" />
            </div>
            <div>
              <label className="block text-sm text-emerald-900/80 mb-2">Opponent *</label>
              <input value={form.opponent} onChange={e => setForm(f => ({ ...f, opponent: e.target.value }))} required
                className="w-full field text-sm"
                placeholder="e.g. Team Beta" />
            </div>
            <div>
              <label className="block text-sm text-emerald-900/80 mb-2">Match Date *</label>
              <input type="date" value={form.match_date} onChange={e => setForm(f => ({ ...f, match_date: e.target.value }))} required
                className="w-full field text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-emerald-900/80 mb-2">Venue</label>
              <input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
                className="w-full field text-sm"
                placeholder="e.g. City Cricket Ground" />
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-3 justify-end">
              <button type="submit" className="btn-primary px-6 py-3 text-sm">Create Match</button>
            </div>
          </form>
        </div>
      )}

      {matches.length === 0 ? (
        <div className="panel card-hero text-center py-16 text-emerald-900/75">
          <p className="text-5xl mb-4">🏆</p>
          <p className="text-lg font-semibold">No matches yet.</p>
          <p className="mt-2 text-sm text-emerald-900/70">Create a fixture to start tracking attendance, expenses, and results.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map(match => (
            <div key={match.id} className="panel card-elevated overflow-hidden transition-all duration-200 hover:-translate-y-1">
              <div className="p-6 lg:p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link to={`/matches/${match.id}`} className="font-semibold text-emerald-950 text-xl hover:text-emerald-700 hover:underline">
                      Match #{match.match_number} — vs {match.opponent}
                    </Link>
                    <span className={`badge ${STATUS_COLORS[match.status]}`}>{match.status}</span>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3 text-sm text-emerald-900/70">
                    <span>👥 {match.team_name}</span>
                    <span>📅 {new Date(match.match_date).toLocaleDateString()}</span>
                    {match.venue && <span>📍 {match.venue}</span>}
                    <span>✅ <strong className="text-emerald-700">{match.attended_count}</strong> attended</span>
                    <span>❌ <strong className="text-rose-600">{match.not_attended_count}</strong> absent</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Link to={`/matches/${match.id}`} className="btn-muted bg-white border border-emerald-200 text-emerald-700 px-4 py-2 text-sm hover:bg-emerald-50">
                    Open
                  </Link>
                  {!readOnly && (
                    <button onClick={() => deleteMatch(match.id)} className="btn-muted text-rose-600 border-rose-200 hover:bg-rose-50 px-4 py-2 text-sm">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
