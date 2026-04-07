import { writable } from 'svelte/store';

type RecordWithId = {
	id: string;
} & Record<string, unknown>;

type SelfImprovementRecordStoreState = {
	opportunitiesById: Record<string, RecordWithId>;
	knowledgeItemsById: Record<string, RecordWithId>;
};

const initialState: SelfImprovementRecordStoreState = {
	opportunitiesById: {},
	knowledgeItemsById: {}
};

function mergeRecord(current: Record<string, RecordWithId>, record: RecordWithId) {
	return {
		...current,
		[record.id]: {
			...(current[record.id] ?? {}),
			...record
		}
	};
}

function createSelfImprovementRecordStore() {
	const { subscribe, update } = writable<SelfImprovementRecordStoreState>(initialState);

	return {
		subscribe,
		reset() {
			update(() => initialState);
		},
		seedOpportunities(opportunities: RecordWithId[]) {
			update((state) => {
				let nextById = state.opportunitiesById;

				for (const opportunity of opportunities) {
					nextById = mergeRecord(nextById, opportunity);
				}

				return {
					...state,
					opportunitiesById: nextById
				};
			});
		},
		seedKnowledgeItems(knowledgeItems: RecordWithId[]) {
			update((state) => {
				let nextById = state.knowledgeItemsById;

				for (const knowledgeItem of knowledgeItems) {
					nextById = mergeRecord(nextById, knowledgeItem);
				}

				return {
					...state,
					knowledgeItemsById: nextById
				};
			});
		}
	};
}

export const selfImprovementRecordStore = createSelfImprovementRecordStore();

export function mergeStoredOpportunityRecord<T extends { id: string }>(
	opportunity: T,
	opportunitiesById: SelfImprovementRecordStoreState['opportunitiesById']
): T {
	const storedOpportunity = opportunitiesById[opportunity.id];

	if (!storedOpportunity) {
		return opportunity;
	}

	return {
		...opportunity,
		...storedOpportunity
	} as T;
}

export function mergeStoredKnowledgeItemRecord<T extends { id: string }>(
	knowledgeItem: T,
	knowledgeItemsById: SelfImprovementRecordStoreState['knowledgeItemsById']
): T {
	const storedKnowledgeItem = knowledgeItemsById[knowledgeItem.id];

	if (!storedKnowledgeItem) {
		return knowledgeItem;
	}

	return {
		...knowledgeItem,
		...storedKnowledgeItem
	} as T;
}
