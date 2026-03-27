import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { AGENT_SANDBOX_OPTIONS } from '$lib/types/agent-session';
import { loadControlPlane } from '$lib/server/control-plane';
import { loadFolderPickerOptions } from '$lib/server/folder-options';
import {
	listAgentSessions,
	parseAgentSandbox,
	startAgentSession,
	summarizeAgentSessions
} from '$lib/server/agent-sessions';

export const load: PageServerLoad = async () => {
	const sessions = await listAgentSessions();
	const controlPlane = await loadControlPlane();

	return {
		sessions,
		summary: summarizeAgentSessions(sessions),
		sandboxOptions: AGENT_SANDBOX_OPTIONS,
		folderOptions: await loadFolderPickerOptions(),
		projects: [...controlPlane.projects]
			.filter((project) => project.projectRootFolder)
			.sort((a, b) => a.name.localeCompare(b.name))
	};
};

export const actions: Actions = {
	startSession: async ({ request }) => {
		const form = await request.formData();
		const name = form.get('name')?.toString().trim() ?? '';
		const cwd = form.get('cwd')?.toString().trim() ?? '';
		const prompt = form.get('prompt')?.toString().trim() ?? '';
		const modelInput = form.get('model')?.toString().trim() ?? '';
		const sandbox = parseAgentSandbox(form.get('sandbox')?.toString(), 'workspace-write');

		if (!name || !cwd || !prompt) {
			return fail(400, { message: 'Name, cwd, and prompt are required.' });
		}

		await startAgentSession({
			name,
			cwd,
			prompt,
			sandbox,
			model: modelInput || null
		});

		return { ok: true };
	}
};
