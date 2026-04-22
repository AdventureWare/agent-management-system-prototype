import { beforeEach, describe, expect, it, vi } from 'vitest';

const openArtifactInEditorMock = vi.hoisted(() =>
	vi.fn(async () => ({
		path: '/tmp/project/agent_output/brief.md',
		launcher: 'VS Code CLI'
	}))
);

vi.mock('$lib/server/artifact-browser', () => ({
	openArtifactInEditor: openArtifactInEditorMock
}));

import { POST } from './open/+server';

describe('POST /api/artifacts/open', () => {
	beforeEach(() => {
		openArtifactInEditorMock.mockClear();
		openArtifactInEditorMock.mockResolvedValue({
			path: '/tmp/project/agent_output/brief.md',
			launcher: 'VS Code CLI'
		});
	});

	it('opens an artifact with line, column, and editor preference data', async () => {
		const response = await POST({
			request: new Request('http://localhost/api/artifacts/open', {
				method: 'POST',
				body: JSON.stringify({
					path: '/tmp/project/agent_output/brief.md',
					line: 12,
					column: 4,
					editor: 'cursor'
				})
			})
		} as never);

		expect(openArtifactInEditorMock).toHaveBeenCalledWith({
			path: '/tmp/project/agent_output/brief.md',
			line: 12,
			column: 4,
			preferredEditor: 'cursor'
		});
		expect(await response.json()).toEqual({
			path: '/tmp/project/agent_output/brief.md',
			launcher: 'VS Code CLI'
		});
	});

	it('maps missing files to a 404 error payload', async () => {
		openArtifactInEditorMock.mockRejectedValueOnce(
			new Error('Artifact file is missing from disk.')
		);

		try {
			await POST({
				request: new Request('http://localhost/api/artifacts/open', {
					method: 'POST',
					body: JSON.stringify({
						path: '/tmp/project/agent_output/missing.md'
					})
				})
			} as never);
		} catch (error) {
			expect(error).toMatchObject({
				status: 404,
				body: {
					message: 'Artifact file is missing from disk.'
				}
			});
			return;
		}

		throw new Error('Expected POST to throw an HttpError.');
	});
});
