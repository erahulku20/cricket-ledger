import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { matchesAPI, expensesAPI, pollsAPI, isReadOnly } from '../api';

const STATUS_COLORS = { upcoming: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700' };
const RESPONSE_STYLES = { available: 'bg-green-100 text-green-700 border-green-300', not_available: 'bg-red-100 text-red-700 border-red-300', maybe: 'bg-yellow-100 text-yellow-700 border-yellow-300' };
const RESPONSE_LABELS = { available: '✅ Available', not_available: '❌ Not Available', maybe: '🤔 Maybe' };

// ─── Attendance Section ────────────────────────────────────────────────────────
function AttendanceSection({ match, onRefresh, readOnly }) {
  const [local, setLocal] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const map = {};
    match.attendance.forEach(a => { map[a.id] = a.status; });
    setLocal(map);
  }, [match.attendance]);

  const toggle = (id, current) => {
    const next = current === 'attended' ? 'not_attended' : current === 'not_attended' ? 'not_marked' : 'attended';
    setLocal(l => ({ ...l, [id]: next }));
  };

  const save = async () => {
    setSaving(true);
    const attendance = match.attendance.map(a => ({ player_id: a.id, status: local[a.id] || 'not_marked' }));
    await matchesAPI.updateAttendance(match.id, attendance);
    setSaving(false);
    onRefresh();
  };

  const attended = Object.values(local).filter(s => s === 'attended').length;
  const notAttended = Object.values(local).filter(s => s === 'not_attended').length;

  return (
    <div className="panel fade-in">
      <div className="px-5 py-4 border-b border-emerald-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-emerald-900">Attendance</h2>
          <p className="text-xs text-emerald-900/60 mt-0.5">Click on a player to cycle status (→ Attended → Absent → Unmarked)</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-emerald-700 font-medium">✅ {attended}</span>
          <span className="text-sm text-rose-600 font-medium">❌ {notAttended}</span>
          <button onClick={save} disabled={readOnly || saving}
            className="btn-primary px-4 py-1.5 text-sm disabled:opacity-50">
            {readOnly ? 'Read-only' : saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      <div className="p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {match.attendance.map(player => {
          const status = local[player.id] || 'not_marked';
          const styles = {
            attended: 'border-green-400 bg-green-50 text-green-800',
            not_attended: 'border-red-300 bg-red-50 text-red-700 line-through',
            not_marked: 'border-gray-200 bg-gray-50 text-gray-500'
          };
          const icons = { attended: '✅', not_attended: '❌', not_marked: '⬜' };
          return (
            <button key={player.id} onClick={() => !readOnly && toggle(player.id, status)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium text-left transition-colors ${readOnly ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'} ${styles[status]}`}>
              <span>{icons[status]}</span>
              <span className="truncate">{player.name}</span>
            </button>
          );
        })}
        {match.attendance.length === 0 && (
          <p className="col-span-full text-gray-400 text-sm text-center py-4">No players in this team yet</p>
        )}
      </div>
    </div>
  );
}

