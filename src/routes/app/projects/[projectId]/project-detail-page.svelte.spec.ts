import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/app/projects/[projectId]/+page.svelte', () => {
	it('renders the project danger zone and disables deletion when tasks remain', async () => {
		render(Page, {
			form: {} as never,
			data: {
				project: {
					id: 'project_1',
					name: 'Agent Management System Prototype',
					summary: 'Prototype summary',
					projectRootFolder: '/tmp/project',
					defaultArtifactRoot: '/tmp/project/agent_output',
					defaultRepoPath: '/tmp/project',
					defaultRepoUrl: 'git@github.com:org/repo.git',
					defaultBranch: 'main',
					defaultThreadSandbox: null
				},
				permissionSurface: {
					effectiveSandbox: 'workspace-write',
					sandboxSource: 'Fallback until a worker or provider override is chosen',
					summary: {
						trackedPathCount: 3,
						blockerCount: 0,
						macosPromptCount: 1,
						outsideSandboxCount: 1
					},
					localPaths: [
						{
							id: 'project-root-folder',
							label: 'Project root folder',
							path: '/tmp/project',
							importance: 'Required for every thread start.',
							requiredForLaunch: true,
							accessStatus: 'ready',
							accessMessage: 'Accessible to the current app process.',
							accessGuidance: null,
							coverageStatus: 'project_root',
							coverageLabel: 'Inside project root',
							coverageMessage: 'Covered because the path lives under the thread workspace root.',
							recommendedAction: null
						},
						{
							id: 'artifact-root',
							label: 'Default artifact root',
							path: '/Users/test/Library/Mobile Documents/com~apple~CloudDocs/Shared',
							importance: 'Used when task outputs land outside the thread workspace.',
							requiredForLaunch: false,
							accessStatus: 'macos_cloud_probe_blocked',
							accessMessage: 'macOS blocked the direct access probe for this cloud-synced folder.',
							accessGuidance:
								'AMS will still let a danger-full-access run try the real Codex launch path, but Files and Folders or iCloud Drive approval may still be required.',
							coverageStatus: 'outside_sandbox',
							coverageLabel: 'Outside sandbox',
							coverageMessage:
								'Not automatically writable from a standard thread launch. Move it under the project root, add it as an additional writable root, or use danger-full-access.',
							recommendedAction:
								'Retry the task first. If the run still fails, grant Files and Folders or iCloud Drive access to the app or terminal running AMS.'
						}
					]
				},
				relatedGoals: [
					{
						id: 'goal_1',
						name: 'Ship deletion',
						area: 'product',
						status: 'running',
						summary: 'Goal summary',
						artifactPath: '/tmp/project/agent_output/goals/ship-deletion',
						taskCount: 1
					}
				],
				relatedTasks: [
					{
						id: 'task_1',
						title: 'Finish deletion flow',
						summary: 'Wire delete behavior',
						status: 'ready',
						priority: 'high',
						artifactPath: '/tmp/project/agent_output/tasks/task_1',
						goalName: 'Ship deletion',
						assigneeName: 'Coordinator',
						openReview: null,
						pendingApproval: null,
						hasUnmetDependencies: false,
						updatedAtLabel: 'just now'
					}
				],
				folderOptions: [],
				sandboxOptions: ['workspace-write'],
				metrics: {
					totalTasks: 1,
					activeTasks: 1,
					reviewTasks: 0,
					pendingApprovals: 0,
					blockedTasks: 0,
					goalCount: 1
				}
			} as never
		});

		expect(document.body.textContent).toContain('Delete project');
		expect(document.body.textContent).toContain('Local access and sandbox coverage');
		expect(document.body.textContent).toContain('macOS protected');
		expect(document.body.textContent).toContain('Outside sandbox');
		expect(document.body.textContent).toContain(
			'Reassign or delete those tasks first because tasks require a project.'
		);
		expect(
			(document.querySelector('button[type="submit"][disabled]') as HTMLButtonElement | null)
				?.textContent
		).toContain('Delete project');
	});
});
