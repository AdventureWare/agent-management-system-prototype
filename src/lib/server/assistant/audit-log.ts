import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const ASSISTANT_ACTION_LOG_PATH = resolve(process.cwd(), 'data', 'assistant-actions.jsonl');

export async function logAssistantAction(event: Record<string, unknown>) {
	const entry = JSON.stringify({
		...event,
		recordedAt: new Date().toISOString()
	});

	await mkdir(dirname(ASSISTANT_ACTION_LOG_PATH), { recursive: true });
	await appendFile(ASSISTANT_ACTION_LOG_PATH, `${entry}\n`, 'utf8');
}
