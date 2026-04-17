const express = require('express');
const router = express.Router();
const { db } = require('../database');

// GET all matches (optionally filter by team)
router.get('/', (req, res) => {
  const { team_id } = req.query;
  const matches = team_id
    ? db.prepare(`SELECT m.*, t.name as team_name,
        (SELECT COUNT(*) FROM attendance a WHERE a.match_id = m.id AND a.status = 'attended') as attended_count,
        (SELECT COUNT(*) FROM attendance a WHERE a.match_id = m.id AND a.status = 'not_attended') as not_attended_count
        FROM matches m JOIN teams t ON t.id = m.team_id WHERE m.team_id = ? ORDER BY m.match_date DESC`).all(team_id)
    : db.prepare(`SELECT m.*, t.name as team_name,
        (SELECT COUNT(*) FROM attendance a WHERE a.match_id = m.id AND a.status = 'attended') as attended_count,
        (SELECT COUNT(*) FROM attendance a WHERE a.match_id = m.id AND a.status = 'not_attended') as not_attended_count
        FROM matches m JOIN teams t ON t.id = m.team_id ORDER BY m.match_date DESC`).all();
  res.json(matches);
});

// GET single match with attendance details
router.get('/:id', (req, res) => {
  const match = db.prepare(`SELECT m.*, t.name as team_name FROM matches m JOIN teams t ON t.id = m.team_id WHERE m.id = ?`).get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  const attendance = db.prepare(`
    SELECT p.id, p.name, p.phone, COALESCE(a.status, 'not_marked') as status
    FROM players p
    LEFT JOIN attendance a ON a.player_id = p.id AND a.match_id = ?
    WHERE p.team_id = ?
    ORDER BY p.name
  `).all(req.params.id, match.team_id);

  const expenses = db.prepare(`
    SELECT e.*, p.name as paid_by_name FROM expenses e
    LEFT JOIN players p ON p.id = e.paid_by
    WHERE e.match_id = ? ORDER BY e.created_at DESC
  `).all(req.params.id);

  res.json({ ...match, attendance, expenses });
});

// POST create match
router.post('/', (req, res) => {
  const { team_id, match_number, opponent, match_date, venue } = req.body;
  if (!team_id || !match_number || !opponent || !match_date) {
    return res.status(400).json({ error: 'team_id, match_number, opponent, match_date are required' });
  }
  const result = db.prepare(
    'INSERT INTO matches (team_id, match_number, opponent, match_date, venue) VALUES (?, ?, ?, ?, ?)'
  ).run(team_id, match_number, opponent, match_date, venue || null);

  // Auto-initialize attendance for all players
  const players = db.prepare('SELECT id FROM players WHERE team_id = ?').all(team_id);
  const insertAtt = db.prepare('INSERT OR IGNORE INTO attendance (match_id, player_id, status) VALUES (?, ?, ?)');
  players.forEach(p => insertAtt.run(result.lastInsertRowid, p.id, 'not_marked'));

  res.status(201).json(db.prepare('SELECT * FROM matches WHERE id = ?').get(result.lastInsertRowid));
});

// PUT update match
router.put('/:id', (req, res) => {
  const { opponent, match_date, venue, status } = req.body;
  db.prepare('UPDATE matches SET opponent = ?, match_date = ?, venue = ?, status = ? WHERE id = ?')
    .run(opponent, match_date, venue || null, status, req.params.id);
  res.json(db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id));
});

// DELETE match
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM matches WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// PUT update attendance for a match
router.put('/:id/attendance', (req, res) => {
  const { attendance } = req.body; // [{player_id, status}]
  if (!Array.isArray(attendance)) return res.status(400).json({ error: 'attendance must be an array' });

  const upsert = db.prepare(`
    INSERT INTO attendance (match_id, player_id, status) VALUES (?, ?, ?)
    ON CONFLICT(match_id, player_id) DO UPDATE SET status = excluded.status
  `);
  const tx = db.transaction(() => {
    attendance.forEach(({ player_id, status }) => upsert.run(req.params.id, player_id, status));
  });
  tx();
  res.json({ success: true });
});

module.exports = router;
