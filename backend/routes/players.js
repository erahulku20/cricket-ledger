const express = require('express');
const router = express.Router();
const { db } = require('../database');

// GET all players (requires team_id for isolation)
router.get('/', (req, res) => {
  const { team_id } = req.query;

  if (!team_id) {
    return res.status(400).json({ error: 'team_id is required for data isolation' });
  }

  const players = db.prepare('SELECT p.*, t.name as team_name FROM players p JOIN teams t ON t.id = p.team_id WHERE p.team_id = ? ORDER BY p.name').all(team_id);
  res.json(players);
});

// GET single player
router.get('/:id', (req, res) => {
  const player = db.prepare('SELECT p.*, t.name as team_name FROM players p JOIN teams t ON t.id = p.team_id WHERE p.id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  res.json(player);
});

// POST create player
router.post('/', (req, res) => {
  const { team_id, name, phone } = req.body;
  if (!team_id || !name || !name.trim()) return res.status(400).json({ error: 'team_id and name are required' });
  const result = db.prepare('INSERT INTO players (team_id, name, phone) VALUES (?, ?, ?)').run(team_id, name.trim(), phone || null);
  res.status(201).json(db.prepare('SELECT * FROM players WHERE id = ?').get(result.lastInsertRowid));
});

// PUT update player
router.put('/:id', (req, res) => {
  const { name, phone } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  db.prepare('UPDATE players SET name = ?, phone = ? WHERE id = ?').run(name.trim(), phone || null, req.params.id);
  res.json(db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id));
});

// DELETE player
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM players WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
