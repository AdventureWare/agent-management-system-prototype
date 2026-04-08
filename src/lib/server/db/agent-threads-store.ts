import { migrateAppDb } from '$lib/server/db/migrate';
import { openAppDb } from '$lib/server/db/connection';
import type {
	AgentRun,
	AgentThread,
	AgentThreadContact,
	AgentThreadsDb
} from '$lib/types/agent-thread';

const AGENT_THREAD_COLLECTIONS = ['contacts', 'runs', 'threads'] as const satisfies Array<
	keyof AgentThreadsDb
>;

type AgentThreadCollection = (typeof AGENT_THREAD_COLLECTIONS)[number];
type AgentThreadRecordPayload = AgentThread | AgentRun | AgentThreadContact;
type AgentThreadRecordRow = {
	collection: string;
	id: string;
	position: number;
	payload: string;
};

function isAgentThreadCollection(value: string): value is AgentThreadCollection {
	return AGENT_THREAD_COLLECTIONS.includes(value as AgentThreadCollection);
}

function emptyAgentThreadsDb(): AgentThreadsDb {
	return {
		threads: [],
		runs: [],
		contacts: []
	};
}

export function isAgentThreadsSqliteEmpty() {
	migrateAppDb();

	const db = openAppDb();

	try {
		const row = db
			.prepare<[], { count: number }>('select count(*) as count from agent_thread_records')
			.get();

		return !row || row.count === 0;
	} finally {
		db.close();
	}
}

export function loadAgentThreadsFromSqlite(): AgentThreadsDb {
	migrateAppDb();

	const db = openAppDb();

	try {
		const rows = db
			.prepare<[], AgentThreadRecordRow>(
				`
					select collection, id, position, payload
					from agent_thread_records
					order by collection asc, position asc, id asc
				`
			)
			.all();
		const data = emptyAgentThreadsDb();

		for (const row of rows) {
			if (!isAgentThreadCollection(row.collection)) {
				console.warn(
					`[agent-threads-store] Ignoring unknown sqlite collection "${row.collection}" for record "${row.id}".`
				);
				continue;
			}

			const collection = data[row.collection] as AgentThreadRecordPayload[];
			collection.push(JSON.parse(row.payload) as AgentThreadRecordPayload);
		}

		return data;
	} finally {
		db.close();
	}
}

export function saveAgentThreadsToSqlite(data: AgentThreadsDb) {
	migrateAppDb();

	const db = openAppDb();

	try {
		const replaceAllRecords = db.transaction((input: AgentThreadsDb) => {
			db.exec('delete from agent_thread_records');

			const insertRecord = db.prepare(
				`
					insert into agent_thread_records (collection, id, position, payload)
					values (?, ?, ?, ?)
				`
			);

			for (const collection of AGENT_THREAD_COLLECTIONS) {
				const records = input[collection] ?? [];

				for (const [position, record] of records.entries()) {
					insertRecord.run(collection, record.id, position, JSON.stringify(record));
				}
			}
		});

		replaceAllRecords(data);
	} finally {
		db.close();
	}
}
