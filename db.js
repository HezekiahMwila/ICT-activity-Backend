// Creates the SQLite database connection and exports a small pool-like helper.
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dbFile = process.env.DB_PATH || path.join(__dirname, "data", "records.db");
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

const db = new Database(dbFile);
db.pragma("journal_mode = WAL");

// Create the table, and add the starting records only the first time.
const tableExists = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'records'")
  .get();
db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));
if (!tableExists) {
  db.exec(fs.readFileSync(path.join(__dirname, "seed.sql"), "utf8"));
  console.log("Database created and seeded with starting records.");
}

// query(sql, params) returns { rows, rowCount } like the pg pool.
// Use ? placeholders and pass values in an array, keeping user input out of the SQL text.
const pool = {
  async query(sql, params = []) {
    const stmt = db.prepare(sql);
    if (stmt.reader) {
      const rows = stmt.all(params);
      return { rows, rowCount: rows.length };
    }
    const info = stmt.run(params);
    return { rows: [], rowCount: info.changes };
  }
};

module.exports = pool;
