const express = require('express');
const router = express.Router();
const { db } = require('../database');

function splitAmountEvenly(totalAmount, itemCount) {
  if (!itemCount || itemCount < 1) return [];
  const totalCents = Math.round(totalAmount * 100);
  const baseCents = Math.floor(totalCents / itemCount);
  const remainder = totalCents - (baseCents * itemCount);

  return Array.from({ length: itemCount }, (_, index) => (
    (baseCents + (index < remainder ? 1 : 0)) / 100
  ));
}

// GET all teams
router.get('/', (req, res) => {
  const teams = db.prepare(`
    SELECT t.*, COUNT(p.id) as player_count
    FROM teams t
    LEFT JOIN players p ON p.team_id = t.id
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `).all();
  res.json(teams);
});

router.get('/:id/final-settlement', (req, res) => {
  const teamId = parseInt(req.params.id, 10);
  const leagueFeeRaw = req.query.league_fee;
  const leaguePaidByRaw = req.query.league_paid_by;
  const leagueFee = leagueFeeRaw === undefined ? 1000 : parseFloat(leagueFeeRaw);
  const leaguePaidBy = leaguePaidByRaw === undefined || leaguePaidByRaw === ''
    ? null
    : parseInt(leaguePaidByRaw, 10);

  if (!Number.isFinite(leagueFee) || leagueFee < 0) {
    return res.status(400).json({ error: 'league_fee must be a non-negative number' });
  }

  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
  if (!team) return res.status(404).json({ error: 'Team not found' });

  const players = db.prepare('SELECT id, name FROM players WHERE team_id = ? ORDER BY name').all(teamId);
  if (players.length === 0) {
    return res.json({
      team_id: teamId,
      team_name: team.name,
      league_fee: leagueFee,
      total_matches: 0,
      totals: { paid: 0, expense_owes: 0, league_owes: 0, net: 0 },
      players: [],
      suggested_settlements: []
    });
  }

  if (leaguePaidBy !== null && !players.some(p => p.id === leaguePaidBy)) {
    return res.status(400).json({ error: 'league_paid_by must be a player from this team' });
  }

  const paidRows = db.prepare(`
    SELECT e.paid_by as player_id, COALESCE(SUM(e.amount), 0) as paid
    FROM expenses e
    JOIN matches m ON m.id = e.match_id
    WHERE m.team_id = ? AND e.paid_by IS NOT NULL
    GROUP BY e.paid_by
  `).all(teamId);

  const owesRows = db.prepare(`
    SELECT es.player_id, COALESCE(SUM(es.share_amount), 0) as owes
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    JOIN matches m ON m.id = e.match_id
    WHERE m.team_id = ?
    GROUP BY es.player_id
  `).all(teamId);

  const expenseCategoryRows = db.prepare(`
    SELECT es.player_id, e.category, COALESCE(SUM(es.share_amount), 0) as owes
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    JOIN matches m ON m.id = e.match_id
    WHERE m.team_id = ?
    GROUP BY es.player_id, e.category
  `).all(teamId);

  const attendedRows = db.prepare(`
    SELECT a.player_id, COUNT(*) as attended_matches
    FROM attendance a
    JOIN matches m ON m.id = a.match_id
    WHERE m.team_id = ? AND a.status = 'attended'
    GROUP BY a.player_id
  `).all(teamId);

  const matchAttendanceRows = db.prepare(`
    SELECT m.id as match_id, COUNT(a.player_id) as attendee_count
    FROM matches m
    LEFT JOIN attendance a ON a.match_id = m.id AND a.status = 'attended'
    WHERE m.team_id = ? AND m.status != 'cancelled'
    GROUP BY m.id
    HAVING attendee_count > 0
    ORDER BY m.match_date, m.id
  `).all(teamId);

  const paidByPlayer = Object.fromEntries(paidRows.map(r => [r.player_id, Number(r.paid) || 0]));
  const owesByPlayer = Object.fromEntries(owesRows.map(r => [r.player_id, Number(r.owes) || 0]));
  const attendedByPlayer = Object.fromEntries(attendedRows.map(r => [r.player_id, Number(r.attended_matches) || 0]));
  const expenseCategoryByPlayer = {};

  expenseCategoryRows.forEach(row => {
    if (!expenseCategoryByPlayer[row.player_id]) {
      expenseCategoryByPlayer[row.player_id] = { match: 0, party: 0, other: 0 };
    }
    expenseCategoryByPlayer[row.player_id][row.category] = Number(row.owes) || 0;
  });

  const leagueMatchesCount = matchAttendanceRows.length;
  const leaguePerMatchShares = splitAmountEvenly(leagueFee, leagueMatchesCount);
  const leagueOwesByPlayer = Object.fromEntries(players.map(player => [player.id, 0]));

  matchAttendanceRows.forEach((matchRow, matchIndex) => {
    if (!matchRow.attendee_count) return;
    const attendees = db.prepare(`
      SELECT player_id
      FROM attendance
      WHERE match_id = ? AND status = 'attended'
      ORDER BY player_id
    `).all(matchRow.match_id);

    const attendeeShares = splitAmountEvenly(leaguePerMatchShares[matchIndex], attendees.length);

    attendees.forEach((attendee, attendeeIndex) => {
      leagueOwesByPlayer[attendee.player_id] += attendeeShares[attendeeIndex] || 0;
    });
  });

  if (leagueMatchesCount === 0 && players.length > 0) {
    const fallbackLeagueShares = splitAmountEvenly(leagueFee, players.length);
    players.forEach((player, index) => {
      leagueOwesByPlayer[player.id] = fallbackLeagueShares[index] || 0;
    });
  }

  const playerBalances = players.map(player => {
    const matchesPlayed = attendedByPlayer[player.id] || 0;
    const leagueOwes = leagueOwesByPlayer[player.id] || 0;
    const leaguePaidShare = leaguePaidBy === player.id ? leagueFee : 0;
    const paid = (paidByPlayer[player.id] || 0) + leaguePaidShare;
    const categoryBreakdown = expenseCategoryByPlayer[player.id] || { match: 0, party: 0, other: 0 };
    const expenseOwes = owesByPlayer[player.id] || 0;
    const net = paid - expenseOwes - leagueOwes;

    return {
      player_id: player.id,
      player_name: player.name,
      matches_played: matchesPlayed,
      paid: Number(paid.toFixed(2)),
      match_expense_owes: Number(categoryBreakdown.match.toFixed(2)),
      party_expense_owes: Number(categoryBreakdown.party.toFixed(2)),
      other_expense_owes: Number(categoryBreakdown.other.toFixed(2)),
      expense_owes: Number(expenseOwes.toFixed(2)),
      league_owes: Number(leagueOwes.toFixed(2)),
      total_owes: Number((expenseOwes + leagueOwes).toFixed(2)),
      net: Number(net.toFixed(2))
    };
  });

  const debtors = playerBalances
    .filter(p => p.net < -0.01)
    .map(p => ({ player_id: p.player_id, player_name: p.player_name, amount: -p.net }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = playerBalances
    .filter(p => p.net > 0.01)
    .map(p => ({ player_id: p.player_id, player_name: p.player_name, amount: p.net }))
    .sort((a, b) => b.amount - a.amount);

  const suggestedSettlements = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.amount, creditor.amount);
    const rounded = Number(amount.toFixed(2));

    if (rounded > 0) {
      suggestedSettlements.push({
        from_player_id: debtor.player_id,
        from_player_name: debtor.player_name,
        to_player_id: creditor.player_id,
        to_player_name: creditor.player_name,
        amount: rounded
      });
    }

    debtor.amount = Number((debtor.amount - amount).toFixed(4));
    creditor.amount = Number((creditor.amount - amount).toFixed(4));

    if (debtor.amount <= 0.01) debtorIndex += 1;
    if (creditor.amount <= 0.01) creditorIndex += 1;
  }

  res.json({
    team_id: teamId,
    team_name: team.name,
    league_fee: leagueFee,
    league_paid_by: leaguePaidBy,
    total_matches: leagueMatchesCount,
    league_per_match: Number((leagueMatchesCount > 0 ? leagueFee / leagueMatchesCount : 0).toFixed(2)),
    totals: {
      paid: Number(playerBalances.reduce((sum, p) => sum + p.paid, 0).toFixed(2)),
      match_expense_owes: Number(playerBalances.reduce((sum, p) => sum + p.match_expense_owes, 0).toFixed(2)),
      party_expense_owes: Number(playerBalances.reduce((sum, p) => sum + p.party_expense_owes, 0).toFixed(2)),
      other_expense_owes: Number(playerBalances.reduce((sum, p) => sum + p.other_expense_owes, 0).toFixed(2)),
      expense_owes: Number(playerBalances.reduce((sum, p) => sum + p.expense_owes, 0).toFixed(2)),
      league_owes: Number(playerBalances.reduce((sum, p) => sum + p.league_owes, 0).toFixed(2)),
      total_owes: Number(playerBalances.reduce((sum, p) => sum + p.total_owes, 0).toFixed(2)),
      net: Number(playerBalances.reduce((sum, p) => sum + p.net, 0).toFixed(2))
    },
    players: playerBalances,
    suggested_settlements: suggestedSettlements
  });
});

// GET single team with players
router.get('/:id', (req, res) => {
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id);
  if (!team) return res.status(404).json({ error: 'Team not found' });
  const players = db.prepare('SELECT * FROM players WHERE team_id = ? ORDER BY name').all(req.params.id);
  res.json({ ...team, players });
});

// POST create team
router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Team name is required' });
  try {
    const result = db.prepare('INSERT INTO teams (name) VALUES (?)').run(name.trim());
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(team);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Team name already exists' });
    throw e;
  }
});

// PUT update team
router.put('/:id', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Team name is required' });
  db.prepare('UPDATE teams SET name = ? WHERE id = ?').run(name.trim(), req.params.id);
  res.json(db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id));
});

// DELETE team
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM teams WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
