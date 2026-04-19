const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'cricket.db');

let _db = null;
let _inTransaction = false;

function save() {
  if (_db && !_inTransaction) {
    const data = _db.export();
    fs.writeFileSync(DB_FILE, Buffer.from(data));
  }
}

function getScalar(sql) {
  const result = _db.exec(sql);
  if (!result[0] || !result[0].values || !result[0].values[0]) return null;
  return result[0].values[0][0];
}

const db = {
  prepare(sql) {
    return {
      run(...args) {
        if (!_db) throw new Error('DB not initialized');
        const params = args.flat();
        if (params.length) { _db.run(sql, params); } else { _db.run(sql); }
        const insertedId = getScalar('SELECT last_insert_rowid()');
        if (!_inTransaction) save();
        return { lastInsertRowid: insertedId };
      },
      get(...args) {
        if (!_db) throw new Error('DB not initialized');
        const params = args.flat();
        const stmt = _db.prepare(sql);
        if (params.length) stmt.bind(params);
        const row = stmt.step() ? Object.assign({}, stmt.getAsObject()) : undefined;
        stmt.free();
        return row;
      },
      all(...args) {
        if (!_db) throw new Error('DB not initialized');
        const params = args.flat();
        const stmt = _db.prepare(sql);
        if (params.length) stmt.bind(params);
        const rows = [];
        while (stmt.step()) rows.push(Object.assign({}, stmt.getAsObject()));
        stmt.free();
        return rows;
      }
    };
  },
  exec(sql) {
    if (!_db) throw new Error('DB not initialized');
    _db.exec(sql);
    return db;
  },
  transaction(fn) {
    return (...args) => {
      if (!_db) throw new Error('DB not initialized');
      _inTransaction = true;
      _db.run('BEGIN');
      try {
        fn(...args);
        _db.run('COMMIT');
      } catch (e) {
        _db.run('ROLLBACK');
        throw e;
      } finally {
        _inTransaction = false;
        save();
      }
    };
  }
};

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_FILE)) {
    try {
      const buf = fs.readFileSync(DB_FILE);
      _db = new SQL.Database(buf);
      _db.exec('SELECT 1');
    } catch (e) {
      console.warn('Existing DB unreadable, creating fresh:', e.message);
      _db = new SQL.Database();
      [DB_FILE + '-shm', DB_FILE + '-wal'].forEach(f => { try { fs.unlinkSync(f); } catch (_) {} });
    }
  } else {
    _db = new SQL.Database();
  }

  _db.exec('PRAGMA foreign_keys = ON');
  _db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      access_code TEXT UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      phone TEXT UNIQUE,
      role TEXT NOT NULL CHECK(role IN ('admin','member')) DEFAULT 'member',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      phone TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      match_number INTEGER NOT NULL DEFAULT 1,
      opponent TEXT NOT NULL,
      match_date TEXT NOT NULL,
      venue TEXT,
      status TEXT DEFAULT 'upcoming' CHECK(status IN ('upcoming','completed','cancelled')),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'not_marked' CHECK(status IN ('attended','not_attended','not_marked')),
      UNIQUE(match_id, player_id)
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      category TEXT NOT NULL CHECK(category IN ('match','party','other')),
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      paid_by INTEGER REFERENCES players(id),
      split_among TEXT DEFAULT 'attendees' CHECK(split_among IN ('attendees','all','party_attendees')),
      custom_player_ids TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS expense_splits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      share_amount REAL NOT NULL,
      settled INTEGER DEFAULT 0,
      UNIQUE(expense_id, player_id)
    );
    CREATE TABLE IF NOT EXISTS polls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS poll_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      response TEXT NOT NULL CHECK(response IN ('available','not_available','maybe')),
      UNIQUE(poll_id, player_id)
    );
  `);

  const matchCols = _db.exec("PRAGMA table_info(matches)");
  const matchColNames = new Set(
    (matchCols[0] && matchCols[0].values ? matchCols[0].values : []).map(col => col[1])
  );
  if (!matchColNames.has('match_number')) {
    _db.exec('ALTER TABLE matches ADD COLUMN match_number INTEGER NOT NULL DEFAULT 1');
  }

  const teamCols = _db.exec("PRAGMA table_info(teams)");
  const teamColNames = new Set(
    (teamCols[0] && teamCols[0].values ? teamCols[0].values : []).map(col => col[1])
  );
  if (!teamColNames.has('access_code')) {
    _db.exec('ALTER TABLE teams ADD COLUMN access_code TEXT');
    _db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_access_code ON teams(access_code)');
  }

  const expenseCols = _db.exec("PRAGMA table_info(expenses)");
  const expenseColNames = new Set(
    (expenseCols[0] && expenseCols[0].values ? expenseCols[0].values : []).map(col => col[1])
  );
  if (!expenseColNames.has('custom_player_ids')) {
    _db.exec('ALTER TABLE expenses ADD COLUMN custom_player_ids TEXT');
  }

  save();
  return db;
}

module.exports = { db, initDb };
