import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openAppDb } from '$lib/server/db/connection';

const MIGRATIONS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), 'migrations');

export function migrateAppDb() {
	const db = openAppDb();

	try {
		db.exec(`
			create table if not exists schema_migrations (
				name text primary key,
				applied_at text not null
			);
		`);

		const applied = new Set(
			db
				.prepare<[], { name: string }>('select name from schema_migrations')
				.all()
				.map((row) => row.name)
		);
		const migrations = readdirSync(MIGRATIONS_DIR)
			.filter((file) => file.endsWith('.sql'))
			.sort();

		for (const name of migrations) {
			if (applied.has(name)) {
				continue;
			}

			const sql = readFileSync(resolve(MIGRATIONS_DIR, name), 'utf8');
			const applyMigration = db.transaction((migrationName: string, migrationSql: string) => {
				db.exec(migrationSql);
				db.prepare('insert into schema_migrations (name, applied_at) values (?, ?)').run(
					migrationName,
					new Date().toISOString()
				);
			});

			applyMigration(name, sql);
		}
	} finally {
		db.close();
	}
}
