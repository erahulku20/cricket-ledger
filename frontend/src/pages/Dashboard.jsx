import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI } from '../api';

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

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.get().then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div className="flex justify-center py-20 text-emerald-700/70 text-lg">Loading...</div>;

  const statusBadge = (status) => {
    const styles = { upcoming: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700' };
    return <span className={`status-pill ${styles[status] || ''}`}>{status}</span>;
  };

  const settledPercentage = data.totalExpenses > 0
    ? Math.round(((data.totalExpenses - data.unsettledExpenses) / data.totalExpenses) * 100)
    : 0;

  const pulseMetrics = [
    { label: 'Live matches', value: data.upcomingMatches, icon: '🏏', accent: 'blue' },
    { label: 'Settled amount', value: `${settledPercentage}%`, icon: '💱', accent: 'green' },
    { label: 'Completed', value: data.completedMatches, icon: '✅', accent: 'violet' },
  ];

  return (
    <div className="space-y-6">
      <section className="section-panel p-6 fade-in">
        <div className="section-header">
          <h1 className="section-title">Dashboard</h1>
        </div>
      </section>

      <div className="panel p-5 rounded-[28px] overflow-hidden fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-emerald-50/60 px-5 py-4 border-b border-emerald-100">
          <div>
            <h2 className="font-semibold text-emerald-900">Recent Matches</h2>
          </div>
          <Link to="/matches" className="inline-flex items-center gap-1 text-sm text-emerald-700 font-semibold hover:underline">
            View all
            <span>→</span>
          </Link>
        </div>
        {data.recentMatches.length === 0 ? (
          <div className="text-center py-16 text-emerald-800/55">
            <p className="text-5xl mb-3">🏏</p>
            <p className="text-lg">No matches yet. <Link to="/matches" className="text-emerald-700 hover:underline">Add your first match</Link></p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-emerald-50 text-emerald-900/65 text-xs uppercase tracking-[0.15em]">
                <tr>
                  <th className="text-left px-5 py-3">Match</th>
                  <th className="text-left px-5 py-3">Team</th>
                  <th className="text-left px-5 py-3">Date</th>
                  <th className="text-left px-5 py-3">Attended</th>
                  <th className="text-left px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {data.recentMatches.map(m => (
                  <tr key={m.id} className="hover:bg-emerald-50/50 transition-colors duration-200">
                    <td className="px-5 py-4">
                      <Link to={`/matches/${m.id}`} className="font-semibold text-emerald-900 hover:text-emerald-700 hover:underline">
                        Match #{m.match_number} vs {m.opponent}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-emerald-900/75">{m.team_name}</td>
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
    </div>
  );
}
