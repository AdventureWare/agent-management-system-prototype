import { existsSync } from 'node:fs';
import Database from 'better-sqlite3';

export type CodexStateThreadRow = {
	id: string;
	title: string;
	cwd: string;
	sandbox_policy: string;
	model: string | null;
	first_user_message: string | null;
	rollout_path: string;
	created_at: number;
	updated_at: number;
};

function openReadOnlyCodexStateDb(path: string) {
	if (!existsSync(path)) {
		return null;
	}

	try {
		return new Database(path, {
			readonly: true,
			fileMustExist: true
		});
	} catch {
		return null;
	}
}

export function listCodexStateThreadRows(path: string) {
	const db = openReadOnlyCodexStateDb(path);

	if (!db) {
		return [];
	}

	try {
		return db
			.prepare<[], CodexStateThreadRow>(
				`
					select
						id,
						title,
						cwd,
						sandbox_policy,
						model,
						first_user_message,
						rollout_path,
						created_at,
						updated_at
					from threads
					where archived = 0
					order by updated_at desc
				`
			)
			.all();
	} catch {
		return [];
	} finally {
		db.close();
	}
}
