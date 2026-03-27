import { beforeEach, describe, expect, it, vi } from 'vitest';

const { readdir } = vi.hoisted(() => ({
	readdir: vi.fn()
}));

vi.mock('node:fs/promises', () => ({
	readdir
}));

import { loadFolderPickerOptions } from './folder-options';

type MockDirent = {
	name: string;
	isDirectory: () => boolean;
};

function directory(name: string): MockDirent {
	return {
		name,
		isDirectory: () => true
	};
}

function file(name: string): MockDirent {
	return {
		name,
		isDirectory: () => false
	};
}

describe('folder picker options', () => {
	beforeEach(() => {
		readdir.mockReset();
	});

	it('builds labeled folder options from the known roots and skips hidden entries', async () => {
		readdir.mockImplementation(async (path: string) => {
			switch (path) {
				case '/Users/colinfreed/Projects/Products':
					return [directory('Kwipoo'), directory('.git'), file('README.md')];
				case '/Users/colinfreed/Projects/Products/Kwipoo':
					return [directory('app')];
				case '/Users/colinfreed/Projects/Products/Kwipoo/app':
					return [];
				case '/Users/colinfreed/Projects/Experiments':
					return [directory('agent-management-system-prototype')];
				case '/Users/colinfreed/Projects/Experiments/agent-management-system-prototype':
					return [];
				default:
					throw new Error(`ENOENT: ${path}`);
			}
		});

		const options = await loadFolderPickerOptions();

		expect(options).toEqual([
			{ path: '/Users/colinfreed/Projects/Products', label: 'Products · .' },
			{ path: '/Users/colinfreed/Projects/Products/Kwipoo', label: 'Products · Kwipoo' },
			{ path: '/Users/colinfreed/Projects/Products/Kwipoo/app', label: 'Products · Kwipoo/app' },
			{ path: '/Users/colinfreed/Projects/Experiments', label: 'Experiments · .' },
			{
				path: '/Users/colinfreed/Projects/Experiments/agent-management-system-prototype',
				label: 'Experiments · agent-management-system-prototype'
			}
		]);
	});
});
