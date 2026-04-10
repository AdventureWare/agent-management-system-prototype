import { migrateAppDb } from '$lib/server/db/migrate';
import { openAppDb } from '$lib/server/db/connection';
import { bumpStoreRevision, readStoreRevision } from '$lib/server/db/store-revisions';
import type {
	SelfImprovementCapturedSuggestion,
	SelfImprovementSuggestionDecision,
	SelfImprovementSuggestionImpression,
	SelfImprovementKnowledgeItem,
	SelfImprovementOpportunityRecord,
	TrackedSelfImprovementFeedbackSignal
} from '$lib/types/self-improvement';

export type SelfImprovementStoreDb = {
	records: SelfImprovementOpportunityRecord[];
	signals: TrackedSelfImprovementFeedbackSignal[];
	knowledgeItems: SelfImprovementKnowledgeItem[];
	capturedSuggestions: SelfImprovementCapturedSuggestion[];
	impressions: SelfImprovementSuggestionImpression[];
	decisions: SelfImprovementSuggestionDecision[];
};

const SELF_IMPROVEMENT_COLLECTIONS = [
	'records',
	'signals',
	'knowledgeItems',
	'capturedSuggestions',
	'impressions',
	'decisions'
] as const satisfies Array<keyof SelfImprovementStoreDb>;
const SELF_IMPROVEMENT_STORE_NAME = 'self-improvement';

type SelfImprovementCollection = (typeof SELF_IMPROVEMENT_COLLECTIONS)[number];
type SelfImprovementRecordPayload =
	| SelfImprovementOpportunityRecord
	| TrackedSelfImprovementFeedbackSignal
	| SelfImprovementKnowledgeItem
	| SelfImprovementCapturedSuggestion
	| SelfImprovementSuggestionImpression
	| SelfImprovementSuggestionDecision;
type SelfImprovementEntryRow = {
	collection: SelfImprovementCollection;
	id: string;
	position: number;
	payload: string;
};

function emptySelfImprovementDb(): SelfImprovementStoreDb {
	return {
		records: [],
		signals: [],
		knowledgeItems: [],
		capturedSuggestions: [],
		impressions: [],
		decisions: []
	};
}

export function isSelfImprovementSqliteEmpty() {
	migrateAppDb();

	const db = openAppDb();

	try {
		const row = db
			.prepare<[], { count: number }>('select count(*) as count from self_improvement_entries')
			.get();

		return !row || row.count === 0;
	} finally {
		db.close();
	}
}

export function loadSelfImprovementFromSqlite(): SelfImprovementStoreDb {
	return loadSelfImprovementSnapshotFromSqlite().data;
}

export function loadSelfImprovementSnapshotFromSqlite(): {
	data: SelfImprovementStoreDb;
	revision: number;
} {
	migrateAppDb();

	const db = openAppDb();

	try {
		return db.transaction(() => {
			const rows = db
				.prepare<[], SelfImprovementEntryRow>(
					`
						select collection, id, position, payload
						from self_improvement_entries
						order by collection asc, position asc, id asc
					`
				)
				.all();
			const data = emptySelfImprovementDb();

			for (const row of rows) {
				const collection = data[row.collection] as SelfImprovementRecordPayload[];
				collection.push(JSON.parse(row.payload) as SelfImprovementRecordPayload);
			}

			return {
				data,
				revision: readStoreRevision(db, SELF_IMPROVEMENT_STORE_NAME)
			};
		})();
	} finally {
		db.close();
	}
}

export function saveSelfImprovementToSqlite(
	data: SelfImprovementStoreDb,
	options: { expectedRevision?: number } = {}
) {
	migrateAppDb();

	const db = openAppDb();

	try {
		const replaceAllEntries = db.transaction(
			(input: SelfImprovementStoreDb, expectedRevision?: number) => {
				bumpStoreRevision(db, SELF_IMPROVEMENT_STORE_NAME, expectedRevision);
				db.exec('delete from self_improvement_entries');

				const insertEntry = db.prepare(
					`
					insert into self_improvement_entries (collection, id, position, payload)
					values (?, ?, ?, ?)
				`
				);

				for (const collection of SELF_IMPROVEMENT_COLLECTIONS) {
					const records = input[collection] ?? [];

					for (const [position, record] of records.entries()) {
						insertEntry.run(collection, record.id, position, JSON.stringify(record));
					}
				}
			}
		);

		replaceAllEntries(data, options.expectedRevision);
	} finally {
		db.close();
	}
}
