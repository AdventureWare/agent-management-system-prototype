import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';

const APP_DB_FILE = resolve(process.cwd(), 'data', 'app.sqlite');

export function getAppDbFile() {
	return APP_DB_FILE;
}

export function openAppDb() {
	mkdirSync(resolve(process.cwd(), 'data'), { recursive: true });

	const db = new Database(APP_DB_FILE);
	db.pragma('journal_mode = WAL');
	db.pragma('foreign_keys = ON');
	db.pragma('busy_timeout = 5000');
	db.pragma('synchronous = NORMAL');

	return db;
}
