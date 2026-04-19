const express = require('express');
const cors = require('cors');
const { db, initDb } = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const READ_ONLY = process.env.READ_ONLY === 'true';
if (READ_ONLY) {
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return res.status(403).json({ error: 'Read-only mode is enabled. Write operations are disabled.' });
    }
    next();
  });
}

app.use('/api/teams', require('./routes/teams'));
app.use('/api/players', require('./routes/players'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/polls', require('./routes/polls'));

app.get('/api/dashboard', (req, res) => {
  const totalTeams = db.prepare('SELECT COUNT(*) as count FROM teams').get().count;
  const totalPlayers = db.prepare('SELECT COUNT(*) as count FROM players').get().count;
  const totalMatches = db.prepare('SELECT COUNT(*) as count FROM matches').get().count;
  const upcomingMatches = db.prepare("SELECT COUNT(*) as count FROM matches WHERE status = 'upcoming'").get().count;
  const completedMatches = db.prepare("SELECT COUNT(*) as count FROM matches WHERE status = 'completed'").get().count;
  const totalExpenses = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses').get().total;
  const unsettledExpenses = db.prepare('SELECT COALESCE(SUM(es.share_amount), 0) as total FROM expense_splits es WHERE es.settled = 0').get().total;
  const recentMatches = db.prepare("SELECT m.*, t.name as team_name, (SELECT COUNT(*) FROM attendance a WHERE a.match_id = m.id AND a.status = 'attended') as attended_count FROM matches m JOIN teams t ON t.id = m.team_id ORDER BY m.created_at DESC LIMIT 5").all();
  res.json({ totalTeams, totalPlayers, totalMatches, upcomingMatches, completedMatches, totalExpenses, unsettledExpenses, recentMatches });
});

app.get('/api/backup', (req, res) => {
  const tables = ['teams', 'players', 'matches', 'attendance', 'expenses', 'expense_splits', 'polls', 'poll_responses', 'users'];
  const backup = {};

  tables.forEach(table => {
    backup[table] = db.prepare(`SELECT * FROM ${table}`).all();
  });

  res.setHeader('Content-Disposition', `attachment; filename="cricket-backup-${new Date().toISOString().slice(0,10)}.json"`);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({ generated_at: new Date().toISOString(), backup }, null, 2));
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log('Cricket Tracker API running on http://localhost:' + PORT);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
