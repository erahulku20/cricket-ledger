const express = require('express');
const router = express.Router();
const { db } = require('../database');

// GET dashboard summary
router.get('/', (req, res) => {
  // Total teams
  const totalTeams = db.prepare('SELECT COUNT(*) as count FROM teams').get().count;
  // Total players
  const totalPlayers = db.prepare('SELECT COUNT(*) as count FROM players').get().count;
  // Total matches
  const totalMatches = db.prepare('SELECT COUNT(*) as count FROM matches').get().count;
  // Upcoming matches
  const upcomingMatches = db.prepare("SELECT COUNT(*) as count FROM matches WHERE status = 'upcoming'").get().count;
  // Completed matches
  const completedMatches = db.prepare("SELECT COUNT(*) as count FROM matches WHERE status = 'completed'").get().count;
  // Total expenses
  const totalExpenses = db.prepare('SELECT COALESCE(SUM(amount),0) as sum FROM expenses').get().sum;
  // Unsettled expenses (sum of all splits not settled)
  const unsettledExpenses = db.prepare('SELECT COALESCE(SUM(share_amount),0) as sum FROM expense_splits WHERE settled = 0').get().sum;
  // Recent matches (last 5)
  const recentMatches = db.prepare(`
    SELECT m.*, t.name as team_name,
      (SELECT COUNT(*) FROM attendance a WHERE a.match_id = m.id AND a.status = 'attended') as attended_count
    FROM matches m
    JOIN teams t ON t.id = m.team_id
    ORDER BY m.match_date DESC, m.id DESC
    LIMIT 5
  `).all();

  res.json({
    totalTeams,
    totalPlayers,
    totalMatches,
    upcomingMatches,
    completedMatches,
    totalExpenses,
    unsettledExpenses,
    recentMatches
  });
});

module.exports = router;
