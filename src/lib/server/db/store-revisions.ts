import type Database from 'better-sqlite3';

export class StoreRevisionConflictError extends Error {
	constructor(readonly storeName: string) {
		super(`Store "${storeName}" changed while the update was in progress.`);
		this.name = 'StoreRevisionConflictError';
	}
}

export function ensureStoreRevisionsTable(db: Database.Database) {
	db.exec(`
		create table if not exists store_revisions (
			store_name text primary key,
			revision integer not null default 0,
			updated_at text not null
		);
	`);
}

export function readStoreRevision(db: Database.Database, storeName: string) {
	ensureStoreRevisionsTable(db);

	const row = db
		.prepare<[string], { revision: number }>(
			`
				select revision
				from store_revisions
				where store_name = ?
			`
		)
		.get(storeName);

	return row?.revision ?? 0;
}

export function bumpStoreRevision(
	db: Database.Database,
	storeName: string,
	expectedRevision?: number
) {
	ensureStoreRevisionsTable(db);

	const now = new Date().toISOString();
	db.prepare(
		`
			insert into store_revisions (store_name, revision, updated_at)
			values (?, 0, ?)
			on conflict(store_name) do nothing
		`
	).run(storeName, now);

	if (typeof expectedRevision === 'number') {
		const result = db
			.prepare(
				`
					update store_revisions
					set revision = revision + 1,
						updated_at = ?
					where store_name = ?
						and revision = ?
				`
			)
			.run(now, storeName, expectedRevision);

		if (result.changes === 0) {
			throw new StoreRevisionConflictError(storeName);
		}

		return expectedRevision + 1;
	}

	db.prepare(
		`
			update store_revisions
			set revision = revision + 1,
				updated_at = ?
			where store_name = ?
		`
	).run(now, storeName);

	return readStoreRevision(db, storeName);
}
