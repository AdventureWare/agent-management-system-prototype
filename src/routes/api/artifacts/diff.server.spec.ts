import { beforeEach, describe, expect, it, vi } from 'vitest';

const buildArtifactDiffPreviewMock = vi.hoisted(() =>
	vi.fn(async () => ({
		status: 'ready',
		diffText: 'diff --git a/file b/file',
		message: 'Showing the local diff against HEAD.',
		comparedAgainst: 'HEAD'
	}))
);

vi.mock('$lib/server/artifact-browser', () => ({
	buildArtifactDiffPreview: buildArtifactDiffPreviewMock
}));

import { GET } from './diff/+server';

describe('GET /api/artifacts/diff', () => {
	beforeEach(() => {
		buildArtifactDiffPreviewMock.mockClear();
		buildArtifactDiffPreviewMock.mockResolvedValue({
			status: 'ready',
			diffText: 'diff --git a/file b/file',
			message: 'Showing the local diff against HEAD.',
			comparedAgainst: 'HEAD'
		});
	});

	it('returns diff preview data for the requested path', async () => {
		const response = await GET({
			url: new URL('http://localhost/api/artifacts/diff?path=%2Ftmp%2Fproject%2Fbrief.md')
		} as never);

		expect(buildArtifactDiffPreviewMock).toHaveBeenCalledWith({
			path: '/tmp/project/brief.md'
		});
		expect(await response.json()).toEqual({
			status: 'ready',
			diffText: 'diff --git a/file b/file',
			message: 'Showing the local diff against HEAD.',
			comparedAgainst: 'HEAD'
		});
	});

	it('maps missing files to a 404 error payload', async () => {
		buildArtifactDiffPreviewMock.mockRejectedValueOnce(
			new Error('Artifact file is missing from disk.')
		);

		try {
			await GET({
				url: new URL('http://localhost/api/artifacts/diff?path=%2Ftmp%2Fproject%2Fmissing.md')
			} as never);
		} catch (error) {
			expect(error).toMatchObject({
				status: 404
			});
			return;
		}

		throw new Error('Expected GET to throw an HttpError.');
	});
});
