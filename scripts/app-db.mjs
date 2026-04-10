import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const MIGRATIONS_DIR = resolve(REPO_ROOT, 'src', 'lib', 'server', 'db', 'migrations');

const STORES = [
	{
		name: 'control-plane',
		table: 'control_plane_records',
		jsonFile: 'control-plane.json',
		collections: [
			'providers',
			'roles',
			'projects',
			'goals',
			'executionSurfaces',
			'tasks',
			'runs',
			'reviews',
			'approvals',
			'planningSessions',
			'decisions'
		],
		createDefault() {
			return {
				providers: [],
				roles: [],
				projects: [],
				goals: [],
				executionSurfaces: [],
				tasks: [],
				runs: [],
				reviews: [],
				approvals: [],
				planningSessions: [],
				decisions: []
			};
		}
	},
	{
		name: 'agent-threads',
		table: 'agent_thread_records',
		jsonFile: 'agent-threads.json',
		collections: ['threads', 'runs', 'contacts'],
		createDefault() {
			return {
				threads: [],
				runs: [],
				contacts: []
			};
		}
	},
	{
		name: 'self-improvement',
		table: 'self_improvement_entries',
		jsonFile: 'self-improvement.json',
		collections: [
			'records',
			'signals',
			'knowledgeItems',
			'capturedSuggestions',
			'impressions',
			'decisions'
		],
		createDefault() {
			return {
				records: [],
				signals: [],
				knowledgeItems: [],
				capturedSuggestions: [],
				impressions: [],
				decisions: []
			};
		}
	}
];

function parseArgs(argv) {
	const args = [...argv];
	const command = args.shift();
	let targetRoot = process.cwd();

	while (args.length > 0) {
		const value = args.shift();

		if (value === '--root') {
			const next = args.shift();

			if (!next) {
				throw new Error('Missing value for --root');
			}

			targetRoot = resolve(next);
			continue;
		}

		throw new Error(`Unknown argument: ${value}`);
	}

	if (!command) {
		throw new Error('Missing command. Use migrate, import-json, or export-json.');
	}

	return { command, targetRoot };
}

function getDataPaths(targetRoot) {
	return {
		dataDir: resolve(targetRoot, 'data'),
		appDbFile: resolve(targetRoot, 'data', 'app.sqlite')
	};
}

function openAppDb(targetRoot) {
	const { dataDir, appDbFile } = getDataPaths(targetRoot);
	mkdirSync(dataDir, { recursive: true });

	const db = new Database(appDbFile);
	db.pragma('journal_mode = WAL');
	db.pragma('foreign_keys = ON');
	db.pragma('busy_timeout = 5000');
	db.pragma('synchronous = NORMAL');

	return db;
}

function migrateAppDb(targetRoot) {
	const db = openAppDb(targetRoot);

	try {
		db.exec(`
			create table if not exists schema_migrations (
				name text primary key,
				applied_at text not null
			);
		`);

		const applied = new Set(
			db
				.prepare('select name from schema_migrations')
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
			const applyMigration = db.transaction((migrationName, migrationSql) => {
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

function readJsonFile(path, createDefault) {
	if (!existsSync(path)) {
		return createDefault();
	}

	try {
		return JSON.parse(readFileSync(path, 'utf8'));
	} catch (error) {
		throw new Error(
			`Failed to parse ${path}: ${error instanceof Error ? error.message : String(error)}`,
			{ cause: error }
		);
	}
}

function importJson(targetRoot) {
	migrateAppDb(targetRoot);
	const db = openAppDb(targetRoot);

	try {
		for (const store of STORES) {
			const jsonPath = resolve(targetRoot, 'data', store.jsonFile);
			const data = readJsonFile(jsonPath, store.createDefault);
			const replaceStore = db.transaction((input) => {
				db.prepare(`delete from ${store.table}`).run();

				const insertRecord = db.prepare(
					`
						insert into ${store.table} (collection, id, position, payload)
						values (?, ?, ?, ?)
					`
				);

				for (const collection of store.collections) {
					const records = Array.isArray(input[collection]) ? input[collection] : [];

					for (const [position, record] of records.entries()) {
						if (!record || typeof record !== 'object' || typeof record.id !== 'string') {
							continue;
						}

						insertRecord.run(collection, record.id, position, JSON.stringify(record));
					}
				}
			});

			replaceStore(data);
			console.log(`Imported ${store.name} from ${jsonPath}`);
		}
	} finally {
		db.close();
	}
}

function exportJson(targetRoot) {
	migrateAppDb(targetRoot);
	const db = openAppDb(targetRoot);

	try {
		mkdirSync(resolve(targetRoot, 'data'), { recursive: true });

		for (const store of STORES) {
			const data = store.createDefault();
			const rows = db
				.prepare(
					`
						select collection, payload
						from ${store.table}
						order by collection asc, position asc, id asc
					`
				)
				.all();

			for (const row of rows) {
				if (!store.collections.includes(row.collection)) {
					continue;
				}

				data[row.collection].push(JSON.parse(row.payload));
			}

			const jsonPath = resolve(targetRoot, 'data', store.jsonFile);
			writeFileSync(jsonPath, JSON.stringify(data, null, 2));
			console.log(`Exported ${store.name} to ${jsonPath}`);
		}
	} finally {
		db.close();
	}
}

function main() {
	const { command, targetRoot } = parseArgs(process.argv.slice(2));

	switch (command) {
		case 'migrate':
			migrateAppDb(targetRoot);
			console.log(`Migrated app database at ${getDataPaths(targetRoot).appDbFile}`);
			break;
		case 'import-json':
			importJson(targetRoot);
			break;
		case 'export-json':
			exportJson(targetRoot);
			break;
		default:
			throw new Error(`Unknown command: ${command}`);
	}
}

try {
	main();
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
}
