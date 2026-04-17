const express = require('express');
const router = express.Router();
const { db } = require('../database');

// GET polls for a match
router.get('/match/:matchId', (req, res) => {
  const polls = db.prepare('SELECT * FROM polls WHERE match_id = ? ORDER BY created_at DESC').all(req.params.matchId);
  const result = polls.map(poll => {
    const responses = db.prepare(`
      SELECT pr.*, p.name as player_name
      FROM poll_responses pr JOIN players p ON p.id = pr.player_id
      WHERE pr.poll_id = ?
    `).all(poll.id);

    const match = db.prepare('SELECT team_id FROM matches WHERE id = ?').get(poll.match_id);
    const allPlayers = db.prepare('SELECT id, name FROM players WHERE team_id = ?').all(match.team_id);

    const summary = {
      available: responses.filter(r => r.response === 'available').length,
      not_available: responses.filter(r => r.response === 'not_available').length,
      maybe: responses.filter(r => r.response === 'maybe').length,
      pending: allPlayers.length - responses.length
    };

    return { ...poll, responses, summary, total_players: allPlayers.length };
  });
  res.json(result);
});

// POST create poll
router.post('/', (req, res) => {
  const { match_id, question } = req.body;
  if (!match_id || !question) return res.status(400).json({ error: 'match_id and question are required' });
  const result = db.prepare('INSERT INTO polls (match_id, question) VALUES (?, ?)').run(match_id, question);
  res.status(201).json(db.prepare('SELECT * FROM polls WHERE id = ?').get(result.lastInsertRowid));
});

// DELETE poll
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM polls WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST respond to poll
router.post('/:pollId/respond', (req, res) => {
  const { player_id, response } = req.body;
  if (!player_id || !response) return res.status(400).json({ error: 'player_id and response are required' });
  db.prepare(`
    INSERT INTO poll_responses (poll_id, player_id, response) VALUES (?, ?, ?)
    ON CONFLICT(poll_id, player_id) DO UPDATE SET response = excluded.response
  `).run(req.params.pollId, player_id, response);
  res.json({ success: true });
});

module.exports = router;