// ─── Expenses Section ─────────────────────────────────────────────────────────
function ExpensesSection({ match, onRefresh, readOnly }) {
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('expenses');
  const defaultForm = { category: 'match', description: '', amount: '', paid_by: '', split_among: 'attendees', custom_player_ids: [] };
  const [form, setForm] = useState(defaultForm);

  const loadExpenses = useCallback(() =>
    Promise.all([expensesAPI.getByMatch(match.id), expensesAPI.getBalances(match.id)])
      .then(([e, b]) => { setExpenses(e); setBalances(b); }),
    [match.id]);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  const addExpense = async (e) => {
    e.preventDefault();
    await expensesAPI.create({
      ...form,
      match_id: match.id,
      amount: parseFloat(form.amount),
      paid_by: form.paid_by || null,
      custom_player_ids: form.split_among === 'party_attendees' ? form.custom_player_ids : []
    });
    setForm(defaultForm); setShowForm(false);
    loadExpenses();
  };

  const toggleCustomPlayer = (playerId) => {
    setForm(current => {
      const has = current.custom_player_ids.includes(playerId);
      return {
        ...current,
        custom_player_ids: has
          ? current.custom_player_ids.filter(id => id !== playerId)
          : [...current.custom_player_ids, playerId]
      };
    });
  };

  const deleteExpense = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    await expensesAPI.delete(id);
    loadExpenses();
  };

  const toggleSettle = async (split) => {
    if (split.settled) await expensesAPI.unsettleSplit(split.id);
    else await expensesAPI.settleSplit(split.id);
    loadExpenses();
  };

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const categoryColors = { match: 'bg-blue-100 text-blue-700', party: 'bg-purple-100 text-purple-700', other: 'bg-gray-100 text-gray-600' };

  return (
    <div className="panel fade-in">
      <div className="px-5 py-4 border-b border-emerald-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-emerald-900">Expenses & Splits</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-emerald-900/70">Total: <strong className="text-emerald-950">₹{totalExpenses.toFixed(2)}</strong></span>
            {!readOnly ? (
              <button onClick={() => setShowForm(!showForm)}
                className="btn-primary px-4 py-1.5 text-sm">
                + Add Expense
              </button>
            ) : (
              <span className="text-sm text-rose-700">Read-only mode active. Expense changes are disabled.</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {['expenses', 'balances'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-lg text-sm font-medium capitalize ${activeTab === tab ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {tab === 'expenses' ? '📋 Expenses' : '⚖️ Balances'}
            </button>
          ))}
        </div>
      </div>

      {showForm && !readOnly && (
        <div className="p-5 border-b border-emerald-100 bg-emerald-50/60">
          <form onSubmit={addExpense} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full field text-sm">
                <option value="match">🏏 Match</option>
                <option value="party">🎉 After-Party</option>
                <option value="other">📦 Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Description *</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required
                className="w-full field text-sm"
                placeholder="e.g. Ground booking fee" autoFocus />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Amount (₹) *</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required min="0" step="0.01"
                className="w-full field text-sm"
                placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Paid By</label>
              <select value={form.paid_by} onChange={e => setForm(f => ({ ...f, paid_by: e.target.value }))}
                className="w-full field text-sm">
                <option value="">Unknown / Group</option>
                {match.attendance.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Split Among</label>
              <select value={form.split_among} onChange={e => setForm(f => ({ ...f, split_among: e.target.value }))}
                className="w-full field text-sm">
                <option value="attendees">✅ Who Attended</option>
                <option value="all">👥 All Team Members</option>
                <option value="party_attendees">🎉 Selected Party Members</option>
              </select>
            </div>
            {form.split_among === 'party_attendees' && (
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Select people for this party expense *</label>
                <div className="flex flex-wrap gap-2 rounded-lg border border-gray-300 p-2 bg-white">
                  {match.attendance.map(p => {
                    const selected = form.custom_player_ids.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleCustomPlayer(p.id)}
                        className={`px-2.5 py-1 rounded-full text-xs border ${selected ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
                      >
                        {selected ? '✅ ' : ''}{p.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={form.split_among === 'party_attendees' && form.custom_player_ids.length === 0}
                className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
              >
                Add
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-muted px-3 py-2 text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="p-5">
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            {expenses.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No expenses yet. Add the first one!</p>
            ) : expenses.map(exp => (
              <div key={exp.id} className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="flex items-start justify-between px-4 py-3 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[exp.category]}`}>{exp.category}</span>
                    <span className="font-medium text-gray-800">{exp.description}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-800">₹{exp.amount.toFixed(2)}</span>
                    {!readOnly && (
                      <button onClick={() => deleteExpense(exp.id)} className="text-gray-400 hover:text-red-500 text-xs">🗑️</button>
                    )}
                  </div>
                </div>
                {exp.paid_by_name && (
                  <div className="px-4 py-1.5 text-xs text-gray-500 border-b bg-white">
                    Paid by: <strong>{exp.paid_by_name}</strong>
                  </div>
                )}
                <div className="px-4 py-3 bg-white">
                  <p className="text-xs text-gray-500 mb-2 font-medium uppercase">Splits (each ₹{exp.splits.length > 0 ? (exp.amount / exp.splits.length).toFixed(2) : '—'})</p>
                  <div className="flex flex-wrap gap-2">
                    {exp.splits.map(split => (
                      readOnly ? (
                        <span key={split.id} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${
                          split.settled ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600'
                        }`}>
                          {split.settled ? '✅' : '⬜'} {split.player_name} <span className="font-semibold">₹{split.share_amount.toFixed(2)}</span>
                        </span>
                      ) : (
                        <button key={split.id} onClick={() => toggleSettle(split)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors ${
                            split.settled ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-green-300'
                          }`}>
                          {split.settled ? '✅' : '⬜'} {split.player_name} <span className="font-semibold">₹{split.share_amount.toFixed(2)}</span>
                        </button>
                      )
                    ))}
                    {exp.splits.length === 0 && <span className="text-xs text-gray-400">No attendees to split among</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'balances' && (
          <div className="overflow-x-auto">
            {balances.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No balance data yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <th className="text-left px-4 py-2">Player</th>
                    <th className="text-right px-4 py-2">Paid</th>
                    <th className="text-right px-4 py-2">Owes</th>
                    <th className="text-right px-4 py-2">Settled</th>
                    <th className="text-right px-4 py-2">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {balances.map(b => (
                    <tr key={b.player_id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-800">{b.player_name}</td>
                      <td className="px-4 py-2 text-right text-green-600">₹{Number(b.paid).toFixed(2)}</td>
                      <td className="px-4 py-2 text-right text-red-500">₹{Number(b.owes).toFixed(2)}</td>
                      <td className="px-4 py-2 text-right text-gray-400">₹{Number(b.settled).toFixed(2)}</td>
                      <td className={`px-4 py-2 text-right font-bold ${b.net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {b.net >= 0 ? '+' : ''}₹{Number(b.net).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Polls Section ────────────────────────────────────────────────────────────
function PollsSection({ match, readOnly }) {
  const [polls, setPolls] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState('');

  const load = useCallback(() =>
    pollsAPI.getByMatch(match.id).then(setPolls),
    [match.id]);

  useEffect(() => { load(); }, [load]);

  const createPoll = async (e) => {
    e.preventDefault();
    await pollsAPI.create({ match_id: match.id, question });
    setQuestion(''); setShowForm(false);
    load();
  };

  const respond = async (pollId, response) => {
    if (!selectedPlayer) { alert('Select a player first'); return; }
    await pollsAPI.respond(pollId, { player_id: parseInt(selectedPlayer), response });
    load();
  };

  const deletePoll = async (id) => {
    if (!window.confirm('Delete this poll?')) return;
    await pollsAPI.delete(id);
    load();
  };

  return (
    <div className="panel fade-in">
      <div className="px-5 py-4 border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-semibold text-emerald-900">Availability Polls</h2>
          {readOnly && <p className="text-sm text-rose-700 mt-1">Read-only mode is active. Polls and responses are disabled.</p>}
        </div>
        {!readOnly ? (
          <button onClick={() => setShowForm(!showForm)}
            className="btn-primary px-4 py-1.5 text-sm">
            + New Poll
          </button>
        ) : null}
      </div>

      {showForm && !readOnly && (
        <div className="p-4 border-b border-emerald-100 bg-sky-50/60">
          <form onSubmit={createPoll} className="flex gap-3">
            <input value={question} onChange={e => setQuestion(e.target.value)} required autoFocus
              className="flex-1 field text-sm"
              placeholder="e.g. Are you available for Match #5 on Saturday?" />
            <button type="submit" className="btn-primary px-4 py-2 text-sm">Create</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-muted px-3 py-2 text-sm">Cancel</button>
          </form>
        </div>
      )}

      <div className="p-5 space-y-5">
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600 font-medium">Respond as:</label>
          <select value={selectedPlayer} onChange={e => setSelectedPlayer(e.target.value)}
            className="field px-3 py-1.5 text-sm">
            <option value="">Select player...</option>
            {match.attendance.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {polls.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No polls yet. Create one to check availability!</p>
        ) : (
          polls.map(poll => (
            <div key={poll.id} className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <p className="font-medium text-gray-800">{poll.question}</p>
                {!readOnly && (
                  <button onClick={() => deletePoll(poll.id)} className="text-gray-400 hover:text-red-500 text-xs ml-2">🗑️</button>
                )}
              </div>

              {/* Summary bar */}
              <div className="flex gap-3 mb-4 text-sm">
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">✅ {poll.summary.available} Available</span>
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">❌ {poll.summary.not_available} No</span>
                <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-medium">🤔 {poll.summary.maybe} Maybe</span>
                <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full">⏳ {poll.summary.pending} Pending</span>
              </div>

              {!readOnly && (
                <div className="flex gap-2 mb-4">
                  {['available', 'not_available', 'maybe'].map(r => (
                    <button key={r} onClick={() => respond(poll.id, r)}
                      className={`px-3 py-1.5 rounded-lg text-sm border font-medium transition-colors ${RESPONSE_STYLES[r]} hover:opacity-80`}>
                      {RESPONSE_LABELS[r]}
                    </button>
                  ))}
                </div>
              )}

              {poll.responses.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {poll.responses.map(r => (
                    <span key={r.id} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${RESPONSE_STYLES[r.response]}`}>
                      {r.player_name}: {RESPONSE_LABELS[r.response]}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main MatchDetail Page ────────────────────────────────────────────────────
export default function MatchDetail() {
  const readOnly = isReadOnly;
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editStatus, setEditStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  const load = useCallback(() =>
    matchesAPI.getOne(id).then(m => { setMatch(m); setNewStatus(m.status); setLoading(false); }),
    [id]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async () => {
    await matchesAPI.update(id, {
      opponent: match.opponent,
      match_date: match.match_date,
      venue: match.venue,
      status: newStatus,
    });
    setEditStatus(false);
    load();
  };

  if (loading) return <div className="flex justify-center py-20 text-emerald-700/70">Loading...</div>;
  if (!match) return <div className="text-center py-20 text-rose-500/80">Match not found</div>;

  const attendedCount = match.attendance.filter(a => a.status === 'attended').length;
  const absentCount = match.attendance.filter(a => a.status === 'not_attended').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="panel-soft p-6 rounded-[28px] fade-in">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Link to={`/teams/${match.team_id}/dashboard`} className="hover:text-slate-700">← {match.team_name} Dashboard</Link>
              <span className="text-slate-300">/</span>
              <span className="text-slate-400">Match detail</span>
            </div>
            <div>
              <h1 className="title-xl">Match #{match.match_number} — vs {match.opponent}</h1>
              <div className="flex flex-wrap gap-3 mt-3 text-sm text-slate-600">
                <span>👥 {match.team_name}</span>
                <span>📅 {new Date(match.match_date).toLocaleDateString()}</span>
                {match.venue && <span>📍 {match.venue}</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {editStatus ? (
              <>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                  className="field px-3 py-2 text-sm min-w-[160px]">
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button onClick={updateStatus} className="btn-primary px-4 py-2 text-sm">Save</button>
                <button onClick={() => setEditStatus(false)} className="btn-muted px-4 py-2 text-sm">Cancel</button>
              </>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm">
                <span className={`${STATUS_COLORS[match.status]} px-2 py-1 rounded-full text-xs font-semibold`}>{match.status}</span>
                {!readOnly && (
                  <button onClick={() => setEditStatus(true)} className="text-slate-500 hover:text-slate-700 transition">✏️ Edit status</button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="panel text-center p-5 card-elevated border-t-4 border-emerald-400">
          <p className="text-3xl font-bold text-emerald-700">{attendedCount}</p>
          <p className="text-sm text-slate-500 mt-2">Attended</p>
        </div>
        <div className="panel text-center p-5 card-elevated border-t-4 border-rose-300">
          <p className="text-3xl font-bold text-rose-600">{absentCount}</p>
          <p className="text-sm text-slate-500 mt-2">Absent</p>
        </div>
        <div className="panel text-center p-5 card-elevated border-t-4 border-slate-300">
          <p className="text-3xl font-bold text-slate-700">{match.attendance.length - attendedCount - absentCount}</p>
          <p className="text-sm text-slate-500 mt-2">Unmarked</p>
        </div>
      </div>

      <AttendanceSection match={match} onRefresh={load} readOnly={readOnly} />
      <ExpensesSection match={match} onRefresh={load} readOnly={readOnly} />
      <PollsSection match={match} readOnly={readOnly} />
    </div>
  );
}

