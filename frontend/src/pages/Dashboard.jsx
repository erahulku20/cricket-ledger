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
          <div>
            <p className="eyebrow">Team ledger dashboard</p>
            <h1 className="section-title">Your cricket league at a glance</h1>
            <p className="section-note">
              Monitor squad size, upcoming fixtures, expenses, and settlement health from one polished control center.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="panel p-6 relative overflow-hidden league-pulse-card fade-in">
            <div className="pulse-ring"></div>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-slate-500">League pulse</p>
                <h2 className="text-3xl font-bold text-emerald-950 mt-3">Smooth season tracking</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600 max-w-xl">
                  Explore match throughput, team health, and expense momentum in one clean view. The league dashboard makes progress easy to scan.
                </p>
              </div>
              <div className="pulse-value-card">
                <p className="text-sm uppercase tracking-[0.26em] text-slate-500">Expenses</p>
                <p className="mt-2 text-4xl font-bold text-rose-900">₹{data.totalExpenses.toFixed(0)}</p>
                <p className="text-xs text-slate-500 mt-1">Total costs logged</p>
              </div>
            </div>

            <div className="mt-8 mini-chart">
              <div className="mini-chart-row">
                <span>Week 1</span>
                <div className="mini-chart-track"><div className="chart-bar h-7 w-[44%]"></div></div>
              </div>
              <div className="mini-chart-row">
                <span>Week 2</span>
                <div className="mini-chart-track"><div className="chart-bar h-10 w-[62%] accent"></div></div>
              </div>
              <div className="mini-chart-row">
                <span>Week 3</span>
                <div className="mini-chart-track"><div className="chart-bar h-5 w-[35%]"></div></div>
              </div>
              <div className="mini-chart-row">
                <span>Week 4</span>
                <div className="mini-chart-track"><div className="chart-bar h-9 w-[58%] accent"></div></div>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {pulseMetrics.map((item) => (
              <div key={item.label} className={`panel card-elevated p-5 hover:-translate-y-1 transition-transform duration-200 ${item.accent === 'blue' ? 'border-blue-200' : item.accent === 'green' ? 'border-green-200' : 'border-violet-200'}`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.26em] text-slate-500">{item.label}</p>
                    <p className="mt-3 text-3xl font-bold text-slate-900">{item.value}</p>
                  </div>
                  <div className="text-3xl">{item.icon}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="summary-grid">
        <StatCard icon="👥" label="Teams" value={data.totalTeams} color="border-emerald-500" />
        <StatCard icon="🧑‍🤝‍🧑" label="Players" value={data.totalPlayers} color="border-sky-500" />
        <StatCard icon="🏆" label="Matches" value={data.totalMatches} color="border-amber-500" />
        <StatCard icon="📅" label="Upcoming" value={data.upcomingMatches} color="border-violet-500" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.9fr] gap-5">
        <div className="space-y-4">
          <div className="panel p-5 rounded-[28px] border-l-4 border-rose-400 bg-rose-50/75 fade-in">
            <p className="text-sm text-rose-700/90">Total Expenses</p>
            <p className="text-3xl font-bold text-rose-800">₹{data.totalExpenses.toFixed(2)}</p>
            <p className="mt-2 text-xs text-rose-700/70">Track spending across matches, party costs, and reimbursements.</p>
          </div>
          <div className="panel p-5 rounded-[28px] border-l-4 border-amber-500 bg-amber-50/80 fade-in">
            <p className="text-sm text-amber-800/80">Unsettled Amount</p>
            <p className="text-3xl font-bold text-amber-900">₹{data.unsettledExpenses.toFixed(2)}</p>
            <p className="mt-2 text-xs text-amber-800/70">Outstanding splits that still need to be settled by your players.</p>
          </div>
        </div>
        <div className="panel p-5 rounded-[28px] overflow-hidden fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-emerald-50/60 px-5 py-4 border-b border-emerald-100">
            <div>
              <h2 className="font-semibold text-emerald-900">Recent Matches</h2>
              <p className="text-sm text-emerald-900/70 mt-1">Quick access to your latest scheduled and completed fixtures.</p>
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
    </div>
  );
}
