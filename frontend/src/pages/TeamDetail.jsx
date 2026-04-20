import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { teamsAPI, playersAPI } from '../api';

export default function TeamDetail() {
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingSettlement, setLoadingSettlement] = useState(false);
  const [settlement, setSettlement] = useState(null);
  const [leagueFee, setLeagueFee] = useState('1000');
  const [leaguePaidBy, setLeaguePaidBy] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [editId, setEditId] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentRecorded, setPaymentRecorded] = useState(false);

  const load = () => teamsAPI.getOne(id).then(d => { setTeam(d); setLoading(false); });
  useEffect(() => { load(); }, [id]);

  const loadSettlement = async () => {
    setLoadingSettlement(true);
    try {
      const data = await teamsAPI.getFinalSettlement(id, parseFloat(leagueFee || '0'), leaguePaidBy || undefined);
      setSettlement(data);
    } finally {
      setLoadingSettlement(false);
    }
  };

  const exportSettlement = () => {
    if (!settlement) return;
    const payload = {
      generated_at: new Date().toISOString(),
      team: { id: team.id, name: team.name },
      league_fee: parseFloat(leagueFee || '0'),
      league_paid_by: leaguePaidBy || null,
      settlement,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `settlement-${team.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportSettlementCsv = () => {
    if (!settlement) return;

    const csvEscape = (value) => {
      const text = value == null ? '' : String(value);
      if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const leaguePaidByName = leaguePaidBy
      ? team.players.find((p) => String(p.id) === String(leaguePaidBy))?.name || leaguePaidBy
      : 'Not set';

    const rows = [
      ['Generated At', new Date().toISOString()],
      ['Team', team.name],
      ['League Fee', leagueFee],
      ['League Paid By', leaguePaidByName],
      [],
      ['Totals', 'Value'],
      ['Total Paid', settlement.totals.paid],
      ['Match Expense Owes', settlement.totals.match_expense_owes || 0],
      ['Party Expense Owes', settlement.totals.party_expense_owes || 0],
      ['League Owes', settlement.totals.league_owes],
      ['Total Owes', settlement.totals.total_owes || 0],
      ['Net', settlement.totals.net],
      ['Matches', settlement.total_matches],
      [],
      ['Player Name', 'Matches', 'Paid', 'Match', 'Party', 'League', 'Total Owes', 'Net'],
      ...settlement.players.map((p) => [
        p.player_name,
        p.matches_played,
        `₹${Number(p.paid).toFixed(2)}`,
        `₹${Number(p.match_expense_owes || 0).toFixed(2)}`,
        `₹${Number(p.party_expense_owes || 0).toFixed(2)}`,
        `₹${Number(p.league_owes).toFixed(2)}`,
        `₹${Number(p.total_owes).toFixed(2)}`,
        `₹${Number(p.net).toFixed(2)}`,
      ]) ,
      [],
      ['Suggested Settlements'],
      ['From', 'To', 'Amount'],
      ...settlement.suggested_settlements.map((s) => [
        s.from_player_name,
        s.to_player_name,
        `₹${Number(s.amount).toFixed(2)}`,
      ]),
    ];

    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `settlement-${team.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (editId) {
      await playersAPI.update(editId, { ...form, team_id: id });
    } else {
      await playersAPI.create({ ...form, team_id: id });
    }
    setForm({ name: '', phone: '' }); setEditId(null); setShowForm(false);
    load();
  };

  const deletePlayer = async (pid) => {
    if (!window.confirm('Remove this player?')) return;
    await playersAPI.delete(pid);
    load();
  };

  const startEdit = (p) => { setEditId(p.id); setForm({ name: p.name, phone: p.phone || '' }); setShowForm(true); };
  const cancelForm = () => { setShowForm(false); setForm({ name: '', phone: '' }); setEditId(null); };

  if (loading) return <div className="flex justify-center py-20 text-emerald-700/70">Loading...</div>;
  if (!team) return <div className="text-center py-20 text-rose-500/80">Team not found</div>;

  return (
    <div className="space-y-5">
  
      <div className="flex items-center gap-3">
        <Link to="/teams" className="text-emerald-900/60 hover:text-emerald-800 text-sm">← Teams</Link>
        <span className="text-emerald-900/30">/</span>
        <h1 className="title-xl">{team.name}</h1>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-emerald-900/70 text-sm">{team.players.length} player{team.players.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2 text-sm">
          + Add Player
        </button>
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        .animate-slide-in {
          animation: slideIn 0.5s ease-out forwards;
        }
        .animate-scale-in {
          animation: scaleIn 0.4s ease-out forwards;
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
        .settle-card {
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }
        .settle-card:hover {
          border-color: currentColor;
          transform: translateY(-2px);
        }
      `}</style>

      <div className="panel-soft p-6 space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <span className="text-2xl">💰</span> Final Settle-Up
            </h2>
            <p className="text-xs text-gray-600 mt-2">League fee divided by matches → split among attendees. Party expenses included.</p>
          </div>
          <div className="flex items-end gap-2 bg-white rounded-lg p-3 shadow-sm border border-emerald-100">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">League Fee (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={leagueFee}
                onChange={(e) => setLeagueFee(e.target.value)}
                className="w-28 field text-sm font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Paid By</label>
              <select
                value={leaguePaidBy}
                onChange={(e) => setLeaguePaidBy(e.target.value)}
                className="w-36 field text-sm"
              >
                <option value="">Not set</option>
                {team.players.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <button
                onClick={loadSettlement}
                disabled={loadingSettlement}
                className="btn-primary px-6 py-2 text-sm font-bold disabled:opacity-50"
              >
                {loadingSettlement ? '⏳ Calculating...' : '🧮 Calculate'}
              </button>
              {settlement && (
              <>
                <button
                  onClick={exportSettlement}
                  className="btn-muted px-5 py-2 text-sm"
                >
                  📥 Export JSON
                </button>
                <button
                  onClick={exportSettlementCsv}
                  className="btn-muted px-5 py-2 text-sm"
                >
                  📄 Export CSV
                </button>
              </>
            )}
            </div>
          </div>

        {settlement && (
          <div className="space-y-6 animate-scale-in">
            {/* Summary Cards removed for minimal view */}

            {/* League Per Match Info */}
            <div className="bg-white rounded-lg p-3 border-l-4 border-blue-600 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-semibold">Per Match Split</p>
                  <p className="text-2xl font-bold text-blue-600">₹{Number(settlement.league_per_match || 0).toFixed(2)}</p>
                </div>
                <span className="text-4xl">📐</span>
              </div>
            </div>

            {/* Settlement Suggestions - Main Card */}
            {settlement.suggested_settlements.length > 0 && (
              <div className="panel p-5 border-2 border-emerald-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <span className="text-2xl">✅</span> Settlement Summary
                  </h3>
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                    {settlement.suggested_settlements.length} transfer{settlement.suggested_settlements.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-3">
                  {settlement.suggested_settlements.map((s, index) => (
                    <div
                      key={`${s.from_player_id}-${s.to_player_id}-${index}`}
                      className="flex items-center justify-between p-3 bg-emerald-50/40 rounded-lg hover:bg-emerald-50 transition-all border-l-4 border-emerald-400 group"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-xl">👤</span>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{s.from_player_name}</p>
                          <p className="text-xs text-gray-500">owes</p>
                        </div>
                        <span className="text-xl">→</span>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{s.to_player_name}</p>
                          <p className="text-xs text-gray-500">receives</p>
                        </div>
                      </div>
                      <div className="ml-2 text-right">
                        <p className="text-lg font-bold text-emerald-700">₹{Number(s.amount).toFixed(2)}</p>
                        <button
                          onClick={() => { setSelectedPayment(s); setShowPaymentModal(true); }}
                          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded mt-1 transition-all opacity-0 group-hover:opacity-100"
                        >
                          📝 Record
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {settlement.suggested_settlements.length === 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-8 border-2 border-green-300 text-center">
                <p className="text-3xl mb-2">✨</p>
                <p className="text-lg font-bold text-green-700">Perfect! Everyone is settled.</p>
                <p className="text-sm text-green-600 mt-1">No transfers needed.</p>
              </div>
            )}

            {/* Player Balances Table */}
            <div className="panel overflow-hidden border-2 border-emerald-100">
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-5 py-3 border-b-2 border-gray-200">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                  <span>👥</span> Player Balances
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 text-xs uppercase font-bold border-b">
                      <th className="text-left px-4 py-3">Player</th>
                      <th className="text-right px-4 py-3">Matches</th>
                      <th className="text-right px-4 py-3">Paid</th>
                      <th className="text-right px-4 py-3">Match 🏏</th>
                      <th className="text-right px-4 py-3">Party 🎉</th>
                      <th className="text-right px-4 py-3">League 🏆</th>
                      <th className="text-right px-4 py-3">Total</th>
                      <th className="text-right px-4 py-3">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {settlement.players.map((p, idx) => (
                      <tr key={p.player_id} className="hover:bg-blue-50 transition-colors" style={{ 'animationDelay': `${idx * 50}ms` }}>
                        <td className="px-4 py-3 font-bold text-gray-800">{p.player_name}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{p.matches_played}</td>
                        <td className="px-4 py-3 text-right text-green-600 font-semibold">₹{Number(p.paid).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-red-600">₹{Number(p.match_expense_owes || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-pink-600">₹{Number(p.party_expense_owes || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-orange-600">₹{Number(p.league_owes).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-indigo-600 font-bold">₹{Number(p.total_owes).toFixed(2)}</td>
                        <td className={`px-4 py-3 text-right font-bold ${p.net >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                          {p.net >= 0 ? '+' : ''}₹{Number(p.net).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Recording Modal */}
      {showPaymentModal && selectedPayment && !paymentRecorded && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-scale-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 border-2 border-green-400">
              <div className="text-center">
                <p className="text-4xl mb-2">💳</p>
                <h3 className="text-xl font-bold text-gray-800">Record Payment</h3>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4 space-y-2 border-2 border-green-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">From:</p>
                  <p className="font-bold text-gray-800">{selectedPayment.from_player_name}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">To:</p>
                  <p className="font-bold text-gray-800">{selectedPayment.to_player_name}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t-2 border-green-300">
                  <p className="text-sm font-bold text-gray-600">Amount:</p>
                  <p className="text-2xl font-bold text-green-600">₹{Number(selectedPayment.amount).toFixed(2)}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedPayment(null);
                    setPaymentRecorded(false);
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setPaymentRecorded(true);
                  }}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-2 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
                >
                  💾 Confirm & Record
                </button>
              </div>

            </div>
        </div>
      )}
      {showPaymentModal && selectedPayment && paymentRecorded && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-scale-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center space-y-4 border-4 border-green-400 animate-pulse">
              <style>{`
                @keyframes bounce-check { 
                  0%, 100% { transform: scale(1); }
                  50% { transform: scale(1.1); }
                }
                .check-bounce { animation: bounce-check 0.6s ease-in-out; }
              `}</style>
              
              <div className="check-bounce">
                <p className="text-6xl">✅</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-green-600">Settlement Completed!</h3>
                <p className="text-sm text-gray-600">Payment successfully recorded</p>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4 space-y-1 border-2 border-green-200">
                <p className="text-xs text-gray-600">Transferred</p>
                <p className="text-lg font-bold text-gray-800">₹{Number(selectedPayment.amount).toFixed(2)}</p>
                <p className="text-xs text-gray-600 mt-2">
                  {selectedPayment.from_player_name} <span className="text-green-600">→</span> {selectedPayment.to_player_name}
                </p>
              </div>
              
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedPayment(null);
                  setPaymentRecorded(false);
                }}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-3 rounded-lg font-bold transition-all shadow-lg hover:shadow-xl text-lg"
              >
                Done ✨
              </button>
            </div>

        </div>
      )}
      {showForm && (
        <div className="form-card p-6 fade-in">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
            <div>
              <h2 className="text-xl font-semibold text-emerald-900">{editId ? 'Edit Player' : 'Add Player'}</h2>
              <p className="text-sm text-emerald-900/70 mt-1">Fill in player details and save them to the team roster.</p>
            </div>
            <button type="button" onClick={cancelForm} className="btn-muted px-4 py-2 text-sm">
              Cancel
            </button>
          </div>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-emerald-900/80 mb-2">Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                className="w-full field text-sm"
                placeholder="Player name" autoFocus />
            </div>
            <div>
              <label className="block text-sm text-emerald-900/80 mb-2">Phone (optional)</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full field text-sm"
                placeholder="Phone number" />
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" className="btn-primary px-4 py-2 text-sm">
                {editId ? 'Update Player' : 'Add Player'}
              </button>
            </div>
          </form>
        </div>
      )}

      {team.players.length === 0 ? (
        <div className="panel card-hero text-center py-16 text-emerald-900/75">
          <p className="text-5xl mb-3">🧑‍🤝‍🧑</p>
          <p className="text-lg font-semibold">No players yet.</p>
          <p className="mt-2 text-sm text-emerald-900/70">Add squad members to start tracking attendance and payments.</p>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <table className="table-compact w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-[0.12em]">
              <tr>
                <th className="text-left">#</th>
                <th className="text-left">Name</th>
                <th className="text-left">Phone</th>
                <th className="text-left">Joined</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {team.players.map((p, i) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="text-slate-400">{i + 1}</td>
                  <td className="font-medium text-slate-800">{p.name}</td>
                  <td className="text-slate-500">{p.phone || '—'}</td>
                  <td className="text-slate-400 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="text-right">
                    <button onClick={() => startEdit(p)} className="text-emerald-700 hover:text-emerald-900 text-xs border border-emerald-200 rounded px-2 py-1 mr-2 transition">
                      Edit
                    </button>
                    <button onClick={() => deletePlayer(p.id)} className="text-rose-500 hover:text-rose-700 text-xs border border-rose-200 rounded px-2 py-1 transition">
                      Remove
                    </button>
                  </td>
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

