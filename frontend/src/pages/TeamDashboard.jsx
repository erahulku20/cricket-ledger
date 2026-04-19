import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { teamsAPI, matchesAPI, playersAPI } from '../api';

function StatCard({ icon, label, value, color }) {
  return (
    <div className={`panel p-5 border-l-4 ${color} fade-in`}>
      <div className="flex items-center gap-3">
        <span className="text-3xl">{icon}</span>
        <div>
          <p className="text-sm text-emerald-900/70">{label}</p>
          <p className="text-2xl font-bold text-emerald-950">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function TeamDashboard() {
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      teamsAPI.getOne(id),
      matchesAPI.getAll(id),
      playersAPI.getAll(id)
    ]).then(([teamData, matchesData, playersData]) => {
      setTeam(teamData);
      setMatches(matchesData);
      setPlayers(playersData);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="flex justify-center py-20 text-emerald-700/70 text-lg">Loading...</div>;
  if (!team) return <div className="text-center py-20 text-red-600">Team not found</div>;

  const upcomingMatches = matches.filter(m => m.status === 'upcoming');
  const completedMatches = matches.filter(m => m.status === 'completed');
  const recentMatches = matches.slice(0, 5);

  const statusBadge = (status) => {
    const styles = { upcoming: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700' };
    return <span className={`status-pill ${styles[status] || ''}`}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      <section className="section-panel p-6 fade-in">
        <div className="section-header">
          <div>
            <p className="eyebrow">Team dashboard</p>
            <h1 className="section-title">{team.name} Overview</h1>
            <p className="section-note">
              Monitor your team's squad, fixtures, and performance from one dedicated control center.
            </p>
          </div>
          <div className="flex gap-3">
            <Link to={`/teams/${id}`} className="btn-muted">Manage Players</Link>
            <Link to={`/matches?team_id=${id}`} className="btn-primary">View Matches</Link>
          </div>
        </div>
      </section>

      <div className="summary-grid">
        <StatCard icon="🧑‍🤝‍🧑" label="Players" value={players.length} color="border-emerald-500" />
        <StatCard icon="🏆" label="Total Matches" value={matches.length} color="border-sky-500" />
        <StatCard icon="📅" label="Upcoming" value={upcomingMatches.length} color="border-amber-500" />
        <StatCard icon="✅" label="Completed" value={completedMatches.length} color="border-violet-500" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.9fr] gap-5">
        <div className="panel p-5 rounded-[28px] overflow-hidden fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-emerald-50/60 px-5 py-4 border-b border-emerald-100">
            <div>
              <h2 className="font-semibold text-emerald-900">Recent Matches</h2>
              <p className="text-sm text-emerald-900/70 mt-1">Your team's latest scheduled and completed fixtures.</p>
            </div>
            <Link to={`/matches?team_id=${id}`} className="inline-flex items-center gap-1 text-sm text-emerald-700 font-semibold hover:underline">
              View all
              <span>→</span>
            </Link>
          </div>
          {recentMatches.length === 0 ? (
            <div className="text-center py-16 text-emerald-800/55">
              <p className="text-5xl mb-3">🏏</p>
              <p className="text-lg">No matches yet. <Link to={`/matches?team_id=${id}`} className="text-emerald-700 hover:underline">Schedule your first match</Link></p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-emerald-50 text-emerald-900/65 text-xs uppercase tracking-[0.15em]">
                  <tr>
                    <th className="text-left px-5 py-3">Match</th>
                    <th className="text-left px-5 py-3">Date</th>
                    <th className="text-left px-5 py-3">Attended</th>
                    <th className="text-left px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {recentMatches.map(m => (
                    <tr key={m.id} className="hover:bg-emerald-50/50 transition-colors duration-200">
                      <td className="px-5 py-4">
                        <Link to={`/matches/${m.id}`} className="font-semibold text-emerald-900 hover:text-emerald-700 hover:underline">
                          Match #{m.match_number} vs {m.opponent}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-emerald-900/70">{new Date(m.match_date).toLocaleDateString()}</td>
                      <td className="px-5 py-4 text-emerald-900/80">
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">{m.attended_count} players</span>
                      </td>
                      <td className="px-5 py-4">{statusBadge(m.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel p-5 rounded-[28px] fade-in">
          <div className="bg-emerald-50/60 px-5 py-4 border-b border-emerald-100 mb-4">
            <h2 className="font-semibold text-emerald-900">Team Players</h2>
            <p className="text-sm text-emerald-900/70 mt-1">Your squad members</p>
          </div>
          {players.length === 0 ? (
            <div className="text-center py-12 text-emerald-800/55">
              <p className="text-4xl mb-2">👥</p>
              <p className="text-sm">No players yet</p>
              <Link to={`/teams/${id}`} className="text-emerald-700 hover:underline text-sm mt-2 inline-block">Add players</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {players.slice(0, 8).map(player => (
                <div key={player.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-sm font-semibold text-emerald-700">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-emerald-900">{player.name}</p>
                      {player.phone && <p className="text-xs text-emerald-900/60">{player.phone}</p>}
                    </div>
                  </div>
                </div>
              ))}
              {players.length > 8 && (
                <div className="text-center pt-2">
                  <Link to={`/teams/${id}`} className="text-emerald-700 hover:underline text-sm">
                    View all {players.length} players →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}