import { describe, expect, it, vi } from 'vitest';

const loadControlPlane = vi.hoisted(() => vi.fn());
const installExternalSkillToProject = vi.hoisted(() => vi.fn());
const searchExternalSkills = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/control-plane', () => ({
	loadControlPlane
}));

vi.mock('$lib/server/external-skills', () => ({
	installExternalSkillToProject,
	searchExternalSkills
}));

import { actions } from './+page.server';

function requestFromForm(values: Record<string, string>) {
	const form = new FormData();

	for (const [key, value] of Object.entries(values)) {
		form.set(key, value);
	}

	return new Request('http://localhost/app/skills', {
		method: 'POST',
		body: form
	});
}

describe('/app/skills server actions', () => {
	it('returns installed skill review details after external install', async () => {
		loadControlPlane.mockResolvedValue({
			projects: [
				{
					id: 'project_app',
					name: 'App',
					projectRootFolder: '/tmp/app'
				}
			]
		});
		installExternalSkillToProject.mockResolvedValue({
			installedSkillIds: ['docs-writer'],
			installedSkills: [
				{
					id: 'docs-writer',
					description: 'Write docs',
					sourceLabel: 'Project',
					global: false,
					project: true,
					skillFilePath: '/tmp/app/.agents/skills/docs-writer/SKILL.md'
				}
			]
		});
		searchExternalSkills.mockResolvedValue({
			results: [],
			rawOutput: ''
		});

		const result = await actions.installExternalSkill({
			request: requestFromForm({
				projectId: 'project_app',
				packageSpec: 'owner/repo@docs-writer',
				query: 'docs'
			})
		} as never);

		expect(result).toMatchObject({
			ok: true,
			successAction: 'installExternalSkill',
			projectId: 'project_app',
			packageSpec: 'owner/repo@docs-writer',
			installedSkillIds: ['docs-writer'],
			installedSkills: [
				{
					id: 'docs-writer',
					skillFilePath: '/tmp/app/.agents/skills/docs-writer/SKILL.md'
				}
			]
		});
	});

	it('surfaces external install conflicts as action failures', async () => {
		loadControlPlane.mockResolvedValue({
			projects: [
				{
					id: 'project_app',
					name: 'App',
					projectRootFolder: '/tmp/app'
				}
			]
		});
		installExternalSkillToProject.mockRejectedValue(
			new Error('Skill "docs-writer" is already installed for this project.')
		);

		const result = await actions.installExternalSkill({
			request: requestFromForm({
				projectId: 'project_app',
				packageSpec: 'owner/repo@docs-writer'
			})
		} as never);

		expect(result).toMatchObject({
			status: 400,
			data: {
				message: 'Skill "docs-writer" is already installed for this project.',
				projectId: 'project_app',
				packageSpec: 'owner/repo@docs-writer'
			}
		});
	});
});
