const express = require('express');
const cors = require('cors');
const { db, initDb } = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/teams', require('./routes/teams'));
app.use('/api/players', require('./routes/players'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/polls', require('./routes/polls'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.get('/api/backup', (req, res) => {
  const tables = ['teams', 'players', 'matches', 'attendance', 'expenses', 'expense_splits', 'polls', 'poll_responses'];
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
