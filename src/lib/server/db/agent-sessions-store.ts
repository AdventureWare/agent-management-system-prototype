import { migrateAppDb } from '$lib/server/db/migrate';
import { openAppDb } from '$lib/server/db/connection';
import type { AgentRun, AgentSession, AgentSessionsDb } from '$lib/types/agent-thread';

const AGENT_SESSION_COLLECTIONS = ['sessions', 'runs'] as const satisfies Array<
	keyof AgentSessionsDb
>;

type AgentSessionCollection = (typeof AGENT_SESSION_COLLECTIONS)[number];
type AgentSessionRecordPayload = AgentSession | AgentRun;
type AgentSessionRecordRow = {
	collection: AgentSessionCollection;
	id: string;
	position: number;
	payload: string;
};

function emptyAgentSessionsDb(): AgentSessionsDb {
	return {
		threads: [],
		sessions: [],
		runs: []
	};
}

export function isAgentSessionsSqliteEmpty() {
	migrateAppDb();

	const db = openAppDb();

	try {
		const row = db
			.prepare<[], { count: number }>('select count(*) as count from agent_session_records')
			.get();

		return !row || row.count === 0;
	} finally {
		db.close();
	}
}

export function loadAgentSessionsFromSqlite(): AgentSessionsDb {
	migrateAppDb();

	const db = openAppDb();

	try {
		const rows = db
			.prepare<[], AgentSessionRecordRow>(
				`
					select collection, id, position, payload
					from agent_session_records
					order by collection asc, position asc, id asc
				`
			)
			.all();
		const data = emptyAgentSessionsDb();

		for (const row of rows) {
			const collection = data[row.collection] as AgentSessionRecordPayload[];
			collection.push(JSON.parse(row.payload) as AgentSessionRecordPayload);
		}

		data.threads = data.sessions;

		return data;
	} finally {
		db.close();
	}
}

export function saveAgentSessionsToSqlite(data: AgentSessionsDb) {
	migrateAppDb();

	const db = openAppDb();

	try {
		const replaceAllRecords = db.transaction((input: AgentSessionsDb) => {
			db.exec('delete from agent_session_records');

			const insertRecord = db.prepare(
				`
					insert into agent_session_records (collection, id, position, payload)
					values (?, ?, ?, ?)
				`
			);

			for (const collection of AGENT_SESSION_COLLECTIONS) {
				const records =
					collection === 'sessions'
						? (input.threads ?? input.sessions ?? [])
						: (input[collection] ?? []);

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
