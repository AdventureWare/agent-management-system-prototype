import type { PageServerLoad } from './$types';
import {
	getDefaultV2CoreDbFile,
	openV2CoreDbReadonly
} from '$lib/server/v2-core-persistence';
import { readV2CoreOperatorConsole } from '$lib/server/v2-core-service';

function parseLimit(value: string | null) {
	const parsed = Number.parseInt(value ?? '', 10);

	if (!Number.isFinite(parsed)) {
		return 8;
	}

	return Math.min(Math.max(parsed, 1), 25);
}

export function _getV2CoreUiDbFile() {
	return process.env.AMS_V2_CORE_DB_FILE?.trim() || getDefaultV2CoreDbFile();
}

export const load: PageServerLoad = async ({ url }) => {
	const dbFile = _getV2CoreUiDbFile();
	const projectId = url.searchParams.get('project')?.trim() || null;
	const goalId = url.searchParams.get('goal')?.trim() || null;
	const limit = parseLimit(url.searchParams.get('limit'));
	let db: ReturnType<typeof openV2CoreDbReadonly> | null = null;

	try {
		db = openV2CoreDbReadonly({ dbFile });
		const operatorConsole = readV2CoreOperatorConsole(db, {
			projectId,
			goalId,
			limit
		});

		return {
			status: 'ready' as const,
			dbFile,
			error: null,
			scope: operatorConsole.scope,
			operatorConsole
		};
	} catch (error) {
		return {
			status: 'unavailable' as const,
			dbFile,
			error: error instanceof Error ? error.message : String(error),
			scope: {
				projectId,
				goalId
			},
			operatorConsole: null
		};
	} finally {
		db?.close();
	}
};
