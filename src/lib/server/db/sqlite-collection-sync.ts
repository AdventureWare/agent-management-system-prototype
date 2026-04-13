import type Database from 'better-sqlite3';

type ExistingCollectionRow = {
	id: string;
	position: number;
	payload: string;
};

export function syncSqliteCollectionRecords(
	db: Database.Database,
	input: {
		tableName: string;
		collection: string;
		records: Array<{ id: string; payload: string }>;
	}
) {
	const existingRows = db
		.prepare<[string], ExistingCollectionRow>(
			`
				select id, position, payload
				from ${input.tableName}
				where collection = ?
			`
		)
		.all(input.collection);
	const existingRowsById = new Map(existingRows.map((row) => [row.id, row]));
	const nextIds = new Set(input.records.map((record) => record.id));
	const deleteRecord = db.prepare(
		`
			delete from ${input.tableName}
			where collection = ?
				and id = ?
		`
	);
	const upsertRecord = db.prepare(
		`
			insert into ${input.tableName} (collection, id, position, payload)
			values (?, ?, ?, ?)
			on conflict(collection, id) do update set
				position = excluded.position,
				payload = excluded.payload
		`
	);

	for (const existingRow of existingRows) {
		if (!nextIds.has(existingRow.id)) {
			deleteRecord.run(input.collection, existingRow.id);
		}
	}

	for (const [position, record] of input.records.entries()) {
		const existingRow = existingRowsById.get(record.id);

		if (
			existingRow &&
			existingRow.position === position &&
			existingRow.payload === record.payload
		) {
			continue;
		}

		upsertRecord.run(input.collection, record.id, position, record.payload);
	}
}
