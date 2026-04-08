import { migrateAppDb } from '$lib/server/db/migrate';
import { openAppDb } from '$lib/server/db/connection';
import type {
	Approval,
	ControlPlaneData,
	Decision,
	Goal,
	PlanningSession,
	Project,
	Provider,
	Review,
	Role,
	Run,
	Task,
	Worker
} from '$lib/types/control-plane';

const CONTROL_PLANE_COLLECTIONS = [
	'providers',
	'roles',
	'projects',
	'goals',
	'workers',
	'tasks',
	'runs',
	'reviews',
	'approvals',
	'planningSessions',
	'decisions'
] as const satisfies Array<keyof ControlPlaneData>;

type ControlPlaneCollection = (typeof CONTROL_PLANE_COLLECTIONS)[number];

type ControlPlaneRecordPayload =
	| Provider
	| Role
	| Project
	| Goal
	| Worker
	| Task
	| Run
	| Review
	| Approval
	| PlanningSession
	| Decision;

type ControlPlaneRecordRow = {
	collection: string;
	id: string;
	position: number;
	payload: string;
};

function isControlPlaneCollection(value: string): value is ControlPlaneCollection {
	return CONTROL_PLANE_COLLECTIONS.includes(value as ControlPlaneCollection);
}

function emptyControlPlaneData(): ControlPlaneData {
	return {
		providers: [],
		roles: [],
		projects: [],
		goals: [],
		workers: [],
		tasks: [],
		runs: [],
		reviews: [],
		approvals: [],
		planningSessions: [],
		decisions: []
	};
}

export function isControlPlaneSqliteEmpty() {
	migrateAppDb();

	const db = openAppDb();

	try {
		const row = db
			.prepare<[], { count: number }>('select count(*) as count from control_plane_records')
			.get();

		return !row || row.count === 0;
	} finally {
		db.close();
	}
}

export function loadControlPlaneFromSqlite(): ControlPlaneData {
	migrateAppDb();

	const db = openAppDb();

	try {
		const rows = db
			.prepare<[], ControlPlaneRecordRow>(
				`
					select collection, id, position, payload
					from control_plane_records
					order by collection asc, position asc, id asc
				`
			)
			.all();
		const data = emptyControlPlaneData();

		for (const row of rows) {
			if (!isControlPlaneCollection(row.collection)) {
				console.warn(
					`[control-plane-store] Ignoring unknown sqlite collection "${row.collection}" for record "${row.id}".`
				);
				continue;
			}

			const collection = data[row.collection] as ControlPlaneRecordPayload[];
			collection.push(JSON.parse(row.payload) as ControlPlaneRecordPayload);
		}

		return data;
	} finally {
		db.close();
	}
}

export function saveControlPlaneToSqlite(data: ControlPlaneData) {
	migrateAppDb();

	const db = openAppDb();

	try {
		const replaceAllRecords = db.transaction((input: ControlPlaneData) => {
			db.exec('delete from control_plane_records');

			const insertRecord = db.prepare(
				`
					insert into control_plane_records (collection, id, position, payload)
					values (?, ?, ?, ?)
				`
			);

			for (const collection of CONTROL_PLANE_COLLECTIONS) {
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
