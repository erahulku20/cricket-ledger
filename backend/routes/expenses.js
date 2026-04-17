const express = require('express');
const router = express.Router();
const { db } = require('../database');

function computeSplits(expenseId, matchId, splitAmong, amount, paidBy, customPlayerIds) {
  // Get players to split among
  let players = [];
  if (splitAmong === 'attendees') {
    players = db.prepare(`
      SELECT player_id FROM attendance WHERE match_id = ? AND status = 'attended'
    `).all(matchId);
  } else if (splitAmong === 'all') {
    const match = db.prepare('SELECT team_id FROM matches WHERE id = ?').get(matchId);
    players = db.prepare('SELECT id as player_id FROM players WHERE team_id = ?').all(match.team_id);
  } else if (splitAmong === 'party_attendees') {
    if (Array.isArray(customPlayerIds) && customPlayerIds.length > 0) {
      players = customPlayerIds.map(playerId => ({ player_id: playerId }));
    } else {
      players = db.prepare(`
        SELECT player_id FROM attendance WHERE match_id = ? AND status = 'attended'
      `).all(matchId);
    }
  }

  if (players.length === 0) return [];

  const share = parseFloat((amount / players.length).toFixed(2));
  const remainder = parseFloat((amount - share * players.length).toFixed(2));

  const splits = players.map((p, i) => ({
    expense_id: expenseId,
    player_id: p.player_id,
    share_amount: i === 0 ? share + remainder : share,
    settled: p.player_id === paidBy ? 1 : 0
  }));
  return splits;
}

// GET expenses for a match
router.get('/match/:matchId', (req, res) => {
  const expenses = db.prepare(`
    SELECT e.*, p.name as paid_by_name,
      (SELECT SUM(es.share_amount) FROM expense_splits es WHERE es.expense_id = e.id AND es.settled = 0) as unsettled_amount
    FROM expenses e
    LEFT JOIN players p ON p.id = e.paid_by
    WHERE e.match_id = ? ORDER BY e.created_at DESC
  `).all(req.params.matchId);

  const result = expenses.map(exp => {
    const splits = db.prepare(`
      SELECT es.*, p.name as player_name
      FROM expense_splits es JOIN players p ON p.id = es.player_id
      WHERE es.expense_id = ?
    `).all(exp.id);
    return { ...exp, splits };
  });
  res.json(result);
});

// GET balance summary for a match
router.get('/match/:matchId/balances', (req, res) => {
  const matchId = req.params.matchId;
  const match = db.prepare('SELECT team_id FROM matches WHERE id = ?').get(matchId);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  const players = db.prepare('SELECT id, name FROM players WHERE team_id = ?').all(match.team_id);

  const balances = players.map(player => {
    const paid = db.prepare(`
      SELECT COALESCE(SUM(e.amount), 0) as total
      FROM expenses e WHERE e.match_id = ? AND e.paid_by = ?
    `).get(matchId, player.id).total;

    const owes = db.prepare(`
      SELECT COALESCE(SUM(es.share_amount), 0) as total
      FROM expense_splits es
      JOIN expenses e ON e.id = es.expense_id
      WHERE e.match_id = ? AND es.player_id = ? AND es.settled = 0
    `).get(matchId, player.id).total;

    const settled = db.prepare(`
      SELECT COALESCE(SUM(es.share_amount), 0) as total
      FROM expense_splits es
      JOIN expenses e ON e.id = es.expense_id
      WHERE e.match_id = ? AND es.player_id = ? AND es.settled = 1
    `).get(matchId, player.id).total;

    return { player_id: player.id, player_name: player.name, paid, owes, settled, net: paid - owes - settled };
  });

  res.json(balances);
});

// POST add expense
router.post('/', (req, res) => {
  const { match_id, category, description, amount, paid_by, split_among, custom_player_ids } = req.body;
  if (!match_id || !category || !description || !amount) {
    return res.status(400).json({ error: 'match_id, category, description, amount are required' });
  }

  const customPlayerIds = Array.isArray(custom_player_ids)
    ? custom_player_ids.map(id => parseInt(id, 10)).filter(Number.isInteger)
    : [];

  if (split_among === 'party_attendees' && customPlayerIds.length === 0) {
    return res.status(400).json({ error: 'Select at least one player for party split' });
  }

  const result = db.prepare(`
    INSERT INTO expenses (match_id, category, description, amount, paid_by, split_among, custom_player_ids)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    match_id,
    category,
    description,
    parseFloat(amount),
    paid_by || null,
    split_among || 'attendees',
    customPlayerIds.length > 0 ? JSON.stringify(customPlayerIds) : null
  );

  const expenseId = result.lastInsertRowid;
  const splits = computeSplits(
    expenseId,
    match_id,
    split_among || 'attendees',
    parseFloat(amount),
    paid_by,
    customPlayerIds
  );

  const insertSplit = db.prepare('INSERT INTO expense_splits (expense_id, player_id, share_amount, settled) VALUES (?, ?, ?, ?)');
  const tx = db.transaction(() => splits.forEach(s => insertSplit.run(s.expense_id, s.player_id, s.share_amount, s.settled)));
  tx();

  res.status(201).json(db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId));
});

// DELETE expense
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// PUT settle a split
router.put('/splits/:splitId/settle', (req, res) => {
  db.prepare('UPDATE expense_splits SET settled = 1 WHERE id = ?').run(req.params.splitId);
  res.json({ success: true });
});

// PUT unsettle a split
router.put('/splits/:splitId/unsettle', (req, res) => {
  db.prepare('UPDATE expense_splits SET settled = 0 WHERE id = ?').run(req.params.splitId);
  res.json({ success: true });
});

module.exports = router;
