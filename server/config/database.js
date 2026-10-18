'use strict';

const fs = require('fs');
const path = require('path');
const config = require('./env');

let driver;
let sqliteDb = null;
let pgPool = null;

if (config.dbClient === 'pg' || (config.dbClient === 'auto' && /^postgres:\/\//.test(config.databaseUrl))) {
  driver = 'pg';
  const { Pool } = require('pg');
  pgPool = new Pool({ connectionString: config.databaseUrl, max: 10 });
  pgPool.on('error', (err) => console.error('[db] pool xatosi:', err.message));
} else {
  driver = 'sqlite';
  const { DatabaseSync } = require('node:sqlite');
  fs.mkdirSync(config.dataDir, { recursive: true });
  sqliteDb = new DatabaseSync(path.join(config.dataDir, 'edukitob.db'));
  sqliteDb.exec('PRAGMA journal_mode = WAL;');
  sqliteDb.exec('PRAGMA foreign_keys = ON;');
  sqliteDb.exec('PRAGMA busy_timeout = 5000;');
}

function translate(sql) {
  if (driver !== 'pg') return sql;
  let i = 0;
  return sql.replace(/\?/g, () => '$' + (++i));
}

async function query(sql, params = []) {
  if (driver === 'sqlite') {
    const stmt = sqliteDb.prepare(sql);
    const rows = stmt.all(...params);
    return rows;
  }
  const res = await pgPool.query(translate(sql), params);
  return res.rows;
}

async function get(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0];
}

async function run(sql, params = []) {
  if (driver === 'sqlite') {
    const stmt = sqliteDb.prepare(sql);
    const info = stmt.run(...params);
    return { changes: info.changes, lastId: Number(info.lastInsertRowid) };
  }
  const res = await pgPool.query(translate(sql), params);
  return { changes: res.rowCount, lastId: null };
}

async function tx(fn) {
  if (driver === 'sqlite') {
    sqliteDb.exec('BEGIN');
    try {
      const result = await fn(query);
      sqliteDb.exec('COMMIT');
      return result;
    } catch (err) {
      try { sqliteDb.exec('ROLLBACK'); } catch (_) { /* noop */ }
      throw err;
    }
  }
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    const q = async (sql, params = []) => (await client.query(translate(sql), params)).rows;
    const result = await fn(q);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* noop */ }
    throw err;
  } finally {
    client.release();
  }
}

function info() {
  return { driver, sqliteFile: driver === 'sqlite' ? path.join(config.dataDir, 'edukitob.db') : null };
}

async function close() {
  if (driver === 'sqlite') sqliteDb.close();
  else await pgPool.end();
}

module.exports = { driver, query, get, run, tx, info, close };
