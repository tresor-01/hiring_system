/**
 * Run this once to create all tables:
 *   npx ts-node src/initDb.ts
 * Make sure DATABASE_URL is set in .env first.
 */
import fs from 'fs';
import path from 'path';
import pool from './db';
import dotenv from 'dotenv';

dotenv.config();

async function init() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('✅  Database schema created successfully');
  } catch (err) {
    console.error('❌  Error creating schema:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

init();
